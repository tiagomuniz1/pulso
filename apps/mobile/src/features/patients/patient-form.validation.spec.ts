import { PatientGender } from '@app/shared'
import { validatePatientForm, type IPatientFormValues } from './patient-form.validation'

const valid: IPatientFormValues = {
  userMode: 'new',
  userId: '',
  fullName: 'Ana Paula Souza',
  email: 'ana@pulso.test',
  phoneNumber: '(11) 99999-8888',
  birthDate: '15/05/1990',
  documentNumber: '921.158.628-11',
  gender: PatientGender.FEMALE,
  isDependent: false,
  responsiblePatientId: '',
  kinshipType: '',
  address: {},
}

const form = (overrides: Partial<IPatientFormValues> = {}) => ({ ...valid, ...overrides })

describe('validatePatientForm', () => {
  it('o formulário preenchido não tem erro', () => {
    expect(validatePatientForm(valid, false).errors).toEqual({})
  })

  /**
   * A data convertida volta junto com os erros de propósito: convertê-la de
   * novo no componente exigiria um ramo para o caso que a validação acabou
   * de descartar, e esse ramo nenhum teste alcança.
   */
  it('devolve a data já no formato da API', () => {
    expect(validatePatientForm(valid, false).birthDate).toBe('1990-05-15')
  })

  it('data inválida volta como null', () => {
    expect(validatePatientForm(form({ birthDate: '31/02/1990' }), false).birthDate).toBeNull()
  })

  it.each([
    ['nome curto', { fullName: 'An' }, 'fullName'],
    ['nome só com espaços', { fullName: '   ' }, 'fullName'],
    ['e-mail sem arroba', { email: 'ana.pulso.test' }, 'email'],
    ['e-mail sem domínio', { email: 'ana@pulso' }, 'email'],
    ['telefone incompleto', { phoneNumber: '(11) 9999-88' }, 'phoneNumber'],
    ['telefone sem máscara', { phoneNumber: '11999998888' }, 'phoneNumber'],
    ['gênero vazio', { gender: '' }, 'gender'],
  ])('recusa %s', (_caso, overrides, field) => {
    expect(validatePatientForm(form(overrides), false).errors[field]).toBeDefined()
  })

  describe('data de nascimento', () => {
    it('vazia é obrigatória', () => {
      expect(validatePatientForm(form({ birthDate: '' }), false).errors.birthDate).toMatch(/obrigatória/)
    })

    it('inexistente no calendário é inválida', () => {
      expect(validatePatientForm(form({ birthDate: '31/02/1990' }), false).errors.birthDate).toMatch(
        /inválida/,
      )
    })

    it('no futuro é recusada', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const masked = `${String(tomorrow.getDate()).padStart(2, '0')}/${String(tomorrow.getMonth() + 1).padStart(2, '0')}/${tomorrow.getFullYear()}`

      expect(validatePatientForm(form({ birthDate: masked }), false).errors.birthDate).toMatch(/futura/)
    })
  })

  /**
   * Dependente dispensa CPF — é o recém-nascido e o menor sem documento
   * emitido, que é o motivo de o vínculo existir. Em troca, exige titular e
   * parentesco: sem eles o vínculo não diz de quem a pessoa depende.
   */
  describe('dependente', () => {
    const dependent = (overrides: Partial<IPatientFormValues> = {}) =>
      form({
        isDependent: true,
        documentNumber: '',
        responsiblePatientId: 'pat-9',
        kinshipType: 'filho',
        ...overrides,
      })

    it('não precisa de CPF', () => {
      expect(validatePatientForm(dependent(), false).errors).toEqual({})
    })

    it('precisa de titular', () => {
      expect(
        validatePatientForm(dependent({ responsiblePatientId: '' }), false).errors.responsiblePatientId,
      ).toBeDefined()
    })

    it('precisa de parentesco', () => {
      expect(validatePatientForm(dependent({ kinshipType: '' }), false).errors.kinshipType).toBeDefined()
    })

    it('quem não é dependente precisa de CPF', () => {
      expect(validatePatientForm(form({ documentNumber: '' }), false).errors.documentNumber).toBeDefined()
      expect(
        validatePatientForm(form({ documentNumber: '921.158.628' }), false).errors.documentNumber,
      ).toBeDefined()
    })
  })

  describe('usuário existente', () => {
    it('exige escolher o usuário', () => {
      expect(validatePatientForm(form({ userMode: 'existing', userId: '' }), false).errors.userId).toBe(
        'Selecione um usuário',
      )
    })

    // Nome e e-mail são do usuário escolhido — pedi-los seria pedir que a
    // pessoa redigite o que já está cadastrado.
    it('não pede nome nem e-mail', () => {
      const { errors } = validatePatientForm(
        form({ userMode: 'existing', userId: 'u-1', fullName: '', email: '' }),
        false,
      )

      expect(errors.fullName).toBeUndefined()
      expect(errors.email).toBeUndefined()
    })
  })

  /**
   * Na edição não se troca o usuário do paciente, então o modo "existente"
   * não existe ali — e nome e e-mail voltam a ser obrigatórios mesmo que o
   * estado do formulário ainda carregue `userMode: 'existing'`.
   */
  it('editando, nome e e-mail são sempre pedidos', () => {
    const { errors } = validatePatientForm(
      form({ userMode: 'existing', userId: 'u-1', fullName: '', email: '' }),
      true,
    )

    expect(errors.fullName).toBeDefined()
    expect(errors.email).toBeDefined()
    expect(errors.userId).toBeUndefined()
  })

  describe('endereço', () => {
    const complete = {
      street: 'Rua das Flores',
      number: '123',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01000-000',
    }

    it('intocado passa', () => {
      expect(validatePatientForm(form({ address: {} }), false).errors).toEqual({})
    })

    it('completo passa', () => {
      expect(validatePatientForm(form({ address: complete }), false).errors).toEqual({})
    })

    // Um campo só já torna o bloco obrigatório: meio endereço não entrega
    // carta nenhuma, e deixar passar criaria cadastro pela metade.
    it('começado tem de terminar', () => {
      const { errors } = validatePatientForm(form({ address: { city: 'São Paulo' } }), false)

      expect(errors['address.street']).toBeDefined()
      expect(errors['address.number']).toBeDefined()
      expect(errors['address.neighborhood']).toBeDefined()
      expect(errors['address.state']).toBeDefined()
      expect(errors['address.zipCode']).toBeDefined()
      expect(errors['address.city']).toBeUndefined()
    })

    it.each([
      ['UF com uma letra', { ...complete, state: 'S' }, 'address.state'],
      ['UF com três letras', { ...complete, state: 'SPP' }, 'address.state'],
      ['CEP curto', { ...complete, zipCode: '0100' }, 'address.zipCode'],
      ['CEP com letra', { ...complete, zipCode: '0100a-000' }, 'address.zipCode'],
    ])('recusa %s', (_caso, address, field) => {
      expect(validatePatientForm(form({ address }), false).errors[field]).toBeDefined()
    })

    it('CEP sem hífen passa', () => {
      expect(validatePatientForm(form({ address: { ...complete, zipCode: '01000000' } }), false).errors).toEqual({})
    })

    it('complemento sozinho também torna o bloco obrigatório', () => {
      expect(
        validatePatientForm(form({ address: { complement: 'Apto 42' } }), false).errors[
          'address.street'
        ],
      ).toBeDefined()
    })
  })
})
