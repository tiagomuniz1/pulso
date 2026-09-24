import { z } from 'zod'
import {
  EMPTY_ADDRESS,
  addressSchema,
  hasAnyAddressValue,
  toAddressInput,
  validateOptionalAddress,
  zipCodeRegex,
} from './address-fields'

const filled = {
  street: 'Rua Pedro Melquiades de Medeiros',
  number: '05',
  complement: 'Loteamento Campestre',
  neighborhood: 'Centro',
  city: 'São Mamede',
  state: 'PB',
  zipCode: '58625-000',
  country: 'BR',
}

function collectIssues(address: Record<string, string> | undefined) {
  const issues: z.ZodIssue[] = []
  const ctx = { addIssue: (issue: z.ZodIssue) => issues.push(issue) } as unknown as z.RefinementCtx
  validateOptionalAddress(address, ctx)
  return issues
}

describe('zipCodeRegex', () => {
  it('accepts the masked format only', () => {
    expect(zipCodeRegex.test('58625-000')).toBe(true)
    expect(zipCodeRegex.test('58625000')).toBe(false)
    expect(zipCodeRegex.test('58625-0000')).toBe(false)
  })
})

describe('addressSchema', () => {
  it('uppercases the state', () => {
    expect(addressSchema.parse({ ...filled, state: 'pb' }).state).toBe('PB')
  })

  it('rejects a state with more than two characters', () => {
    expect(addressSchema.safeParse({ ...filled, state: 'PBA' }).success).toBe(false)
  })

  it('accepts an empty complement', () => {
    expect(addressSchema.safeParse({ ...filled, complement: '' }).success).toBe(true)
  })
})

describe('hasAnyAddressValue', () => {
  it('is false for undefined and for the empty block', () => {
    expect(hasAnyAddressValue(undefined)).toBe(false)
    expect(hasAnyAddressValue({ ...EMPTY_ADDRESS })).toBe(false)
  })

  it('is false when every field is only whitespace', () => {
    expect(hasAnyAddressValue({ ...EMPTY_ADDRESS, city: '   ' })).toBe(false)
  })

  it('is true as soon as one field has content', () => {
    expect(hasAnyAddressValue({ ...EMPTY_ADDRESS, city: 'Patos' })).toBe(true)
  })
})

describe('validateOptionalAddress', () => {
  it('reports nothing when the block was never touched', () => {
    expect(collectIssues(undefined)).toEqual([])
    expect(collectIssues({ ...EMPTY_ADDRESS })).toEqual([])
  })

  it('reports nothing for a complete address', () => {
    expect(collectIssues(filled)).toEqual([])
  })

  it('anchors each issue under the address path', () => {
    const issues = collectIssues({ ...EMPTY_ADDRESS, street: 'Rua São José' })

    expect(issues.length).toBeGreaterThan(0)
    expect(issues.every((issue) => issue.path[0] === 'address')).toBe(true)
    expect(issues.map((issue) => issue.path[1])).toEqual(
      expect.arrayContaining(['number', 'neighborhood', 'city', 'state', 'zipCode']),
    )
  })

  it('does not demand a country — it defaults to BR', () => {
    const { country, ...withoutCountry } = filled
    expect(collectIssues(withoutCountry)).toEqual([])
  })

  it('flags an unmasked zip code', () => {
    const issues = collectIssues({ ...filled, zipCode: '58625000' })
    expect(issues).toHaveLength(1)
    expect(issues[0].path).toEqual(['address', 'zipCode'])
  })
})

describe('toAddressInput', () => {
  it('returns undefined when the block is empty', () => {
    expect(toAddressInput(undefined)).toBeUndefined()
    expect(toAddressInput({ ...EMPTY_ADDRESS })).toBeUndefined()
  })

  it('trims every field and uppercases the state', () => {
    expect(toAddressInput({ ...filled, street: '  Rua São José  ', state: ' pb ' })).toEqual({
      ...filled,
      street: 'Rua São José',
      state: 'PB',
    })
  })

  it('turns a blank complement into null', () => {
    expect(toAddressInput({ ...filled, complement: '   ' })!.complement).toBeNull()
  })

  it('defaults the country to BR', () => {
    expect(toAddressInput({ ...filled, country: '' })!.country).toBe('BR')
  })
})
