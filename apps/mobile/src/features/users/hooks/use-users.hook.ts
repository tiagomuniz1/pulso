import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createUserUseCase,
  deleteUserUseCase,
  getUserUseCase,
  listUsersUseCase,
  sendSetPasswordEmailUseCase,
  updateUserUseCase,
  type IApiError,
  type ICreateUserInput,
  type IUpdateUserInput,
  type IUserListParams,
  type IUserModel,
} from '@app/core'

export function useUsers(params?: IUserListParams) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => listUsersUseCase(params),
  })
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => getUserUseCase(id),
    enabled: Boolean(id),
  })
}

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation<IUserModel, IApiError, ICreateUserInput>({
    mutationFn: (input) => createUserUseCase(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient()

  return useMutation<IUserModel, IApiError, IUpdateUserInput>({
    mutationFn: (input) => updateUserUseCase(id, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      void queryClient.invalidateQueries({ queryKey: ['user', id] })
      // O nome no cabeçalho vem da sessão: editar o próprio perfil sem isto
      // deixaria o avatar com as iniciais antigas até o próximo login.
      void queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
    },
  })
}

/**
 * Excluir usuário invalida pacientes e profissionais junto.
 *
 * O backend faz cascata: excluir o usuário apaga a ficha de profissional e
 * a de paciente que dependiam dele. Deixar as duas listas em cache mostraria
 * registros que não existem mais.
 */
export function useDeleteUser() {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    mutationFn: (id) => deleteUserUseCase(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
      void queryClient.invalidateQueries({ queryKey: ['patients'] })
      void queryClient.invalidateQueries({ queryKey: ['professionals'] })
    },
  })
}

/**
 * Envia o link de definição de senha.
 *
 * Não invalida nada: não muda registro nenhum. O que importa é o erro
 * chegar à tela — o backend responde `503` quando o e-mail não sai, de
 * propósito, para ninguém confirmar uma entrega que não aconteceu.
 */
export function useSendSetPasswordEmail() {
  return useMutation<void, IApiError, string>({
    mutationFn: (id) => sendSetPasswordEmailUseCase(id),
  })
}
