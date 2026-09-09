jest.mock('@/components/features/medical-records/services/medical-records.service')
jest.mock('@/components/features/medical-record-templates/services/medical-record-templates.service')
jest.mock('@/components/features/professionals/services/professionals.service')

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppointmentStatus, CouncilType, MedicalRecordFieldType } from '@app/shared'
import { medicalRecordsService } from '@/components/features/medical-records/services/medical-records.service'
import { medicalRecordTemplatesService } from '@/components/features/medical-record-templates/services/medical-record-templates.service'
import { professionalsService } from '@/components/features/professionals/services/professionals.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { MedicalRecordSection, TEMPLATE_PICKER_LIMIT } from './medical-record-section'

const mockMedicalRecordsService = medicalRecordsService as jest.Mocked<typeof medicalRecordsService>
const mockTemplatesService = medicalRecordTemplatesService as jest.Mocked<typeof medicalRecordTemplatesService>
const mockProfessionalsService = professionalsService as jest.Mocked<typeof professionalsService>

const makeProfessionalDto = (overrides: object = {}) => ({
  id: 'doctor-uuid',
  user: { id: 'user-uuid', fullName: 'Dr. Test', email: 'doctor@example.com', isActive: true },
  registrations: [{ id: 'reg-1', councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true }],
  specialties: [],
  bio: null,
  createdAt: new Date().toISOString() as unknown as Date,
  updatedAt: new Date().toISOString() as unknown as Date,
  ...overrides,
})

const makeTemplateDto = (overrides: object = {}) => ({
  id: 'tpl-uuid',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardiologia',
  councilType: null,
  name: 'Anamnese',
  sections: [],
  fields: [
    {
      key: 'complaint',
      label: 'Queixa',
      type: MedicalRecordFieldType.TEXT,
      required: false,
      order: 0,
      options: null,
      placeholder: null,
      helpText: null,
      canonical: false,
      canonicalKey: null,
      sectionKey: null,
    },
    {
      label: 'Notas extras',
      type: MedicalRecordFieldType.TEXTAREA,
      required: false,
      order: 1,
      options: null,
      placeholder: null,
      helpText: null,
      canonical: false,
      canonicalKey: null,
      sectionKey: null,
    },
  ],
  isActive: true,
  createdAt: new Date().toISOString() as unknown as Date,
  updatedAt: new Date().toISOString() as unknown as Date,
  ...overrides,
})

const makeRecordDto = (overrides: object = {}) => ({
  id: 'record-uuid',
  appointmentId: 'appt-uuid',
  patientId: 'patient-uuid',
  patientName: 'Patient One',
  professionalId: 'doctor-uuid',
  professionalName: 'Dr. Test',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardiologia',
  councilType: null,
  templateId: 'tpl-uuid',
  templateSchemaSnapshot: [
    {
      key: 'complaint',
      label: 'Queixa',
      type: MedicalRecordFieldType.TEXT,
      required: false,
      order: 0,
      options: null,
      placeholder: null,
      helpText: null,
      canonical: false,
      canonicalKey: null,
      sectionKey: null,
    },
  ],
  data: { complaint: 'Dor de cabeça' },
  notes: null,
  createdAt: new Date().toISOString() as unknown as Date,
  updatedAt: new Date().toISOString() as unknown as Date,
  ...overrides,
})

const defaultProps = {
  appointmentId: 'appt-uuid',
  specialtyId: 'spec-uuid',
  professionalId: 'doctor-uuid',
  appointmentStatus: AppointmentStatus.SCHEDULED,
  canManage: true,
}

/** Abre o modal e escolhe um modelo — o formulário só aparece depois disso. */
async function openForm(templateId = 'tpl-uuid') {
  await waitFor(() => expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument())
  await userEvent.click(screen.getByTestId('fill-medical-record-button'))
  await waitFor(() => expect(screen.getByTestId(`template-option-${templateId}`)).toBeInTheDocument())
  await userEvent.click(screen.getByTestId(`template-option-${templateId}`))
  await waitFor(() => expect(screen.getByTestId('medical-record-form')).toBeInTheDocument())
}

