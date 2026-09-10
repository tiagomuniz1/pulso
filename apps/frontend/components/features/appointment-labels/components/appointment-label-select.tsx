'use client'

import { useAppointmentLabels } from '../hooks/use-appointment-labels.hook'
import { cn } from '@/lib/cn'
import { LABEL_STRIP_CLASS } from '../constants/label-color-classes'
import type { IAppointmentLabelRefModel } from '@/components/features/appointments/types/appointment-model.types'

interface AppointmentLabelSelectProps {
  value: IAppointmentLabelRefModel | null
  isPending: boolean
  onChange: (labelId: string | null) => void
  'data-testid'?: string
}

/**
 * Escolhe o rótulo da consulta. Salva no `onChange`, sem botão — é um campo só.
 *
 * Lista apenas os ativos: desativar um rótulo significa "pare de usar em coisas
 * novas", e as consultas que já o têm continuam coloridas.
 */
export function AppointmentLabelSelect({
  value,
  isPending,
  onChange,
  'data-testid': testId,
}: AppointmentLabelSelectProps) {
  const { data } = useAppointmentLabels({ isActive: true, limit: 100 })
  const labels = data?.data ?? []

  return (
    <div className="flex min-w-0 items-center gap-2">
      <select
        value={value?.id ?? ''}
        disabled={isPending}
        onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        data-testid={testId ?? 'appointment-label-select'}
        className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 py-1 text-sm text-text disabled:opacity-50"
      >
        <option value="">Sem rótulo</option>
        {labels.map((label) => (
          <option key={label.id} value={label.id}>
            {label.name}
          </option>
        ))}
      </select>
      {/* Amostra, e não a pílula: o select já mostra o nome, e repeti-lo ao lado
          estourava a coluna do `<dl>` do diálogo, que tem cerca de 190px. O que
          falta ali é só a cor. */}
      {value && (
        <span
          aria-hidden="true"
          title={value.name}
          data-testid="appointment-label-swatch"
          data-label-color={value.color}
          className={cn('h-5 w-5 shrink-0 rounded-md', LABEL_STRIP_CLASS[value.color])}
        />
      )}
    </div>
  )
}
