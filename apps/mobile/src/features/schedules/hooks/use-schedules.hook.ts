import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createScheduleUseCase,
  deleteScheduleUseCase,
  getScheduleUseCase,
  listSchedulesUseCase,
  updateScheduleUseCase,
  type IApiError,
  type ICreateScheduleInput,
  type IScheduleListParams,
  type IScheduleModel,
  type IUpdateScheduleInput,
} from '@app/core'

export function useSchedules(params?: IScheduleListParams) {
  return useQuery({
    queryKey: ['schedules', params],
    queryFn: () => listSchedulesUseCase(params),
  })
}

export function useSchedule(id: string) {
  return useQuery({
    queryKey: ['schedule', id],
    queryFn: () => getScheduleUseCase(id),
    enabled: Boolean(id),
  })
}

/**
 * Mexer numa agenda muda os horários livres do dia.
 *
 * Por isso toda mutação invalida `availability` junto: sem isso a grade
 * continuaria oferecendo um horário que acabou de deixar de existir, e
 * agendar ali terminaria em erro.
 */
function invalidateSchedules(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  void queryClient.invalidateQueries({ queryKey: ['schedules'] })
  void queryClient.invalidateQueries({ queryKey: ['availability'] })
  if (id) void queryClient.invalidateQueries({ queryKey: ['schedule', id] })
}

export function useCreateSchedule() {
  const queryClient = useQueryClient()

  return useMutation<IScheduleModel, IApiError, ICreateScheduleInput>({
    mutationFn: (input) => createScheduleUseCase(input),
    onSuccess: () => invalidateSchedules(queryClient),
  })
}

export function useUpdateSchedule(id: string) {
  const queryClient = useQueryClient()

  return useMutation<IScheduleModel, IApiError, IUpdateScheduleInput>({
    mutationFn: (input) => updateScheduleUseCase(id, input),
    onSuccess: () => invalidateSchedules(queryClient, id),
  })
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    mutationFn: (id) => deleteScheduleUseCase(id),
    onSuccess: () => invalidateSchedules(queryClient),
  })
}
