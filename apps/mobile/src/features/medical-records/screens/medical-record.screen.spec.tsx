import { AppointmentStatus, MedicalRecordFieldType, PatientGender } from '@app/shared'
import {
  createMedicalRecordUseCase,
  getAppointmentUseCase,
  getMedicalRecordByAppointmentUseCase,
  listTemplatesUseCase,
  updateMedicalRecordUseCase,
} from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { MedicalRecordScreen } from './medical-record.screen'

jest.mock('@app/core/src/features/appointments/use-cases/get-appointment.use-case')
jest.mock('@app/core/src/features/medical-records/use-cases/get-medical-record-by-appointment.use-case')
jest.mock('@app/core/src/features/medical-records/use-cases/create-medical-record.use-case')
jest.mock('@app/core/src/features/medical-records/use-cases/update-medical-record.use-case')
jest.mock('@app/core/src/features/medical-record-templates/use-cases/list-templates.use-case')

jest.mock('expo-router', () => ({ useLocalSearchParams: () => ({ id: 'appt-1' }) }))

const mockAppointment = getAppointmentUseCase as jest.MockedFunction<typeof getAppointmentUseCase>
const mockRecord = getMedicalRecordByAppointmentUseCase as jest.MockedFunction<
  typeof getMedicalRecordByAppointmentUseCase
>
const mockTemplates = listTemplatesUseCase as jest.MockedFunction<typeof listTemplatesUseCase>
const mockCreate = createMedicalRecordUseCase as jest.MockedFunction<typeof createMedicalRecordUseCase>
const mockUpdate = updateMedicalRecordUseCase as jest.MockedFunction<typeof updateMedicalRecordUseCase>

