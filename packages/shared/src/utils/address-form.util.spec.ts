import { hasAnyAddressValue, toNormalizedAddress } from './address-form.util'

const complete = {
  street: 'Rua das Flores',
  number: '123',
  complement: 'Apto 42',
  neighborhood: 'Centro',
  city: 'São Paulo',
  state: 'sp',
  zipCode: '01000-000',
}

describe('hasAnyAddressValue', () => {
  it.each([
    ['ausente', undefined],
    ['vazio', {}],
    ['só espaços', { street: '   ', city: '' }],
  ])('%s não conta como preenchido', (_caso, address) => {
    expect(hasAnyAddressValue(address)).toBe(false)
  })

  // Um campo só já torna o bloco obrigatório: meio endereço não entrega
  // carta nenhuma, e deixar passar criaria cadastro pela metade.
  it('um campo digitado já conta', () => {
    expect(hasAnyAddressValue({ city: 'São Paulo' })).toBe(true)
  })
})

describe('toNormalizedAddress', () => {
  it('bloco intocado vira nada', () => {
    expect(toNormalizedAddress({})).toBeUndefined()
  })

  /**
   * A UF em maiúsculas e o país padrão são o motivo de esta função existir
   * no `@app/shared`: são conversões silenciosas — "sp" passa pelo
   * formulário sem erro e só aparece errado no cadastro, semanas depois.
   */
  it('normaliza a UF e assume o Brasil', () => {
    expect(toNormalizedAddress(complete)).toEqual({
      street: 'Rua das Flores',
      number: '123',
      complement: 'Apto 42',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01000-000',
      country: 'BR',
    })
  })

  it('respeita o país informado, também em maiúsculas', () => {
    expect(toNormalizedAddress({ ...complete, country: 'pt' })?.country).toBe('PT')
  })

  it('tira os espaços das pontas', () => {
    expect(toNormalizedAddress({ ...complete, street: '  Rua A  ', city: ' Santos ' })).toMatchObject(
      { street: 'Rua A', city: 'Santos' },
    )
  })

  // `''` e `'   '` viram `null`, não string vazia: o complemento é opcional
  // de verdade, e gravar vazio faria a ficha mostrar uma linha em branco.
  it.each([['vazio', ''], ['só espaços', '   ']])(
    'complemento %s vira null',
    (_caso, complement) => {
      expect(toNormalizedAddress({ ...complete, complement })?.complement).toBeNull()
    },
  )
})
