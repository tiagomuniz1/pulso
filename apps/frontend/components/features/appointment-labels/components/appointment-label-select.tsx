'use client'

import { useAppointmentLabels } from '../hooks/use-appointment-labels.hook'
import { AppointmentLabelPill } from './appointment-label-pill'
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
    <div className="flex items-center gap-2">
      <select
        value={value?.id ?? ''}
        disabled={isPending}
        onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
        data-testid={testId ?? 'appointment-label-select'}
        className="rounded-lg border border-line bg-surface px-2 py-1 text-sm text-text disabled:opacity-50"
      >
        <option value="">Sem rótulo</option>
        {labels.map((label) => (
          <option key={label.id} value={label.id}>
            {label.name}
          </option>
        ))}
      </select>
      {value && <AppointmentLabelPill name={value.name} color={value.color} />}
    </div>
  )
}
