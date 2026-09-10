'use client'

import { useState } from 'react'
import { AppointmentLabelColor } from '@app/shared'
import { cn } from '@/lib/cn'
import { Input } from '@/components/ui/atoms/input/input'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { ModalFormActions } from '@/components/ui/molecules/modal-form-actions/modal-form-actions'
import { LABEL_STRIP_CLASS } from '../constants/label-color-classes'
import { AppointmentLabelColorPicker } from './appointment-label-color-picker'
import type { IAppointmentLabelModel } from '../types/appointment-label-model.types'

interface AppointmentLabelFormProps {
  label?: IAppointmentLabelModel
  isPending: boolean
  globalError?: string | null
  onSubmit: (values: { name: string; color: AppointmentLabelColor }) => void
}

const NOME_MAXIMO = 40

export function AppointmentLabelForm({
  label,
  isPending,
  globalError,
  onSubmit,
}: AppointmentLabelFormProps) {
  const [name, setName] = useState(label?.name ?? '')
  const [color, setColor] = useState<AppointmentLabelColor | undefined>(label?.color)
  const [erros, setErros] = useState<{ name?: string; color?: string }>({})

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const nomeLimpo = name.trim()
    const novosErros: { name?: string; color?: string } = {}
    if (nomeLimpo.length < 2) novosErros.name = 'Mínimo 2 caracteres'
    if (nomeLimpo.length > NOME_MAXIMO) novosErros.name = `Máximo ${NOME_MAXIMO} caracteres`
    if (!color) novosErros.color = 'Escolha uma cor'

    setErros(novosErros)
    if (Object.keys(novosErros).length > 0) return

    onSubmit({ name: nomeLimpo, color: color! })
  }

  return (
    <form onSubmit={handleSubmit} data-testid="appointment-label-form" noValidate>
      <div className="flex flex-col gap-4">
        {globalError && (
          <Alert variant="error" data-testid="appointment-label-form-error">
            {globalError}
          </Alert>
        )}

        <Input
          label="Nome *"
          id="appointment-label-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={NOME_MAXIMO}
          placeholder="Ex: Retorno"
          error={erros.name}
          data-testid="appointment-label-form-name"
        />

        <AppointmentLabelColorPicker
          value={color}
          onChange={(escolhida) => setColor(escolhida)}
          error={erros.color}
        />

        {/* Amarra "escolhi verde" a "é assim que vai aparecer": a mesma faixa
            de 4px que a agenda desenha, no bloco de verdade. */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-text-dim">Como vai aparecer na agenda</span>
          <div
            data-testid="appointment-label-form-preview"
            className="relative flex items-center gap-2 overflow-hidden rounded-md border border-accent bg-accent/10 px-3 py-2 pl-4 text-sm"
          >
            {color && (
              <span
                aria-hidden="true"
                data-testid="appointment-label-form-preview-strip"
                className={cn('absolute inset-y-0 left-0 w-1', LABEL_STRIP_CLASS[color])}
              />
            )}
            <span className="w-12 shrink-0 font-mono text-xs">08:00</span>
            <span className="truncate font-medium">Maria Silva</span>
          </div>
        </div>
      </div>

      <ModalFormActions>
        <Button
          type="submit"
          isLoading={isPending}
          disabled={isPending}
          data-testid="appointment-label-form-submit"
        >
          {label ? 'Salvar' : 'Criar rótulo'}
        </Button>
      </ModalFormActions>
    </form>
  )
}
