import { KinshipType, PatientGender } from '@app/shared'
import { toCreatePatientDto } from './to-create-patient-dto.mapper'

describe('toCreatePatientDto', () => {
  it('leaves address undefined when the input has none', () => {
    expect(toCreatePatientDto({ ...input, address: undefined } as never).address).toBeUndefined()
  })

  it('passes the address through and defaults the country to BR', () => {
    const address = {
      street: 'Rua São José',
      number: '340',
      complement: null,
      neighborhood: 'Centro',
      city: 'Patos',
      state: 'PB',
      zipCode: '58700-000',
    }

    expect(toCreatePatientDto({ ...input, address } as never).address).toEqual({ ...address, country: 'BR' })
  })

  it('keeps an explicit country', () => {
    const address = {
      street: 'Rua São José',
      number: '340',
      neighborhood: 'Centro',
      city: 'Patos',
      state: 'PB',
      zipCode: '58700-000',
      country: 'PT',
    }

    expect(toCreatePatientDto({ ...input, address } as never).address!.country).toBe('PT')
  })

  const input = {
    fullName: 'João Silva',
    email: 'joao@example.com',
    phoneNumber: '(11) 99999-9999',
    birthDate: '1990-05-15',
    documentNumber: '12345678901',
    gender: PatientGender.MALE,
  }

  it('maps all fields to DTO correctly', () => {
    const dto = toCreatePatientDto(input)

    expect(dto.fullName).toBe(input.fullName)
    expect(dto.email).toBe(input.email)
    expect(dto.phoneNumber).toBe(input.phoneNumber)
    expect(dto.birthDate).toBe(input.birthDate)
    expect(dto.documentNumber).toBe(input.documentNumber)
    expect(dto.gender).toBe(input.gender)
  })

  it('maps userId when linking to an existing user', () => {
    const dto = toCreatePatientDto({
      userId: 'user-uuid-1',
      phoneNumber: input.phoneNumber,
      birthDate: input.birthDate,
      documentNumber: input.documentNumber,
      gender: input.gender,
    })

    expect(dto.userId).toBe('user-uuid-1')
  })

  it('maps responsiblePatientId and kinshipType for a dependent without documentNumber', () => {
    const dto = toCreatePatientDto({
      fullName: 'Bebê Silva',
      email: 'bebe@example.com',
      phoneNumber: input.phoneNumber,
      birthDate: '2024-01-01',
      gender: input.gender,
      responsiblePatientId: 'responsible-uuid',
      kinshipType: KinshipType.FILHO,
    })

    expect(dto.documentNumber).toBeUndefined()
    expect(dto.responsiblePatientId).toBe('responsible-uuid')
    expect(dto.kinshipType).toBe(KinshipType.FILHO)
  })
})
