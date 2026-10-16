import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createVaccinationUseCase,
  createVaccineIndicationUseCase,
  deleteVaccinationUseCase,
  deleteVaccineIndicationUseCase,
  listVaccinationsUseCase,
  listVaccineIndicationsUseCase,
  listVaccinesUseCase,
  type IApiError,
} from '@app/core'

/** O catálogo global, só o que está em circulação. */
export function useActiveVaccines() {
  return useQuery({
    queryKey: ['vaccines', 'active'],
    queryFn: () => listVaccinesUseCase({ limit: 200 }),
    staleTime: 1000 * 60 * 30,
  })
}

export function useVaccineIndications(appointmentId: string) {
  return useQuery({
    queryKey: ['vaccine-indications', appointmentId],
    queryFn: () => listVaccineIndicationsUseCase(appointmentId),
  })
}

export function useCreateVaccineIndication(appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation<unknown, IApiError, unknown>({
    mutationFn: (input) => createVaccineIndicationUseCase(input as never),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vaccine-indications', appointmentId] })
    },
  })
}

export function useDeleteVaccineIndication(appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    mutationFn: (id) => deleteVaccineIndicationUseCase(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vaccine-indications', appointmentId] })
    },
  })
}

/**
 * A caderneta é do **paciente**, não da consulta.
 *
 * É a única entidade clínica cujo vínculo com a consulta é opcional: a dose
 * aplicada anos atrás noutro serviço não tem consulta a que se amarrar, e a
 * caderneta precisa mostrá-la do mesmo jeito.
 */
export function usePatientVaccinations(patientId: string) {
  return useQuery({
    queryKey: ['vaccinations', patientId],
    queryFn: () => listVaccinationsUseCase({ patientId, limit: 100 }),
    enabled: Boolean(patientId),
  })
}

export function useCreateVaccination(patientId: string) {
  const queryClient = useQueryClient()

  return useMutation<unknown, IApiError, unknown>({
    mutationFn: (input) => createVaccinationUseCase(input as never),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vaccinations', patientId] })
    },
  })
}

export function useDeleteVaccination(patientId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    mutationFn: (id) => deleteVaccinationUseCase(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vaccinations', patientId] })
    },
  })
}
