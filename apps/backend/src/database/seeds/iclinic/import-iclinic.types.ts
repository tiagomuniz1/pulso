/**
 * Contratos do importador do IClinic — separados da orquestração para o runner
 * e os testes não arrastarem o `DataSource` junto.
 */

export interface ImportTargets {
  /** Slug da clínica que recebe o acervo principal (ginecologia/obstetrícia). */
  clinicSlug: string
  /** E-mail do profissional dono desse acervo. */
  professionalEmail: string
  /** Slug da clínica que recebe o acervo de ortopedia. */
  orthopedicsClinicSlug: string
  orthopedicsProfessionalEmail: string
}

export interface ImportOptions extends ImportTargets {
  /** Diretório do export (os três CSVs). */
  dir: string
  /** Relata sem gravar. */
  dryRun: boolean
  logger?: (message: string) => void
}

export interface PhaseCount {
  read: number
  created: number
  matched: number
  skipped: number
}

export interface ImportReport {
  dryRun: boolean
  patients: PhaseCount
  appointments: PhaseCount
  medicalRecords: PhaseCount
  templates: PhaseCount
  labels: PhaseCount
  scheduleExceptions: PhaseCount
  /** Casos que exigem olho humano depois da carga. */
  attention: {
    patientsWithoutDocument: string[]
    synthesizedEmails: string[]
    mergedDuplicates: string[]
    partialAddresses: string[]
    matchedExistingPatients: string[]
    futureAppointmentsOffGrid: string[]
    slotConflicts: string[]
    discardedEvents: string[]
  }
}

export function emptyPhaseCount(): PhaseCount {
  return { read: 0, created: 0, matched: 0, skipped: 0 }
}

export function emptyReport(dryRun: boolean): ImportReport {
  return {
    dryRun,
    patients: emptyPhaseCount(),
    appointments: emptyPhaseCount(),
    medicalRecords: emptyPhaseCount(),
    templates: emptyPhaseCount(),
    labels: emptyPhaseCount(),
    scheduleExceptions: emptyPhaseCount(),
    attention: {
      patientsWithoutDocument: [],
      synthesizedEmails: [],
      mergedDuplicates: [],
      partialAddresses: [],
      matchedExistingPatients: [],
      futureAppointmentsOffGrid: [],
      slotConflicts: [],
      discardedEvents: [],
    },
  }
}

export function formatReport(report: ImportReport): string {
  const lines: string[] = []
  const phase = (name: string, count: PhaseCount) =>
    `  ${name.padEnd(22)} lidos=${String(count.read).padStart(5)}  criados=${String(count.created).padStart(5)}  casados=${String(count.matched).padStart(5)}  pulados=${String(count.skipped).padStart(5)}`

  lines.push('')
  lines.push(report.dryRun ? '=== SIMULAÇÃO (nada foi gravado) ===' : '=== CARGA CONCLUÍDA ===')
  lines.push(phase('Modelos de prontuário', report.templates))
  lines.push(phase('Rótulos de consulta', report.labels))
  lines.push(phase('Pacientes', report.patients))
  lines.push(phase('Bloqueios de agenda', report.scheduleExceptions))
  lines.push(phase('Consultas', report.appointments))
  lines.push(phase('Prontuários', report.medicalRecords))

  const section = (title: string, items: string[]) => {
    if (items.length === 0) return
    lines.push('')
    lines.push(`--- ${title} (${items.length}) ---`)
    items.forEach((item) => lines.push(`  • ${item}`))
  }

  section('Pacientes já existentes no Pulso (casados, não recriados)', report.attention.matchedExistingPatients)
  section('Pacientes sem CPF', report.attention.patientsWithoutDocument)
  section('Cadastros duplicados mesclados', report.attention.mergedDuplicates)
  section('E-mails sintetizados', report.attention.synthesizedEmails)
  section('Endereços incompletos', report.attention.partialAddresses)
  section('Consultas futuras fora da grade — remarcar', report.attention.futureAppointmentsOffGrid)
  section('Horário ocupado por outra paciente — remarcar', report.attention.slotConflicts)
  section('Eventos descartados', report.attention.discardedEvents)

  lines.push('')
  return lines.join('\n')
}
