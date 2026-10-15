import {
  AppointmentCancellationScope,
  AppointmentLabelColor,
  AppointmentStatus,
  DayOfWeek,
  PatientGender,
  RecurrenceInterval,
  UserRole,
} from '@app/shared'
import {
  cancelAppointmentUseCase,
  getMyProfessionalUseCase,
  getAppointmentSeriesUseCase,
  getReassignCandidatesUseCase,
  listAppointmentPhotosUseCase,
  listVaccinationsUseCase,
  listVaccineIndicationsUseCase,
  listVaccinesUseCase,
  listAppointmentLabelsUseCase,
  setAppointmentLabelUseCase,
  listAtestadosUseCase,
  listExamRequestsUseCase,
  listPrescriptionsUseCase,
  completeAppointmentUseCase,
  getAppointmentUseCase,
  getMedicalRecordByAppointmentUseCase,
  listPatientMedicalHistoryUseCase,
  listTemplatesUseCase,
} from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import type { IAppointmentDetailModel } from '@app/core'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useSessionStore } from '../../auth/session.store'
import { useThemeStore } from '../../../theme/theme.store'
import { AppointmentDetailScreen } from './appointment-detail.screen'
import { addDays, todayIsoDate } from '../utils/agenda-date.util'

jest.mock('@app/core/src/features/appointments/use-cases/get-appointment.use-case')
jest.mock('@app/core/src/features/appointments/use-cases/cancel-appointment.use-case')
jest.mock('@app/core/src/features/appointments/use-cases/complete-appointment.use-case')
jest.mock('@app/core/src/features/medical-records/use-cases/get-medical-record-by-appointment.use-case')
jest.mock('@app/core/src/features/medical-records/use-cases/list-patient-medical-history.use-case')
jest.mock('@app/core/src/features/medical-record-templates/use-cases/list-templates.use-case')
jest.mock('@app/core/src/features/prescriptions/use-cases/list-prescriptions.use-case')
jest.mock('@app/core/src/features/atestados/use-cases/list-atestados.use-case')
jest.mock('@app/core/src/features/exames/use-cases/list-exam-requests.use-case')
jest.mock('@app/core/src/features/professionals/use-cases/get-my-professional.use-case')
jest.mock('@app/core/src/features/appointments/use-cases/get-reassign-candidates.use-case')
jest.mock('@app/core/src/features/appointment-labels/use-cases/list-appointment-labels.use-case')
jest.mock('@app/core/src/features/appointments/use-cases/set-appointment-label.use-case')
jest.mock('@app/core/src/features/appointments/use-cases/get-appointment-series.use-case')
jest.mock('@app/core/src/features/consultation-photos/use-cases/list-appointment-photos.use-case')
jest.mock('@app/core/src/features/vaccine-indications/use-cases/list-vaccine-indications.use-case')
jest.mock('@app/core/src/features/vaccinations/use-cases/list-vaccinations.use-case')
jest.mock('@app/core/src/features/vaccines/use-cases/list-vaccines.use-case')

const mockBack = jest.fn()
const mockPush = jest.fn()
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
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

const detail = (overrides: Record<string, unknown> = {}) =>
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
  }) as unknown as IAppointmentDetailModel

/** Página vazia genérica — cada consulta a recebe com o seu próprio tipo. */
const emptyPage = { data: [], total: 0, page: 1, limit: 20 }
const anyPage = emptyPage as never

function asRole(role: UserRole) {
  useSessionStore.setState({
    status: 'authenticated',
    user: { id: 'u1', fullName: 'Dra. Ana', email: 'ana@pulso.test', role, clinicId: 'c1' } as never,
  })
}

