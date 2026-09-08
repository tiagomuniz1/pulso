jest.mock('@/components/features/medical-records/services/medical-records.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { medicalRecordsService } from '@/components/features/medical-records/services/medical-records.service'
import { AppointmentHistorySection } from './appointment-history-section'

const mockService = medicalRecordsService as jest.Mocked<typeof medicalRecordsService>

const PACIENTE = 'patient-uuid'
const ESPECIALIDADE = 'specialty-uuid'
const CONSULTA_ATUAL = 'appointment-atual'

const campo = (key: string, label: string, extras: object = {}) => ({
  key,
  label,
  type: 'text',
  required: false,
  order: 1,
  options: null,
  placeholder: null,
  helpText: null,
  sectionKey: null,
  ...extras,
})

const makeDto = (overrides: object = {}) => ({
  id: 'record-1',
  appointmentId: 'appointment-1',
  patientId: PACIENTE,
  patientName: 'Clara Monteiro Alves',
  professionalId: 'professional-1',
  professionalName: 'Dra. Helena Vasconcelos',
  specialtyId: ESPECIALIDADE,
  specialtyName: 'Ginecologia e Obstetrícia',
  appointmentDate: '2026-03-11',
  appointmentStartTime: '14:30',
  templateId: 'template-1',
  templateSchemaSnapshot: [campo('queixa', 'Queixa principal'), campo('conduta', 'Conduta')],
  data: { queixa: 'Dor pélvica', conduta: 'Solicitado ultrassom' },
  notes: 'Retorno em 30 dias',
  createdAt: '2026-03-11T18:00:00.000Z',
  updatedAt: '2026-03-11T18:00:00.000Z',
  ...overrides,
})

const makePage = (itens: object[], total?: number) => ({
  data: itens,
  total: total ?? itens.length,
  page: 1,
  limit: 50,
})

function render(specialtyId: string | null = ESPECIALIDADE) {
  return renderWithProviders(
    <AppointmentHistorySection
      patientId={PACIENTE}
      specialtyId={specialtyId}
      appointmentId={CONSULTA_ATUAL}
    />,
  )
}

describe('AppointmentHistorySection (integration)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('mostra skeleton enquanto carrega', () => {
    mockService.listByPatient.mockReturnValue(new Promise(() => {}))
    render()
    expect(screen.getByTestId('appointment-history-skeleton')).toBeInTheDocument()
  })

  it('mostra erro quando a busca falha', async () => {
    mockService.listByPatient.mockRejectedValue(new Error('Network error'))
    render()
    expect(await screen.findByTestId('appointment-history-error')).toBeInTheDocument()
  })

  it('mostra estado vazio quando não há atendimento anterior', async () => {
    mockService.listByPatient.mockResolvedValue(makePage([]) as any)
    render()
    expect(await screen.findByTestId('appointment-history-empty')).toBeInTheDocument()
  })

  // O recorte é o ponto da funcionalidade: histórico DAQUELA especialidade,
  // sem a consulta em que o médico está.
  it('pede o histórico da especialidade da consulta, excluindo a atual', async () => {
    mockService.listByPatient.mockResolvedValue(makePage([makeDto()]) as any)
    render()

    await waitFor(() => {
      expect(mockService.listByPatient).toHaveBeenCalledWith(
        PACIENTE,
        expect.objectContaining({
          specialtyId: ESPECIALIDADE,
          excludeAppointmentId: CONSULTA_ATUAL,
        }),
      )
    })
  })

  // Consulta generalista tem prontuário com especialidade nula. Omitir o
  // parâmetro traria todas as especialidades, que é outra coisa.
  it("pede a especialidade nula quando a consulta é generalista", async () => {
    mockService.listByPatient.mockResolvedValue(makePage([]) as any)
    render(null)

    await waitFor(() => {
      expect(mockService.listByPatient).toHaveBeenCalledWith(
        PACIENTE,
        expect.objectContaining({ specialtyId: 'null' }),
      )
    })
  })

  it('mostra data, horário e quem atendeu, com os detalhes recolhidos', async () => {
    mockService.listByPatient.mockResolvedValue(makePage([makeDto()]) as any)
    render()

    const item = await screen.findByTestId('appointment-history-item-record-1')
    expect(item).toHaveTextContent('11/03/2026')
    expect(item).toHaveTextContent('14:30')
    expect(screen.getByTestId('appointment-history-professional-record-1')).toHaveTextContent(
      'Dra. Helena Vasconcelos',
    )
    expect(screen.queryByTestId('appointment-history-detail-record-1')).not.toBeInTheDocument()
  })

  it('expande e recolhe ao clicar', async () => {
    mockService.listByPatient.mockResolvedValue(makePage([makeDto()]) as any)
    render()

    const alternar = await screen.findByTestId('appointment-history-toggle-record-1')
    expect(alternar).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(alternar)

    const detalhe = screen.getByTestId('appointment-history-detail-record-1')
    expect(detalhe).toHaveTextContent('Queixa principal')
    expect(detalhe).toHaveTextContent('Dor pélvica')
    expect(detalhe).toHaveTextContent('Retorno em 30 dias')
    expect(alternar).toHaveAttribute('aria-expanded', 'true')

    await userEvent.click(alternar)
    expect(screen.queryByTestId('appointment-history-detail-record-1')).not.toBeInTheDocument()
  })

  it('expande dois atendimentos ao mesmo tempo, para comparar', async () => {
    mockService.listByPatient.mockResolvedValue(
      makePage([makeDto(), makeDto({ id: 'record-2', appointmentId: 'appointment-2' })]) as any,
    )
    render()

    await userEvent.click(await screen.findByTestId('appointment-history-toggle-record-1'))
    await userEvent.click(screen.getByTestId('appointment-history-toggle-record-2'))

    expect(screen.getByTestId('appointment-history-detail-record-1')).toBeInTheDocument()
    expect(screen.getByTestId('appointment-history-detail-record-2')).toBeInTheDocument()
  })

  describe('busca', () => {
    const doisRegistros = () =>
      makePage([
        makeDto(),
        makeDto({
          id: 'record-2',
          appointmentId: 'appointment-2',
          appointmentDate: '2025-11-04',
          professionalName: 'Dr. Rafael Andrade',
          data: { queixa: 'Prurido vulvar', conduta: 'Prescrito antifúngico' },
          notes: null,
        }),
      ])

    it('filtra pelo conteúdo registrado, não só pelo cabeçalho', async () => {
      mockService.listByPatient.mockResolvedValue(doisRegistros() as any)
      render()

      await screen.findByTestId('appointment-history-list')
      await userEvent.type(screen.getByTestId('appointment-history-search'), 'antifúngico')

      expect(screen.queryByTestId('appointment-history-item-record-1')).not.toBeInTheDocument()
      expect(screen.getByTestId('appointment-history-item-record-2')).toBeInTheDocument()
    })

    it('filtra por quem atendeu', async () => {
      mockService.listByPatient.mockResolvedValue(doisRegistros() as any)
      render()

      await screen.findByTestId('appointment-history-list')
      await userEvent.type(screen.getByTestId('appointment-history-search'), 'Rafael')

      expect(screen.queryByTestId('appointment-history-item-record-1')).not.toBeInTheDocument()
      expect(screen.getByTestId('appointment-history-item-record-2')).toBeInTheDocument()
    })

    it('filtra por data', async () => {
      mockService.listByPatient.mockResolvedValue(doisRegistros() as any)
      render()

      await screen.findByTestId('appointment-history-list')
      await userEvent.type(screen.getByTestId('appointment-history-search'), '04/11/2025')

      expect(screen.getByTestId('appointment-history-item-record-2')).toBeInTheDocument()
      expect(screen.queryByTestId('appointment-history-item-record-1')).not.toBeInTheDocument()
    })

    it('acha as observações', async () => {
      mockService.listByPatient.mockResolvedValue(doisRegistros() as any)
      render()

      await screen.findByTestId('appointment-history-list')
      await userEvent.type(screen.getByTestId('appointment-history-search'), 'Retorno em 30')

      expect(screen.getByTestId('appointment-history-item-record-1')).toBeInTheDocument()
      expect(screen.queryByTestId('appointment-history-item-record-2')).not.toBeInTheDocument()
    })

    it('ignora diferença de maiúsculas', async () => {
      mockService.listByPatient.mockResolvedValue(doisRegistros() as any)
      render()

      await screen.findByTestId('appointment-history-list')
      await userEvent.type(screen.getByTestId('appointment-history-search'), 'PRURIDO')

      expect(screen.getByTestId('appointment-history-item-record-2')).toBeInTheDocument()
    })

    it('avisa quando nada casa', async () => {
      mockService.listByPatient.mockResolvedValue(doisRegistros() as any)
      render()

      await screen.findByTestId('appointment-history-list')
      await userEvent.type(screen.getByTestId('appointment-history-search'), 'inexistente')

      expect(screen.getByTestId('appointment-history-no-results')).toBeInTheDocument()
    })

    // A busca é local: sem este aviso ela pareceria varrer tudo quando varre
    // só o que foi carregado.
    it('avisa que a busca não alcança além do que foi carregado', async () => {
      mockService.listByPatient.mockResolvedValue(makePage([makeDto()], 120) as any)
      render()

      expect(await screen.findByTestId('appointment-history-truncated')).toHaveTextContent('de 120')
    })

    it('não avisa quando tudo coube', async () => {
      mockService.listByPatient.mockResolvedValue(makePage([makeDto()]) as any)
      render()

      await screen.findByTestId('appointment-history-list')
      expect(screen.queryByTestId('appointment-history-truncated')).not.toBeInTheDocument()
    })
  })

  it('mostra rótulo de opção em vez do valor cru', async () => {
    mockService.listByPatient.mockResolvedValue(
      makePage([
        makeDto({
          templateSchemaSnapshot: [
            campo('tipo_parto', 'Tipo de parto', {
              type: 'select',
              options: [
                { value: 'cesarea', label: 'Cesárea' },
                { value: 'normal', label: 'Normal' },
              ],
            }),
          ],
          data: { tipo_parto: 'cesarea' },
        }),
      ]) as any,
    )
    render()

    await userEvent.click(await screen.findByTestId('appointment-history-toggle-record-1'))
    expect(screen.getByTestId('appointment-history-detail-record-1')).toHaveTextContent('Cesárea')
  })

  it('mostra travessão para campo não preenchido', async () => {
    mockService.listByPatient.mockResolvedValue(
      makePage([makeDto({ data: { queixa: '', conduta: null } })]) as any,
    )
    render()

    await userEvent.click(await screen.findByTestId('appointment-history-toggle-record-1'))
    expect(screen.getByTestId('appointment-history-detail-record-1')).toHaveTextContent('—')
  })

  // Consulta excluída deixa o prontuário sem data. Esconder o registro seria
  // pior que exibi-lo sem ela.
  it('exibe o registro mesmo sem data do atendimento', async () => {
    mockService.listByPatient.mockResolvedValue(
      makePage([makeDto({ appointmentDate: null, appointmentStartTime: null })]) as any,
    )
    render()

    expect(await screen.findByTestId('appointment-history-item-record-1')).toHaveTextContent(
      'Data não disponível',
    )
  })
})
