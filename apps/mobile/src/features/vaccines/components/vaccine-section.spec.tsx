import {
  createVaccinationUseCase,
  createVaccineIndicationUseCase,
  deleteVaccinationUseCase,
  deleteVaccineIndicationUseCase,
  listVaccinationsUseCase,
  listVaccineIndicationsUseCase,
  listVaccinesUseCase,
} from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { VaccineSection } from './vaccine-section'

jest.mock('@app/core/src/features/vaccines/use-cases/list-vaccines.use-case')
jest.mock('@app/core/src/features/vaccine-indications/use-cases/list-vaccine-indications.use-case')
jest.mock('@app/core/src/features/vaccine-indications/use-cases/create-vaccine-indication.use-case')
jest.mock('@app/core/src/features/vaccine-indications/use-cases/delete-vaccine-indication.use-case')
jest.mock('@app/core/src/features/vaccinations/use-cases/list-vaccinations.use-case')
jest.mock('@app/core/src/features/vaccinations/use-cases/create-vaccination.use-case')
jest.mock('@app/core/src/features/vaccinations/use-cases/delete-vaccination.use-case')

const mockVaccines = listVaccinesUseCase as jest.MockedFunction<typeof listVaccinesUseCase>
const mockIndications = listVaccineIndicationsUseCase as jest.MockedFunction<typeof listVaccineIndicationsUseCase>
const mockCreateIndication = createVaccineIndicationUseCase as jest.MockedFunction<typeof createVaccineIndicationUseCase>
const mockDeleteIndication = deleteVaccineIndicationUseCase as jest.MockedFunction<typeof deleteVaccineIndicationUseCase>
const mockDoses = listVaccinationsUseCase as jest.MockedFunction<typeof listVaccinationsUseCase>
const mockCreateDose = createVaccinationUseCase as jest.MockedFunction<typeof createVaccinationUseCase>
const mockDeleteDose = deleteVaccinationUseCase as jest.MockedFunction<typeof deleteVaccinationUseCase>

const catalog = {
  data: [
    { id: 'v1', name: 'Tríplice viral', abbreviation: 'SCR', preventedDiseases: [], isActive: true, createdAt: new Date() },
  ],
  total: 1,
  page: 1,
  limit: 200,
} as never

const emptyPage = { data: [], total: 0, page: 1, limit: 100 } as never

beforeEach(() => {
  jest.clearAllMocks()
  mockVaccines.mockResolvedValue(catalog)
  mockIndications.mockResolvedValue([])
  mockDoses.mockResolvedValue(emptyPage)
})

function render({ canIssue = true, hasFicha = true } = {}) {
  return renderWithProviders(
    <VaccineSection
      appointmentId="appt-1"
      patientId="pat-1"
      canIssue={canIssue}
      hasFicha={hasFicha}
    />,
  )
}

