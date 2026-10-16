import { toVaccineModel } from './to-vaccine-model.mapper'

const dto = {
  id: 'v1',
  name: 'Tríplice viral',
  abbreviation: 'SCR',
  preventedDiseases: ['Sarampo', 'Caxumba', 'Rubéola'],
  isActive: true,
  createdAt: '2026-01-10T10:00:00.000Z',
  updatedAt: '2026-01-10T10:00:00.000Z',
} as never

describe('toVaccineModel', () => {
  it('mapeia os campos que a tela usa', () => {
    expect(toVaccineModel(dto)).toEqual({
      id: 'v1',
      name: 'Tríplice viral',
      abbreviation: 'SCR',
      preventedDiseases: ['Sarampo', 'Caxumba', 'Rubéola'],
      isActive: true,
      createdAt: new Date('2026-01-10T10:00:00.000Z'),
    })
  })

  // Model E mapper, sempre os dois: `updatedAt` está no DTO, não está no
  // model e não é copiado — some sem erro e sem teste falhando.
  it('não carrega campo que o model não declara', () => {
    expect(toVaccineModel(dto)).not.toHaveProperty('updatedAt')
  })
})
