import { MedicalRecordFieldType } from '@app/shared'
import type { IRecordFieldModel } from '@app/core'
import { fireEvent, screen } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { DynamicField } from './dynamic-field'

const field = (overrides: Partial<IRecordFieldModel> = {}): IRecordFieldModel => ({
  key: 'campo',
  label: 'Campo',
  type: MedicalRecordFieldType.TEXT,
  required: false,
  order: 1,
  options: null,
  placeholder: null,
  helpText: null,
  sectionKey: null,
  ...overrides,
})

const onChange = jest.fn()

async function renderField(overrides: Partial<IRecordFieldModel>, value: string | string[] = '') {
  onChange.mockClear()
  return renderWithProviders(
    <DynamicField field={field(overrides)} value={value} onChange={onChange} error={null} />,
  )
}

describe('DynamicField', () => {
  describe('texto', () => {
    it('is a single line for TEXT', async () => {
      await renderField({ placeholder: 'Diga a queixa' })

      const input = screen.getByTestId('field-campo')
      expect(input.props.multiline).toBeFalsy()
      expect(input.props.placeholder).toBe('Diga a queixa')

      fireEvent.changeText(input, 'Dor')
      expect(onChange).toHaveBeenCalledWith('Dor')
    })

    it('is multiline for TEXTAREA', async () => {
      await renderField({ type: MedicalRecordFieldType.TEXTAREA })

      expect(screen.getByTestId('field-campo').props.multiline).toBe(true)
    })

    it('opens the numeric keyboard for NUMBER', async () => {
      await renderField({ type: MedicalRecordFieldType.NUMBER })

      expect(screen.getByTestId('field-campo').props.keyboardType).toBe('numeric')
    })

    // Converter a cada tecla faria o campo recusar o ponto enquanto "68." é
    // digitado — a conversão acontece uma vez, na gravação.
    it('passes the raw string along, without converting', async () => {
      await renderField({ type: MedicalRecordFieldType.NUMBER })

      fireEvent.changeText(screen.getByTestId('field-campo'), '68.')
      expect(onChange).toHaveBeenCalledWith('68.')
    })

    // O seletor nativo de data é fase 3; até lá o formato fica no placeholder,
    // que é preenchível hoje — melhor que uma máscara fingindo um date picker.
    it('shows the expected format for DATE', async () => {
      await renderField({ type: MedicalRecordFieldType.DATE })

      expect(screen.getByTestId('field-campo').props.placeholder).toBe('AAAA-MM-DD')
    })

    it('respects a placeholder the template defined for DATE', async () => {
      await renderField({ type: MedicalRecordFieldType.DATE, placeholder: 'Quando foi' })

      expect(screen.getByTestId('field-campo').props.placeholder).toBe('Quando foi')
    })
  })

  describe('escolha', () => {
    it('offers sim and não for BOOLEAN', async () => {
      await renderField({ type: MedicalRecordFieldType.BOOLEAN })

      fireEvent.press(screen.getByTestId('field-campo-true'))
      expect(onChange).toHaveBeenCalledWith('true')
    })

    // Sem isto, uma marcação acidental num campo opcional não teria desfazer.
    it('unmarks when the chosen option is pressed again', async () => {
      await renderField({ type: MedicalRecordFieldType.BOOLEAN }, 'true')

      fireEvent.press(screen.getByTestId('field-campo-true'))
      expect(onChange).toHaveBeenCalledWith('')
    })

    it('picks one option for SELECT', async () => {
      await renderField({
        type: MedicalRecordFieldType.SELECT,
        options: [
          { value: 'leve', label: 'Leve' },
          { value: 'forte', label: 'Forte' },
        ],
      })

      fireEvent.press(screen.getByTestId('field-campo-forte'))
      expect(onChange).toHaveBeenCalledWith('forte')
    })

    it('survives a SELECT with no options', async () => {
      await renderField({ type: MedicalRecordFieldType.SELECT })

      expect(screen.getByTestId('field-campo')).toBeTruthy()
    })

    describe('MULTISELECT', () => {
      const options = [
        { value: 'dipirona', label: 'Dipirona' },
        { value: 'penicilina', label: 'Penicilina' },
      ]

      it('adds to the selection', async () => {
        await renderField({ type: MedicalRecordFieldType.MULTISELECT, options }, ['dipirona'])

        fireEvent.press(screen.getByTestId('field-campo-penicilina'))
        expect(onChange).toHaveBeenCalledWith(['dipirona', 'penicilina'])
      })

      it('removes from the selection', async () => {
        await renderField({ type: MedicalRecordFieldType.MULTISELECT, options }, [
          'dipirona',
          'penicilina',
        ])

        fireEvent.press(screen.getByTestId('field-campo-dipirona'))
        expect(onChange).toHaveBeenCalledWith(['penicilina'])
      })

      it('recovers from a value that is not a list', async () => {
        await renderField({ type: MedicalRecordFieldType.MULTISELECT, options }, 'dipirona')

        fireEvent.press(screen.getByTestId('field-campo-dipirona'))
        expect(onChange).toHaveBeenCalledWith(['dipirona'])
      })
    })
  })

  describe('ajuda e erro', () => {
    it('shows the help text on a text field', async () => {
      await renderField({ helpText: 'Em centímetros' })

      expect(screen.getByText('Em centímetros')).toBeTruthy()
    })

    it('shows the help text on a choice field', async () => {
      await renderField({ type: MedicalRecordFieldType.BOOLEAN, helpText: 'Marque uma' })

      expect(screen.getByText('Marque uma')).toBeTruthy()
    })

    it.each([
      ['texto', MedicalRecordFieldType.TEXT],
      ['escolha', MedicalRecordFieldType.BOOLEAN],
    ])('shows the error on a %s field', async (_kind, type) => {
      await renderWithProviders(
        <DynamicField
          field={field({ type })}
          value=""
          onChange={onChange}
          error="Campo obrigatório"
        />,
      )

      expect(screen.getByTestId('field-campo-error')).toHaveTextContent('Campo obrigatório')
    })

    it('marks a required field with an asterisk', async () => {
      await renderField({ required: true })

      expect(screen.getByText('*')).toBeTruthy()
    })
  })
})

