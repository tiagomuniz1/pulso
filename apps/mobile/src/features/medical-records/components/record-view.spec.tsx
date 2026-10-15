import { MedicalRecordFieldType } from '@app/shared'
import type { IMedicalRecordModel } from '@app/core'
import { screen } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { RecordView } from './record-view'

const field = (overrides = {}) => ({
  key: 'queixa',
  label: 'Queixa principal',
  type: MedicalRecordFieldType.TEXT,
  required: false,
  order: 1,
  options: null,
  placeholder: null,
  helpText: null,
  sectionKey: null,
  ...overrides,
})

const record = (overrides = {}) =>
  ({
    id: 'rec-1',
    appointmentId: 'appt-1',
    templateId: 'tpl-1',
    schema: [field()],
    data: { queixa: 'Dor de cabeça' },
    notes: null,
    ...overrides,
  }) as unknown as IMedicalRecordModel

describe('RecordView', () => {
  it('mostra rótulo e valor de cada campo', async () => {
    await renderWithProviders(<RecordView record={record()} />)

    expect(screen.getByTestId('record-view-queixa')).toHaveTextContent(/Dor de cabeça/)
    expect(screen.getByText('QUEIXA PRINCIPAL')).toBeTruthy()
  })

  // O valor passa pelo mesmo formatador do PDF e do histórico: uma opção
  // aparecendo como `hipertensao_grau_2` numa tela e "Hipertensão grau 2"
  // noutra é o defeito que esse formatador existe para não ter.
  it('resolve o rótulo da opção escolhida', async () => {
    await renderWithProviders(
      <RecordView
        record={record({
          schema: [
            field({
              key: 'diagnostico',
              label: 'Diagnóstico',
              type: MedicalRecordFieldType.SELECT,
              options: [{ value: 'hipertensao_grau_2', label: 'Hipertensão grau 2' }],
            }),
          ],
          data: { diagnostico: 'hipertensao_grau_2' },
        })}
      />,
    )

    expect(screen.getByTestId('record-view-diagnostico')).toHaveTextContent(/Hipertensão grau 2/)
  })

  it('campo em branco aparece como traço, e não some', async () => {
    await renderWithProviders(<RecordView record={record({ data: {} })} />)

    expect(screen.getByTestId('record-view-queixa')).toHaveTextContent('—')
  })

  it('agrupa os campos pelas seções do modelo', async () => {
    await renderWithProviders(
      <RecordView
        record={record({
          schema: [
            field({ key: 'queixa', sectionKey: 'anamnese' }),
            field({ key: 'conduta', label: 'Conduta', order: 2, sectionKey: 'plano' }),
            field({ key: 'solto', label: 'Solto', order: 3 }),
          ],
          data: { queixa: 'a', conduta: 'b', solto: 'c' },
        })}
      />,
    )

    expect(screen.getByTestId('record-view-section-anamnese')).toBeTruthy()
    expect(screen.getByTestId('record-view-section-plano')).toBeTruthy()
    // Campo sem seção não desaparece: cai no cartão sem título.
    expect(screen.getByTestId('record-view-section-loose')).toBeTruthy()
  })

  it('sem campo solto, não desenha o cartão vazio', async () => {
    await renderWithProviders(
      <RecordView
        record={record({ schema: [field({ sectionKey: 'anamnese' })], data: { queixa: 'a' } })}
      />,
    )

    expect(screen.queryByTestId('record-view-section-loose')).toBeNull()
  })

  it('mostra as observações quando há', async () => {
    await renderWithProviders(<RecordView record={record({ notes: 'Retorno em 30 dias' })} />)

    expect(screen.getByTestId('record-view-notes')).toHaveTextContent(/Retorno em 30 dias/)
  })

  it('sem observações, não desenha o cartão', async () => {
    await renderWithProviders(<RecordView record={record()} />)

    expect(screen.queryByTestId('record-view-notes')).toBeNull()
  })
})
