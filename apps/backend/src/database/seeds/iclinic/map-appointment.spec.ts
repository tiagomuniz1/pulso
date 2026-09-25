import { AppointmentStatus } from '@app/shared'
import { IClinicSchedulingRow } from './iclinic-csv.parser'
import { isBlockingEvent, mapStatus, resolveLabelName, resolveOwner, toShortTime } from './map-appointment'

function row(overrides: Partial<IClinicSchedulingRow> = {}): IClinicSchedulingRow {
  return {
    pk: '480431231',
    patient_id: '549928',
    patient_name: 'Mykaelle Nicandro Pereira',
    date: '2025-06-11',
    start_time: '08:00:00',
    end_time: '08:45:00',
    status: 'cp',
    description: 'CONSULTA PRÉ NATAL',
    all_day: '',
    event_blocked_scheduling: '',
    procedures: [{ name: 'Consulta pré-natal' }],
    ...overrides,
  }
}

describe('resolveOwner', () => {
  it('sends anything named Ortopedia to the orthopedics clinic', () => {
    expect(resolveOwner([{ name: 'Consulta ortopedia' }])).toBe('orthopedics')
    expect(resolveOwner([{ name: 'Retorno Ortopedia' }])).toBe('orthopedics')
    expect(resolveOwner([{ name: 'Procedimento Ortopedia' }])).toBe('orthopedics')
  })

  it('keeps everything else in the main clinic', () => {
    expect(resolveOwner([{ name: 'Consulta Ginecológica' }])).toBe('main')
    expect(resolveOwner([{ name: 'Retorno Pré-natal' }])).toBe('main')
    expect(resolveOwner([])).toBe('main')
  })
})

describe('toShortTime', () => {
  it('drops the seconds the IClinic carries around', () => {
    expect(toShortTime('08:30:05')).toBe('08:30')
    expect(toShortTime('')).toBe('')
  })
})

describe('isBlockingEvent', () => {
  it('recognizes both shapes of agenda block', () => {
    expect(isBlockingEvent(row({ event_blocked_scheduling: '1' }))).toBe(true)
    expect(isBlockingEvent(row({ all_day: 'Sim' }))).toBe(true)
  })

  it('is false for an ordinary appointment', () => {
    expect(isBlockingEvent(row())).toBe(false)
  })
})

describe('mapStatus', () => {
  it('trusts the medical record above any status code', () => {
    expect(mapStatus({ hasMedicalRecord: true, isFuture: false, iclinicStatus: 'sc' })).toEqual({
      status: AppointmentStatus.COMPLETED,
      cancellationReason: null,
    })
  })

  it('maps "na" to no-show', () => {
    expect(mapStatus({ hasMedicalRecord: false, isFuture: false, iclinicStatus: 'na' }).status).toBe(
      AppointmentStatus.NO_SHOW,
    )
  })

  it('leaves a future appointment scheduled', () => {
    expect(mapStatus({ hasMedicalRecord: false, isFuture: true, iclinicStatus: 'sc' }).status).toBe(
      AppointmentStatus.SCHEDULED,
    )
    expect(mapStatus({ hasMedicalRecord: false, isFuture: true, iclinicStatus: 're' }).status).toBe(
      AppointmentStatus.SCHEDULED,
    )
  })

  it('marks a future appointment confirmed when the IClinic said so', () => {
    expect(mapStatus({ hasMedicalRecord: false, isFuture: true, iclinicStatus: 'co' }).status).toBe(
      AppointmentStatus.CONFIRMED,
    )
  })

  it('treats the attended codes as completed', () => {
    for (const code of ['cp', 'at', 'pa', 'st']) {
      expect(mapStatus({ hasMedicalRecord: false, isFuture: false, iclinicStatus: code }).status).toBe(
        AppointmentStatus.COMPLETED,
      )
    }
  })

  it('cancels a past appointment nobody closed, saying why', () => {
    const result = mapStatus({ hasMedicalRecord: false, isFuture: false, iclinicStatus: 'sc' })

    expect(result.status).toBe(AppointmentStatus.CANCELLED)
    expect(result.cancellationReason).toContain('sem desfecho registrado')
    expect(result.cancellationReason).toContain('"sc"')
  })

  it('names an empty status in the cancellation reason', () => {
    const result = mapStatus({ hasMedicalRecord: false, isFuture: false, iclinicStatus: '' })
    expect(result.cancellationReason).toContain('vazio')
  })
})

describe('resolveLabelName', () => {
  it('uses the procedure as the label', () => {
    expect(resolveLabelName([{ name: 'Consulta Ginecológica' }])).toBe('Consulta Ginecológica')
  })

  it('returns null when there is no procedure', () => {
    expect(resolveLabelName([])).toBeNull()
    expect(resolveLabelName([{ name: '   ' }])).toBeNull()
  })
})

describe('mapStatus — a consulta de hoje', () => {
  it('keeps today scheduled instead of cancelling it', () => {
    // `isFuture` recebe `date >= today`, então a consulta de hoje chega aqui
    // como futura. O teste guarda o contrato de quem chama.
    const result = mapStatus({ hasMedicalRecord: false, isFuture: true, iclinicStatus: 'sc' })

    expect(result.status).toBe(AppointmentStatus.SCHEDULED)
    expect(result.cancellationReason).toBeNull()
  })
})
