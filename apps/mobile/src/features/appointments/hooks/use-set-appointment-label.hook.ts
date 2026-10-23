import { useMutation, useQueryClient } from '@tanstack/react-query'
import { setAppointmentLabelUseCase, type IApiError, type IAppointmentModel } from '@app/core'

/**
 * Marca o rótulo da consulta.
 *
 * Invalida a agenda junto: a faixa colorida do bloco vem da listagem do dia,
 * não desta consulta, e sem isso voltar da tela de detalhe mostraria o bloco
 * com a cor antiga.
 */
export function useSetAppointmentLabel(id: string) {
  const queryClient = useQueryClient()

  return useMutation<IAppointmentModel, IApiError, string | null>({
    mutationFn: (labelId) => setAppointmentLabelUseCase(id, labelId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['appointment', id] })
      void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    },
  })
}
