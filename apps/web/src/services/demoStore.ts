import type { Evidence, Mandate, Policy } from '../types'
import { randomCode, randomUUID, sha256, signPayload, stableStringify, verifyPayload } from './cryptoBridge'
import { supabase } from './auth'

export const bankPolicy: Policy = {
  schemaVersion: 1, policyId: 'bank-kyc-review', version: 1, institutionId: 'bharat-trust-bank-demo',
  roleCode: 'kyc-officer', purposeCode: 'bank-kyc-review',
  permittedActionCodes: ['confirm-masked-reference', 'explain-required-documents', 'schedule-physical-appointment', 'provide-official-callback'],
  prohibitedActionCodes: ['request-otp', 'request-pin', 'request-upi-pin', 'request-cvv', 'request-password', 'request-screen-sharing', 'request-remote-access-installation', 'demand-personal-upi-transfer'],
  maximumMandateLifetime: 90, superseded: false
}

const recordKey = (code: string) => `adhikaar:mandate:${code}`
const anonymousSessionKey = 'adhikaar:anonymous-session'

export async function demoRepresentativeStatus(): Promise<{ id: string; institutionId: string; revoked: boolean }> {
  const { data: representative, error } = await supabase.from('representatives').select('id,institution_id,status,credential_id').eq('display_name', 'Aarav Sharma — DEMO').maybeSingle()
  if (error || !representative) return { id: '', institutionId: '20000000-0000-0000-0000-000000000001', revoked: false }
  const { data: revocations } = await supabase.from('revocations').select('id').eq('subject_type', 'representative').eq('subject_id', representative.id).limit(1)
  return { id: representative.id, institutionId: representative.institution_id, revoked: representative.status === 'revoked' || Boolean(revocations?.length) }
}

export async function revokeDemoRepresentative(): Promise<void> {
  const status = await demoRepresentativeStatus()
  if (!status.id) throw new Error('The employee must enrol a device before the credential can be revoked.')
  if (status.revoked) return
  const { error } = await supabase.functions.invoke('revoke-subject', {
    body: {
      institutionId: status.institutionId,
      subjectType: 'representative',
      subjectId: status.id,
      reasonCode: 'judge_demo_revocation',
      reasonText: 'Fictional live revocation demonstration.'
    }
  })
  if (error) throw new Error('The immutable revocation could not be published.')
}

export async function issueDemoMandate(challenge: string, requestedActionCodes: string[]): Promise<Evidence> {
  const normalized = challenge.toUpperCase().replaceAll('-', '').replaceAll(' ', '')
  if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/u.test(normalized)) throw new Error('Enter the receiver’s valid 8-character challenge.')
  if (!requestedActionCodes.length) throw new Error('Choose at least one permitted action.')
  if (requestedActionCodes.some(action => !bankPolicy.permittedActionCodes.includes(action))) throw new Error('This request is outside your signed policy and cannot be issued.')
  const now = Math.floor(Date.now() / 1000)
  const salt = randomCode(16)
  const mandate: Mandate = {
    schemaVersion: 1, mandateId: randomUUID(), verificationCode: randomCode(6),
    institutionId: bankPolicy.institutionId, representativeId: 'aarav-sharma-demo',
    representativeDisplayName: 'Aarav Sharma — DEMO', roleCode: bankPolicy.roleCode,
    purposeCode: bankPolicy.purposeCode, requestedActionCodes, citizenChallengeSalt: salt,
    citizenChallengeDigest: await sha256(`${salt}:${normalized}`), nonce: randomCode(26),
    issuedAt: now, expiresAt: now + 90, policyId: bankPolicy.policyId, policyVersion: bankPolicy.version,
    registryRoot: '0x4f7c2e7d8f3a-demo-registry-root'
  }
  const signed = await signPayload(mandate)
  const evidence: Evidence = {
    schemaVersion: 1, mandate, policy: bankPolicy, signatureValid: true,
    credentialSignatureValid: true, registryProofValid: true, registryRootMatches: true,
    institutionKnown: true, revoked: false, nonceConsumedByOtherSession: false,
    challengeMatches: true, trustAgeSeconds: 1, maximumTrustAgeSeconds: 300,
    evaluatedAt: now, signature: signed.signature, representativePublicKeyJwk: signed.publicJwk
  }
  const { error: enrolmentError } = await supabase.functions.invoke('enrol-device', { body: { publicKeyJwk: signed.publicJwk } })
  if (enrolmentError) throw new Error('Your device key could not be enrolled with the institution. Check that local Supabase Functions are running.')
  const { error: submissionError } = await supabase.functions.invoke('submit-mandate', {
    body: {
      mandate,
      signature: signed.signature,
      canonicalHash: await sha256(stableStringify(mandate)),
      nonceHash: await sha256(mandate.nonce)
    }
  })
  if (submissionError) throw new Error('The signed proof was rejected by the institution backend.')
  // Retain a same-device cache only as a resilience aid. The authoritative exchange
  // happens through Supabase so the citizen and employee can use separate devices.
  localStorage.setItem(recordKey(mandate.verificationCode), JSON.stringify(evidence))
  return evidence
}

