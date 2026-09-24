import { MedicalRecordFieldType } from '@app/shared'
import { IClinicRecordBlock, IClinicRecordRow } from './iclinic-csv.parser'
import { htmlToPlainText } from './html-to-plain-text.util'
import { FIELD_KEY_BY_TAB_AND_LABEL, ICLINIC_TEMPLATES } from './iclinic-templates'

/**
 * Prontuário do IClinic → o `data` jsonb do Pulso.
 *
 * O conteúdo vem como uma lista de blocos, cada um com o rótulo do campo, o tipo
 * (`kind`) e o formulário a que pertence (`tab`). A conversão é por tipo:
 *
 * | `kind` | vira | por quê |
 * |---|---|---|
 * | `lt` | texto plano | HTML rico sem destino: o viewer é `whitespace-pre-wrap` |
 * | `st` | texto cru | já é texto curto |
 * | `da` | `AAAA-MM-DD` | é o formato que o `DATE` do Pulso lê |
 * | `db` | texto | CID livre; `multiselect` congelaria a lista de opções |
 * | `bm` | texto | IMC com peso e altura, uma medição por linha |
 */

export interface MappedRecord {
  externalId: string
  tab: string
  templateName: string
  data: Record<string, unknown>
  /** Conteúdo de um segundo formulário no mesmo prontuário, se houver. */
  notes: string | null
}

const FIELD_TYPE_BY_KEY = new Map<string, MedicalRecordFieldType>(
  ICLINIC_TEMPLATES.flatMap((template) =>
    template.fields.map((field) => [`${template.tab}::${field.key}`, field.type] as const),
  ),
)

const TEMPLATE_NAME_BY_TAB = new Map(ICLINIC_TEMPLATES.map((template) => [template.tab, template.name]))

/** `DD/MM/AAAA` → `AAAA-MM-DD`. Devolve `null` para qualquer outra coisa. */
export function toIsoDate(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((value ?? '').trim())
  if (!match) return null
  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

/** Uma medição de IMC por linha: `Peso 85,2 kg · Altura 164 cm · IMC 31,68`. */
export function formatBodyMass(entries: unknown): string {
  if (!Array.isArray(entries)) return ''

  return entries
    .map((entry) => {
      const { weight, height, bmi_value: bmi } = (entry ?? {}) as Record<string, unknown>
      const parts: string[] = []
      if (weight != null) parts.push(`Peso ${formatNumber(weight)} kg`)
      if (height != null) parts.push(`Altura ${formatNumber(height)} cm`)
      if (bmi != null) parts.push(`IMC ${formatNumber(bmi)}`)
      return parts.join(' · ')
    })
    .filter((line) => line !== '')
    .join('\n')
}

function formatNumber(value: unknown): string {
  const parsed = typeof value === 'number' ? value : Number(value)
  if (Number.isNaN(parsed)) return String(value)
  return parsed.toFixed(2).replace(/\.?0+$/, '').replace('.', ',')
}

export function blockToValue(block: IClinicRecordBlock, fieldType: MedicalRecordFieldType): unknown {
  const value = block.value

  switch (block.kind) {
    case 'da':
      return fieldType === MedicalRecordFieldType.DATE
        ? toIsoDate(String(value ?? ''))
        : String(value ?? '')
    case 'bm':
      return formatBodyMass(value)
    case 'db':
      return Array.isArray(value) ? value.map(String).join('\n') : String(value ?? '')
    case 'lt':
      return htmlToPlainText(String(value ?? ''))
    default:
      return typeof value === 'string' ? value : value == null ? '' : String(value)
  }
}

/** O formulário do prontuário é o `tab` com mais blocos preenchidos. */
export function resolvePrimaryTab(blocks: IClinicRecordBlock[]): string | null {
  const counts = new Map<string, number>()
  for (const block of blocks) {
    if (!block.tab) continue
    counts.set(block.tab, (counts.get(block.tab) ?? 0) + 1)
  }
  if (counts.size === 0) return null

  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

export function mapMedicalRecord(row: IClinicRecordRow): MappedRecord | null {
  const primaryTab = resolvePrimaryTab(row.blocks)
  // Dois prontuários do acervo não têm bloco nenhum. Ainda assim são registros
  // de que a consulta gerou prontuário — entram vazios, no formulário do
  // procedimento, e quem abrir vê o que o IClinic tinha: nada.
  const tab = primaryTab ?? ICLINIC_TEMPLATES[0].tab
  const templateName = TEMPLATE_NAME_BY_TAB.get(tab)
  if (!templateName) return null

  const labelToKey = FIELD_KEY_BY_TAB_AND_LABEL[tab] ?? {}
  const data: Record<string, unknown> = {}
  const leftovers: string[] = []

  const ordered = [...row.blocks].sort((a, b) => (a.date_added ?? '').localeCompare(b.date_added ?? ''))

  for (const block of ordered) {
    if (block.tab !== tab) {
      // Bloco de um segundo formulário: vai para `notes`, senão o `data`
      // carregaria chave que o snapshot do modelo não conhece — e o backend
      // recusa a edição com "Unknown field key".
      const text = String(blockToValue(block, MedicalRecordFieldType.TEXTAREA) ?? '').trim()
      if (text) leftovers.push(`${block.tab ?? 'Outro formulário'} — ${block.name ?? ''}\n${text}`.trim())
      continue
    }

    const key = labelToKey[block.name ?? '']
    if (!key) continue

    const fieldType = FIELD_TYPE_BY_KEY.get(`${tab}::${key}`) ?? MedicalRecordFieldType.TEXTAREA
    const value = blockToValue(block, fieldType)
    if (value === null || value === '') continue

    // Trinta e um prontuários repetem o mesmo campo, preenchido em momentos
    // diferentes da consulta. Concatenar preserva os dois; sobrescrever perderia
    // o primeiro.
    const existing = data[key]
    data[key] =
      existing === undefined || fieldType === MedicalRecordFieldType.DATE
        ? value
        : `${existing}\n\n${value}`
  }

  return {
    externalId: row.pk,
    tab,
    templateName,
    data,
    notes: leftovers.length > 0 ? leftovers.join('\n\n') : null,
  }
}
