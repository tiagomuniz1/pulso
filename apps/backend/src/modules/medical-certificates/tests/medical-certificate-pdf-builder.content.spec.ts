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
import { CouncilType, MedicalCertificateSnapshot, MedicalCertificateType } from '@app/shared'
import { PdfDocumentService } from '../../../common/pdf/pdf-document.service'
import { MedicalCertificatePdfBuilderService } from '../services/medical-certificate-pdf-builder.service'

const makeSnapshot = (
  overrides: Partial<MedicalCertificateSnapshot> = {},
): MedicalCertificateSnapshot => ({
  issuedAt: '2026-09-04T10:00:00.000Z',
  type: MedicalCertificateType.LEAVE,
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
  daysOff: 3,
  startDate: '2026-09-04',
  cidCode: null,
  attendanceDate: null,
  checkInTime: null,
  checkOutTime: null,
  observations: null,
  ...overrides,
})

async function build(
  snapshot: MedicalCertificateSnapshot,
  logo: string | null = null,
): Promise<{ text: string; definition: object }> {
  const pdfDocumentService = new PdfDocumentService()
  pdfDocumentService.onModuleInit()
  const service = new MedicalCertificatePdfBuilderService(pdfDocumentService)
  await service.build(snapshot, logo)
  const definition = (pdfmake.createPdf as jest.Mock).mock.calls.at(-1)![0] as object
  return { text: JSON.stringify(definition), definition }
}

describe('MedicalCertificatePdfBuilderService — conteúdo do documento', () => {
  beforeEach(() => jest.clearAllMocks())

  it('nomeia o documento como atestado', async () => {
    const { text } = await build(makeSnapshot())
    expect(text).toContain('Atestado')
    expect(text).not.toContain('Receituário')
  })

  it('traz a clínica e o endereço no cabeçalho', async () => {
    const { text } = await build(makeSnapshot())
    expect(text).toContain('Clínica Pulso')
    expect(text).toContain('Rua das Flores, 100, Sala 2')
    expect(text).toContain('Centro — São Paulo — SP')
    expect(text).toContain('CEP 01001000')
  })

  it('escreve o afastamento com paciente, CPF formatado, dias e data', async () => {
    const { text } = await build(makeSnapshot())
    expect(text).toContain('Clara Monteiro Alves')
    expect(text).toContain('123.456.789-01')
    expect(text).toContain('3 dias')
    expect(text).toContain('04/09/2026')
  })

  it('escreve dia no singular quando o afastamento é de um dia só', async () => {
    const { text } = await build(makeSnapshot({ daysOff: 1 }))
    expect(text).toContain('1 dia,')
    expect(text).not.toContain('1 dias')
  })

  it('inclui o CID quando informado, e o omite quando não', async () => {
    const { text: comCid } = await build(makeSnapshot({ cidCode: 'M54.5' }))
    expect(comCid).toContain('CID: M54.5')

    const { text: semCid } = await build(makeSnapshot())
    expect(semCid).not.toContain('CID:')
  })

  it('escreve comparecimento com os horários quando o tipo é de presença', async () => {
    const { text } = await build(
      makeSnapshot({
        type: MedicalCertificateType.ATTENDANCE,
        daysOff: null,
        startDate: null,
        attendanceDate: '2026-09-04',
        checkInTime: '09:00',
        checkOutTime: '10:30',
      }),
    )
    expect(text).toContain('compareceu a esta consulta em 04/09/2026')
    expect(text).toContain('das 09:00 às 10:30')
  })

  it('assina com nome, conselho e especialidade', async () => {
    const { text } = await build(makeSnapshot())
    expect(text).toContain('São Paulo, 4 de setembro de 2026')
    expect(text).toContain('Dra. Helena Vasconcelos')
    expect(text).toContain('CRM 12345/SP')
    expect(text).toContain('Ginecologia e Obstetrícia')
  })

  it('acrescenta o RQE à linha do conselho quando existe', async () => {
    const { text } = await build(
      makeSnapshot({
        professional: { ...makeSnapshot().professional, registryNumber: '54321' },
      }),
    )
    expect(text).toContain('CRM 12345/SP · RQE 54321')
  })

  it('diz "Não informado" quando o paciente não tem CPF', async () => {
    const { text } = await build(
      makeSnapshot({ patient: { name: 'Clara Monteiro Alves', documentNumber: null } }),
    )
    expect(text).toContain('Não informado')
  })

  // Uma imagem que não é data-URI viria de um logo corrompido ou de uma URL que o
  // fetcher não conseguiu resolver. Embutir isso derrubaria o pdfmake e com ele
  // todos os PDFs da clínica.
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

  it('mantém a definição do documento estável com logo', async () => {
    const { definition } = await build(makeSnapshot(), 'data:image/png;base64,AAAA')
    expect(definition).toMatchSnapshot()
  })

  it('mantém a definição do documento estável no atestado de comparecimento', async () => {
    const { definition } = await build(
      makeSnapshot({
        type: MedicalCertificateType.ATTENDANCE,
        daysOff: null,
        startDate: null,
        attendanceDate: '2026-09-04',
        checkInTime: '09:00',
        checkOutTime: '10:30',
        observations: 'Paciente orientada a retornar em sete dias.',
      }),
    )
    expect(definition).toMatchSnapshot()
  })
})
