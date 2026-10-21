import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPatientUseCase,
  deletePatientUseCase,
  getPatientUseCase,
  listPatientsUseCase,
  updatePatientUseCase,
  type IApiError,
  type ICreatePatientInput,
  type IPatientListParams,
  type IPatientModel,
  type IUpdatePatientInput,
} from '@app/core'

export function usePatients(params?: IPatientListParams) {
  return useQuery({
    queryKey: ['patients', params],
    queryFn: () => listPatientsUseCase(params),
  })
}

export function usePatient(id: string) {
  return useQuery({
    queryKey: ['patient', id],
    queryFn: () => getPatientUseCase(id),
    enabled: Boolean(id),
  })
}

/**
 * Excluir paciente invalida `users` junto, como na web.
 *
 * A ficha de paciente está amarrada a um usuário, e o backend desfaz o
 * vínculo ao excluir — deixar a lista de usuários em cache mostraria uma
 * pessoa que não existe mais daquele lado.
 */
export function useDeletePatient() {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    // Embrulhado, e não `mutationFn: deletePatientUseCase`: o React Query
    // passa um segundo argumento à função, e um use-case que ganhe um
    // parâmetro opcional amanhã passaria a recebê-lo sem ninguém pedir.
    mutationFn: (id) => deletePatientUseCase(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patients'] })
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useCreatePatient() {
  const queryClient = useQueryClient()

  return useMutation<IPatientModel, IApiError, ICreatePatientInput>({
    mutationFn: (input) => createPatientUseCase(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patients'] })
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUpdatePatient(id: string) {
  const queryClient = useQueryClient()

  return useMutation<IPatientModel, IApiError, IUpdatePatientInput>({
    mutationFn: (input) => updatePatientUseCase(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patients'] })
      void queryClient.invalidateQueries({ queryKey: ['patient', id] })
    },
  })
}
