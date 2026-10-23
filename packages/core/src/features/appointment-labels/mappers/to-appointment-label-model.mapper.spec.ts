import { AppointmentLabelColor } from '@app/shared'
import {
  toAppointmentLabelModel,
  toPaginatedAppointmentLabelsModel,
} from './to-appointment-label-model.mapper'

const dto = {
  id: 'label-uuid',
  name: 'Retorno',
  color: AppointmentLabelColor.GREEN,
  isActive: true,
  createdAt: '2026-03-01T10:00:00.000Z',
  updatedAt: '2026-03-02T11:00:00.000Z',
} as never

describe('toAppointmentLabelModel', () => {
  it('maps every field', () => {
    expect(toAppointmentLabelModel(dto)).toEqual({
      id: 'label-uuid',
      name: 'Retorno',
      color: AppointmentLabelColor.GREEN,
      isActive: true,
      createdAt: new Date('2026-03-01T10:00:00.000Z'),
      updatedAt: new Date('2026-03-02T11:00:00.000Z'),
    })
  })

  // String na resposta, Date no modelo: a tela ordena e formata, e comparar
  // strings ISO funciona por acidente até o fuso entrar na conta.
  it('turns the timestamps into dates', () => {
    const model = toAppointmentLabelModel(dto)

    expect(model.createdAt).toBeInstanceOf(Date)
    expect(model.updatedAt).toBeInstanceOf(Date)
  })
})

describe('toPaginatedAppointmentLabelsModel', () => {
  it('maps the page and its rows', () => {
    const result = toPaginatedAppointmentLabelsModel({
      data: [dto],
      total: 1,
      page: 1,
      limit: 20,
    } as never)

    expect(result).toEqual({
      data: [toAppointmentLabelModel(dto)],
      total: 1,
      page: 1,
      limit: 20,
    })
  })

  it('survives an empty page', () => {
    const result = toPaginatedAppointmentLabelsModel({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
    } as never)

    expect(result.data).toEqual([])
  })
})
