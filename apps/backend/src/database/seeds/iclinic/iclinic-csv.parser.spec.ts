import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { decodeJsonPack, readPatients, readRecords, readSchedulings } from './iclinic-csv.parser'

describe('decodeJsonPack', () => {
  it('decodes the json:: prefix the IClinic uses for composite columns', () => {
    expect(decodeJsonPack('json::[{"name": "Consulta"}]', [])).toEqual([{ name: 'Consulta' }])
  })

  it('falls back when the column is empty or not packed', () => {
    expect(decodeJsonPack(undefined, [])).toEqual([])
    expect(decodeJsonPack('', [])).toEqual([])
    expect(decodeJsonPack('Particular', [])).toEqual([])
  })

  it('falls back instead of throwing on malformed JSON', () => {
    expect(decodeJsonPack('json::{quebrado', { block: [] })).toEqual({ block: [] })
  })
})

describe('leitura dos CSVs', () => {
  let dir: string

  beforeAll(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'iclinic-'))

    fs.writeFileSync(
      path.join(dir, '23-09-2026-patient.csv'),
      'patient_id,name,birthdate,gender,cpf,mobile_phone,email,date_added\n' +
        '549928,Mykaelle Nicandro Pereira,2001-05-30,f,11392731402,(83) 98640-4309,m@example.com,2025-06-10T23:09:35+00:00\n',
    )

    fs.writeFileSync(
      path.join(dir, '23-09-2026-event_scheduling.csv'),
      'pk,patient_id,date,start_time,end_time,status,procedure_pack\n' +
        '480431231,549928,2025-06-11,08:00:00,08:45:00,cp,"json::[{""name"": ""Consulta pré-natal""}]"\n',
    )

    fs.writeFileSync(
      path.join(dir, '23-09-2026-event_record.csv'),
      'pk,patient_id,date,start_time,end_time,procedure_pack,eventblock_pack\n' +
        '481322830,549928,2025-06-11,08:00:00,08:40:00,"json::[{""name"": ""Consulta Ginecológica""}]","json::{""block"": [{""name"": ""Conduta"", ""kind"": ""lt"", ""tab"": ""ATENDIMENTO GINECOLOGICO"", ""value"": ""<p>Oi</p>""}]}"\n',
    )
  })

  afterAll(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('reads the patients file', () => {
    const patients = readPatients(dir)

    expect(patients).toHaveLength(1)
    expect(patients[0].patient_id).toBe('549928')
    expect(patients[0].name).toBe('Mykaelle Nicandro Pereira')
  })

  it('reads the schedulings and unpacks the procedures', () => {
    const schedulings = readSchedulings(dir)

    expect(schedulings).toHaveLength(1)
    expect(schedulings[0].procedures).toEqual([{ name: 'Consulta pré-natal' }])
  })

  it('reads the records and unpacks the blocks', () => {
    const records = readRecords(dir)

    expect(records).toHaveLength(1)
    expect(records[0].procedures).toEqual([{ name: 'Consulta Ginecológica' }])
    expect(records[0].blocks).toHaveLength(1)
    expect(records[0].blocks[0].name).toBe('Conduta')
  })

  it('says which file is missing instead of failing obscurely', () => {
    const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'iclinic-vazio-'))
    expect(() => readPatients(empty)).toThrow('-patient.csv')
    fs.rmSync(empty, { recursive: true, force: true })
  })
})
