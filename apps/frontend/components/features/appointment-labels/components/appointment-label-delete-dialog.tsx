'use client'

import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import type { IAppointmentLabelModel } from '../types/appointment-label-model.types'

interface AppointmentLabelDeleteDialogProps {
  label: IAppointmentLabelModel | null
  isOpen: boolean
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
}

export function AppointmentLabelDeleteDialog({
  label,
  isOpen,
  isPending,
  onClose,
  onConfirm,
}: AppointmentLabelDeleteDialogProps) {
  if (!label) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Excluir rótulo"
      data-testid="appointment-label-delete-dialog"
    >
      <p className="mb-6 text-sm text-text-dim">
        Deseja excluir o rótulo <strong>&quot;{label.name}&quot;</strong>? As consultas que o usam
        ficam sem rótulo na agenda. Se a ideia é apenas parar de usá-lo em consultas novas,
        desative-o em vez de excluir.
      </p>
      <div className="flex justify-end gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          disabled={isPending}
          data-testid="appointment-label-delete-dialog-cancel"
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onConfirm}
          isLoading={isPending}
          disabled={isPending}
          data-testid="appointment-label-delete-dialog-confirm"
        >
          Excluir
        </Button>
      </div>
    </Modal>
  )
}
