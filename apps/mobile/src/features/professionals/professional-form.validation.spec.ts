import { CouncilType } from '@app/shared'
import {
  applyRegistrationNumberMask,
  isRegistrationValid,
  showsRegistryNumber,
  validateProfessionalForm,
  type IProfessionalFormValues,
} from './professional-form.validation'

const crm = { councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }

const valid: IProfessionalFormValues = {
  userMode: 'new',
  userId: '',
  fullName: 'Mauro Lima',
  email: 'mauro@pulso.test',
  registrations: [crm],
  specialties: [],
  bio: '',
  isActive: true,
}

const form = (overrides: Partial<IProfessionalFormValues> = {}) => ({ ...valid, ...overrides })

describe('isRegistrationValid', () => {
  it('aceita um CRM de até seis dígitos', () => {
    expect(isRegistrationValid(crm)).toBe(true)
  })

  /**
   * Cada conselho tem o seu formato, e a tabela está no `@app/shared`.
   * Validar com uma regra só deixaria passar registro impossível e
   * recusaria registro válido — um CRN tem até oito dígitos.
   */
  it('recusa CRM com sete dígitos', () => {
    expect(isRegistrationValid({ ...crm, number: '1234567' })).toBe(false)
  })

  it('aceita CRN com oito dígitos', () => {
    expect(
      isRegistrationValid({ ...crm, councilType: CouncilType.CRN, number: '12345678' }),
    ).toBe(true)
  })

  it.each([
    ['UF com uma letra', 'S'],
    ['UF com três letras', 'SPP'],
    ['UF em minúsculas', 'sp'],
    ['UF vazia', ''],
  ])('recusa %s', (_caso, state) => {
    expect(isRegistrationValid({ ...crm, state })).toBe(false)
  })
})

describe('applyRegistrationNumberMask', () => {
  it('sobe para maiúsculas e tira o que não serve', () => {
    expect(applyRegistrationNumberMask('12a-b/3', CouncilType.CRM)).toBe('12A-B/')
  })

  // O corte é por conselho: seis no CRM, oito no CRN.
  it('corta no tamanho do conselho', () => {
    expect(applyRegistrationNumberMask('123456789', CouncilType.CRM)).toBe('123456')
    expect(applyRegistrationNumberMask('123456789', CouncilType.CRN)).toBe('12345678')
  })
})

describe('showsRegistryNumber', () => {
  /**
   * RQE é exclusivo da medicina. Pedi-lo a um nutricionista seria pedir um
   * dado que não existe — e o que manda é o registro **principal**, não um
   * CRM secundário que a pessoa também tenha.
   */
  it('só com CRM principal', () => {
    expect(showsRegistryNumber([crm])).toBe(true)
    expect(showsRegistryNumber([{ ...crm, councilType: CouncilType.CRN }])).toBe(false)
  })

  it('CRM secundário não basta', () => {
    expect(
      showsRegistryNumber([
        { ...crm, councilType: CouncilType.CRN, isPrimary: true },
        { ...crm, isPrimary: false },
      ]),
    ).toBe(false)
  })

  it('sem registro nenhum, não mostra', () => {
    expect(showsRegistryNumber([])).toBe(false)
  })
})

describe('validateProfessionalForm', () => {
  it('o formulário preenchido não tem erro', () => {
    expect(validateProfessionalForm(valid, false)).toEqual({})
  })

  it.each([
    ['nome curto', { fullName: 'Ma' }, 'fullName'],
    ['e-mail inválido', { email: 'mauro' }, 'email'],
    ['sem registro', { registrations: [] }, 'registrations'],
    ['registro mal formado', { registrations: [{ ...crm, number: '' }] }, 'registrations'],
  ])('recusa %s', (_caso, overrides, field) => {
    expect(validateProfessionalForm(form(overrides), false)[field]).toBeDefined()
  })

  it('usuário existente exige a escolha', () => {
    expect(validateProfessionalForm(form({ userMode: 'existing' }), false).userId).toBeDefined()
  })

  it('usuário existente não pede nome nem e-mail', () => {
    const errors = validateProfessionalForm(
      form({ userMode: 'existing', userId: 'u-1', fullName: '', email: '' }),
      false,
    )

    expect(errors.fullName).toBeUndefined()
    expect(errors.email).toBeUndefined()
  })

  // Na edição não se troca o usuário da ficha.
  it('editando, não pede usuário nem nome', () => {
    expect(
      validateProfessionalForm(form({ userMode: 'existing', fullName: '', email: '' }), true),
    ).toEqual({})
  })

  it('RQE só aceita dígitos', () => {
    expect(
      validateProfessionalForm(
        form({ specialties: [{ specialtyId: 'spec-1', registryNumber: '12a' }] }),
        false,
      ).specialties,
    ).toBeDefined()
  })

  it('especialidade sem RQE passa', () => {
    expect(
      validateProfessionalForm(form({ specialties: [{ specialtyId: 'spec-1' }] }), false),
    ).toEqual({})
  })

  it('bio tem limite', () => {
    expect(validateProfessionalForm(form({ bio: 'a'.repeat(501) }), false).bio).toBeDefined()
    expect(validateProfessionalForm(form({ bio: 'a'.repeat(500) }), false).bio).toBeUndefined()
  })
})
