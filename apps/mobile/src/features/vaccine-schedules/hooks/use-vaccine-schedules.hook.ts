import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getPatientVaccineStatusUseCase,
  recordVaccineDecisionUseCase,
  type IApiError,
  type IRecordDecisionInput,
} from '@app/core'

/** O que o calendário diz sobre este paciente. */
export function usePatientVaccineStatus(patientId: string) {
  return useQuery({
    queryKey: ['vaccine-schedules', 'status', patientId],
    queryFn: () => getPatientVaccineStatusUseCase(patientId),
    enabled: Boolean(patientId),
  })
}

/**
 * A conduta do profissional sobre uma pendência.
 *
 * Invalida a caderneta junto: confirmar que a vacina vai ser aplicada
 * muda o que a tela seguinte deve mostrar, e deixar as duas consultas
 * fora de sincronia é o tipo de coisa que só aparece na frente da
 * paciente.
 */
export function useRecordVaccineDecision(patientId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, IRecordDecisionInput>({
    mutationFn: (input) => recordVaccineDecisionUseCase(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vaccine-schedules', 'status', patientId] })
      void queryClient.invalidateQueries({ queryKey: ['vaccinations', patientId] })
    },
  })
}
