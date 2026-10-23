import { UserRole } from '@app/shared'

export interface IUserFormValues {
  fullName: string
  email: string
  password: string
  role: string
  isActive: boolean
}

export type UserFormErrors = Partial<Record<string, string>>

/**
 * As regras do cadastro de usuário, as mesmas do zod da web.
 *
 * @param isEditing a senha só é pedida ao criar — na edição ela é trocada
 * pelo link de definição, que o ADMIN envia a partir da ficha.
 */
export function validateUserForm(values: IUserFormValues, isEditing: boolean): UserFormErrors {
  const errors: UserFormErrors = {}

  if (values.fullName.trim().length < 3) errors.fullName = 'Nome deve ter no mínimo 3 caracteres'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'E-mail inválido'
  if (!isEditing && values.password.length < 8) {
    errors.password = 'Senha deve ter no mínimo 8 caracteres'
  }
  if (!(Object.values(UserRole) as string[]).includes(values.role)) {
    errors.role = 'Perfil de acesso inválido'
  }

  return errors
}

/**
 * Quais perfis podem ser escolhidos.
 *
 * `PROFESSIONAL` só entra para quem já o é, para que o valor atual seja
 * representável e a troca tenha volta — virar profissional acontece ao criar
 * a ficha, não ao escolher um perfil aqui. `PATIENT` e `PLATFORM_ADMIN`
 * nunca entram: o primeiro não faz login, o segundo é da plataforma.
 */
export function selectableRoles(isProfessional: boolean): UserRole[] {
  const base = [UserRole.USER, UserRole.ADMIN]
  return isProfessional ? [...base, UserRole.PROFESSIONAL] : base
}
