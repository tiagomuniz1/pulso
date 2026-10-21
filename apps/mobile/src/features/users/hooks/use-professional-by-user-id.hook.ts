import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { listProfessionalsUseCase, type IProfessionalModel } from '@app/core'

/**
 * A ficha de profissional de um usuário.
 *
 * Não há endpoint por `userId`, então busca a lista e procura — o mesmo que
 * a web faz. Só é chamada quando o usuário tem ficha (`isProfessional`),
 * porque é uma listagem inteira para achar uma linha.
 */
const LIMITE_DA_BUSCA = 100

/**
 * `enabled` é obrigatório de propósito: um padrão `true` faria a tela que
 * esquecesse de passá-lo buscar a lista inteira de profissionais para nada.
 */
export function useProfessionalByUserId(userId: string, { enabled }: { enabled: boolean }) {
  const { data, isPending, isError } = useQuery({
    queryKey: ['professionals', { limit: LIMITE_DA_BUSCA }],
    queryFn: () => listProfessionalsUseCase({ limit: LIMITE_DA_BUSCA }),
    enabled,
  })

  const professional = useMemo<IProfessionalModel | undefined>(
    () => data?.find((candidate) => candidate.user.id === userId),
    [data, userId],
  )

  return { professional, isPending: enabled && isPending, isError: enabled && isError }
}
