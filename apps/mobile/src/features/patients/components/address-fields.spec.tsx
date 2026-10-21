import { applyZipCodeMask } from './address-fields'

describe('applyZipCodeMask', () => {
  it.each([
    ['', ''],
    ['0', '0'],
    ['01000', '01000'],
    ['010000', '01000-0'],
    ['01000000', '01000-000'],
  ])('"%s" vira "%s"', (input, expected) => {
    expect(applyZipCodeMask(input)).toBe(expected)
  })

  it('ignora o que não é dígito e para nos oito', () => {
    expect(applyZipCodeMask('01.000-000')).toBe('01000-000')
    expect(applyZipCodeMask('010000001')).toBe('01000-000')
  })
})
