// O buffer do PDF é opaco: asserir `%PDF` prova que o pdfmake não quebrou, não
// que o documento diz o que deve dizer. Aqui o pdfmake é mockado para capturar
// a definição do documento e asserir o conteúdo.
jest.mock('pdfmake/js/index.js', () => ({
  addFonts: jest.fn(),
  setLocalAccessPolicy: jest.fn(),
  setUrlAccessPolicy: jest.fn(),
  createPdf: jest.fn(() => ({ getBuffer: jest.fn(async () => Buffer.from('%PDF-fake')) })),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfmake = require('pdfmake/js/index.js')
import { MedicalRecordFieldType, MedicalRecordTemplateFieldDto } from '@app/shared'
import { PdfDocumentService } from '../../../common/pdf/pdf-document.service'
import {
  MedicalRecordPdfBuilderService,
  MedicalRecordPdfData,
} from '../services/medical-record-pdf-builder.service'

const campo = (
  overrides: Partial<MedicalRecordTemplateFieldDto> & { key: string; label: string },
): MedicalRecordTemplateFieldDto =>
  ({
    type: MedicalRecordFieldType.TEXT,
    required: false,
    order: 0,
    options: null,
    placeholder: null,
    helpText: null,
    canonical: false,
    canonicalKey: null,
    sectionKey: null,
    ...overrides,
  }) as MedicalRecordTemplateFieldDto

const makeData = (overrides: Partial<MedicalRecordPdfData> = {}): MedicalRecordPdfData => ({
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
  },
  patient: { name: 'Clara Monteiro Alves', documentNumber: '12345678901' },
  professionalName: 'Dra. Helena Vasconcelos',
  specialtyName: 'Ginecologia e Obstetrícia',
  appointmentDate: '2026-09-04',
  appointmentStartTime: '14:30',
  fields: [
    campo({ key: 'queixa', label: 'Queixa principal', order: 0 }),
    campo({
      key: 'diagnostico',
      label: 'Diagnóstico',
      order: 1,
      type: MedicalRecordFieldType.SELECT,
      options: [{ value: 'hipertensao_grau_2', label: 'Hipertensão grau 2' }],
    }),
  ],
  data: { queixa: 'Cefaleia há três dias', diagnostico: 'hipertensao_grau_2' },
  notes: null,
  sections: [],
  ...overrides,
})

async function build(
  data: MedicalRecordPdfData,
  logo: string | null = null,
): Promise<{ text: string; definition: any }> {
  const pdfDocumentService = new PdfDocumentService()
  pdfDocumentService.onModuleInit()
  const service = new MedicalRecordPdfBuilderService(pdfDocumentService)
  await service.build(data, logo)
  const definition = (pdfmake.createPdf as jest.Mock).mock.calls.at(-1)![0]
  return { text: JSON.stringify(definition), definition }
}

describe('MedicalRecordPdfBuilderService — conteúdo do documento', () => {
  beforeEach(() => jest.clearAllMocks())

  it('nomeia o documento como prontuário', async () => {
    const { text } = await build(makeData())
    expect(text).toContain('Prontuário')
  })

  it('traz a clínica e o endereço no cabeçalho', async () => {
    const { text } = await build(makeData())
    expect(text).toContain('Clínica Pulso')
    expect(text).toContain('Rua das Flores, 100, Sala 2')
    expect(text).toContain('CEP 01001000')
  })

  it('identifica paciente, atendimento e profissional', async () => {
    const { text } = await build(makeData())
    expect(text).toContain('Clara Monteiro Alves')
    expect(text).toContain('CPF 123.456.789-01')
    expect(text).toContain('04/09/2026 às 14:30')
    expect(text).toContain('Ginecologia e Obstetrícia')
    expect(text).toContain('Dra. Helena Vasconcelos')
  })

  it('diz "Clínica geral" quando o atendimento não tem especialidade', async () => {
    const { text } = await build(makeData({ specialtyName: null }))
    expect(text).toContain('Clínica geral')
  })

  it('escreve cada campo com o rótulo e o valor legível', async () => {
    const { text } = await build(makeData())
    expect(text).toContain('Queixa principal')
    expect(text).toContain('Cefaleia há três dias')
    expect(text).toContain('Diagnóstico')
    // O `data` guarda o value; o documento tem de mostrar o label.
    expect(text).toContain('Hipertensão grau 2')
    expect(text).not.toContain('hipertensao_grau_2')
  })

  // Um prontuário é também o registro do que não foi preenchido.
  it('mostra o campo não preenchido com travessão, em vez de omiti-lo', async () => {
    const { text } = await build(makeData({ data: { queixa: 'Cefaleia há três dias' } }))
    expect(text).toContain('Diagnóstico')
    expect(text).toContain('—')
  })

  it('agrupa os campos nas seções do modelo, na ordem delas', async () => {
    const { text } = await build(
      makeData({
        fields: [
          campo({ key: 'peso', label: 'Peso', order: 0, sectionKey: 'exame' }),
          campo({ key: 'queixa', label: 'Queixa principal', order: 1, sectionKey: 'anamnese' }),
        ],
        data: { peso: 62, queixa: 'Cefaleia' },
        sections: [
          { key: 'anamnese', title: 'Anamnese', order: 0 },
          { key: 'exame', title: 'Exame físico', order: 1 },
        ],
      }),
    )
    expect(text.indexOf('Anamnese')).toBeLessThan(text.indexOf('Exame físico'))
    expect(text.indexOf('Queixa principal')).toBeLessThan(text.indexOf('Peso'))
  })

  // O modelo pode ter sido excluído depois de o prontuário ser escrito. O
  // `sectionKey` continua congelado no registro, mas o título não existe mais.
  it('cai em lista plana quando o modelo não tem mais seções', async () => {
    const { text } = await build(
      makeData({
        fields: [campo({ key: 'peso', label: 'Peso', order: 0, sectionKey: 'exame' })],
        data: { peso: 62 },
        sections: [],
      }),
    )
    expect(text).toContain('Peso')
    expect(text).toContain('62')
  })

  it('não perde o campo cuja seção foi removida do modelo', async () => {
    const { text } = await build(
      makeData({
        fields: [
          campo({ key: 'peso', label: 'Peso', order: 0, sectionKey: 'secao_que_sumiu' }),
          campo({ key: 'queixa', label: 'Queixa principal', order: 1, sectionKey: 'anamnese' }),
        ],
        data: { peso: 62, queixa: 'Cefaleia' },
        sections: [{ key: 'anamnese', title: 'Anamnese', order: 0 }],
      }),
    )
    expect(text).toContain('Peso')
    expect(text).toContain('Queixa principal')
  })

  it('não cria seção vazia para o grupo sem campo nenhum', async () => {
    const { text } = await build(
      makeData({
        fields: [campo({ key: 'queixa', label: 'Queixa principal', order: 0, sectionKey: 'anamnese' })],
        data: { queixa: 'Cefaleia' },
        sections: [
          { key: 'anamnese', title: 'Anamnese', order: 0 },
          { key: 'vazia', title: 'Seção sem campos', order: 1 },
        ],
      }),
    )
    expect(text).not.toContain('Seção sem campos')
  })

  it('inclui as observações quando existem, e as omite quando não', async () => {
    const { text: com } = await build(makeData({ notes: 'Retorno em 30 dias.' }))
    expect(com).toContain('Observações')
    expect(com).toContain('Retorno em 30 dias.')

    const { text: sem } = await build(makeData())
    expect(sem).not.toContain('Observações')
  })

  // A diferença deste PDF para receita, atestado, pedido de exame e indicação
  // de vacina: é cópia de um registro, não documento atestado.
  it('não leva bloco de assinatura nem conselho profissional', async () => {
    const { text } = await build(makeData())
    expect(text).not.toContain('CRM')
    expect(text).not.toContain('RQE')
    // A linha de assinatura dos outros documentos tem 200pt.
    expect(text).not.toContain('"x2":200')
  })

  it('só embute o logo quando ele é um data-URI', async () => {
    const { text: comLogo } = await build(makeData(), 'data:image/png;base64,AAAA')
    expect(comLogo).toContain('data:image/png;base64,AAAA')

    const { text: comLixo } = await build(makeData(), 'https://exemplo.com/logo.png')
    expect(comLixo).not.toContain('https://exemplo.com/logo.png')
  })

  // Prontuário é o documento longo da casa: trinta campos com textarea passam
  // da página. Estas três asserções cobrem o que faltava aos outros quatro.
  describe('em mais de uma página', () => {
    it('identifica a clínica no topo das páginas de continuação', async () => {
      const { definition } = await build(makeData())
      expect(definition.header(1)).toBeUndefined()
      expect(definition.header(2)).toMatchObject({ text: 'Clínica Pulso' })
    })

    it('numera as páginas, e só quando há mais de uma', async () => {
      const { definition } = await build(makeData())
      expect(definition.footer(1, 1)).toBeUndefined()
      expect(definition.footer(2, 2)).toMatchObject({ text: '2 de 2' })
    })

    // Rótulo no pé de uma página e valor no topo da seguinte é a maneira mais
    // fácil de um prontuário impresso ser lido errado.
    it('mantém rótulo e valor na mesma página', async () => {
      const { definition } = await build(makeData())
      const linhas = definition.content.filter(
        (node: any) => node.unbreakable === true && Array.isArray(node.stack),
      )
      expect(linhas).toHaveLength(2)
    })
  })

  it('mantém a definição do documento estável', async () => {
    const { definition } = await build(
      makeData({
        notes: 'Retorno em 30 dias.',
        sections: [{ key: 'anamnese', title: 'Anamnese', order: 0 }],
      }),
    )
    expect(definition).toMatchSnapshot()
  })
})
