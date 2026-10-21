import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createTemplateUseCase,
  deleteTemplateUseCase,
  getTemplateUseCase,
  listCanonicalFieldsUseCase,
  listTemplatesUseCase,
  updateTemplateUseCase,
  type IApiError,
  type ICreateTemplateInput,
  type ITemplateModel,
  type IUpdateTemplateInput,
} from '@app/core'
import type { CouncilType } from '@app/shared'

export const TEMPLATES_PAGE_SIZE = 20

export interface ITemplateScope {
  specialtyId?: string
  councilType?: CouncilType
}

/**
 * Os modelos que o perfil alcança, paginados.
 *
 * O recorte é do servidor: o profissional recebe as especialidades que
 * exerce e o generalista da própria profissão. A chave do cache carrega o
 * escopo — sem isso ele leria o catálogo inteiro guardado para o ADMIN.
 *
 * **A página anterior fica na tela enquanto a próxima carrega.** Sem isso
 * a lista inteira desmonta a cada toque em "Próxima" — e com ela o próprio
 * controle de paginação, que fica no rodapé: o dedo toca onde havia um
 * botão e encontra o vazio do carregando.
 */
export function useTemplates(page: number, scope: ITemplateScope) {
  return useQuery({
    queryKey: ['medical-record-templates', 'list', page, scope.specialtyId, scope.councilType],
    queryFn: () =>
      listTemplatesUseCase({
        page,
        limit: TEMPLATES_PAGE_SIZE,
        ...(scope.specialtyId ? { specialtyId: scope.specialtyId } : {}),
        ...(scope.councilType ? { councilType: scope.councilType } : {}),
      }),
    placeholderData: keepPreviousData,
  })
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: ['medical-record-templates', id],
    queryFn: () => getTemplateUseCase(id),
    enabled: Boolean(id),
  })
}

/** O catálogo da plataforma, global e sem recorte por profissão. */
export function useCanonicalFields() {
  return useQuery({
    queryKey: ['canonical-fields'],
    queryFn: () => listCanonicalFieldsUseCase(),
  })
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()

  return useMutation<ITemplateModel, IApiError, ICreateTemplateInput>({
    mutationFn: (input) => createTemplateUseCase(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['medical-record-templates'] })
    },
  })
}

export function useUpdateTemplate(id: string) {
  const queryClient = useQueryClient()

  return useMutation<ITemplateModel, IApiError, IUpdateTemplateInput>({
    mutationFn: (input) => updateTemplateUseCase(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['medical-record-templates'] })
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    mutationFn: (id) => deleteTemplateUseCase(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['medical-record-templates'] })
    },
  })
}