describe('AppointmentDetailScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    asRole(UserRole.ADMIN)
    mockGet.mockResolvedValue(detail())
    mockRecord.mockResolvedValue(null)
    mockTemplates.mockResolvedValue(anyPage)
    mockHistory.mockResolvedValue(anyPage)
    ;(listPrescriptionsUseCase as jest.Mock).mockResolvedValue([])
    ;(listAtestadosUseCase as jest.Mock).mockResolvedValue([])
    ;(listExamRequestsUseCase as jest.Mock).mockResolvedValue([])
    // Sem ficha: é o ADMIN que administra sem atender. Os testes que precisam
    // da permissão de emitir a concedem explicitamente.
    ;(getMyProfessionalUseCase as jest.Mock).mockResolvedValue(null)
    ;(listAppointmentPhotosUseCase as jest.Mock).mockResolvedValue([])
    ;(listVaccineIndicationsUseCase as jest.Mock).mockResolvedValue([])
    ;(listVaccinationsUseCase as jest.Mock).mockResolvedValue(emptyPage)
    ;(listVaccinesUseCase as jest.Mock).mockResolvedValue(emptyPage)
    ;(getReassignCandidatesUseCase as jest.Mock).mockResolvedValue([])
    ;(listAppointmentLabelsUseCase as jest.Mock).mockResolvedValue(emptyPage)
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
          limit: 50,
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
        limit: 50,
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
    // Concluir não se desfaz, e o botão fica a um toque na faixa inferior —
    // a web pede confirmação, e aqui o motivo é mais forte ainda.
    it('pede confirmação antes de concluir', async () => {
      mockComplete.mockResolvedValue(detail())

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('action-complete'))

      expect(await screen.findByTestId('complete-card')).toBeTruthy()
      expect(mockComplete).not.toHaveBeenCalled()

      fireEvent.press(screen.getByTestId('confirm-complete'))

      await waitFor(() => expect(mockComplete).toHaveBeenCalledWith('appt-1'))
    })

    it('voltar da confirmação não conclui', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('action-complete'))
      fireEvent.press(await screen.findByTestId('abort-complete'))

      await waitFor(() => expect(screen.queryByTestId('complete-card')).toBeNull())
      expect(mockComplete).not.toHaveBeenCalled()
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

    it('abre a folha de trocar profissional', async () => {
      ;(getReassignCandidatesUseCase as jest.Mock).mockResolvedValue([
        { professionalId: 'doc-2', professionalName: 'Dr. Bruno', specialtyName: 'Ginecologia' },
      ])

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('action-reassign'))

      expect(await screen.findByTestId('reassign-sheet')).toBeTruthy()
    })

    /**
     * A série tem um profissional só — a checagem de posse ao cancelar "esta
     * e as futuras" depende disso —, então o backend recusa trocar uma
     * ocorrência com 422. Oferecer o botão daria erro garantido.
     */
    it('não oferece trocar numa ocorrência de série', async () => {
      mockGet.mockResolvedValue(
        detail({ seriesId: 'ser-1', seriesSequence: 2, seriesTotalOccurrences: 8 }),
      )

      await renderWithProviders(<AppointmentDetailScreen />)
      await screen.findByTestId('appointment-actions')

      expect(screen.queryByTestId('action-reassign')).toBeNull()
    })

    // Trocar é do ADMIN: o profissional não remaneja o colega.
    it('não oferece trocar ao profissional', async () => {
      asRole(UserRole.PROFESSIONAL)
      ;(getMyProfessionalUseCase as jest.Mock).mockResolvedValue({ id: 'doc-1' })

      await renderWithProviders(<AppointmentDetailScreen />)
      await screen.findByTestId('appointment-actions')

      expect(screen.queryByTestId('action-reassign')).toBeNull()
    })

    it('diz algo quando a ação falha', async () => {
      mockComplete.mockRejectedValue({ status: 422, title: 'x', detail: 'y' })

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('action-complete'))
      fireEvent.press(await screen.findByTestId('confirm-complete'))

      expect(await screen.findByTestId('action-error')).toBeTruthy()
    })
  })

  // Enquanto a requisição está em voo, um segundo toque criaria uma segunda
  // chamada — e num celular o toque duplo é acidente comum.
  it('apaga e trava as ações enquanto a requisição está em voo', async () => {
    mockComplete.mockReturnValue(new Promise(() => {}))

    await renderWithProviders(<AppointmentDetailScreen />)
    fireEvent.press(await screen.findByTestId('action-complete'))
    fireEvent.press(await screen.findByTestId('confirm-complete'))

    await waitFor(() => expect(screen.getByTestId('action-complete')).toHaveStyle({ opacity: 0.5 }))

    fireEvent.press(screen.getByTestId('confirm-complete'))
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

    mockHistory.mockResolvedValue(anyPage)
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

  // As três abas de documento são o mesmo componente a menos de um nome; o
  // que este teste prova é que a tela liga cada uma ao tipo certo.
  it.each([
    ['receitas', 'receita'],
    ['atestados', 'atestado'],
    ['exames', 'exame'],
  ])('a aba %s abre a seção de %s', async (tabId, kind) => {
    await renderWithProviders(<AppointmentDetailScreen />)
    fireEvent.press(await screen.findByTestId(`appointment-tab-${tabId}`))

    expect(await screen.findByTestId(`document-section-${kind}`)).toBeTruthy()
  })

  it.each([
    ['fotos', 'photo-section'],
    ['vacinas', 'vaccine-section'],
  ])('a aba %s abre a sua seção', async (tabId, sectionTestId) => {
    await renderWithProviders(<AppointmentDetailScreen />)
    fireEvent.press(await screen.findByTestId(`appointment-tab-${tabId}`))

    expect(await screen.findByTestId(sectionTestId)).toBeTruthy()
  })

  /**
   * O recorte de papel desta tela, e é o mesmo da web: a recepção lê a
   * agenda e o resumo, e nada mais. Antes o app lhe oferecia o prontuário e
   * os botões de cancelar, e entregava `403` no lugar de ausência.
   */
  describe('o recorte por papel', () => {
    it('a recepção só tem o Resumo, e nenhuma ação', async () => {
      asRole(UserRole.USER)

      await renderWithProviders(<AppointmentDetailScreen />)
      await screen.findByTestId('appointment-tabs')

      expect(screen.getByTestId('appointment-tab-resumo')).toBeTruthy()
      ;['prontuario', 'historico', 'receitas', 'atestados', 'exames', 'fotos', 'vacinas'].forEach(
        (id) => expect(screen.queryByTestId(`appointment-tab-${id}`)).toBeNull(),
      )
      expect(screen.queryByTestId('appointment-actions')).toBeNull()
    })

    // Posse, não cargo: o profissional responde pela consulta dele.
    it('o profissional não gerencia a consulta de outro', async () => {
      asRole(UserRole.PROFESSIONAL)
      ;(getMyProfessionalUseCase as jest.Mock).mockResolvedValue({ id: 'doc-outro' })

      await renderWithProviders(<AppointmentDetailScreen />)
      await screen.findByTestId('appointment-tabs')

      await waitFor(() =>
        expect(screen.queryByTestId('appointment-tab-prontuario')).toBeNull(),
      )
      expect(screen.queryByTestId('appointment-actions')).toBeNull()
    })

    it('o profissional dono gerencia a própria', async () => {
      asRole(UserRole.PROFESSIONAL)
      ;(getMyProfessionalUseCase as jest.Mock).mockResolvedValue({ id: 'doc-1' })

      await renderWithProviders(<AppointmentDetailScreen />)

      expect(await screen.findByTestId('appointment-tab-prontuario')).toBeTruthy()
      expect(screen.getByTestId('appointment-actions')).toBeTruthy()
    })

    // A aba aberta pode deixar de existir enquanto a consulta carrega: o
    // recorte encolhe a fileira depois do primeiro render.
    it('volta ao Resumo quando a aba aberta some', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-tab-receitas'))
      await screen.findByTestId('document-section-receita')

      asRole(UserRole.USER)
      mockGet.mockResolvedValue(detail({ reason: 'remonta' }))
      fireEvent.press(screen.getByTestId('appointment-back'))

      await waitFor(() => expect(mockBack).toHaveBeenCalled())
    })
  })

  describe('a contagem nas abas', () => {
    it('conta o que cada aba tem', async () => {
      ;(listPrescriptionsUseCase as jest.Mock).mockResolvedValue([{ id: 'p1' }, { id: 'p2' }])
      ;(listAppointmentPhotosUseCase as jest.Mock).mockResolvedValue([{ id: 'ph1' }])
      ;(listVaccineIndicationsUseCase as jest.Mock).mockResolvedValue([{ id: 'i1' }])
      ;(listVaccinationsUseCase as jest.Mock).mockResolvedValue({ ...emptyPage, total: 2 })

      await renderWithProviders(<AppointmentDetailScreen />)

      expect(await screen.findByTestId('appointment-tab-receitas-count')).toHaveTextContent('2')
      expect(screen.getByTestId('appointment-tab-fotos-count')).toHaveTextContent('1')
      // A caderneta é do paciente, mas a contagem é desta consulta: doses
      // registradas mais indicações emitidas.
      expect(screen.getByTestId('appointment-tab-vacinas-count')).toHaveTextContent('3')
    })

    it('Resumo, Prontuário e Histórico não contam nada', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)
      await screen.findByTestId('appointment-tabs')

      expect(screen.queryByTestId('appointment-tab-resumo-count')).toBeNull()
      expect(screen.queryByTestId('appointment-tab-prontuario-count')).toBeNull()
      expect(screen.queryByTestId('appointment-tab-historico-count')).toBeNull()
    })
  })

  describe('o índice de documentos do Resumo', () => {
    it('mostra a contagem e leva à aba', async () => {
      ;(listAtestadosUseCase as jest.Mock).mockResolvedValue([
        { id: 'a1', issuedAt: new Date(2026, 3, 12), daysOff: 2 },
      ])

      await renderWithProviders(<AppointmentDetailScreen />)

      expect(await screen.findByTestId('resumo-document-atestados-count')).toHaveTextContent('1')

      fireEvent.press(screen.getByTestId('resumo-document-atestados'))

      expect(await screen.findByTestId('document-section-atestado')).toBeTruthy()
    })

    // Para a recepção não sobraria nenhuma linha — o cartão inteiro some.
    it('some inteiro para quem não tem as abas', async () => {
      asRole(UserRole.USER)

      await renderWithProviders(<AppointmentDetailScreen />)
      await screen.findByTestId('resumo-tab')

      expect(screen.queryByTestId('resumo-tab-documents')).toBeNull()
    })

    it('formata CPF e telefone', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)

      expect(await screen.findByTestId('patient-document')).toHaveTextContent('902.741.017-41')
      expect(screen.getByTestId('patient-phone')).toHaveTextContent('(81) 99999-0000')
    })

    it('paciente sem CPF mostra traço', async () => {
      mockGet.mockResolvedValue(
        detail({ patient: { ...detail().patient, documentNumber: null } }),
      )

      await renderWithProviders(<AppointmentDetailScreen />)

      expect(await screen.findByTestId('patient-document')).toHaveTextContent('—')
    })
  })

  describe('o rótulo da consulta', () => {
    it('marca o rótulo', async () => {
      ;(listAppointmentLabelsUseCase as jest.Mock).mockResolvedValue({
        ...emptyPage,
        data: [{ id: 'lbl-1', name: 'Retorno', color: AppointmentLabelColor.MUSTARD }],
      })
      ;(setAppointmentLabelUseCase as jest.Mock).mockResolvedValue({ id: 'appt-1' })

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-details-toggle'))
      fireEvent.press(await screen.findByTestId('detail-label-select'))
      fireEvent.press(await screen.findByTestId('detail-label-select-option-lbl-1'))

      await waitFor(() =>
        expect(setAppointmentLabelUseCase).toHaveBeenCalledWith('appt-1', 'lbl-1'),
      )
    })

    // "Sem rótulo" é a opção que desmarca, e manda `null` — string vazia o
    // backend não aceitaria como id.
    it('tira o rótulo', async () => {
      mockGet.mockResolvedValue(
        detail({ label: { id: 'lbl-1', name: 'Retorno', color: AppointmentLabelColor.MUSTARD } }),
      )
      ;(setAppointmentLabelUseCase as jest.Mock).mockResolvedValue({ id: 'appt-1' })

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-details-toggle'))
      expect(await screen.findByTestId('detail-label-swatch')).toBeTruthy()

      fireEvent.press(screen.getByTestId('detail-label-select'))
      fireEvent.press(await screen.findByTestId('detail-label-select-option-all'))

      await waitFor(() => expect(setAppointmentLabelUseCase).toHaveBeenCalledWith('appt-1', null))
    })

    // Enquanto o catálogo não chega, o seletor existe com a única opção que
    // não depende dele — some-lo e trazê-lo de volta piscaria a linha.
    it('o seletor existe antes de o catálogo chegar', async () => {
      ;(listAppointmentLabelsUseCase as jest.Mock).mockReturnValue(new Promise(() => {}))

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-details-toggle'))
      fireEvent.press(await screen.findByTestId('detail-label-select'))

      expect(await screen.findByTestId('detail-label-select-option-all')).toHaveTextContent(
        'Sem rótulo',
      )
    })

    it('a amostra acompanha o tema escuro', async () => {
      useThemeStore.setState({ mode: 'dark' })
      mockGet.mockResolvedValue(
        detail({ label: { id: 'lbl-1', name: 'Retorno', color: AppointmentLabelColor.MUSTARD } }),
      )

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-details-toggle'))

      // #CBC076 é o mostarda do tema escuro.
      expect(await screen.findByTestId('detail-label-swatch')).toHaveStyle({
        backgroundColor: '#CBC076',
      })

      useThemeStore.setState({ mode: 'light' })
    })

    it('avisa quando salvar o rótulo falha', async () => {
      ;(listAppointmentLabelsUseCase as jest.Mock).mockResolvedValue({
        ...emptyPage,
        data: [{ id: 'lbl-1', name: 'Retorno', color: AppointmentLabelColor.MUSTARD }],
      })
      ;(setAppointmentLabelUseCase as jest.Mock).mockRejectedValue({ status: 403, title: 'x', detail: 'y' })

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-details-toggle'))
      fireEvent.press(await screen.findByTestId('detail-label-select'))
      fireEvent.press(await screen.findByTestId('detail-label-select-option-lbl-1'))

      expect(await screen.findByTestId('detail-label-error')).toBeTruthy()
    })

    // A recepção lê a agenda e precisa do rótulo para o filtro, mas marcar é
    // de quem atende.
    it('a recepção lê o rótulo, e não o troca', async () => {
      asRole(UserRole.USER)
      mockGet.mockResolvedValue(
        detail({ label: { id: 'lbl-1', name: 'Retorno', color: AppointmentLabelColor.MUSTARD } }),
      )

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-details-toggle'))

      expect(await screen.findByTestId('detail-label')).toHaveTextContent('Retorno')
      expect(screen.queryByTestId('detail-label-select')).toBeNull()
    })

    it('sem rótulo, a recepção lê um traço', async () => {
      asRole(UserRole.USER)

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-details-toggle'))

      expect(await screen.findByTestId('detail-label')).toHaveTextContent('—')
    })
  })

  describe('os detalhes do atendimento', () => {
    it('mostra motivo e motivo do cancelamento', async () => {
      mockGet.mockResolvedValue(
        detail({
          status: AppointmentStatus.CANCELLED,
          reason: 'Dor lombar',
          cancellationReason: 'Paciente remarcou',
        }),
      )

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-details-toggle'))

      expect(await screen.findByTestId('detail-reason')).toHaveTextContent('Dor lombar')
      expect(screen.getByTestId('detail-cancellation-reason')).toHaveTextContent(
        'Paciente remarcou',
      )
    })

    it('consulta sem motivo não deixa campo vazio', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-details-toggle'))

      await screen.findByTestId('detail-professional')
      expect(screen.queryByTestId('detail-reason')).toBeNull()
      expect(screen.queryByTestId('detail-cancellation-reason')).toBeNull()
      expect(screen.queryByTestId('detail-series')).toBeNull()
    })

    it('a série mostra a posição e abre a lista', async () => {
      mockGet.mockResolvedValue(
        detail({ seriesId: 'ser-1', seriesSequence: 2, seriesTotalOccurrences: 8 }),
      )
      ;(getAppointmentSeriesUseCase as jest.Mock).mockResolvedValue({
        id: 'ser-1',
        professionalName: 'Dra. Ana',
        patientName: 'Maria Silva',
        specialtyName: null,
        recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00:00',
        anchorDate: '2026-04-13',
        createdOccurrenceCount: 2,
        occurrences: [
          { id: 'appt-1', date: '2026-04-13', startTime: '09:00:00', status: AppointmentStatus.SCHEDULED },
          { id: 'appt-2', date: '2026-04-20', startTime: '09:00:00', status: AppointmentStatus.SCHEDULED },
        ],
      })

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-details-toggle'))

      expect(await screen.findByTestId('detail-series')).toHaveTextContent('2/8')

      fireEvent.press(screen.getByTestId('detail-view-series'))
      fireEvent.press(await screen.findByTestId('series-item-2026-04-20'))

      await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/(app)/appointments/appt-2'))
    })

    it('fecha a lista da série sem sair da consulta', async () => {
      mockGet.mockResolvedValue(
        detail({ seriesId: 'ser-1', seriesSequence: 2, seriesTotalOccurrences: 8 }),
      )
      ;(getAppointmentSeriesUseCase as jest.Mock).mockResolvedValue({
        id: 'ser-1',
        professionalName: 'Dra. Ana',
        patientName: 'Maria Silva',
        specialtyName: null,
        recurrenceInterval: RecurrenceInterval.EVERY_WEEK,
        dayOfWeek: DayOfWeek.MONDAY,
        startTime: '09:00:00',
        anchorDate: '2026-04-13',
        createdOccurrenceCount: 1,
        occurrences: [
          { id: 'appt-1', date: '2026-04-13', startTime: '09:00:00', status: AppointmentStatus.SCHEDULED },
        ],
      })

      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('appointment-details-toggle'))
      fireEvent.press(await screen.findByTestId('detail-view-series'))
      await screen.findByTestId('series-sheet')

      fireEvent.press(screen.getByTestId('series-sheet-close'))

      await waitFor(() => expect(screen.queryByTestId('series-sheet')).toBeNull())
      expect(mockPush).not.toHaveBeenCalled()
    })

    it('fecha a folha de trocar profissional sem trocar', async () => {
      await renderWithProviders(<AppointmentDetailScreen />)
      fireEvent.press(await screen.findByTestId('action-reassign'))
      await screen.findByTestId('reassign-sheet')

      fireEvent.press(screen.getByTestId('reassign-sheet-close'))

      await waitFor(() => expect(screen.queryByTestId('reassign-sheet')).toBeNull())
    })
  })
})
