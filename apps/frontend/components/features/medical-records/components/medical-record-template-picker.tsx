'use client'

import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import type { ITemplateModel } from '@/components/features/medical-record-templates/types/template-model.types'

const MAXIMO_DE_SECOES_EXIBIDAS = 3

function formatarData(data: Date): string {
  return data.toLocaleDateString('pt-BR')
}

interface MedicalRecordTemplatePickerProps {
  templates: ITemplateModel[]
  isError: boolean
  onSelect: (templateId: string) => void
  onRetry: () => void
  /** Consulta generalista muda o texto: para um nutricionista não há especialidade. */
  isGeneralist: boolean
}

/**
 * Primeiro passo do preenchimento: qual modelo usar.
 *
 * A clínica pode ter vários modelos para a mesma especialidade — primeira
 * consulta, retorno, pré-natal — e nenhum é padrão, então a escolha é explícita
 * mesmo quando só existe um. Cada opção mostra nome e tamanho; a data desempata
 * dois nomes parecidos, que é o que os distingue quando dividem a especialidade.
 */
export function MedicalRecordTemplatePicker({
  templates,
  isError,
  onSelect,
  onRetry,
  isGeneralist,
}: MedicalRecordTemplatePickerProps) {
  // Falha de leitura não é ausência de modelo. Dizer "não existe modelo" aqui
  // convidaria o profissional a procurar o administrador por um problema que é
  // de rede.
  if (isError) {
    return (
      <div data-testid="medical-record-template-picker-error">
        <Alert variant="error">
          Não foi possível carregar os modelos de prontuário. Tente novamente.
        </Alert>
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRetry}
            data-testid="medical-record-template-picker-retry"
          >
            Tentar novamente
          </Button>
        </div>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <Alert variant="error" data-testid="no-template-alert">
        {isGeneralist
          ? 'Nenhum modelo de prontuário cadastrado para a sua profissão.'
          : 'Nenhum modelo de prontuário cadastrado para esta especialidade.'}
      </Alert>
    )
  }

  return (
    <div data-testid="medical-record-template-picker">
      <p className="mb-4 text-sm text-text-dim">
        Escolha o modelo que vai estruturar este prontuário.
      </p>
      <ul className="flex flex-col gap-3">
        {templates.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              onClick={() => onSelect(template.id)}
              className="w-full rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-accent hover:bg-surface-raised"
              data-testid={`template-option-${template.id}`}
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <span className="text-sm font-medium text-text">{template.name}</span>
                <span className="shrink-0 text-xs text-text-mute">
                  {template.fields.length} {template.fields.length === 1 ? 'campo' : 'campos'}
                </span>
              </div>
              {template.sections.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {template.sections.slice(0, MAXIMO_DE_SECOES_EXIBIDAS).map((section) => (
                    <span
                      key={section.key}
                      className="inline-block rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent"
                    >
                      {section.title}
                    </span>
                  ))}
                  {template.sections.length > MAXIMO_DE_SECOES_EXIBIDAS && (
                    <span className="inline-block rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">
                      +{template.sections.length - MAXIMO_DE_SECOES_EXIBIDAS}
                    </span>
                  )}
                </div>
              )}
              <p className="mt-2 text-xs text-text-mute">
                Atualizado em {formatarData(template.updatedAt)}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
