'use client'

import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'

interface ChangeTemplateDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

/**
 * Confirma a troca de modelo com o formulário já preenchido.
 *
 * Não há como aproveitar o que foi digitado: as chaves de campo são geradas com
 * sufixo aleatório, então dois modelos nunca compartilham chave nem para o mesmo
 * rótulo. Trocar recomeça, e isso precisa ser dito antes e não depois.
 */
export function ChangeTemplateDialog({ isOpen, onClose, onConfirm }: ChangeTemplateDialogProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Trocar modelo"
      data-testid="change-template-dialog"
    >
      <p className="mb-6 text-sm text-text-dim">
        O outro modelo tem campos diferentes, então o que você já preencheu será descartado.
        Deseja continuar?
      </p>
      <div className="flex justify-end gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          data-testid="change-template-dialog-cancel"
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={onConfirm}
          data-testid="change-template-dialog-confirm"
        >
          Trocar e descartar
        </Button>
      </div>
    </Modal>
  )
}
