import { AppointmentCancellationScope, AppointmentStatus, PatientGender } from '@app/shared'
import {
  cancelAppointmentUseCase,
  completeAppointmentUseCase,
  getAppointmentUseCase,
  getMedicalRecordByAppointmentUseCase,
  listPatientMedicalHistoryUseCase,
  listTemplatesUseCase,
} from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { AppointmentDetailScreen } from './appointment-detail.screen'
import { addDays, todayIsoDate } from '../utils/agenda-date.util'

jest.mock('@app/core/src/features/appointments/use-cases/get-appointment.use-case')
jest.mock('@app/core/src/features/appointments/use-cases/cancel-appointment.use-case')
jest.mock('@app/core/src/features/appointments/use-cases/complete-appointment.use-case')
jest.mock('@app/core/src/features/medical-records/use-cases/get-medical-record-by-appointment.use-case')
jest.mock('@app/core/src/features/medical-records/use-cases/list-patient-medical-history.use-case')
jest.mock('@app/core/src/features/medical-record-templates/use-cases/list-templates.use-case')

const mockBack = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack }),
  useLocalSearchParams: () => ({ id: 'appt-1' }),
}))

const mockGet = getAppointmentUseCase as jest.MockedFunction<typeof getAppointmentUseCase>
const mockCancel = cancelAppointmentUseCase as jest.MockedFunction<typeof cancelAppointmentUseCase>
const mockComplete = completeAppointmentUseCase as jest.MockedFunction<typeof completeAppointmentUseCase>
const mockRecord = getMedicalRecordByAppointmentUseCase as jest.MockedFunction<
  typeof getMedicalRecordByAppointmentUseCase
>
const mockHistory = listPatientMedicalHistoryUseCase as jest.MockedFunction<
  typeof listPatientMedicalHistoryUseCase
>
const mockTemplates = listTemplatesUseCase as jest.MockedFunction<typeof listTemplatesUseCase>

