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
import { CouncilType, ExamRequestSnapshot } from '@app/shared'
import { PdfDocumentService } from '../../../common/pdf/pdf-document.service'
import { ExamRequestPdfBuilderService } from '../services/exam-request-pdf-builder.service'

const makeSnapshot = (overrides: Partial<ExamRequestSnapshot> = {}): ExamRequestSnapshot => ({
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
  items: [{ name: 'Hemograma completo', observations: 'Jejum de 8 horas' }],
  notes: null,
  ...overrides,
})

async function build(
  snapshot: ExamRequestSnapshot,
  logo: string | null = null,
): Promise<{ text: string; definition: object }> {
  const pdfDocumentService = new PdfDocumentService()
  pdfDocumentService.onModuleInit()
  const service = new ExamRequestPdfBuilderService(pdfDocumentService)
  await service.build(snapshot, logo)
  const definition = (pdfmake.createPdf as jest.Mock).mock.calls.at(-1)![0] as object
  return { text: JSON.stringify(definition), definition }
}

describe('ExamRequestPdfBuilderService — conteúdo do documento', () => {
  beforeEach(() => jest.clearAllMocks())

  it('nomeia o documento como solicitação de exames', async () => {
    const { text } = await build(makeSnapshot())
    expect(text).toContain('SOLICITAÇÃO DE EXAMES')
    expect(text).not.toContain('Receituário')
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

  it('numera os exames e traz as observações de cada um', async () => {
    const { text } = await build(
      makeSnapshot({
        items: [
          { name: 'Hemograma completo', observations: 'Jejum de 8 horas' },
          { name: 'Ultrassonografia transvaginal', observations: null },
        ],
      }),
    )
    expect(text).toContain('1. Hemograma completo')
    expect(text).toContain('Jejum de 8 horas')
    expect(text).toContain('2. Ultrassonografia transvaginal')
  })

  it('omite o bloco de exames quando não há nenhum', async () => {
    const { text } = await build(makeSnapshot({ items: [] }))
    expect(text).not.toContain('Exames Solicitados')
  })

  it('assina com nome, conselho e especialidade', async () => {
    const { text } = await build(makeSnapshot())
    expect(text).toContain('São Paulo, 4 de setembro de 2026')
    expect(text).toContain('Dra. Helena Vasconcelos')
    expect(text).toContain('CRM 12345/SP')
    expect(text).toContain('Ginecologia e Obstetrícia')
  })

  // Ao contrário da receita, o pedido de exame não tem QR: não há quem confira.
  it('não leva QR de verificação', async () => {
    const { text } = await build(makeSnapshot())
    expect(text).not.toContain('"qr"')
    expect(text).not.toContain('autenticidade')
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

  it('mantém a definição do documento estável com logo e observações gerais', async () => {
    const { definition } = await build(
      makeSnapshot({ notes: 'Trazer exames anteriores.' }),
      'data:image/png;base64,AAAA',
    )
    expect(definition).toMatchSnapshot()
  })
})
