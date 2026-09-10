import { cn } from '@/lib/cn'
import type { AppointmentLabelColor } from '@app/shared'
import { LABEL_PILL_CLASS } from '../constants/label-color-classes'

interface AppointmentLabelPillProps {
  name: string
  color: AppointmentLabelColor
  className?: string
  'data-testid'?: string
}

/**
 * O rótulo com o nome escrito.
 *
 * A pílula sempre mostra o nome, nunca só a cor: as dezesseis têm luminosidade
 * constante de propósito, o que as faz lerem como família — e tira de quem tem
 * daltonismo a rota de escape de distinguir por claro/escuro.
 *
 * `rounded-full` e não `rounded-md`: o raio do tema varia de 2px a 32px, e uma
 * pílula precisa ser sempre uma pílula.
 */
export function AppointmentLabelPill({
  name,
  color,
  className,
  'data-testid': testId,
}: AppointmentLabelPillProps) {
  return (
    <span
      data-testid={testId ?? 'appointment-label-pill'}
      data-label-color={color}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        LABEL_PILL_CLASS[color],
        className,
      )}
    >
      {name}
    </span>
  )
}
