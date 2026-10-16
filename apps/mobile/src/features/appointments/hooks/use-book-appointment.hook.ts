import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  bookAppointmentUseCase,
  bookRecurringAppointmentsUseCase,
  getProfessionalUseCase,
  listPatientsUseCase,
  previewRecurrenceUseCase,
  type IApiError,
  type IAppointmentModel,
  type IBookAppointmentInput,
  type IBookRecurringAppointmentsInput,
  type IRecurrencePreviewInput,
  type IRecurrencePreviewModel,
  type IRecurringAppointmentsResultModel,
} from '@app/core'

/** Os pacientes da clínica, para o seletor do agendamento. */
export function useBookablePatients(enabled: boolean) {
  return useQuery({
    queryKey: ['patients', 'bookable'],
    queryFn: () => listPatientsUseCase({ limit: 100 }),
    enabled,
    staleTime: 1000 * 60 * 5,
  })
}

/**
 * As especialidades do profissional escolhido.
 *
 * Com uma só, ela vai no corpo sem o usuário escolher; com mais de uma, o
 * backend exige a escolha — é o que decide se o seletor aparece.
 */
export function useProfessionalSpecialties(professionalId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['professional', professionalId],
    queryFn: () => getProfessionalUseCase(professionalId as string),
    enabled: enabled && Boolean(professionalId),
  })
}

function useInvalidateAgenda() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['appointments'] })
    void queryClient.invalidateQueries({ queryKey: ['availability'] })
  }
}

export function useBookAppointment() {
  const invalidate = useInvalidateAgenda()

  return useMutation<IAppointmentModel, IApiError, IBookAppointmentInput>({
    // Embrulhado: o React Query passa um segundo argumento ao `mutationFn`.
    mutationFn: (input) => bookAppointmentUseCase(input),
    onSuccess: invalidate,
  })
}

export function useBookRecurringAppointments() {
  const invalidate = useInvalidateAgenda()

  return useMutation<
    IRecurringAppointmentsResultModel,
    IApiError & { conflictingOccurrences?: { date: string }[] },
    IBookRecurringAppointmentsInput
  >({
    mutationFn: (input) => bookRecurringAppointmentsUseCase(input),
    onSuccess: invalidate,
  })
}

/**
 * As datas que a série geraria, com a disponibilidade de cada uma.
 *
 * `null` desliga a consulta: só o segundo passo da folha precisa dela, e
 * pedi-la no primeiro gastaria uma requisição a cada tecla digitada.
 */
export function useRecurrencePreview(params: IRecurrencePreviewInput | null) {
  return useQuery<IRecurrencePreviewModel>({
    queryKey: ['recurrence-preview', params],
    queryFn: () => previewRecurrenceUseCase(params as IRecurrencePreviewInput),
    enabled: params !== null,
  })
}
