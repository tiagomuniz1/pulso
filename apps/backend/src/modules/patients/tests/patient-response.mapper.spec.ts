import { faker } from '@faker-js/faker'
import { KinshipType, PatientGender } from '@app/shared'
import { PatientResponseMapper } from '../mappers/patient-response.mapper'
import { Patient } from '../entities/patient.entity'

function buildPatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    clinicId: faker.string.uuid(),
    user: {
      id: faker.string.uuid(),
      fullName: faker.person.fullName(),
      email: faker.internet.email(),
      isActive: true,
    },
    documentNumber: '12345678901',
    phoneNumber: '(83) 98640-4309',
    birthDate: '1991-06-05',
    gender: PatientGender.FEMALE,
    responsiblePatientId: null,
    kinshipType: null,
    addressStreet: null,
    addressNumber: null,
    addressComplement: null,
    addressNeighborhood: null,
    addressCity: null,
    addressState: null,
    addressZipCode: null,
    addressCountry: null,
    version: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as unknown as Patient
}

describe('PatientResponseMapper', () => {
  let mapper: PatientResponseMapper

  beforeEach(() => {
    mapper = new PatientResponseMapper()
  })

  it('maps the patient and its user', () => {
    const patient = buildPatient()

    const result = mapper.toResponse(patient, null)

    expect(result.id).toBe(patient.id)
    expect(result.user).toEqual({
      id: patient.user.id,
      fullName: patient.user.fullName,
      email: patient.user.email,
      isActive: patient.user.isActive,
    })
    expect(result.documentNumber).toBe(patient.documentNumber)
    expect(result.phoneNumber).toBe(patient.phoneNumber)
    expect(result.birthDate).toBe(patient.birthDate)
    expect(result.gender).toBe(patient.gender)
  })

  it('returns address null when the patient has no address', () => {
    expect(mapper.toResponse(buildPatient(), null).address).toBeNull()
  })

  it('rebuilds the nested address from the flat columns', () => {
    const patient = buildPatient({
      addressStreet: 'Rua Pedro Melquiades de Medeiros',
      addressNumber: '05',
      addressComplement: 'Loteamento Campestre',
      addressNeighborhood: 'Centro',
      addressCity: 'São Mamede',
      addressState: 'PB',
      addressZipCode: '58625-000',
      addressCountry: 'BR',
    })

    expect(mapper.toResponse(patient, null).address).toEqual({
      street: 'Rua Pedro Melquiades de Medeiros',
      number: '05',
      complement: 'Loteamento Campestre',
      neighborhood: 'Centro',
      city: 'São Mamede',
      state: 'PB',
      zipCode: '58625-000',
      country: 'BR',
    })
  })

  it('keeps complement null when the address has none', () => {
    const patient = buildPatient({
      addressStreet: 'Rua São José',
      addressNumber: '340',
      addressComplement: null,
      addressNeighborhood: 'Centro',
      addressCity: 'Patos',
      addressState: 'PB',
      addressZipCode: '58700-000',
      addressCountry: 'BR',
    })

    expect(mapper.toResponse(patient, null).address!.complement).toBeNull()
  })

  it('maps the responsible patient reference', () => {
    const responsible = buildPatient({ documentNumber: '98765432100' })

    const result = mapper.toResponse(buildPatient(), responsible)

    expect(result.responsiblePatient).toEqual({
      id: responsible.id,
      fullName: responsible.user.fullName,
      documentNumber: responsible.documentNumber,
    })
  })

  it('maps dependents and defaults them to an empty list', () => {
    const dependent = buildPatient({ kinshipType: KinshipType.FILHO })

    expect(mapper.toResponse(buildPatient(), null).dependents).toEqual([])
    expect(mapper.toResponse(buildPatient(), null, [dependent]).dependents).toEqual([
      { id: dependent.id, fullName: dependent.user.fullName, kinshipType: KinshipType.FILHO },
    ])
  })
})