/**
 * O valor do formulário é `string | string[]` porque o multiselect existe —
 * então todo campo de texto precisa decidir o que fazer se receber uma lista.
 * Acontece quando o modelo muda o tipo de um campo depois que o prontuário
 * nasceu: o guardado é de um tipo, o schema pede outro.
 */
describe('DynamicField com valor do tipo errado', () => {
  it.each([
    ['TEXT', MedicalRecordFieldType.TEXT],
    ['TEXTAREA', MedicalRecordFieldType.TEXTAREA],
    ['NUMBER', MedicalRecordFieldType.NUMBER],
    ['DATE', MedicalRecordFieldType.DATE],
  ])('renders %s empty instead of crashing on a list', async (_name, type) => {
    await renderField({ type }, ['lista'])

    expect(screen.getByTestId('field-campo').props.value).toBe('')
  })

  it.each([
    ['BOOLEAN', MedicalRecordFieldType.BOOLEAN],
    ['SELECT', MedicalRecordFieldType.SELECT],
  ])('renders %s unselected instead of crashing on a list', async (_name, type) => {
    await renderField({ type, options: [{ value: 'sim', label: 'Sim' }] }, ['lista'])

    expect(screen.getByTestId('field-campo')).toBeTruthy()
  })
})

describe('DynamicField, ramos de escolha', () => {
  const options = [
    { value: 'leve', label: 'Leve' },
    { value: 'forte', label: 'Forte' },
  ]

  it('shows the SELECT option already chosen as marked', async () => {
    await renderField({ type: MedicalRecordFieldType.SELECT, options }, 'forte')

    expect(screen.getByTestId('field-campo-forte').props.accessibilityState.checked).toBe(true)
    expect(screen.getByTestId('field-campo-leve').props.accessibilityState.checked).toBe(false)
  })

  it('unmarks a SELECT by pressing the chosen option', async () => {
    await renderField({ type: MedicalRecordFieldType.SELECT, options }, 'forte')

    fireEvent.press(screen.getByTestId('field-campo-forte'))
    expect(onChange).toHaveBeenCalledWith('')
  })

  // Um multiselect sem opções é modelo mal montado, não motivo de tela branca.
  it('survives a MULTISELECT with no options', async () => {
    await renderField({ type: MedicalRecordFieldType.MULTISELECT }, [])

    expect(screen.getByTestId('field-campo')).toBeTruthy()
  })
})
