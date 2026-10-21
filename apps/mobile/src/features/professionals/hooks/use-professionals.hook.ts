import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createProfessionalUseCase,
  deleteProfessionalUseCase,
  getProfessionalUseCase,
  listClinicSpecialtiesUseCase,
  listProfessionalsUseCase,
  updateProfessionalUseCase,
  type IApiError,
  type ICreateProfessionalInput,
  type IProfessionalListParams,
  type IProfessionalModel,
  type IUpdateProfessionalInput,
} from '@app/core'

export function useProfessionals(params?: IProfessionalListParams) {
  return useQuery({
    queryKey: ['professionals', params],
    queryFn: () => listProfessionalsUseCase(params),
  })
}

export function useProfessional(id: string) {
  return useQuery({
    queryKey: ['professional', id],
    queryFn: () => getProfessionalUseCase(id),
    enabled: Boolean(id),
  })
}

export function useCreateProfessional() {
  const queryClient = useQueryClient()

  return useMutation<IProfessionalModel, IApiError, ICreateProfessionalInput>({
    mutationFn: (input) => createProfessionalUseCase(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['professionals'] })
      // Criar a ficha promove o usuário a PROFESSIONAL no backend.
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUpdateProfessional(id: string) {
  const queryClient = useQueryClient()

  return useMutation<IProfessionalModel, IApiError, IUpdateProfessionalInput>({
    mutationFn: (input) => updateProfessionalUseCase(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['professionals'] })
      void queryClient.invalidateQueries({ queryKey: ['professional', id] })
    },
  })
}

/**
 * Excluir a ficha mexe no usuário.
 *
 * Para um usuário de perfil PROFESSIONAL, o backend apaga o usuário junto
 * (ou o rebaixa a PATIENT, se ele também for paciente); para um ADMIN com
 * ficha, o usuário fica intacto. Nos dois casos a listagem de usuários
 * muda, então ela é invalidada.
 */
export function useDeleteProfessional() {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    mutationFn: (id) => deleteProfessionalUseCase(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['professionals'] })
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

/** As especialidades que a clínica tem habilitadas, para o formulário. */
export function useClinicSpecialties(clinicId: string | undefined) {
  return useQuery({
    queryKey: ['clinic-specialties', clinicId],
    queryFn: () => listClinicSpecialtiesUseCase(clinicId as string),
    enabled: Boolean(clinicId),
  })
}
