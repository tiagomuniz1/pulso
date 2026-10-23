import { toVaccinationModel } from './to-vaccination-model.mapper'

const dto = {
  id: 'vac-1',
  vaccineId: 'v1',
  vaccineName: 'Tríplice viral',
  dose: '1ª dose',
  appliedAt: '2026-04-12',
  createdAt: '2026-04-12T18:00:00.000Z',
} as never

describe('toVaccinationModel', () => {
  it('converte o carimbo de criação para Date', () => {
    expect(toVaccinationModel(dto).createdAt).toBeInstanceOf(Date)
  })

  /**
   * `appliedAt` continua string, e isso é a decisão importante.
   *
   * É data civil, sem hora: a dose de 12/04 virando `Date` seria meia-noite
   * UTC, que em UTC-3 é 11/04 à noite — e a caderneta mostraria a dose um dia
   * antes do que a paciente tomou.
   */
  it('deixa a data de aplicação como string, sem fuso', () => {
    const model = toVaccinationModel(dto)

    expect(model.appliedAt).toBe('2026-04-12')
    expect(model.appliedAt).not.toBeInstanceOf(Date)
  })

  it('preserva os demais campos', () => {
    expect(toVaccinationModel(dto)).toMatchObject({
      id: 'vac-1',
      vaccineName: 'Tríplice viral',
      dose: '1ª dose',
    })
  })
})
