import { MedicalRecordFieldType } from '@app/shared'
import {
  createMedicalRecordUseCase,
  getMedicalRecordByAppointmentUseCase,
  listTemplatesUseCase,
  updateMedicalRecordUseCase,
} from '@app/core'
import { fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { MedicalRecordTab } from './medical-record-tab'

jest.mock('@app/core/src/features/medical-records/use-cases/get-medical-record-by-appointment.use-case')
jest.mock('@app/core/src/features/medical-records/use-cases/create-medical-record.use-case')
jest.mock('@app/core/src/features/medical-records/use-cases/update-medical-record.use-case')
jest.mock('@app/core/src/features/medical-record-templates/use-cases/list-templates.use-case')

const mockRecord = getMedicalRecordByAppointmentUseCase as jest.MockedFunction<
  typeof getMedicalRecordByAppointmentUseCase
>
const mockTemplates = listTemplatesUseCase as jest.MockedFunction<typeof listTemplatesUseCase>
const mockCreate = createMedicalRecordUseCase as jest.MockedFunction<typeof createMedicalRecordUseCase>
const mockUpdate = updateMedicalRecordUseCase as jest.MockedFunction<typeof updateMedicalRecordUseCase>

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

const page = (data: unknown[]) => ({ data, total: data.length, page: 1, limit: 100 }) as never

const savedRecord = (overrides = {}) =>
  ({
    id: 'rec-1',
    appointmentId: 'appt-1',
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
    ...overrides,
  }) as never

function render() {
  return renderWithProviders(<MedicalRecordTab appointmentId="appt-1" specialtyId="spec-1" />)
}

describe('MedicalRecordTab', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRecord.mockResolvedValue(null)
    mockTemplates.mockResolvedValue(page([template()]))
  })

  it('mostra o giro enquanto carrega', async () => {
    mockRecord.mockReturnValue(new Promise(() => {}))

    await render()

    expect(screen.getByTestId('medical-record-loading')).toBeTruthy()
  })

  it('oferece tentar de novo quando falha', async () => {
    mockRecord.mockRejectedValue(new Error('rede'))

    await render()
    expect(await screen.findByTestId('medical-record-error')).toBeTruthy()

    mockRecord.mockResolvedValue(null)
    fireEvent.press(screen.getByTestId('medical-record-error-retry'))

    expect(await screen.findByTestId('template-picker')).toBeTruthy()
  })

  /**
   * As duas frases da web, e a diferença entre elas.
   *
   * A primeira é "ninguém preencheu ainda"; a segunda é "não dá para
   * preencher" — e esta tem destinatário, que é o administrador da clínica.
   */
  it('sem modelo, diz a quem pedir', async () => {
    mockTemplates.mockResolvedValue(page([]))

    await render()

    await screen.findByTestId('medical-record-empty')
    expect(screen.getByText('Prontuário ainda não preenchido')).toBeTruthy()
    expect(screen.getByTestId('medical-record-no-template')).toHaveTextContent(
      /Peça ao administrador da clínica/,
    )
  })

  it('pede o modelo antes de mostrar campo algum', async () => {
    await render()

    expect(await screen.findByTestId('template-picker')).toBeTruthy()
    expect(screen.getByTestId('awaiting-template')).toBeTruthy()
    expect(screen.queryByTestId('field-queixa')).toBeNull()
  })

  it('só oferece modelo ativo', async () => {
    await render()
    await screen.findByTestId('template-picker')

    expect(mockTemplates).toHaveBeenCalledWith({
      isActive: true,
      limit: 100,
      specialtyId: 'spec-1',
    })
  })

  it('cai no generalista quando a consulta não tem especialidade', async () => {
    await renderWithProviders(<MedicalRecordTab appointmentId="appt-1" specialtyId={null} />)
    await screen.findByTestId('template-picker')

    expect(mockTemplates).toHaveBeenCalledWith({ isActive: true, limit: 100, generalist: true })
  })

  it('cria o prontuário com o modelo escolhido', async () => {
    mockCreate.mockResolvedValue(savedRecord())

    await render()
    fireEvent.press(await screen.findByTestId('template-choice-tpl-1'))

    const field = await screen.findByTestId('field-queixa')
    fireEvent.changeText(field, 'Dor de cabeça')
    await waitFor(() => expect(screen.getByTestId('field-queixa').props.value).toBe('Dor de cabeça'))

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

  it('diz algo quando salvar falha', async () => {
    mockCreate.mockRejectedValue({ status: 500, title: 'x', detail: 'y' })

    await render()
    fireEvent.press(await screen.findByTestId('template-choice-tpl-1'))
    fireEvent.press(await screen.findByTestId('save-medical-record'))

    expect(await screen.findByTestId('save-error')).toBeTruthy()
  })

  it('recusa salvar com obrigatório em branco', async () => {
    mockTemplates.mockResolvedValue(page([template({ fields: [templateField({ required: true })] })]))

    await render()
    fireEvent.press(await screen.findByTestId('template-choice-tpl-1'))
    fireEvent.press(await screen.findByTestId('save-medical-record'))

    expect(await screen.findByTestId('missing-required')).toBeTruthy()
    expect(mockCreate).not.toHaveBeenCalled()
  })

  // As chaves são de outro schema: manter o digitado gravaria valor sob uma
  // chave que o novo modelo não tem.
  it('zera o formulário ao trocar de modelo', async () => {
    mockTemplates.mockResolvedValue(page([template(), template({ id: 'tpl-2', name: 'Retorno' })]))

    await render()
    fireEvent.press(await screen.findByTestId('template-choice-tpl-1'))
    fireEvent.changeText(await screen.findByTestId('field-queixa'), 'Dor')
    await waitFor(() => expect(screen.getByTestId('field-queixa').props.value).toBe('Dor'))

    fireEvent.press(screen.getByTestId('template-choice-tpl-2'))

    await waitFor(() => expect(screen.getByTestId('field-queixa').props.value).toBe(''))
  })

  describe('prontuário existente', () => {
    beforeEach(() => mockRecord.mockResolvedValue(savedRecord()))

    // O schema fica congelado no registro; trocar o modelo descartaria o
    // que já foi escrito.
    it('não oferece o seletor de novo', async () => {
      await render()
      await screen.findByTestId('field-queixa')

      expect(screen.queryByTestId('template-picker')).toBeNull()
    })

    it('traz de volta o que foi escrito', async () => {
      await render()

      expect((await screen.findByTestId('field-queixa')).props.value).toBe('Dor de cabeça')
      expect(screen.getByTestId('record-notes').props.value).toBe('Retorno em 30 dias')
    })

    it('atualiza em vez de criar', async () => {
      mockUpdate.mockResolvedValue(savedRecord())

      await render()
      fireEvent.changeText(await screen.findByTestId('field-queixa'), 'Enxaqueca')
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
    it('agrupa os campos e mantém os soltos à parte', async () => {
      mockTemplates.mockResolvedValue(
        page([
          template({
            sections: [{ key: 'anamnese', title: 'Anamnese', order: 1 }],
            fields: [
              templateField({ key: 'queixa', sectionKey: 'anamnese' }),
              templateField({ key: 'solta', label: 'Observação solta', order: 2 }),
            ],
          }),
        ]),
      )

      await render()
      fireEvent.press(await screen.findByTestId('template-choice-tpl-1'))

      expect(await screen.findByTestId('section-anamnese')).toBeTruthy()
      expect(screen.getByTestId('section-loose')).toBeTruthy()
    })

    it('pula seção sem campo', async () => {
      mockTemplates.mockResolvedValue(
        page([
          template({
            sections: [{ key: 'vazia', title: 'Vazia', order: 1 }],
            fields: [templateField({ key: 'queixa' })],
          }),
        ]),
      )

      await render()
      fireEvent.press(await screen.findByTestId('template-choice-tpl-1'))
      await screen.findByTestId('section-loose')

      expect(screen.queryByTestId('section-vazia')).toBeNull()
    })

    it('sem campo solto, não desenha o cartão solto', async () => {
      mockTemplates.mockResolvedValue(
        page([
          template({
            sections: [{ key: 'anamnese', title: 'Anamnese', order: 1 }],
            fields: [templateField({ sectionKey: 'anamnese' })],
          }),
        ]),
      )

      await render()
      fireEvent.press(await screen.findByTestId('template-choice-tpl-1'))
      await screen.findByTestId('section-anamnese')

      expect(screen.queryByTestId('section-loose')).toBeNull()
    })
  })

  describe('campo do modelo sem chave própria', () => {
    // O construtor só grava `key` em campo livre: o vindo do catálogo
    // canônico se identifica pelo `canonicalKey`.
    it('cai na chave canônica', async () => {
      mockTemplates.mockResolvedValue(
        page([
          template({
            fields: [templateField({ key: undefined, canonical: true, canonicalKey: 'pressao' })],
          }),
        ]),
      )

      await render()
      fireEvent.press(await screen.findByTestId('template-choice-tpl-1'))

      expect(await screen.findByTestId('field-pressao')).toBeTruthy()
    })

    it('cai na posição quando não há nem uma nem outra', async () => {
      mockTemplates.mockResolvedValue(
        page([template({ fields: [templateField({ key: undefined, canonicalKey: null })] })]),
      )

      await render()
      fireEvent.press(await screen.findByTestId('template-choice-tpl-1'))

      expect(await screen.findByTestId('field-0')).toBeTruthy()
    })
  })
})