describe('MedicalRecordSection (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockMedicalRecordsService.getByAppointment.mockResolvedValue(null)
    // Um modelo por padrão: sem nenhum a tela nem oferece o botão, e a maioria
    // dos casos aqui quer chegar ao formulário.
    mockTemplatesService.getAll.mockResolvedValue({
      data: [makeTemplateDto() as any],
      total: 1,
      page: 1,
      limit: TEMPLATE_PICKER_LIMIT,
    })
    // Prontuário salvo busca o modelo pelo id gravado, só para as seções.
    mockTemplatesService.getById.mockResolvedValue(makeTemplateDto() as any)
    mockProfessionalsService.getById.mockResolvedValue(makeProfessionalDto() as any)
  })

  it('shows fill-medical-record button when canManage and no record exists', async () => {
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument()
    })
  })

  it('does not show fill button when canManage is false', async () => {
    renderWithProviders(<MedicalRecordSection {...defaultProps} canManage={false} />)
    await waitFor(() => {
      expect(screen.queryByTestId('fill-medical-record-button')).not.toBeInTheDocument()
    })
  })

  it('fetches the generalist template for the professional own council type when specialtyId is null', async () => {
    mockTemplatesService.getAll.mockResolvedValue({
      data: [makeTemplateDto({ specialtyId: null, specialtyName: null, councilType: CouncilType.CRM }) as any],
      total: 1,
      page: 1,
      limit: TEMPLATE_PICKER_LIMIT,
    })

    renderWithProviders(<MedicalRecordSection {...defaultProps} specialtyId={null} />)

    await waitFor(() => {
      expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument()
    })

    expect(mockProfessionalsService.getById).toHaveBeenCalledWith('doctor-uuid')
    expect(mockTemplatesService.getAll).toHaveBeenCalledWith({
      councilType: CouncilType.CRM,
      limit: TEMPLATE_PICKER_LIMIT,
      isActive: true,
    })

    await userEvent.click(screen.getByTestId('fill-medical-record-button'))

    await waitFor(() => {
      expect(screen.getByTestId('medical-record-form-modal')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('no-template-alert')).not.toBeInTheDocument()
  })

  it('does not query templates until the professional council type has resolved when specialtyId is null', async () => {
    mockProfessionalsService.getById.mockReturnValue(new Promise(() => {}))

    renderWithProviders(<MedicalRecordSection {...defaultProps} specialtyId={null} />)

    await waitFor(() => {
      expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByTestId('fill-medical-record-button'))

    await waitFor(() => {
      expect(screen.getByTestId('medical-record-form-skeleton')).toBeInTheDocument()
    })
    expect(mockTemplatesService.getAll).not.toHaveBeenCalled()
  })

  it('shows medical record view inline when record exists', async () => {
    mockMedicalRecordsService.getByAppointment.mockResolvedValue(makeRecordDto() as any)
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('medical-record-view')).toBeInTheDocument()
    })
  })

  it('shows edit-medical-record button when canManage and record exists and not completed', async () => {
    mockMedicalRecordsService.getByAppointment.mockResolvedValue(makeRecordDto() as any)
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('edit-medical-record-button')).toBeInTheDocument()
    })
  })

  it('hides edit button when appointment is COMPLETED', async () => {
    mockMedicalRecordsService.getByAppointment.mockResolvedValue(makeRecordDto() as any)
    renderWithProviders(
      <MedicalRecordSection {...defaultProps} appointmentStatus={AppointmentStatus.COMPLETED} />,
    )
    await waitFor(() => {
      expect(screen.getByTestId('medical-record-view')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('edit-medical-record-button')).not.toBeInTheDocument()
  })

  it('opens fill modal with form when fill button clicked', async () => {
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await openForm()
  })

  it('shows skeleton while templates are loading', async () => {
    mockTemplatesService.getAll.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('fill-medical-record-button'))
    await waitFor(() => {
      expect(screen.getByTestId('medical-record-form-skeleton')).toBeInTheDocument()
    })
  })

  // Antes o botão aparecia e a má notícia vinha depois do clique. Agora a tela
  // já diz que não há modelo, e a quem pedir.
  it('hides the fill button and explains when the clinic has no template', async () => {
    mockTemplatesService.getAll.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: TEMPLATE_PICKER_LIMIT,
    })

    renderWithProviders(<MedicalRecordSection {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('no-template-empty-state')).toHaveTextContent('especialidade')
    })
    expect(screen.queryByTestId('fill-medical-record-button')).not.toBeInTheDocument()
  })

  it('says profession, not specialty, on a generalist appointment without templates', async () => {
    mockTemplatesService.getAll.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: TEMPLATE_PICKER_LIMIT,
    })

    renderWithProviders(<MedicalRecordSection {...defaultProps} specialtyId={null} />)

    await waitFor(() => {
      expect(screen.getByTestId('no-template-empty-state')).toHaveTextContent('profissão')
    })
  })

  it('submitting fill form calls create medical record service', async () => {
    mockMedicalRecordsService.create.mockResolvedValue(makeRecordDto() as any)
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await openForm()
    await userEvent.click(screen.getByTestId('medical-record-form-submit'))
    await waitFor(() => {
      expect(mockMedicalRecordsService.create).toHaveBeenCalled()
    })
  })

  it('shows the saved record right after creating it, without waiting on a refetch', async () => {
    mockMedicalRecordsService.create.mockResolvedValue(makeRecordDto() as any)
    // getByAppointment keeps answering null for the whole test on purpose: the
    // screen must show the record the POST returned, not depend on a follow-up
    // read. In production that read never brought the record back, and the
    // section sat on "Prontuário ainda não preenchido" over a saved record.
    mockMedicalRecordsService.getByAppointment.mockResolvedValue(null)
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)

    await openForm()
    await userEvent.click(screen.getByTestId('medical-record-form-submit'))

    await waitFor(() => {
      expect(screen.getByTestId('medical-record-view')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('fill-medical-record-button')).not.toBeInTheDocument()
  })

  it('reports a failed read instead of claiming the prontuário is empty', async () => {
    mockMedicalRecordsService.getByAppointment.mockRejectedValue({ status: 500 })
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByTestId('medical-record-error')).toBeInTheDocument()
    })
    // Offering "Preencher prontuário" here invites a duplicate over a record that
    // may well exist.
    expect(screen.queryByTestId('fill-medical-record-button')).not.toBeInTheDocument()
  })

  it('shows 409 error when create fails with 409', async () => {
    mockMedicalRecordsService.create.mockRejectedValue({ status: 409 })
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await openForm()
    await userEvent.click(screen.getByTestId('medical-record-form-submit'))
    await waitFor(() => {
      expect(screen.getByTestId('medical-record-form-error')).toHaveTextContent('Esta consulta já possui prontuário.')
    })
  })

  it('shows 422 error when create fails with 422', async () => {
    mockMedicalRecordsService.create.mockRejectedValue({ status: 422 })
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await openForm()
    await userEvent.click(screen.getByTestId('medical-record-form-submit'))
    await waitFor(() => {
      expect(screen.getByTestId('medical-record-form-error')).toHaveTextContent(
        'Prontuário não pode ser editado após a conclusão da consulta.',
      )
    })
  })

  it('shows generic error when create fails with unexpected error', async () => {
    mockMedicalRecordsService.create.mockRejectedValue({ status: 500 })
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await openForm()
    await userEvent.click(screen.getByTestId('medical-record-form-submit'))
    await waitFor(() => {
      expect(screen.getByTestId('medical-record-form-error')).toHaveTextContent(
        'Ocorreu um erro ao salvar o prontuário.',
      )
    })
  })

  it('submitting edit form calls update medical record service', async () => {
    mockMedicalRecordsService.getByAppointment.mockResolvedValue(makeRecordDto() as any)
    mockMedicalRecordsService.update.mockResolvedValue(makeRecordDto() as any)
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('edit-medical-record-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('edit-medical-record-button'))
    await waitFor(() => expect(screen.getByTestId('medical-record-form')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('medical-record-form-submit'))
    await waitFor(() => {
      expect(mockMedicalRecordsService.update).toHaveBeenCalled()
    })
  })

  it('shows 422 error when update fails with 422', async () => {
    mockMedicalRecordsService.getByAppointment.mockResolvedValue(makeRecordDto() as any)
    mockMedicalRecordsService.update.mockRejectedValue({ status: 422 })
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('edit-medical-record-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('edit-medical-record-button'))
    await waitFor(() => expect(screen.getByTestId('medical-record-form')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('medical-record-form-submit'))
    await waitFor(() => {
      expect(screen.getByTestId('medical-record-form-error')).toHaveTextContent(
        'Prontuário não pode ser editado após a conclusão da consulta.',
      )
    })
  })

  it('closing fill modal resets mode', async () => {
    renderWithProviders(<MedicalRecordSection {...defaultProps} />)
    await waitFor(() => expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument())
    await userEvent.click(screen.getByTestId('fill-medical-record-button'))
    await waitFor(() => expect(screen.getByTestId('medical-record-form-modal')).toBeInTheDocument())
    const fillModal = screen.getByTestId('medical-record-form-modal')
    await userEvent.click(within(fillModal).getByRole('button', { name: 'Fechar' }))
    await waitFor(() => {
      expect(screen.queryByTestId('medical-record-form-modal')).not.toBeInTheDocument()
    })
  })

  describe('escolha do modelo', () => {
    const segundoModelo = () =>
      makeTemplateDto({
        id: 'tpl-retorno',
        name: 'Retorno',
        fields: [
          {
            key: 'evolucao',
            label: 'Evolução',
            type: MedicalRecordFieldType.TEXT,
            required: false,
            order: 0,
            options: null,
            placeholder: null,
            helpText: null,
            canonical: false,
            canonicalKey: null,
            sectionKey: null,
          },
        ],
      })

    function comDoisModelos() {
      mockTemplatesService.getAll.mockResolvedValue({
        data: [makeTemplateDto() as any, segundoModelo() as any],
        total: 2,
        page: 1,
        limit: TEMPLATE_PICKER_LIMIT,
      })
    }

    it('lists every template of the scope before showing the form', async () => {
      comDoisModelos()
      renderWithProviders(<MedicalRecordSection {...defaultProps} />)

      await waitFor(() => expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument())
      await userEvent.click(screen.getByTestId('fill-medical-record-button'))

      await waitFor(() => expect(screen.getByTestId('medical-record-template-picker')).toBeInTheDocument())
      expect(screen.getByTestId('template-option-tpl-uuid')).toHaveTextContent('Anamnese')
      expect(screen.getByTestId('template-option-tpl-retorno')).toHaveTextContent('Retorno')
      // O formulário só aparece depois da escolha.
      expect(screen.queryByTestId('medical-record-form')).not.toBeInTheDocument()
    })

    // A escolha é explícita mesmo com um modelo só — foi decisão de produto.
    it('still asks for a choice when there is a single template', async () => {
      renderWithProviders(<MedicalRecordSection {...defaultProps} />)

      await waitFor(() => expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument())
      await userEvent.click(screen.getByTestId('fill-medical-record-button'))

      await waitFor(() => expect(screen.getByTestId('medical-record-template-picker')).toBeInTheDocument())
      expect(screen.getByTestId('template-option-tpl-uuid')).toBeInTheDocument()
    })

    // Abrir o seletor e reescolher o mesmo modelo é desistir da troca — sem
    // confirmação e sem perder o que já estava escrito.
    it('closes the picker when the same template is chosen again', async () => {
      comDoisModelos()
      renderWithProviders(<MedicalRecordSection {...defaultProps} />)

      await openForm('tpl-uuid')
      await userEvent.type(screen.getByTestId('dynamic-field-complaint'), 'Dor')
      await userEvent.click(screen.getByTestId('change-template-button'))
      await userEvent.click(await screen.findByTestId('template-option-tpl-uuid'))

      await waitFor(() =>
        expect(screen.queryByTestId('medical-record-template-picker')).not.toBeInTheDocument(),
      )
      expect(screen.getByTestId('dynamic-field-complaint')).toHaveValue('Dor')
      expect(screen.queryByTestId('change-template-dialog')).not.toBeInTheDocument()
    })

    it('renders the fields of whichever template was chosen', async () => {
      comDoisModelos()
      renderWithProviders(<MedicalRecordSection {...defaultProps} />)

      await openForm('tpl-retorno')

      expect(screen.getByTestId('dynamic-field-evolucao')).toBeInTheDocument()
      expect(screen.queryByTestId('dynamic-field-complaint')).not.toBeInTheDocument()
      expect(screen.getByTestId('selected-template-name')).toHaveTextContent('Retorno')
    })

    it('sends the chosen templateId on create', async () => {
      comDoisModelos()
      mockMedicalRecordsService.create.mockResolvedValue(makeRecordDto() as any)
      renderWithProviders(<MedicalRecordSection {...defaultProps} />)

      await openForm('tpl-retorno')
      await userEvent.click(screen.getByTestId('medical-record-form-submit'))

      await waitFor(() => {
        expect(mockMedicalRecordsService.create).toHaveBeenCalledWith(
          expect.objectContaining({ templateId: 'tpl-retorno' }),
        )
      })
    })

    it('swaps template without asking when nothing was typed yet', async () => {
      comDoisModelos()
      renderWithProviders(<MedicalRecordSection {...defaultProps} />)

      await openForm('tpl-uuid')
      await userEvent.click(screen.getByTestId('change-template-button'))
      await userEvent.click(await screen.findByTestId('template-option-tpl-retorno'))

      await waitFor(() => expect(screen.getByTestId('dynamic-field-evolucao')).toBeInTheDocument())
      expect(screen.queryByTestId('change-template-dialog')).not.toBeInTheDocument()
    })

    it('confirms before discarding what was already typed', async () => {
      comDoisModelos()
      renderWithProviders(<MedicalRecordSection {...defaultProps} />)

      await openForm('tpl-uuid')
      await userEvent.type(screen.getByTestId('dynamic-field-complaint'), 'Dor')
      await userEvent.click(screen.getByTestId('change-template-button'))
      await userEvent.click(await screen.findByTestId('template-option-tpl-retorno'))

      await waitFor(() => expect(screen.getByTestId('change-template-dialog')).toBeInTheDocument())

      await userEvent.click(screen.getByTestId('change-template-dialog-confirm'))

      await waitFor(() => expect(screen.getByTestId('dynamic-field-evolucao')).toBeInTheDocument())
      expect(screen.queryByTestId('dynamic-field-complaint')).not.toBeInTheDocument()
    })

    it('keeps what was typed when the swap is cancelled', async () => {
      comDoisModelos()
      renderWithProviders(<MedicalRecordSection {...defaultProps} />)

      await openForm('tpl-uuid')
      await userEvent.type(screen.getByTestId('dynamic-field-complaint'), 'Dor')
      await userEvent.click(screen.getByTestId('change-template-button'))
      await userEvent.click(await screen.findByTestId('template-option-tpl-retorno'))
      await userEvent.click(await screen.findByTestId('change-template-dialog-cancel'))

      await waitFor(() => expect(screen.getByTestId('dynamic-field-complaint')).toHaveValue('Dor'))
    })

    // Falha de leitura não é ausência de modelo: some o botão seria mandar o
    // profissional atrás do administrador por um problema de rede.
    it('keeps offering the button when the template listing fails', async () => {
      mockTemplatesService.getAll.mockRejectedValue(new Error('network'))
      renderWithProviders(<MedicalRecordSection {...defaultProps} />)

      await waitFor(() => expect(screen.getByTestId('fill-medical-record-button')).toBeInTheDocument())
      expect(screen.queryByTestId('no-template-empty-state')).not.toBeInTheDocument()

      await userEvent.click(screen.getByTestId('fill-medical-record-button'))

      await waitFor(() =>
        expect(screen.getByTestId('medical-record-template-picker-error')).toBeInTheDocument(),
      )
    })

    it('does not offer the picker for a record that is already saved', async () => {
      mockMedicalRecordsService.getByAppointment.mockResolvedValue(makeRecordDto() as any)
      renderWithProviders(<MedicalRecordSection {...defaultProps} />)

      await waitFor(() => expect(screen.getByTestId('edit-medical-record-button')).toBeInTheDocument())
      await userEvent.click(screen.getByTestId('edit-medical-record-button'))

      await waitFor(() => expect(screen.getByTestId('medical-record-form')).toBeInTheDocument())
      expect(screen.queryByTestId('medical-record-template-picker')).not.toBeInTheDocument()
      expect(screen.queryByTestId('change-template-button')).not.toBeInTheDocument()
    })

    // As seções não entram no snapshot: são buscadas pelo modelo que ficou
    // gravado, não pelo primeiro da especialidade.
    it('fetches the sections from the template the record was born from', async () => {
      mockMedicalRecordsService.getByAppointment.mockResolvedValue(
        makeRecordDto({ templateId: 'tpl-retorno' }) as any,
      )
      renderWithProviders(<MedicalRecordSection {...defaultProps} />)

      await waitFor(() => expect(mockTemplatesService.getById).toHaveBeenCalledWith('tpl-retorno'))
    })
  })
})