const appointment = (overrides = {}) =>
  ({
    id: 'appt-1',
    professionalId: 'doc-1',
    professionalName: 'Dra. Ana',
    patientId: 'pat-1',
    patientName: 'Maria Silva',
    specialtyId: 'spec-1',
    specialtyName: 'Ginecologia',
    scheduleId: 'sch-1',
    date: '2026-03-10',
    startTime: '09:00:00',
    endTime: '09:30:00',
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
      documentNumber: null,
      gender: PatientGender.FEMALE,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as never

const templateField = (overrides = {}) => ({
  key: 'queixa',
  label: 'Queixa principal',
  type: MedicalRecordFieldType.TEXT,
  required: false,
  order: 1,
  options: null,
  placeholder: null,
  helpText: null,
  canonical: false,
  canonicalKey: null,
  sectionKey: null,
  ...overrides,
})

const template = (overrides = {}) => ({
  id: 'tpl-1',
  specialtyId: 'spec-1',
  specialtyName: 'Ginecologia',
  councilType: null,
  name: 'Primeira consulta',
  fields: [templateField({})],
  sections: [],
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const templatePage = (data: ReturnType<typeof template>[]) =>
  ({ data, total: data.length, page: 1, limit: 100 }) as never

const savedRecord = (overrides = {}) =>
  ({
    id: 'rec-1',
    appointmentId: 'appt-1',
    patientId: 'pat-1',
    patientName: 'Maria Silva',
    professionalId: 'doc-1',
    professionalName: 'Dra. Ana',
    specialtyId: 'spec-1',
    specialtyName: 'Ginecologia',
    appointmentDate: '2026-03-10',
    appointmentStartTime: '09:00:00',
    templateId: 'tpl-1',
    schema: [
      {
        key: 'queixa',
        label: 'Queixa principal',
        type: MedicalRecordFieldType.TEXT,
        required: false,
        order: 1,
        options: null,
        placeholder: null,
        helpText: null,
        sectionKey: null,
      },
    ],
    data: { queixa: 'Dor de cabeça' },
    notes: 'Retorno em 30 dias',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as never

describe('MedicalRecordScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAppointment.mockResolvedValue(appointment())
  })

  it('shows the spinner while anything is still loading', async () => {
    mockRecord.mockReturnValue(new Promise(() => {}))
    mockTemplates.mockResolvedValue(templatePage([template()]))

    await renderWithProviders(<MedicalRecordScreen />)

    expect(screen.getByTestId('medical-record-loading')).toBeTruthy()
  })

  it('offers to try again when loading fails', async () => {
    mockRecord.mockRejectedValue(new Error('rede'))
    mockTemplates.mockResolvedValue(templatePage([template()]))

    await renderWithProviders(<MedicalRecordScreen />)
    expect(await screen.findByTestId('medical-record-error')).toBeTruthy()

    mockRecord.mockResolvedValue(null)
    fireEvent.press(screen.getByTestId('medical-record-error-retry'))

    expect(await screen.findByTestId('template-picker')).toBeTruthy()
  })

  // Profissional sem ficha não tem escopo, e sem escopo não há modelo. Uma
  // lista vazia se leria como falha de carregamento.
  it('says there is no template instead of showing an empty picker', async () => {
    mockRecord.mockResolvedValue(null)
    mockTemplates.mockResolvedValue(templatePage([]))

    await renderWithProviders(<MedicalRecordScreen />)

    expect(await screen.findByTestId('medical-record-no-template')).toBeTruthy()
  })

  describe('prontuário novo', () => {
    beforeEach(() => {
      mockRecord.mockResolvedValue(null)
      mockTemplates.mockResolvedValue(
        templatePage([template(), template({ id: 'tpl-2', name: 'Retorno' })]),
      )
    })

    // A clínica pode ter vários modelos no mesmo escopo, e quem escolhe é
    // quem atende — o servidor não tem como adivinhar.
    it('asks which template before showing any field', async () => {
      await renderWithProviders(<MedicalRecordScreen />)

      expect(await screen.findByTestId('template-picker')).toBeTruthy()
      expect(screen.getByTestId('awaiting-template')).toBeTruthy()
      expect(screen.queryByTestId('field-queixa')).toBeNull()
    })

    it('only offers active templates', async () => {
      await renderWithProviders(<MedicalRecordScreen />)
      await screen.findByTestId('template-picker')

      expect(mockTemplates).toHaveBeenCalledWith({
        isActive: true,
        limit: 100,
        specialtyId: 'spec-1',
      })
    })

    it('renders the chosen template fields', async () => {
      await renderWithProviders(<MedicalRecordScreen />)
      fireEvent.press(await screen.findByTestId('template-choice-tpl-1'))

      expect(await screen.findByTestId('field-queixa')).toBeTruthy()
    })

    // As chaves são de outro schema: manter o digitado gravaria valor sob uma
    // chave que o novo modelo não tem.
    it('clears what was typed when the template changes', async () => {
      await renderWithProviders(<MedicalRecordScreen />)
      fireEvent.press(await screen.findByTestId('template-choice-tpl-1'))

      const field = await screen.findByTestId('field-queixa')
      fireEvent.changeText(field, 'Dor')
      await waitFor(() => expect(screen.getByTestId('field-queixa').props.value).toBe('Dor'))

      fireEvent.press(screen.getByTestId('template-choice-tpl-2'))

      await waitFor(() => expect(screen.getByTestId('field-queixa').props.value).toBe(''))
    })

    it('creates the record with the chosen template', async () => {
      mockCreate.mockResolvedValue(savedRecord())

      await renderWithProviders(<MedicalRecordScreen />)
      fireEvent.press(await screen.findByTestId('template-choice-tpl-1'))

      const field = await screen.findByTestId('field-queixa')
      fireEvent.changeText(field, 'Dor de cabeça')
      await waitFor(() =>
        expect(screen.getByTestId('field-queixa').props.value).toBe('Dor de cabeça'),
      )

      fireEvent.press(screen.getByTestId('save-medical-record'))

      await waitFor(() =>
        expect(mockCreate).toHaveBeenCalledWith({
          appointmentId: 'appt-1',
          templateId: 'tpl-1',
          data: { queixa: 'Dor de cabeça' },
        }),
      )
      expect(await screen.findByTestId('save-success')).toBeTruthy()
    })

    it('says something when saving fails', async () => {
      mockCreate.mockRejectedValue({ status: 500, title: 'x', detail: 'y' })

      await renderWithProviders(<MedicalRecordScreen />)
      fireEvent.press(await screen.findByTestId('template-choice-tpl-1'))
      fireEvent.press(await screen.findByTestId('save-medical-record'))

      expect(await screen.findByTestId('save-error')).toBeTruthy()
    })
  })

  describe('campos obrigatórios', () => {
    beforeEach(() => {
      mockRecord.mockResolvedValue(null)
      mockTemplates.mockResolvedValue(
        templatePage([template({ fields: [templateField({ required: true })] })]),
      )
    })

    it('refuses to save and points at the blank field', async () => {
      await renderWithProviders(<MedicalRecordScreen />)
      fireEvent.press(await screen.findByTestId('template-choice-tpl-1'))
      fireEvent.press(await screen.findByTestId('save-medical-record'))

      expect(await screen.findByTestId('missing-required')).toBeTruthy()
      expect(screen.getByTestId('field-queixa-error')).toHaveTextContent('Campo obrigatório')
      expect(mockCreate).not.toHaveBeenCalled()
    })
  })

  describe('prontuário existente', () => {
    beforeEach(() => {
      mockRecord.mockResolvedValue(savedRecord())
      mockTemplates.mockResolvedValue(templatePage([template()]))
    })

    // O schema fica congelado no registro; trocar o modelo descartaria o que
    // já foi escrito.
    it('does not offer the template picker again', async () => {
      await renderWithProviders(<MedicalRecordScreen />)
      await screen.findByTestId('field-queixa')

      expect(screen.queryByTestId('template-picker')).toBeNull()
    })

    it('brings back what was written', async () => {
      await renderWithProviders(<MedicalRecordScreen />)

      expect((await screen.findByTestId('field-queixa')).props.value).toBe('Dor de cabeça')
      expect(screen.getByTestId('record-notes').props.value).toBe('Retorno em 30 dias')
    })

    it('updates instead of creating', async () => {
      mockUpdate.mockResolvedValue(savedRecord())

      await renderWithProviders(<MedicalRecordScreen />)
      const field = await screen.findByTestId('field-queixa')
      fireEvent.changeText(field, 'Enxaqueca')
      await waitFor(() => expect(screen.getByTestId('field-queixa').props.value).toBe('Enxaqueca'))

      fireEvent.press(screen.getByTestId('save-medical-record'))

      await waitFor(() =>
        expect(mockUpdate).toHaveBeenCalledWith('rec-1', {
          data: { queixa: 'Enxaqueca' },
          notes: 'Retorno em 30 dias',
        }),
      )
      expect(mockCreate).not.toHaveBeenCalled()
    })
  })

  describe('seções do modelo', () => {
    it('groups the fields under their sections and keeps the loose ones apart', async () => {
      mockRecord.mockResolvedValue(null)
      mockTemplates.mockResolvedValue(
        templatePage([
          template({
            sections: [{ key: 'anamnese', title: 'Anamnese', order: 1 }],
            fields: [
              templateField({ key: 'queixa', sectionKey: 'anamnese' }),
              templateField({ key: 'solta', label: 'Observação solta', order: 2 }),
            ],
          }),
        ]),
      )

      await renderWithProviders(<MedicalRecordScreen />)
      fireEvent.press(await screen.findByTestId('template-choice-tpl-1'))

      expect(await screen.findByTestId('section-anamnese')).toBeTruthy()
      expect(screen.getByTestId('section-loose')).toBeTruthy()
    })

    it('skips a section with no fields', async () => {
      mockRecord.mockResolvedValue(null)
      mockTemplates.mockResolvedValue(
        templatePage([
          template({
            sections: [{ key: 'vazia', title: 'Vazia', order: 1 }],
            fields: [templateField({ key: 'queixa' })],
          }),
        ]),
      )

      await renderWithProviders(<MedicalRecordScreen />)
      fireEvent.press(await screen.findByTestId('template-choice-tpl-1'))
      await screen.findByTestId('section-loose')

      expect(screen.queryByTestId('section-vazia')).toBeNull()
    })
  })

  // Consulta sem especialidade cai no generalista da profissão.
  it('asks for the generalist templates when the appointment has no specialty', async () => {
    mockAppointment.mockResolvedValue(appointment({ specialtyId: null, specialtyName: null }))
    mockRecord.mockResolvedValue(null)
    mockTemplates.mockResolvedValue(templatePage([template()]))

    await renderWithProviders(<MedicalRecordScreen />)
    await screen.findByTestId('template-picker')

    expect(mockTemplates).toHaveBeenCalledWith({ isActive: true, limit: 100, generalist: true })
  })

  describe('campo do modelo sem chave própria', () => {
    beforeEach(() => mockRecord.mockResolvedValue(null))

    // O construtor de modelos só grava `key` em campo livre: o campo vindo do
    // catálogo canônico se identifica pelo `canonicalKey`.
    it('falls back to the canonical key', async () => {
      mockTemplates.mockResolvedValue(
        templatePage([
          template({
            fields: [templateField({ key: undefined, canonical: true, canonicalKey: 'pressao' })],
          }),
        ]),
      )

      await renderWithProviders(<MedicalRecordScreen />)
      fireEvent.press(await screen.findByTestId('template-choice-tpl-1'))

      expect(await screen.findByTestId('field-pressao')).toBeTruthy()
    })

    // Nem chave nem canônico é modelo mal montado — a posição ao menos mantém
    // os campos distintos entre si, em vez de colapsarem num só.
    it('falls back to the position when there is neither', async () => {
      mockTemplates.mockResolvedValue(
        templatePage([
          template({
            fields: [templateField({ key: undefined, canonicalKey: null })],
          }),
        ]),
      )

      await renderWithProviders(<MedicalRecordScreen />)
      fireEvent.press(await screen.findByTestId('template-choice-tpl-1'))

      expect(await screen.findByTestId('field-0')).toBeTruthy()
    })
  })

  it('shows no loose card when every field belongs to a section', async () => {
    mockRecord.mockResolvedValue(null)
    mockTemplates.mockResolvedValue(
      templatePage([
        template({
          sections: [{ key: 'anamnese', title: 'Anamnese', order: 1 }],
          fields: [templateField({ sectionKey: 'anamnese' })],
        }),
      ]),
    )

    await renderWithProviders(<MedicalRecordScreen />)
    fireEvent.press(await screen.findByTestId('template-choice-tpl-1'))
    await screen.findByTestId('section-anamnese')

    expect(screen.queryByTestId('section-loose')).toBeNull()
  })
})
