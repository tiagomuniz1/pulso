import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface ModalFormActionsProps {
  children: ReactNode
  className?: string
}

/**
 * Barra de ações que fica colada no rodapé do modal enquanto o formulário rola.
 *
 * O `Modal` limita a altura e rola o próprio corpo, mas as ações ficavam dentro
 * dessa área: num prontuário com muitos campos ou numa receita com vários
 * medicamentos, o botão de salvar caía abaixo da dobra e quem preenchia chegava
 * ao fim da tela sem enxergá-lo. `sticky bottom-0` gruda a barra na base da área
 * que rola, então o botão está sempre à mão.
 *
 * O `-mx-6 px-6` desfaz o `p-6` do diálogo para a barra ocupar a largura toda —
 * sem isso o conteúdo passaria por baixo das bordas laterais. O fundo é opaco e
 * igual ao do diálogo pelo mesmo motivo: é ele que esconde o que rola atrás.
 */
export function ModalFormActions({ children, className }: ModalFormActionsProps) {
  return (
    <div
      data-testid="modal-form-actions"
      className={cn(
        'sticky bottom-0 z-10 -mx-6 -mb-6 mt-2 flex items-center justify-end gap-3',
        'border-t border-border bg-surface-2 px-6 py-4',
        className,
      )}
    >
      {children}
    </div>
  )
}
