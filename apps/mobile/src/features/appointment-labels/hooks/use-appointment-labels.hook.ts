import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createAppointmentLabelUseCase,
  deleteAppointmentLabelUseCase,
  listAppointmentLabelsUseCase,
  updateAppointmentLabelUseCase,
  type IApiError,
  type IAppointmentLabelModel,
  type ICreateAppointmentLabelInput,
  type IUpdateAppointmentLabelInput,
} from '@app/core'

/**
 * O catálogo inteiro, inclusive os desativados.
 *
 * A tela de gestão precisa dos dois: um rótulo desativado some do seletor
 * mas continua colorindo as consultas que já o usam, e reativá-lo é
 * justamente o que se vem fazer aqui.
 */
export function useAppointmentLabels() {
  return useQuery({
    queryKey: ['appointment-labels', 'all'],
    queryFn: () => listAppointmentLabelsUseCase(),
  })
}

/**
 * Mexer no catálogo muda a agenda de todo mundo.
 *
 * Por isso toda mutação invalida `appointments` junto: renomear ou
 * recolorir sem isso deixaria a grade com o nome antigo até alguém
 * recarregar.
 */
function invalidateLabels(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ['appointment-labels'] })
  void queryClient.invalidateQueries({ queryKey: ['appointments'] })
}

export function useCreateAppointmentLabel() {
  const queryClient = useQueryClient()

  return useMutation<IAppointmentLabelModel, IApiError, ICreateAppointmentLabelInput>({
    mutationFn: (input) => createAppointmentLabelUseCase(input),
    onSuccess: () => invalidateLabels(queryClient),
  })
}

export function useUpdateAppointmentLabel(id: string) {
  const queryClient = useQueryClient()

  return useMutation<IAppointmentLabelModel, IApiError, IUpdateAppointmentLabelInput>({
    mutationFn: (input) => updateAppointmentLabelUseCase(id, input),
    onSuccess: () => invalidateLabels(queryClient),
  })
}

export function useDeleteAppointmentLabel() {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    mutationFn: (id) => deleteAppointmentLabelUseCase(id),
    onSuccess: () => invalidateLabels(queryClient),
  })
}
