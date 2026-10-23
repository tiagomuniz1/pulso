import { useQuery } from '@tanstack/react-query'
import { getMyProfessionalUseCase, type IProfessionalModel } from '@app/core'

/**
 * A ficha de profissional desta pessoa, ou `null` se ela não atende.
 *
 * Uma consulta só, compartilhada: é a resposta de que dependem "posso
 * emitir?", "posso registrar dose?" e "esta consulta é minha?". Perguntar
 * três vezes seria três requisições para o mesmo fato.
 */
export function useMyProfessional(): IProfessionalModel | null {
  const { data } = useQuery({
    queryKey: ['professionals', 'me'],
    queryFn: getMyProfessionalUseCase,
    staleTime: 1000 * 60 * 30,
  })

  return data ?? null
}

/**
 * Se esta pessoa pode emitir documento **nesta** consulta.
 *
 * Duas condições, e são eixos diferentes: ter ficha de profissional
 * (exercício) e ser o profissional desta consulta. O cargo não entra — um
 * ADMIN com ficha emite nas consultas dele, e só nelas.
 *
 * A razão é o bloco de assinatura: todo documento sai com nome, conselho e
 * registro de quem assina, e emitir sobre consulta alheia poria o registro de
 * uma pessoa num documento que ela não redigiu.
 */
export function useCanIssue(appointmentProfessionalId: string | undefined): boolean {
  const myProfessional = useMyProfessional()

  return Boolean(myProfessional?.id) && myProfessional?.id === appointmentProfessionalId
}

/**
 * Só a ficha, sem exigir ser o profissional da consulta.
 *
 * Registrar dose e registrar conduta vacinal são exercício, mas não há
 * assinatura em jogo: a caderneta frequentemente transcreve dose aplicada
 * anos atrás noutro serviço. Cargo administrativo sozinho não basta, mas o
 * dono do atendimento não precisa ser você.
 */
export function useHasProfessionalRecord(): boolean {
  return Boolean(useMyProfessional()?.id)
}
