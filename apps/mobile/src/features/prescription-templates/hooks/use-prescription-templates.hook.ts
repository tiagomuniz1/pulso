import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createPrescriptionTemplateUseCase,
  deletePrescriptionTemplateUseCase,
  listPrescriptionTemplatesUseCase,
  updatePrescriptionTemplateUseCase,
  type IApiError,
  type ICreatePrescriptionTemplateInput,
  type IPrescriptionTemplateModel,
  type IUpdatePrescriptionTemplateInput,
} from '@app/core'

/**
 * Os modelos que o perfil alcança.
 *
 * O recorte é do servidor: o profissional recebe só os próprios, o ADMIN
 * recebe os da clínica inteira. A tela não filtra nada.
 */
export function usePrescriptionTemplates() {
  return useQuery({
    queryKey: ['prescription-templates'],
    queryFn: () => listPrescriptionTemplatesUseCase(),
  })
}

export function useCreatePrescriptionTemplate() {
  const queryClient = useQueryClient()

  return useMutation<IPrescriptionTemplateModel, IApiError, ICreatePrescriptionTemplateInput>({
    mutationFn: (input) => createPrescriptionTemplateUseCase(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prescription-templates'] })
    },
  })
}

export function useUpdatePrescriptionTemplate(id: string) {
  const queryClient = useQueryClient()

  return useMutation<IPrescriptionTemplateModel, IApiError, IUpdatePrescriptionTemplateInput>({
    mutationFn: (input) => updatePrescriptionTemplateUseCase(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prescription-templates'] })
    },
  })
}

export function useDeletePrescriptionTemplate() {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    mutationFn: (id) => deletePrescriptionTemplateUseCase(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['prescription-templates'] })
    },
  })
}
