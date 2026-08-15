import type { Evidence, VerificationResult } from '../types'

interface SwiftExports {
  adhikaar_verify_bundle(json: string): string
  adhikaar_normalize_challenge(value: string): string
  adhikaar_engine_version(): string
}

let swift: SwiftExports | undefined
let loadFailure: Error | undefined

export async function loadSwiftVerifier(): Promise<void> {
  if (swift || loadFailure) return
  try {
    const moduleUrl = new URL('/swiftwasm/index.js', window.location.origin).href
    const module = await import(/* @vite-ignore */ moduleUrl) as { init(options?: object): Promise<{ exports: SwiftExports }> }
    swift = (await module.init({})).exports
  } catch (error) {
    loadFailure = error instanceof Error ? error : new Error(String(error))
  }
}

export function swiftStatus(): { ready: boolean; version: string; error?: string } {
  if (swift) return { ready: true, version: swift.adhikaar_engine_version() }
  return { ready: false, version: 'not loaded', error: loadFailure?.message }
}

export function normalizeChallenge(value: string): string {
  if (!swift) return ''
  return swift.adhikaar_normalize_challenge(value)
}

export function verifyWithSwift(evidence: Evidence): { result: VerificationResult; durationMs: number } {
  if (!swift) throw new Error('Swift WebAssembly verifier is unavailable. Verification stopped safely.')
  const started = performance.now()
  const result = JSON.parse(swift.adhikaar_verify_bundle(JSON.stringify(evidence))) as VerificationResult
  return { result, durationMs: performance.now() - started }
}
