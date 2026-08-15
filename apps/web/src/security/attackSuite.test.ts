import { describe, expect, it } from 'vitest'
import { attacks } from './attackSuite'

describe('attack fixture catalog', () => {
  it('contains twelve deterministic unique attacks', () => {
    const suite = attacks()
    expect(suite).toHaveLength(12)
    expect(new Set(suite.map(item => item.id)).size).toBe(12)
  })
  it('keeps the identity-versus-authority fixture', () => {
    const item = attacks().find(attack => attack.id === 'unauthorised-action')
    expect(item?.evidence.credentialSignatureValid).toBe(true)
    expect(item?.expected).toBe('AUTHENTIC_UNAUTHORISED')
  })
})

