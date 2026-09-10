'use client'

import { APPOINTMENT_LABEL_COLOR_LABELS, APPOINTMENT_LABEL_COLOR_ORDER } from '@app/shared'
import type { AppointmentLabelColor } from '@app/shared'
import { cn } from '@/lib/cn'
import { LABEL_STRIP_CLASS } from '../constants/label-color-classes'

interface AppointmentLabelColorPickerProps {
  value: AppointmentLabelColor | undefined
  onChange: (color: AppointmentLabelColor) => void
  error?: string
}

/**
 * Grade de amostras, e não um `<select>`.
 *
 * Um select com dezesseis nomes obriga a abrir, ler, fechar e comparar de
 * memória — e o dado que interessa, o tom, não aparece na lista fechada.
 *
 * Cada amostra é um radio nativo escondido dentro do label: dá navegação por
 * teclado e leitura de tela de graça, e o estado selecionado sai do
 * `peer-checked` sem estado extra em React.
 */
export function AppointmentLabelColorPicker({
  value,
  onChange,
  error,
}: AppointmentLabelColorPickerProps) {
  return (
    <fieldset data-testid="appointment-label-form-color">
      <legend className="mb-1.5 text-sm text-text-dim">Cor *</legend>
      <div className="grid grid-cols-8 gap-2">
        {APPOINTMENT_LABEL_COLOR_ORDER.map((color) => (
          <label key={color} className="cursor-pointer">
            <input
              type="radio"
              name="appointment-label-color"
              value={color}
              checked={value === color}
              onChange={() => onChange(color)}
              aria-label={APPOINTMENT_LABEL_COLOR_LABELS[color]}
              data-testid={`appointment-label-color-${color}`}
              className="peer sr-only"
            />
            <span
              aria-hidden="true"
              title={APPOINTMENT_LABEL_COLOR_LABELS[color]}
              className={cn(
                'block h-8 w-full rounded-md ring-offset-2 ring-offset-surface-2',
                'peer-focus-visible:ring-2 peer-focus-visible:ring-text',
                'peer-checked:ring-2 peer-checked:ring-accent',
                LABEL_STRIP_CLASS[color],
              )}
            />
          </label>
        ))}
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-danger" data-testid="appointment-label-form-color-error">
          {error}
        </p>
      )}
    </fieldset>
  )
}
