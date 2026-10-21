import { DAY_OF_WEEK_LABELS, type IScheduleModel } from '@app/core'
import { ListCard, ListCardAction, ListCardActionSpacer } from '../../../components/ui/list-card'

/** "07:00:00" → "07:00". O backend devolve com segundos; a tela não as usa. */
export function formatTime(time: string): string {
  return time.slice(0, 5)
}

/**
 * "Indefinida", "até 31/12/2026", "a partir de 01/01/2026" ou o intervalo.
 *
 * Uma agenda sem datas vale para sempre, e é o caso comum — escrever
 * "— / —" ocuparia a linha sem dizer nada.
 */
export function formatValidity(validFrom: string | null, validUntil: string | null): string {
  const toBr = (iso: string) => iso.split('-').reverse().join('/')
  if (!validFrom && !validUntil) return 'Indefinida'
  if (validFrom && !validUntil) return `A partir de ${toBr(validFrom)}`
  if (!validFrom && validUntil) return `Até ${toBr(validUntil)}`
  return `${toBr(validFrom as string)} — ${toBr(validUntil as string)}`
}

/**
 * Sem `canManage`: quem chega à listagem de agendas gere o que vê.
 *
 * O item nem está no menu da recepção, o PROFESSIONAL recebe só as próprias
 * (recorte do servidor) e o ADMIN gere todas. Uma prop que é sempre
 * verdadeira é um ramo que nenhum teste alcança e uma pergunta que o leitor
 * se faz à toa.
 */
export function ScheduleCard({
  schedule,
  onOpen,
  onEdit,
  onDelete,
}: {
  schedule: IScheduleModel
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <ListCard
      testID={`schedule-card-${schedule.id}`}
      title={schedule.professionalName}
      rows={[
        { label: 'Dia da semana', value: DAY_OF_WEEK_LABELS[schedule.dayOfWeek] },
        {
          label: 'Horário',
          value: `${formatTime(schedule.startTime)} — ${formatTime(schedule.endTime)}`,
        },
        { label: 'Duração do slot', value: `${schedule.slotDurationInMinutes} min` },
        { label: 'Validade', value: formatValidity(schedule.validFrom, schedule.validUntil) },
      ]}
      actions={
        <>
          <ListCardAction
            label="Excluir"
            tone="danger"
            onPress={onDelete}
            testID={`schedule-card-delete-${schedule.id}`}
          />
          <ListCardAction
            label="Editar"
            onPress={onEdit}
            testID={`schedule-card-edit-${schedule.id}`}
          />
          <ListCardActionSpacer />
          <ListCardAction
            label="Ver detalhes ›"
            onPress={onOpen}
            testID={`schedule-card-open-${schedule.id}`}
          />
        </>
      }
    />
  )
}
