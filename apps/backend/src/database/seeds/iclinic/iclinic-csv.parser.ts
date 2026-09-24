import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

/**
 * Leitura dos CSVs do export do IClinic.
 *
 * Duas particularidades do formato justificam este arquivo em vez de um
 * `csv-parse` solto em cada chamador:
 *
 * 1. Colunas compostas vêm como JSON prefixado por `json::` — é assim que o
 *    IClinic embute listas (procedimentos, blocos do prontuário) numa célula.
 * 2. O export é UTF-8, ao contrário do CSV da ANVISA, que é win1252 — nada de
 *    `iconv` aqui.
 */

export interface IClinicPatientRow {
  patient_id: string
  name: string
  birthdate: string
  gender: string
  cpf: string
  mobile_phone: string
  home_phone: string
  email: string
  zip_code: string
  address: string
  number: string
  complement: string
  neighborhood: string
  city: string
  state: string
  country: string
  date_added: string
}

export interface IClinicProcedure {
  name?: string
  duration?: string
  price?: string
}

export interface IClinicSchedulingRow {
  pk: string
  patient_id: string
  patient_name: string
  date: string
  start_time: string
  end_time: string
  status: string
  description: string
  all_day: string
  event_blocked_scheduling: string
  procedures: IClinicProcedure[]
}

export interface IClinicRecordBlock {
  name?: string
  kind?: string
  ordering?: number
  tab?: string
  value?: unknown
  date_added?: string
}

export interface IClinicRecordRow {
  pk: string
  patient_id: string
  date: string
  start_time: string
  end_time: string
  procedures: IClinicProcedure[]
  blocks: IClinicRecordBlock[]
}

/** `json::[...]` → o valor; qualquer outra coisa → o fallback. */
export function decodeJsonPack<T>(raw: string | undefined, fallback: T): T {
  if (!raw || !raw.startsWith('json::')) return fallback
  try {
    return JSON.parse(raw.slice('json::'.length)) as T
  } catch {
    return fallback
  }
}

function readCsv(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, 'utf8')
  return parse(content, {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Record<string, string>[]
}

/**
 * Acha o arquivo pelo sufixo, porque o export nomeia tudo com a data da
 * geração (`23-09-2026-patient.csv`) e amarrar o nome inteiro obrigaria a
 * reeditar o importador a cada export novo.
 */
function resolveFile(dir: string, suffix: string): string {
  const match = fs.readdirSync(dir).find((file) => file.endsWith(suffix))
  if (!match) throw new Error(`Arquivo terminado em "${suffix}" não encontrado em ${dir}`)
  return path.join(dir, match)
}

export function readPatients(dir: string): IClinicPatientRow[] {
  return readCsv(resolveFile(dir, '-patient.csv')) as unknown as IClinicPatientRow[]
}

export function readSchedulings(dir: string): IClinicSchedulingRow[] {
  return readCsv(resolveFile(dir, '-event_scheduling.csv')).map((row) => ({
    ...(row as unknown as IClinicSchedulingRow),
    procedures: decodeJsonPack<IClinicProcedure[]>(row.procedure_pack, []),
  }))
}

export function readRecords(dir: string): IClinicRecordRow[] {
  return readCsv(resolveFile(dir, '-event_record.csv')).map((row) => ({
    ...(row as unknown as IClinicRecordRow),
    procedures: decodeJsonPack<IClinicProcedure[]>(row.procedure_pack, []),
    blocks: decodeJsonPack<{ block?: IClinicRecordBlock[] }>(row.eventblock_pack, {}).block ?? [],
  }))
}
