import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  cancelAppointmentUseCase,
  completeAppointmentUseCase,
  type IApiError,
  type IAppointmentModel,
} from '@app/core'
import { AppointmentCancellationScope } from '@app/shared'

/**
 * Concluir e cancelar, juntos, porque invalidam exatamente o mesmo conjunto e
 * aparecem sempre na mesma tela. Separá-los duplicaria a invalidação em dois
 * arquivos que precisariam ser mantidos em concordância.
 */
function useInvalidateAppointment(id: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['appointment', id] })
    void queryClient.invalidateQueries({ queryKey: ['appointments'] })
  }
}

export function useCompleteAppointment(id: string) {
  const invalidate = useInvalidateAppointment(id)

  return useMutation<IAppointmentModel, IApiError, void>({
    mutationFn: () => completeAppointmentUseCase(id),
    onSuccess: invalidate,
  })
}

export function useCancelAppointment(id: string) {
  const invalidate = useInvalidateAppointment(id)

  return useMutation<IAppointmentModel, IApiError, string>({
    // Só esta ocorrência: cancelar a série inteira do celular é fácil demais
    // de fazer sem querer, e desfazer exige reagendar uma por uma.
    mutationFn: (cancellationReason) =>
      cancelAppointmentUseCase(id, {
        cancellationReason,
        scope: AppointmentCancellationScope.SINGLE_OCCURRENCE,
      }),
    onSuccess: invalidate,
  })
}
