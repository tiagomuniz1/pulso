const DURACAO_MINIMA = 15
const DURACAO_MAXIMA = 120
const MAXIMO_DE_SUGESTOES = 3

/**
 * As durações que uma clínica de fato usa. Sugerir 36 ou 48 minutos é
 * matematicamente correto e inútil: ninguém marca consulta assim. Só se nenhuma
 * destas couber é que vale oferecer as demais.
 */
const DURACOES_USUAIS = [15, 20, 30, 40, 45, 60, 90, 120]
const MINUTOS_NO_DIA = 24 * 60

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

function minutesToTime(total: number): string {
  const hours = Math.floor(total / 60)
  const minutes = total % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

/** "9h", "4h", "3h30", "45 min" — como alguém leria em voz alta. */
function formatarJanela(minutos: number): string {
  const horas = Math.floor(minutos / 60)
  const resto = minutos % 60
  if (horas === 0) return `${resto} min`
  if (resto === 0) return `${horas}h`
  return `${horas}h${String(resto).padStart(2, '0')}`
}

/** Durações entre 15 e 120 minutos que fecham a janela sem sobra. */
export function duracoesQueCabem(intervalo: number): number[] {
  const cabem: number[] = []
  for (let duracao = DURACAO_MINIMA; duracao <= DURACAO_MAXIMA; duracao += 1) {
    if (intervalo % duracao === 0) cabem.push(duracao)
  }
  return cabem
}

/**
 * Explica por que a duração escolhida não fecha a janela — e o que fazer.
 *
 * A regra em si é do domínio e vale nos dois lados: o expediente não pode
 * terminar num encaixe pela metade. O que faltava era o retorno. A mensagem
 * anterior dizia apenas "o intervalo deve ser divisível pela duração do slot",
 * ancorada no campo da duração — quem cadastrava lia que 40 minutos era um valor
 * proibido, quando 40 é perfeitamente válido em outra janela. Aqui a conta
 * aparece e as duas saídas são oferecidas: mudar a duração ou mudar o horário.
 *
 * Devolve `null` quando fecha certinho.
 */
export function describeSlotMismatch(
  startTime: string,
  endTime: string,
  slotDurationInMinutes: number,
): string | null {
  const inicio = timeToMinutes(startTime)
  const fim = timeToMinutes(endTime)
  const intervalo = fim - inicio

  if (intervalo <= 0 || slotDurationInMinutes <= 0) return null
  const sobra = intervalo % slotDurationInMinutes
  if (sobra === 0) return null

  const abertura =
    `A janela das ${startTime} às ${endTime} tem ${formatarJanela(intervalo)} e não fecha ` +
    `em blocos de ${slotDurationInMinutes} min — sobrariam ${sobra} min no fim.`

  const todas = duracoesQueCabem(intervalo).filter((d) => d !== slotDurationInMinutes)
  const usuais = todas.filter((d) => DURACOES_USUAIS.includes(d))
  const alternativas = usuais.length > 0 ? usuais : todas
  // As mais próximas do que a pessoa pediu: quem quer 40 se contenta melhor com
  // 45 do que com 15.
  const sugestoes = alternativas
    .slice()
    .sort((a, b) => Math.abs(a - slotDurationInMinutes) - Math.abs(b - slotDurationInMinutes))
    .slice(0, MAXIMO_DE_SUGESTOES)
    .sort((a, b) => a - b)

  // Esticar o expediente até o próximo múltiplo mantém a duração pedida.
  const fimAjustado = fim + (slotDurationInMinutes - sobra)
  const novoFim = fimAjustado < MINUTOS_NO_DIA ? minutesToTime(fimAjustado) : null

  const saidas: string[] = []
  if (sugestoes.length > 0) {
    const lista =
      sugestoes.length === 1
        ? `${sugestoes[0]}`
        : `${sugestoes.slice(0, -1).join(', ')} ou ${sugestoes[sugestoes.length - 1]}`
    saidas.push(`use ${lista} min`)
  }
  if (novoFim) {
    saidas.push(`termine às ${novoFim} para manter ${slotDurationInMinutes} min`)
  }

  if (saidas.length === 0) return `${abertura} Ajuste o horário de início ou de fim.`
  return `${abertura} Para resolver, ${saidas.join(', ou ')}.`
}
