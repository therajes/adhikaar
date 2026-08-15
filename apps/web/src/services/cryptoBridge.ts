const KEY_DB = 'adhikaar-device-keys'
const KEY_STORE = 'keys'
const KEY_NAME = 'representative-p256'

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''; bytes.forEach(byte => { binary += String.fromCharCode(byte) })
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '')
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4)
  return Uint8Array.from(atob(padded), char => char.charCodeAt(0))
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return bytesToBase64Url(new Uint8Array(digest))
}

function openKeyDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(KEY_DB, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(KEY_STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function readKey(): Promise<CryptoKeyPair | undefined> {
  const database = await openKeyDatabase()
  return new Promise((resolve, reject) => {
    const request = database.transaction(KEY_STORE).objectStore(KEY_STORE).get(KEY_NAME)
    request.onsuccess = () => resolve(request.result as CryptoKeyPair | undefined)
    request.onerror = () => reject(request.error)
  })
}

async function writeKey(pair: CryptoKeyPair): Promise<void> {
  const database = await openKeyDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(KEY_STORE, 'readwrite')
    transaction.objectStore(KEY_STORE).put(pair, KEY_NAME)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function removeRepresentativeKey(): Promise<void> {
  const database = await openKeyDatabase()
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(KEY_STORE, 'readwrite')
    transaction.objectStore(KEY_STORE).delete(KEY_NAME)
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
  })
}

export async function rotateRepresentativeKey(): Promise<CryptoKeyPair> {
  await removeRepresentativeKey()
  return getOrCreateRepresentativeKey()
}

export async function getOrCreateRepresentativeKey(): Promise<CryptoKeyPair> {
  const existing = await readKey()
  if (existing) return existing
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify'])
  await writeKey(pair)
  return pair
}

export async function signPayload(payload: unknown): Promise<{ signature: string; publicJwk: JsonWebKey; fingerprint: string }> {
  const pair = await getOrCreateRepresentativeKey()
  const bytes = new TextEncoder().encode(stableStringify(payload))
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, pair.privateKey, bytes)
  const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
  return { signature: bytesToBase64Url(new Uint8Array(signature)), publicJwk, fingerprint: (await sha256(stableStringify(publicJwk))).slice(0, 20) }
}

export async function verifyPayload(payload: unknown, signature: string, publicJwk: JsonWebKey): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey('jwk', publicJwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    const signatureBytes = base64UrlToBytes(signature)
    return crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, key, signatureBytes.buffer as ArrayBuffer, new TextEncoder().encode(stableStringify(payload)))
  } catch { return false }
}

export function randomCode(length: number): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const values = crypto.getRandomValues(new Uint8Array(length))
  return [...values].map(value => alphabet[value % alphabet.length]).join('')
}

export function randomUUID(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
