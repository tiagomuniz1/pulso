import { PatientGender } from '@app/shared'
import { IClinicPatientRow } from './iclinic-csv.parser'
import {
  dedupeEmails,
  mapAddress,
  mapDocumentNumber,
  mapGender,
  mapPatient,
  mapPhoneNumber,
  normalizeName,
  normalizeStreet,
  placeholderEmail,
} from './map-patient'

function row(overrides: Partial<IClinicPatientRow> = {}): IClinicPatientRow {
  return {
    patient_id: '549928',
    name: 'Mykaelle Nicandro Pereira',
    birthdate: '2001-05-30',
    gender: 'f',
    cpf: '11392731402',
    mobile_phone: '(83) 98640-4309',
    home_phone: '',
    email: 'mykaelle@example.com',
    zip_code: '58625-000',
    address: 'Rua: Pedro Melquiades de Medeiros',
    number: '05',
    complement: '',
    neighborhood: 'Centro',
    city: 'São Mamede',
    state: 'PB',
    country: 'BR',
    date_added: '2025-06-10T23:09:35+00:00',
    ...overrides,
  }
}

describe('mapGender', () => {
  it('maps the two codes the export uses', () => {
    expect(mapGender('f')).toBe(PatientGender.FEMALE)
    expect(mapGender('m')).toBe(PatientGender.MALE)
  })

  it('falls back to OTHER for anything else', () => {
    expect(mapGender('')).toBe(PatientGender.OTHER)
    expect(mapGender('x')).toBe(PatientGender.OTHER)
  })
})

describe('mapPhoneNumber', () => {
  it('keeps an 11-digit mobile masked', () => {
    expect(mapPhoneNumber('(83) 98640-4309')).toBe('(83) 98640-4309')
  })

  it('keeps a 10-digit landline masked — the DTO accepts 4 or 5 digits', () => {
    expect(mapPhoneNumber('(83) 8881-5220')).toBe('(83) 8881-5220')
  })

  it('applies the mask to bare digits', () => {
    expect(mapPhoneNumber('83986404309')).toBe('(83) 98640-4309')
  })

  it('passes anything unexpected through untouched', () => {
    expect(mapPhoneNumber('0800')).toBe('0800')
  })
})

describe('mapDocumentNumber', () => {
  it('strips punctuation and keeps the 11 digits', () => {
    expect(mapDocumentNumber('113.927.314-02')).toBe('11392731402')
  })

  it('returns null when there is no CPF', () => {
    expect(mapDocumentNumber('')).toBeNull()
    expect(mapDocumentNumber('123')).toBeNull()
  })
})

describe('normalizeStreet', () => {
  it('removes the stray colon the IClinic left behind', () => {
    expect(normalizeStreet('Rua: Pedro Melquiades')).toBe('Rua Pedro Melquiades')
    expect(normalizeStreet('Rua:Adalto Gomes')).toBe('Rua Adalto Gomes')
    expect(normalizeStreet('Avenida:  Brasil')).toBe('Avenida Brasil')
  })

  it('leaves a clean street alone', () => {
    expect(normalizeStreet('Rua Manoel Torres')).toBe('Rua Manoel Torres')
  })
})

describe('mapAddress', () => {
  it('returns null when the row has no address at all', () => {
    const result = mapAddress(
      row({ address: '', number: '', neighborhood: '', city: '', state: '', zip_code: '', complement: '' }),
    )
    expect(result.address).toBeNull()
    expect(result.isPartial).toBe(false)
  })

  it('builds the full address and normalizes the street', () => {
    const { address, isPartial } = mapAddress(row())

    expect(isPartial).toBe(false)
    expect(address).toEqual({
      street: 'Rua Pedro Melquiades de Medeiros',
      number: '05',
      complement: null,
      neighborhood: 'Centro',
      city: 'São Mamede',
      state: 'PB',
      zipCode: '58625-000',
      country: 'BR',
    })
  })

  it('flags an address missing a required field', () => {
    const { address, isPartial } = mapAddress(row({ zip_code: '' }))
    expect(address).not.toBeNull()
    expect(isPartial).toBe(true)
  })

  it('defaults the country to BR', () => {
    expect(mapAddress(row({ country: '' })).address!.country).toBe('BR')
  })
})

describe('mapPatient', () => {
  it('maps the fields that have a destination', () => {
    const patient = mapPatient(row())

    expect(patient.externalId).toBe('549928')
    expect(patient.fullName).toBe('Mykaelle Nicandro Pereira')
    expect(patient.email).toBe('mykaelle@example.com')
    expect(patient.emailIsPlaceholder).toBe(false)
    expect(patient.documentNumber).toBe('11392731402')
    expect(patient.gender).toBe(PatientGender.FEMALE)
    expect(patient.birthDate).toBe('2001-05-30')
  })

  it('synthesizes an e-mail when the export has none', () => {
    const patient = mapPatient(row({ email: '' }))

    expect(patient.email).toBe(placeholderEmail('549928'))
    expect(patient.emailIsPlaceholder).toBe(true)
  })

  it('falls back to the landline when there is no mobile', () => {
    expect(mapPatient(row({ mobile_phone: '', home_phone: '(83) 99944-2010' })).phoneNumber).toBe(
      '(83) 99944-2010',
    )
  })
})

describe('normalizeName', () => {
  it('ignores case, accents and repeated spaces', () => {
    expect(normalizeName('  Maria  Áurea  Borba ')).toBe('maria aurea borba')
    expect(normalizeName('MARIA AUREA BORBA')).toBe(normalizeName('maria áurea borba'))
  })
})

describe('dedupeEmails', () => {
  it('leaves distinct e-mails alone', () => {
    const patients = dedupeEmails([
      mapPatient(row({ patient_id: '1', email: 'a@example.com' })),
      mapPatient(row({ patient_id: '2', email: 'b@example.com' })),
    ])

    expect(patients.map((patient) => patient.email)).toEqual(['a@example.com', 'b@example.com'])
  })

  it('gives the shared e-mail to the oldest record and synthesizes the rest', () => {
    const patients = dedupeEmails([
      mapPatient(row({ patient_id: '2', email: 'x@example.com', date_added: '2025-08-01T00:00:00+00:00' })),
      mapPatient(row({ patient_id: '1', email: 'x@example.com', date_added: '2025-06-01T00:00:00+00:00' })),
    ])

    const first = patients.find((patient) => patient.externalId === '1')!
    const second = patients.find((patient) => patient.externalId === '2')!

    expect(first.email).toBe('x@example.com')
    expect(first.emailIsPlaceholder).toBe(false)
    expect(second.email).toBe(placeholderEmail('2'))
    expect(second.emailIsPlaceholder).toBe(true)
  })
})
