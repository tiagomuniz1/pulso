import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createScheduleExceptionUseCase,
  deleteScheduleExceptionUseCase,
  listScheduleExceptionsUseCase,
  type IApiError,
  type ICreateScheduleExceptionInput,
  type IScheduleExceptionModel,
} from '@app/core'

/**
 * Os bloqueios de um profissional numa data.
 *
 * `'self'` é o profissional logado — o servidor já recorta por ele e o
 * parâmetro não vai na requisição, a mesma convenção da agenda.
 */
export function useScheduleExceptions(professionalId: string | null, date: string) {
  const scoped = professionalId === 'self' ? undefined : (professionalId ?? undefined)

  return useQuery({
    queryKey: ['schedule-exceptions', professionalId, date],
    queryFn: () => listScheduleExceptionsUseCase({ professionalId: scoped, from: date, to: date }),
    enabled: professionalId !== null,
  })
}

function useInvalidate() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['schedule-exceptions'] })
    // A disponibilidade muda junto: o horário bloqueado some da grade.
    void queryClient.invalidateQueries({ queryKey: ['availability'] })
  }
}

export function useCreateScheduleException() {
  const invalidate = useInvalidate()

  return useMutation<IScheduleExceptionModel, IApiError, ICreateScheduleExceptionInput>({
    // Embrulhado: o React Query passa um segundo argumento ao `mutationFn`,
    // e a referência nua o repassaria ao use-case.
    mutationFn: (input) => createScheduleExceptionUseCase(input),
    onSuccess: invalidate,
  })
}

export function useDeleteScheduleException() {
  const invalidate = useInvalidate()

  return useMutation<void, IApiError, string>({
    mutationFn: (id) => deleteScheduleExceptionUseCase(id),
    onSuccess: invalidate,
  })
}
