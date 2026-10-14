/**
 * Datas da agenda, em horário local.
 *
 * `toISOString()` está proibido aqui, e o motivo é um bug que já custou caro
 * no backend: ele devolve UTC, e entre 21h e a meia-noite no Brasil isso é o
 * dia seguinte. A agenda abriria amanhã enquanto o consultório ainda atende
 * hoje. O aparelho está no fuso da clínica — os getters locais são a resposta
 * certa, não uma aproximação dela.
 */
const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

const WEEKDAYS_LONG = [
  'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
  'Quinta-feira', 'Sexta-feira', 'Sábado',
]

const pad = (value: number): string => String(value).padStart(2, '0')

/** `YYYY-MM-DD` a partir dos componentes locais da data. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function todayIsoDate(): string {
  return toIsoDate(new Date())
}

/**
 * Soma dias a uma data `YYYY-MM-DD`.
 *
 * Constrói a data pelos componentes, e não por `new Date('2026-03-10')`, que o
 * JavaScript interpreta como meia-noite **UTC** — em UTC-3 isso já é o dia 9.
 */
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return toIsoDate(new Date(year, month - 1, day + days))
}

/** "segunda, 10 de março" — o cabeçalho da agenda. */
export function formatAgendaDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return `${WEEKDAYS[date.getDay()]}, ${day} de ${MONTHS[month - 1]}`
}

/**
 * "Quinta-feira, 15 de outubro de 2026" — o rótulo da barra, como na web.
 *
 * Dia da semana por extenso com inicial maiúscula (`first-letter:uppercase` na
 * classe da web) e mês por extenso. Escrito à mão em vez de `Intl` porque o
 * Hermes nem sempre embarca os dados de locale, e um mês em inglês no meio da
 * agenda é pior do que duas tabelas de strings.
 */
export function formatToolbarDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const weekday = WEEKDAYS_LONG[new Date(year, month - 1, day).getDay()]
  return `${weekday}, ${day} de ${MONTHS[month - 1]} de ${year}`
}

/** "10/03/2026", para onde a data aparece ao lado de outro dado. */
export function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

/** `HH:MM:SS` do backend vira `HH:MM` — o segundo nunca significa nada aqui. */
export function formatTime(time: string): string {
  return time.slice(0, 5)
}

export function isToday(isoDate: string): boolean {
  return isoDate === todayIsoDate()
}