describe('VaccineSection', () => {
  it('mostra as duas seções vazias', async () => {
    await render()

    expect(await screen.findByTestId('indications-empty')).toBeTruthy()
    expect(screen.getByTestId('vaccinations-empty')).toBeTruthy()
  })

  /**
   * A caderneta é do **paciente**, não da consulta: a dose aplicada anos
   * atrás noutro serviço não tem consulta a que se amarrar.
   */
  it('pede a caderneta pelo paciente e as indicações pela consulta', async () => {
    await render()

    await waitFor(() =>
      expect(mockDoses).toHaveBeenCalledWith({ patientId: 'pat-1', limit: 100 }),
    )
    expect(mockIndications).toHaveBeenCalledWith('appt-1')
  })

  it('lista as indicações emitidas', async () => {
    mockIndications.mockResolvedValue([
      { id: 'ind-1', issuedAt: new Date(2026, 3, 12), items: [{}, {}] },
    ] as never)

    await render()

    const item = await screen.findByTestId('indication-item-ind-1')
    expect(item).toHaveTextContent(/2 vacinas indicadas/)
  })

  it('uma indicação só é singular', async () => {
    mockIndications.mockResolvedValue([
      { id: 'ind-1', issuedAt: new Date(2026, 3, 12), items: [{}] },
    ] as never)

    await render()

    expect(await screen.findByTestId('indication-item-ind-1')).toHaveTextContent(
      /1 vacina indicada/,
    )
  })

  it('lista as doses da caderneta', async () => {
    mockDoses.mockResolvedValue({
      data: [
        {
          id: 'vac-1',
          vaccineName: 'Tríplice viral',
          doseLabel: '1ª dose',
          appliedAt: '2026-04-12',
          appliedAtDescription: 'UBS Centro',
        },
      ],
      total: 1,
      page: 1,
      limit: 100,
    } as never)

    await render()

    const item = await screen.findByTestId('vaccination-item-vac-1')
    expect(item).toHaveTextContent(/Tríplice viral/)
    expect(item).toHaveTextContent(/1ª dose · 12\/04\/2026 · UBS Centro/)
  })

  it('dose sem rótulo e sem local não deixa separador solto', async () => {
    mockDoses.mockResolvedValue({
      data: [
        { id: 'vac-1', vaccineName: 'BCG', doseLabel: '', appliedAt: '2026-04-12', appliedAtDescription: null },
      ],
      total: 1,
      page: 1,
      limit: 100,
    } as never)

    await render()

    await screen.findByTestId('vaccination-item-vac-1')
    expect(screen.getByText('12/04/2026')).toBeTruthy()
  })

  describe('emitir indicação', () => {
    it('a vacina vem do catálogo, sem texto livre', async () => {
      mockCreateIndication.mockResolvedValue({ id: 'ind-1' } as never)

      await render()
      fireEvent.press(await screen.findByTestId('indication-new'))
      fireEvent.press(await screen.findByTestId('indication-vaccine-0'))
      fireEvent.press(await screen.findByTestId('indication-vaccine-0-option-v1'))
      await waitFor(() =>
        expect(screen.getByTestId('indication-vaccine-0')).toHaveTextContent(/Tríplice viral/),
      )

      fireEvent.press(screen.getByTestId('indication-submit'))

      await waitFor(() =>
        expect(mockCreateIndication).toHaveBeenCalledWith({
          appointmentId: 'appt-1',
          items: [{ vaccineId: 'v1' }],
        }),
      )
    })

    it('recusa indicação sem vacina escolhida', async () => {
      await render()
      fireEvent.press(await screen.findByTestId('indication-new'))
      fireEvent.press(await screen.findByTestId('indication-submit'))

      expect(await screen.findByTestId('indication-error')).toHaveTextContent(/ao menos uma vacina/)
      expect(mockCreateIndication).not.toHaveBeenCalled()
    })

    it('exclui uma indicação', async () => {
      mockIndications.mockResolvedValue([
        { id: 'ind-1', issuedAt: new Date(), items: [{}] },
      ] as never)
      mockDeleteIndication.mockResolvedValue(undefined)

      await render()
      fireEvent.press(await screen.findByTestId('indication-delete-ind-1'))

      await waitFor(() => expect(mockDeleteIndication).toHaveBeenCalledWith('ind-1'))
    })
  })

  describe('registrar dose', () => {
    // Aplicada aqui é desta consulta; transcrita de fora não tem consulta a
    // que se amarrar.
    it('a dose aplicada nesta clínica carrega a consulta', async () => {
      mockCreateDose.mockResolvedValue({ id: 'vac-1' } as never)

      await render()
      fireEvent.press(await screen.findByTestId('vaccination-new'))
      fireEvent.press(await screen.findByTestId('vaccination-vaccine'))
      fireEvent.press(await screen.findByTestId('vaccination-vaccine-option-v1'))
      await waitFor(() =>
        expect(screen.getByTestId('vaccination-vaccine')).toHaveTextContent(/Tríplice viral/),
      )
      fireEvent.press(screen.getByTestId('vaccination-at-our-clinic'))

      await waitFor(() => expect(screen.queryByTestId('vaccination-where')).toBeNull())

      fireEvent.press(screen.getByTestId('vaccination-submit'))

      await waitFor(() =>
        expect(mockCreateDose).toHaveBeenCalledWith(
          expect.objectContaining({
            patientId: 'pat-1',
            vaccineId: 'v1',
            appointmentId: 'appt-1',
            appliedAtOurClinic: true,
          }),
        ),
      )
    })

    it('a dose transcrita de fora guarda onde foi, sem consulta', async () => {
      mockCreateDose.mockResolvedValue({ id: 'vac-1' } as never)

      await render()
      fireEvent.press(await screen.findByTestId('vaccination-new'))
      fireEvent.press(await screen.findByTestId('vaccination-vaccine'))
      fireEvent.press(await screen.findByTestId('vaccination-vaccine-option-v1'))
      await waitFor(() =>
        expect(screen.getByTestId('vaccination-vaccine')).toHaveTextContent(/Tríplice viral/),
      )

      const where = await screen.findByTestId('vaccination-where')
      fireEvent.changeText(where, 'UBS Centro')
      await waitFor(() => expect(screen.getByTestId('vaccination-where').props.value).toBe('UBS Centro'))

      fireEvent.press(screen.getByTestId('vaccination-submit'))

      await waitFor(() => expect(mockCreateDose).toHaveBeenCalled())
      const sent = mockCreateDose.mock.calls[0]?.[0]
      expect(sent.appliedAtDescription).toBe('UBS Centro')
      expect(sent.appointmentId).toBeUndefined()
    })

    it('recusa dose sem vacina', async () => {
      await render()
      fireEvent.press(await screen.findByTestId('vaccination-new'))
      fireEvent.press(await screen.findByTestId('vaccination-submit'))

      expect(await screen.findByTestId('vaccination-error')).toHaveTextContent(/Escolha a vacina/)
      expect(mockCreateDose).not.toHaveBeenCalled()
    })

    it('exclui uma dose', async () => {
      mockDoses.mockResolvedValue({
        data: [{ id: 'vac-1', vaccineName: 'BCG', doseLabel: '', appliedAt: '2026-04-12' }],
        total: 1,
        page: 1,
        limit: 100,
      } as never)
      mockDeleteDose.mockResolvedValue(undefined)

      await render()
      fireEvent.press(await screen.findByTestId('vaccination-delete-vac-1'))

      await waitFor(() => expect(mockDeleteDose).toHaveBeenCalledWith('vac-1'))
    })
  })

  /**
   * Os dois eixos, e aqui eles divergem: indicar é documento assinado e exige
   * ser o profissional da consulta; registrar dose é transcrição e basta ter
   * ficha, porque não há assinatura em jogo.
   */
  it('quem tem ficha mas não é o dono da consulta registra dose, mas não indica', async () => {
    await render({ canIssue: false, hasFicha: true })
    await screen.findByTestId('indications-empty')

    expect(screen.queryByTestId('indication-new')).toBeNull()
    expect(screen.getByTestId('vaccination-new')).toBeTruthy()
  })

  /**
   * Ler é de todo mundo que chega à aba; mexer é que se divide. O ADMIN sem
   * ficha vê a caderneta inteira e não lança nada nela.
   */
  it('quem não registra também não exclui o que já existe', async () => {
    mockIndications.mockResolvedValue([
      { id: 'ind-1', issuedAt: new Date(), items: [{}] },
    ] as never)
    mockDoses.mockResolvedValue({
      data: [{ id: 'vac-1', vaccineName: 'BCG', doseLabel: '', appliedAt: '2026-04-12' }],
      total: 1,
      page: 1,
      limit: 100,
    } as never)

    await render({ canIssue: false, hasFicha: false })
    await screen.findByTestId('indication-item-ind-1')

    expect(screen.getByTestId('vaccination-item-vac-1')).toBeTruthy()
    expect(screen.queryByTestId('indication-delete-ind-1')).toBeNull()
    expect(screen.queryByTestId('vaccination-delete-vac-1')).toBeNull()
  })

  it('quem não tem ficha não faz nem um nem outro', async () => {
    await render({ canIssue: false, hasFicha: false })
    await screen.findByTestId('indications-empty')

    expect(screen.queryByTestId('indication-new')).toBeNull()
    expect(screen.queryByTestId('vaccination-new')).toBeNull()
  })

  it('oferece tentar de novo nas duas seções, e tenta', async () => {
    mockIndications.mockRejectedValue(new Error('rede'))
    mockDoses.mockRejectedValue(new Error('rede'))

    await render()
    await screen.findByTestId('indications-error')
    expect(screen.getByTestId('vaccinations-error')).toBeTruthy()

    mockIndications.mockResolvedValue([])
    fireEvent.press(screen.getByTestId('indications-error-retry'))
    expect(await screen.findByTestId('indications-empty')).toBeTruthy()

    mockDoses.mockResolvedValue(emptyPage)
    fireEvent.press(screen.getByTestId('vaccinations-error-retry'))
    expect(await screen.findByTestId('vaccinations-empty')).toBeTruthy()
  })

  // Fechar sem emitir não pode deixar nada para trás nem salvar nada.
  it.each([
    ['indication', 'indication-form'],
    ['vaccination', 'vaccination-form'],
  ])('fecha a folha de %s sem salvar', async (prefix, formTestId) => {
    await render()
    fireEvent.press(await screen.findByTestId(`${prefix}-new`))
    await screen.findByTestId(`${formTestId}-close`)

    fireEvent.press(screen.getByTestId(`${formTestId}-close`))

    await waitFor(() => expect(screen.queryByTestId(`${formTestId}-close`)).toBeNull())
    expect(mockCreateIndication).not.toHaveBeenCalled()
    expect(mockCreateDose).not.toHaveBeenCalled()
  })

  it('a folha some depois de salvar', async () => {
    mockCreateDose.mockResolvedValue({ id: 'vac-1' } as never)

    await render()
    fireEvent.press(await screen.findByTestId('vaccination-new'))
    fireEvent.press(await screen.findByTestId('vaccination-vaccine'))
    fireEvent.press(await screen.findByTestId('vaccination-vaccine-option-v1'))
    await waitFor(() =>
      expect(screen.getByTestId('vaccination-vaccine')).toHaveTextContent(/Tríplice viral/),
    )
    fireEvent.press(screen.getByTestId('vaccination-submit'))

    await waitFor(() => expect(screen.queryByTestId('vaccination-form-close')).toBeNull())
  })

  it('mostra os giros enquanto carrega', async () => {
    mockIndications.mockReturnValue(new Promise(() => {}))
    mockDoses.mockReturnValue(new Promise(() => {}))

    await render()

    expect(screen.getByTestId('indications-loading')).toBeTruthy()
    expect(screen.getByTestId('vaccinations-loading')).toBeTruthy()
  })

  it('avisa quando salvar a dose falha', async () => {
    mockCreateDose.mockRejectedValue({ status: 422, title: 'x', detail: 'y' })

    await render()
    fireEvent.press(await screen.findByTestId('vaccination-new'))
    fireEvent.press(await screen.findByTestId('vaccination-vaccine'))
    fireEvent.press(await screen.findByTestId('vaccination-vaccine-option-v1'))
    await waitFor(() =>
      expect(screen.getByTestId('vaccination-vaccine')).toHaveTextContent(/Tríplice viral/),
    )
    fireEvent.press(screen.getByTestId('vaccination-submit'))

    expect(await screen.findByTestId('vaccination-create-error')).toBeTruthy()
  })

  // A indicação tem aviso próprio: ela é documento emitido e a dose é
  // registro — confundi-los diria à pessoa que falhou o que não falhou.
  it('avisa quando salvar a indicação falha', async () => {
    mockCreateIndication.mockRejectedValue({ status: 422, title: 'x', detail: 'y' })

    await render()
    fireEvent.press(await screen.findByTestId('indication-new'))
    fireEvent.press(await screen.findByTestId('indication-vaccine-0'))
    fireEvent.press(await screen.findByTestId('indication-vaccine-0-option-v1'))
    await waitFor(() =>
      expect(screen.getByTestId('indication-vaccine-0')).toHaveTextContent(/Tríplice viral/),
    )
    fireEvent.press(screen.getByTestId('indication-submit'))

    expect(await screen.findByTestId('vaccine-create-error')).toBeTruthy()
  })
})
