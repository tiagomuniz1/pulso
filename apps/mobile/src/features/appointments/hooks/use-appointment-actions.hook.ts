import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelAppointmentUseCase,
  completeAppointmentUseCase,
  getReassignCandidatesUseCase,
  reassignAppointmentUseCase,
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
    // A disponibilidade muda junto: o horário sai de uma agenda e entra
    // noutra, ou volta a ficar livre.
    void queryClient.invalidateQueries({ queryKey: ['availability'] })
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

/**
 * Os profissionais que poderiam assumir esta consulta.
 *
 * O servidor devolve só quem exerce a mesma especialidade (ou profissão) e
 * está livre neste mesmo horário — a data e a hora não mudam na troca.
 */
export function useReassignCandidates(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['appointment', id, 'reassign-candidates'],
    queryFn: () => getReassignCandidatesUseCase(id),
    enabled,
  })
}

export function useReassignAppointment(id: string) {
  const invalidate = useInvalidateAppointment(id)

  return useMutation<IAppointmentModel, IApiError, string>({
    mutationFn: (professionalId) => reassignAppointmentUseCase(id, professionalId),
    onSuccess: invalidate,
  })
}
