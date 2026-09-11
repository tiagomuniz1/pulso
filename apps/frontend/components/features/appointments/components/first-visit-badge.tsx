import { cn } from '@/lib/cn'

interface FirstVisitBadgeProps {
  /** Compõe a frase inteira do `title`, que é o que desfaz a ambiguidade. */
  patientName: string
  professionalName: string
  className?: string
  'data-testid'?: string
}

/**
 * Diz que é a primeira vez que esta paciente é atendida por este profissional.
 *
 * O texto é curto porque o selo vive colado ao nome da paciente, e "primeira
 * vez" só é ambíguo fora desse contexto — mas ambíguo o bastante para o `title`
 * carregar a frase inteira: primeira vez em relação ao profissional, não à
 * clínica nem à especialidade.
 *
 * `rounded-full` e não `rounded-md`: o raio do tema da clínica varia de 2px a
 * 32px, e um selo precisa ser sempre um selo. É a mesma razão registrada em
 * `appointment-label-pill.tsx`.
 *
 * Cor pelo `accent`, que acompanha a marca da clínica. Nada de `bg-info` ou
 * `bg-success` — esses nomes não existem no `tailwind.config.ts` e renderizam
 * sem cor nenhuma; os semânticos reais são `warm`, `good`, `warn` e `danger`.
 */
export function FirstVisitBadge({
  patientName,
  professionalName,
  className,
  'data-testid': testId,
}: FirstVisitBadgeProps) {
  return (
    <span
      data-testid={testId ?? 'first-visit-badge'}
      title={`Primeira vez que ${patientName} é atendida por ${professionalName}`}
      className={cn(
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full',
        'bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent',
        className,
      )}
    >
      Primeira vez
    </span>
  )
}
