import { toCreateMedicalRecordDto } from './to-create-medical-record-dto.mapper'

describe('toCreateMedicalRecordDto', () => {
  it('maps appointmentId, the chosen templateId and data', () => {
    const dto = toCreateMedicalRecordDto({
      appointmentId: 'appt-uuid',
      templateId: 'tpl-uuid',
      data: { k1: 'value' },
    })
    expect(dto.appointmentId).toBe('appt-uuid')
    // Sem isto o servidor não tem como saber qual dos modelos da especialidade
    // o profissional preencheu.
    expect(dto.templateId).toBe('tpl-uuid')
    expect(dto.data).toEqual({ k1: 'value' })
  })

  it('includes notes when provided', () => {
    const dto = toCreateMedicalRecordDto({ appointmentId: 'appt-uuid', templateId: 'tpl-uuid', data: {}, notes: 'Obs' })
    expect(dto.notes).toBe('Obs')
  })

  it('omits notes when not provided', () => {
    const dto = toCreateMedicalRecordDto({ appointmentId: 'appt-uuid', templateId: 'tpl-uuid', data: {} })
    expect(dto.notes).toBeUndefined()
  })
})