const detail = (overrides = {}) =>
  ({
    id: 'appt-1',
    professionalId: 'doc-1',
    professionalName: 'Dra. Ana',
    patientId: 'pat-1',
    patientName: 'Maria Silva',
    specialtyId: 'spec-1',
    specialtyName: 'Ginecologia',
    scheduleId: 'sch-1',
    date: todayIsoDate(),
    startTime: '09:00',
    endTime: '09:30',
    status: AppointmentStatus.SCHEDULED,
    reason: null,
    cancellationReason: null,
    seriesId: null,
    seriesSequence: null,
    seriesTotalOccurrences: null,
    seriesFutureCount: null,
    isFirstVisitWithProfessional: false,
    label: null,
    patient: {
      fullName: 'Maria Silva',
      email: 'maria@exemplo.test',
      phoneNumber: '(81) 99999-0000',
      birthDate: new Date(1990, 4, 20),
      documentNumber: '902.741.017-41',
      gender: PatientGender.FEMALE,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as never

const emptyPage = { data: [], total: 0, page: 1, limit: 20 } as never

describe('AppointmentDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGet.mockResolvedValue(detail())
    mockRecord.mockResolvedValue(null)
    mockTemplates.mockResolvedValue(emptyPage)
    mockHistory.mockResolvedValue(emptyPage)
  })

  it('mostra o giro enquanto carrega', async () => {
    mockGet.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(<AppointmentDetailScreen />)

    expect(screen.getByTestId('appointment-loading')).toBeTruthy()
  })

  it('oferece tentar de novo quando falha', async () => {
    mockGet.mockRejectedValue(new Error('rede'))

    await renderWithProviders(<AppointmentDetailScreen />)
    expect(await screen.findByTestId('appointment-error')).toBeTruthy()

    mockGet.mockResolvedValue(detail())
    fireEvent.press(screen.getByTestId('appointment-error-retry'))

    expect(await screen.findByTestId('appointment-header-card')).toBeTruthy()
  })

  describe('o cartão do topo', () => {
    it('põe a paciente em primeiro plano', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)

      await screen.findByTestId('appointment-header-card')
      expect(screen.getByTestId('header-patient-name')).toHaveTextContent('Maria Silva')
      // Sexo • idade • especialidade, na mesma linha, como na web.
      expect(screen.getByTestId('header-patient-summary')).toHaveTextContent(
        'Feminino • 36 anos • Ginecologia',
      )
      // As iniciais no avatar, como no da sidebar.
      expect(screen.getByText('MS')).toBeTruthy()
      expect(screen.getByTestId('appointment-status')).toHaveTextContent('Agendada')
    })

    /**
     * Os dados do atendimento vêm recolhidos.
     *
     * Quem abre esta tela já sabe que consulta é; o que quer ver primeiro é
     * quem está na frente dele. No desktop os quatro campos cabem na faixa e
     * ficam sempre à mostra — em celular, não.
     */
    it('esconde profissional, data e horário até alguém pedir', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)
      await screen.findByTestId('appointment-header-card')

      expect(screen.queryByTestId('appointment-details')).toBeNull()

      fireEvent.press(screen.getByTestId('appointment-details-toggle'))

      await screen.findByTestId('appointment-details')
      expect(screen.getByTestId('detail-professional')).toHaveTextContent('Dra. Ana')
      expect(screen.getByTestId('detail-specialty')).toHaveTextContent('Ginecologia')
      expect(screen.getByTestId('detail-time')).toHaveTextContent('09:00 — 09:30')
    })

    it('recolhe de novo ao segundo toque', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-details-toggle'))
      await screen.findByTestId('appointment-details')

      fireEvent.press(screen.getByTestId('appointment-details-toggle'))

      await waitFor(() => expect(screen.queryByTestId('appointment-details')).toBeNull())
    })

    it('mostra o selo de primeira vez só na primeira vez', async () => {
      mockGet.mockResolvedValue(detail({ isFirstVisitWithProfessional: true }))

      await renderWithProviders(<AppointmentDetailScreen />)

      expect(await screen.findByTestId('first-visit-badge')).toHaveTextContent('Primeira vez')
    })

    it('sem especialidade, a linha da paciente não fica com separador solto', async () => {
      mockGet.mockResolvedValue(detail({ specialtyName: null, specialtyId: null }))

      await renderWithProviders(<AppointmentDetailScreen />)

      await screen.findByTestId('appointment-header-card')
      expect(screen.getByTestId('header-patient-summary')).toHaveTextContent('Feminino • 36 anos')
    })

    it('volta ao ser tocado', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-back'))

      expect(mockBack).toHaveBeenCalled()
    })
  })

  describe('as abas', () => {
    it('abre no Resumo', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)

      expect(await screen.findByTestId('resumo-tab')).toBeTruthy()
    })

    it('mostra as oito abas da web', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)
      await screen.findByTestId('appointment-tabs')

      const ids = ['resumo', 'prontuario', 'historico', 'receitas', 'atestados', 'exames', 'fotos', 'vacinas']
      ids.forEach((id) => expect(screen.getByTestId(`appointment-tab-${id}`)).toBeTruthy())
    })

    // A fileira é o índice do atendimento: uma versão com três faria parecer
    // que o app tem menos a oferecer do que o sistema tem.
    it('apaga as abas ainda não portadas, sem escondê-las', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)
      await screen.findByTestId('appointment-tabs')

      expect(screen.getByTestId('appointment-tab-receitas')).toHaveStyle({ opacity: 0.4 })
      expect(screen.getByTestId('appointment-tab-resumo')).toHaveStyle({ opacity: 1 })

      fireEvent.press(screen.getByTestId('appointment-tab-receitas'))
      expect(screen.getByTestId('resumo-tab')).toBeTruthy()
    })

    it('troca para o prontuário', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-tab-prontuario'))

      expect(await screen.findByTestId('medical-record-empty')).toBeTruthy()
    })

    it('troca para o histórico', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-tab-historico'))

      expect(await screen.findByTestId('appointment-history-section')).toBeTruthy()
    })
  })

  describe('a aba Resumo', () => {
    it('mostra os dados da paciente em coluna única', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)
      await screen.findByTestId('resumo-tab')

      expect(screen.getByTestId('patient-email')).toHaveTextContent('maria@exemplo.test')
      expect(screen.getByTestId('patient-phone')).toHaveTextContent('(81) 99999-0000')
      expect(screen.getByTestId('patient-document')).toHaveTextContent('902.741.017-41')
      expect(screen.getByTestId('patient-gender')).toHaveTextContent('Feminino')
      expect(screen.getByTestId('patient-birth-date')).toHaveTextContent('20/05/1990 (36 anos)')
    })

    // Dependente de outro paciente não tem CPF obrigatório — recém-nascido e
    // menor sem documento emitido ainda.
    it('aceita paciente sem CPF', async () => {
      mockGet.mockResolvedValue(
        detail({ patient: { ...(detail() as never as { patient: object }).patient, documentNumber: null } }),
      )

      await renderWithProviders(<AppointmentDetailScreen />)

      expect(await screen.findByTestId('patient-document')).toHaveTextContent('—')
    })

    it('lista os documentos da consulta', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)
      await screen.findByTestId('resumo-tab')

      expect(screen.getByTestId('resumo-document-receitas')).toBeTruthy()
      expect(screen.getByTestId('resumo-document-fotos')).toBeTruthy()
    })
  })

  describe('a aba Histórico', () => {
    // Um nutricionista não lê o prontuário de ginecologia: o recorte por
    // especialidade é do servidor, e o cliente tem de pedi-lo certo.
    it('pede o histórico da mesma especialidade, sem a consulta atual', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-tab-historico'))

      await waitFor(() =>
        expect(mockHistory).toHaveBeenCalledWith('pat-1', {
          specialtyId: 'spec-1',
          excludeAppointmentId: 'appt-1',
          limit: 20,
        }),
      )
    })

    // `'null'` pede exatamente os sem especialidade; omitir significaria
    // "todas", que é outra coisa.
    it('pede os sem especialidade quando a consulta não tem', async () => {
      mockGet.mockResolvedValue(detail({ specialtyId: null, specialtyName: null }))

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-tab-historico'))

      await waitFor(() =>
        expect(mockHistory).toHaveBeenCalledWith('pat-1', expect.objectContaining({ specialtyId: 'null' })),
      )
    })

    it('diz quando não há atendimento anterior', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-tab-historico'))

      expect(await screen.findByTestId('appointment-history-empty')).toBeTruthy()
    })

    it('lista os atendimentos anteriores', async () => {
      mockHistory.mockResolvedValue({
        data: [
          {
            id: 'rec-1',
            appointmentDate: '2026-02-10',
            appointmentStartTime: '14:00',
            professionalName: 'Dra. Ana',
            specialtyName: 'Ginecologia',
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      } as never)

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-tab-historico'))

      await screen.findByTestId('appointment-history-item-rec-1')
      expect(screen.getByText('10/02/2026 às 14:00')).toBeTruthy()
      expect(screen.getByText('Dra. Ana • Ginecologia')).toBeTruthy()
    })

    it('oferece tentar de novo quando o histórico falha', async () => {
      mockHistory.mockRejectedValue(new Error('rede'))

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-tab-historico'))

      expect(await screen.findByTestId('appointment-history-error')).toBeTruthy()
    })
  })

  describe('a faixa de ações', () => {
    it('conclui a consulta', async () => {
      mockComplete.mockResolvedValue(detail())

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('action-complete'))

      await waitFor(() => expect(mockComplete).toHaveBeenCalledWith('appt-1'))
    })

    it('esconde concluir para consulta futura', async () => {
      mockGet.mockResolvedValue(detail({ date: addDays(todayIsoDate(), 1) }))

      await renderWithProviders(<AppointmentDetailScreen />)
      await screen.findByTestId('appointment-actions')

      expect(screen.queryByTestId('action-complete')).toBeNull()
    })

    it.each([AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED])(
      'esconde a faixa inteira quando a consulta está %s',
      async (status) => {
        mockGet.mockResolvedValue(detail({ status }))

        await renderWithProviders(<AppointmentDetailScreen />)
        await screen.findByTestId('appointment-header-card')

        expect(screen.queryByTestId('appointment-actions')).toBeNull()
      },
    )

    // Cancelar é irreversível e um toque acidental é barato num celular: o
    // motivo entra antes, no mesmo gesto que confirma.
    it('pede o motivo antes de cancelar', async () => {
      mockCancel.mockResolvedValue(detail())

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('action-cancel'))

      const reason = await screen.findByTestId('cancel-reason')
      fireEvent.changeText(reason, 'Paciente avisou que não vem')
      await waitFor(() =>
        expect(screen.getByTestId('cancel-reason').props.value).toBe('Paciente avisou que não vem'),
      )

      fireEvent.press(screen.getByTestId('confirm-cancel'))

      await waitFor(() =>
        expect(mockCancel).toHaveBeenCalledWith('appt-1', {
          cancellationReason: 'Paciente avisou que não vem',
          scope: AppointmentCancellationScope.SINGLE_OCCURRENCE,
        }),
      )
    })

    it('desiste de cancelar', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('action-cancel'))
      fireEvent.press(await screen.findByTestId('abort-cancel'))

      await waitFor(() => expect(screen.queryByTestId('cancel-card')).toBeNull())
      expect(mockCancel).not.toHaveBeenCalled()
    })

    it('avisa que trocar o profissional ainda não está no app', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('action-reassign'))

      expect(await screen.findByTestId('reassign-unavailable')).toBeTruthy()
    })

    it('diz algo quando a ação falha', async () => {
      mockComplete.mockRejectedValue({ status: 422, title: 'x', detail: 'y' })

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('action-complete'))

      expect(await screen.findByTestId('action-error')).toBeTruthy()
    })
  })

  // Enquanto a requisição está em voo, um segundo toque criaria uma segunda
  // chamada — e num celular o toque duplo é acidente comum.
  it('apaga e trava as ações enquanto a requisição está em voo', async () => {
    mockComplete.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(<AppointmentDetailScreen />)
    fireEvent.press(await screen.findByTestId('action-complete'))

    await waitFor(() => expect(screen.getByTestId('action-complete')).toHaveStyle({ opacity: 0.5 }))

    fireEvent.press(screen.getByTestId('action-complete'))
    expect(mockComplete).toHaveBeenCalledTimes(1)
  })

  it('trava o cancelar enquanto cancela', async () => {
    mockCancel.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(<AppointmentDetailScreen />)
    fireEvent.press(await screen.findByTestId('action-cancel'))
    fireEvent.press(await screen.findByTestId('confirm-cancel'))

    await waitFor(() => expect(screen.getByTestId('action-cancel')).toHaveStyle({ opacity: 0.5 }))
  })

  // Consulta de clínico geral não tem especialidade; o campo recolhido
  // precisa dizer isso em vez de ficar vazio.
  it('escreve um traço na especialidade quando não há', async () => {
    mockGet.mockResolvedValue(detail({ specialtyId: null, specialtyName: null }))

    await renderWithProviders(<AppointmentDetailScreen />)
    fireEvent.press(await screen.findByTestId('appointment-details-toggle'))

    expect(await screen.findByTestId('detail-specialty')).toHaveTextContent('—')
  })

  it('mostra o giro do histórico enquanto ele carrega', async () => {
    mockHistory.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(<AppointmentDetailScreen />)
    fireEvent.press(await screen.findByTestId('appointment-tab-historico'))

    expect(await screen.findByTestId('appointment-history-loading')).toBeTruthy()
  })

  it('o histórico tenta de novo ao ser pedido', async () => {
    mockHistory.mockRejectedValue(new Error('rede'))

    await renderWithProviders(<AppointmentDetailScreen />)
    fireEvent.press(await screen.findByTestId('appointment-tab-historico'))
    await screen.findByTestId('appointment-history-error')

    mockHistory.mockResolvedValue(emptyPage)
    fireEvent.press(screen.getByTestId('appointment-history-error-retry'))

    expect(await screen.findByTestId('appointment-history-empty')).toBeTruthy()
  })

  // Atendimento registrado sem especialidade não vira " • " solto na linha.
  it('o item do histórico sem especialidade mostra só o profissional', async () => {
    mockHistory.mockResolvedValue({
      data: [
        {
          id: 'rec-2',
          appointmentDate: '2026-02-10',
          appointmentStartTime: '14:00',
          professionalName: 'Dra. Ana',
          specialtyName: null,
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    } as never)

    await renderWithProviders(<AppointmentDetailScreen />)
    fireEvent.press(await screen.findByTestId('appointment-tab-historico'))

    await screen.findByTestId('appointment-history-item-rec-2')
    expect(screen.getByText('Dra. Ana')).toBeTruthy()
  })
})
