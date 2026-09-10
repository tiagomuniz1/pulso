// O buffer do PDF é opaco: asserir `%PDF` prova que o pdfmake não quebrou, não
// que o documento diz o que deve dizer. Aqui o pdfmake é mockado para capturar a
// definição do documento e asserir o conteúdo.
//
// O `toMatchSnapshot` da definição inteira existe por um motivo específico: a
// base comum de PDF (`common/pdf/`) foi extraída destes quatro builders, que
// eram cópias quase literais. Um punhado de `toContain` não prova que a extração
// não mudou nada — o snapshot prova. Se ele quebrar durante um refactor que se
// diz puro, é o refactor que está errado, não o teste.
jest.mock('pdfmake/js/index.js', () => ({
  addFonts: jest.fn(),
  setLocalAccessPolicy: jest.fn(),
  setUrlAccessPolicy: jest.fn(),
  createPdf: jest.fn(() => ({ getBuffer: jest.fn(async () => Buffer.from('%PDF-fake')) })),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require('pdfmake/js/index.js')
import { CouncilType, PrescriptionSnapshot } from '@app/shared'
import { PdfDocumentService } from '../../../common/pdf/pdf-document.service'
import { PrescriptionPdfBuilderService } from '../services/prescription-pdf-builder.service'

const VERIFICATION_URL = 'https://clinica.pulso.center/verify/prescriptions/abc123'

const makeSnapshot = (overrides: Partial<PrescriptionSnapshot> = {}): PrescriptionSnapshot => ({
  issuedAt: '2026-09-04T10:00:00.000Z',
  clinic: {
    name: 'Clínica Pulso',
    address: {
      street: 'Rua das Flores',
      number: '100',
      complement: 'Sala 2',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01001000',
    },
    logoUrl: null,
  },
  professional: {
    name: 'Dra. Helena Vasconcelos',
    councilType: CouncilType.CRM,
    registrationNumber: '12345/SP',
    registryNumber: null,
    specialtyName: 'Ginecologia e Obstetrícia',
  },
  patient: { name: 'Clara Monteiro Alves', documentNumber: '12345678901' },
  items: [
    {
      medicationId: 'm1',
      name: 'Amoxicilina',
      activeIngredient: 'amoxicilina',
      dosage: '500mg',
      quantity: '21 comprimidos',
      instructions: 'Tomar 1 comprimido de 8 em 8 horas por 7 dias',
    },
  ],
  notes: null,
  ...overrides,
})

async function build(
  snapshot: PrescriptionSnapshot,
  logo: string | null = null,
): Promise<{ text: string; definition: object }> {
  const pdfDocumentService = new PdfDocumentService()
  pdfDocumentService.onModuleInit()
  const service = new PrescriptionPdfBuilderService(pdfDocumentService)
  await service.build(snapshot, logo, VERIFICATION_URL)
  const definition = (pdfmake.createPdf as jest.Mock).mock.calls.at(-1)![0] as object
  return { text: JSON.stringify(definition), definition }
}

describe('PrescriptionPdfBuilderService — conteúdo do documento', () => {
  beforeEach(() => jest.clearAllMocks())

  it('nomeia o documento como receituário', async () => {
    const { text } = await build(makeSnapshot())
    expect(text).toContain('Receituário')
    expect(text).not.toContain('Atestado')
  })

  it('traz a clínica e o endereço no cabeçalho', async () => {
    const { text } = await build(makeSnapshot())
    expect(text).toContain('Clínica Pulso')
    expect(text).toContain('Rua das Flores, 100, Sala 2')
    expect(text).toContain('Centro — São Paulo — SP')
    expect(text).toContain('CEP 01001000')
  })

  it('traz o bloco do paciente com CPF formatado', async () => {
    const { text } = await build(makeSnapshot())
    expect(text).toContain('Clara Monteiro Alves')
    expect(text).toContain('123.456.789-01')
  })

  it('numera os medicamentos com dosagem, quantidade e posologia', async () => {
    const { text } = await build(
      makeSnapshot({
        items: [
          { ...makeSnapshot().items[0] },
          {
            medicationId: null,
            name: 'Dipirona',
            activeIngredient: 'dipirona sódica',
            dosage: null,
            quantity: null,
            instructions: 'Tomar em caso de dor',
          },
        ],
      }),
    )
    expect(text).toContain('1. Amoxicilina 500mg')
    expect(text).toContain('Quantidade: 21 comprimidos')
    expect(text).toContain('Tomar 1 comprimido de 8 em 8 horas por 7 dias')
    expect(text).toContain('2. Dipirona')
    expect(text).toContain('Tomar em caso de dor')
  })

  it('omite o bloco de medicamentos quando não há nenhum', async () => {
    const { text } = await build(makeSnapshot({ items: [] }))
    expect(text).not.toContain('Medicamentos')
  })

  it('assina com nome, conselho e especialidade', async () => {
    const { text } = await build(makeSnapshot())
    expect(text).toContain('São Paulo, 4 de setembro de 2026')
    expect(text).toContain('Dra. Helena Vasconcelos')
    expect(text).toContain('CRM 12345/SP')
    expect(text).toContain('Ginecologia e Obstetrícia')
  })

  // É o QR que a farmácia bipa para conferir a receita contra a fonte.
  it('inclui o QR de verificação apontando para a URL pública', async () => {
    const { text } = await build(makeSnapshot())
    expect(text).toContain(VERIFICATION_URL)
    expect(text).toContain('Verifique a autenticidade desta receita')
  })

  it('diz "Não informado" quando o paciente não tem CPF', async () => {
    const { text } = await build(
      makeSnapshot({ patient: { name: 'Clara Monteiro Alves', documentNumber: null } }),
    )
    expect(text).toContain('Não informado')
  })

  it('só embute o logo quando ele é um data-URI', async () => {
    const { text: comLogo } = await build(makeSnapshot(), 'data:image/png;base64,AAAA')
    expect(comLogo).toContain('data:image/png;base64,AAAA')

    const { text: comLixo } = await build(makeSnapshot(), 'https://exemplo.com/logo.png')
    expect(comLixo).not.toContain('https://exemplo.com/logo.png')
  })

  it('mantém a definição do documento estável', async () => {
    const { definition } = await build(makeSnapshot())
    expect(definition).toMatchSnapshot()
  })

  it('mantém a definição do documento estável com logo e observações', async () => {
    const { definition } = await build(
      makeSnapshot({ notes: 'Retornar em 15 dias.' }),
      'data:image/png;base64,AAAA',
    )
    expect(definition).toMatchSnapshot()
  })
})