export async function resolveDemoMandate(code: string, challenge: string): Promise<Evidence> {
  const normalizedCode = code.toUpperCase().replaceAll(' ', '')
  if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/u.test(normalizedCode)) throw new Error('Enter a valid 6-character verification code.')
  let anonymousSession = localStorage.getItem(anonymousSessionKey)
  if (!anonymousSession) {
    anonymousSession = await sha256(randomUUID())
    localStorage.setItem(anonymousSessionKey, anonymousSession)
  }
  const { data, error } = await supabase.functions.invoke('resolve-mandate', {
    body: { verificationCode: normalizedCode, anonymousSessionHash: anonymousSession }
  })
  if (error || !data?.evidence) throw new Error('We could not find that proof. Check the code and try again.')
  const bundle = data.evidence as {
    mandate: Mandate
    signature: string
    representative: { id: string; status: string; public_key_jwk: JsonWebKey; credential_id: string }
    policy: { policy_json: Policy; status: string }
    institution: { status: string }
    registrySnapshots: Array<{ snapshot_type: string; status: string; published_at?: string }>
    revocations: Array<{ subject_type: string; subject_id: string }>
    resolvedAt: string
  }
  const revoked = bundle.representative.status === 'revoked' || bundle.revocations.some(item =>
    (item.subject_type === 'representative' && item.subject_id === bundle.representative.id) ||
    (item.subject_type === 'credential' && item.subject_id === bundle.representative.credential_id)
  )
  const latestSnapshot = bundle.registrySnapshots.map(item => item.published_at ? Date.parse(item.published_at) : 0).sort((a, b) => b - a)[0] ?? Date.now()
  const evidence: Evidence = {
    schemaVersion: 1,
    mandate: bundle.mandate,
    policy: bundle.policy.policy_json,
    signatureValid: false,
    credentialSignatureValid: bundle.representative.status === 'active' || revoked,
    registryProofValid: bundle.registrySnapshots.length > 0 && bundle.registrySnapshots.every(item => item.status === 'active'),
    registryRootMatches: bundle.registrySnapshots.length > 0,
    institutionKnown: bundle.institution.status === 'active',
    revoked,
    nonceConsumedByOtherSession: false,
    challengeMatches: false,
    trustAgeSeconds: Math.max(0, Math.floor((Date.now() - latestSnapshot) / 1000)),
    maximumTrustAgeSeconds: 300,
    evaluatedAt: Math.floor(Date.now() / 1000),
    signature: bundle.signature,
    representativePublicKeyJwk: bundle.representative.public_key_jwk
  }
  const normalizedChallenge = challenge.toUpperCase().replaceAll('-', '').replaceAll(' ', '')
  const signatureValid = Boolean(evidence.signature && evidence.representativePublicKeyJwk && await verifyPayload(evidence.mandate, evidence.signature, evidence.representativePublicKeyJwk))
  const challengeMatches = await sha256(`${evidence.mandate.citizenChallengeSalt}:${normalizedChallenge}`) === evidence.mandate.citizenChallengeDigest
  return { ...evidence, signatureValid, challengeMatches, evaluatedAt: Math.floor(Date.now() / 1000) }
}
