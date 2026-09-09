import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MedicalRecordFieldType } from '@app/shared'
import type { ITemplateModel } from '@/components/features/medical-record-templates/types/template-model.types'
import { MedicalRecordTemplatePicker } from './medical-record-template-picker'

function makeTemplate(overrides: Partial<ITemplateModel> = {}): ITemplateModel {
  return {
    id: 'tpl-1',
    specialtyId: 'spec-1',
    specialtyName: 'Cardiologia',
    councilType: null,
    name: 'Anamnese',
    sections: [],
    fields: [
      {
        key: 'queixa',
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
    isActive: true,
    createdAt: new Date('2026-01-01T09:00:00'),
    // Hora explícita: uma data pura seria meia-noite UTC e viraria o dia anterior
    // no fuso local.
    updatedAt: new Date('2026-03-15T12:00:00'),
    ...overrides,
  } as ITemplateModel
}

const defaultProps = {
  templates: [makeTemplate()],
  isError: false,
  onSelect: jest.fn(),
  onRetry: jest.fn(),
  isGeneralist: false,
}

describe('MedicalRecordTemplatePicker', () => {
  beforeEach(() => jest.clearAllMocks())

  it('lists each template with its size and last change', () => {
    render(<MedicalRecordTemplatePicker {...defaultProps} />)

    const option = screen.getByTestId('template-option-tpl-1')
    expect(option).toHaveTextContent('Anamnese')
    expect(option).toHaveTextContent('1 campo')
    expect(option).toHaveTextContent('15/03/2026')
  })

  it('pluralises the field count', () => {
    const dois = makeTemplate({
      fields: [...makeTemplate().fields, { ...makeTemplate().fields[0]!, key: 'outro' }],
    })
    render(<MedicalRecordTemplatePicker {...defaultProps} templates={[dois]} />)

    expect(screen.getByTestId('template-option-tpl-1')).toHaveTextContent('2 campos')
  })

  it('reports the chosen template', async () => {
    const onSelect = jest.fn()
    render(<MedicalRecordTemplatePicker {...defaultProps} onSelect={onSelect} />)

    await userEvent.click(screen.getByTestId('template-option-tpl-1'))

    expect(onSelect).toHaveBeenCalledWith('tpl-1')
  })

  it('shows the section titles as chips, capped with a counter', () => {
    const comSecoes = makeTemplate({
      sections: [
        { key: 's1', title: 'Anamnese', order: 0 },
        { key: 's2', title: 'Exame físico', order: 1 },
        { key: 's3', title: 'Conduta', order: 2 },
        { key: 's4', title: 'Retorno', order: 3 },
      ],
    })
    render(<MedicalRecordTemplatePicker {...defaultProps} templates={[comSecoes]} />)

    const option = screen.getByTestId('template-option-tpl-1')
    expect(option).toHaveTextContent('Anamnese')
    expect(option).toHaveTextContent('Exame físico')
    expect(option).toHaveTextContent('Conduta')
    expect(option).not.toHaveTextContent('Retorno')
    expect(option).toHaveTextContent('+1')
  })

  // Só alcançável se a lista esvaziar com o modal já aberto (o administrador
  // apagou o último modelo noutra aba). Um modal em branco seria pior.
  it('explains an empty list, naming the specialty', () => {
    render(<MedicalRecordTemplatePicker {...defaultProps} templates={[]} />)

    expect(screen.getByTestId('no-template-alert')).toHaveTextContent('especialidade')
  })

  it('explains an empty list, naming the profession on a generalist appointment', () => {
    render(<MedicalRecordTemplatePicker {...defaultProps} templates={[]} isGeneralist />)

    expect(screen.getByTestId('no-template-alert')).toHaveTextContent('profissão')
  })

  // Falha de leitura não é ausência de modelo, e a diferença muda o que o
  // profissional faz a seguir: tentar de novo, ou procurar o administrador.
  it('offers a retry instead of an empty state when the listing failed', async () => {
    const onRetry = jest.fn()
    render(
      <MedicalRecordTemplatePicker {...defaultProps} templates={[]} isError onRetry={onRetry} />,
    )

    expect(screen.getByTestId('medical-record-template-picker-error')).toBeInTheDocument()
    expect(screen.queryByTestId('no-template-alert')).not.toBeInTheDocument()

    await userEvent.click(screen.getByTestId('medical-record-template-picker-retry'))
    expect(onRetry).toHaveBeenCalled()
  })
})
