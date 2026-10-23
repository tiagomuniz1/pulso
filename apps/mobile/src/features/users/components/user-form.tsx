import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { USER_ROLE_DESCRIPTIONS, USER_ROLE_LABELS, UserRole } from '@app/shared'
import type { IApiError, ICreateUserInput, IUpdateUserInput, IUserModel } from '@app/core'
import { Button } from '../../../components/ui/button'
import { ChoiceField, TextField } from '../../../components/ui/fields'
import { useTheme } from '../../../theme/theme-context'
import {
  selectableRoles,
  validateUserForm,
  type IUserFormValues,
} from '../user-form.validation'

function initialValues(user: IUserModel | null): IUserFormValues {
  return {
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    password: '',
    role: user?.role ?? UserRole.USER,
    isActive: user?.isActive ?? true,
  }
}

/**
 * O cadastro de usuário, criando ou editando.
 *
 * Esta tela é também o **"Meu perfil"** de quem não é ADMIN — e por isso
 * `canChangeRole` existe: só o ADMIN escolhe o perfil de acesso, e nem ele o
 * próprio. Numa clínica com um administrador só, rebaixar a si mesmo a
 * deixaria sem ninguém capaz de gerir usuários. O backend recusa os dois
 * casos; aqui apenas não oferecemos o que ele negaria.
 */
export function UserForm({
  user,
  canChangeRole,
  isSubmitting,
  submitError,
  onSubmit,
}: {
  /** `null` ao criar. */
  user: IUserModel | null
  canChangeRole: boolean
  isSubmitting: boolean
  submitError: IApiError | null
  onSubmit: (input: ICreateUserInput | IUpdateUserInput) => void
}) {
  const theme = useTheme()
  const isEditing = user !== null

  const [values, setValues] = useState<IUserFormValues>(() => initialValues(user))
  const [errors, setErrors] = useState<UserFormErrorsState>({})

  function set<K extends keyof IUserFormValues>(field: K, value: IUserFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit() {
    const found = validateUserForm(values, isEditing)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    if (isEditing) {
      onSubmit({
        fullName: values.fullName,
        email: values.email,
        isActive: values.isActive,
        // Omitido quando não se pode trocar: mandar o valor atual passaria,
        // mas um dia em que ele divergisse da sessão viraria uma promoção
        // acidental.
        ...(canChangeRole ? { role: values.role as UserRole } : {}),
      })
      return
    }

    onSubmit({
      fullName: values.fullName,
      email: values.email,
      password: values.password,
      role: values.role as UserRole,
    })
  }

  const roleOptions = selectableRoles(Boolean(user?.isProfessional)).map((role) => ({
    value: role,
    label: USER_ROLE_LABELS[role],
  }))

  return (
    <View style={styles.form} testID="user-form">
      {submitError ? (
        <Text style={[styles.error, { color: theme.danger }]} testID="user-form-error">
          {submitError.status === 409
            ? 'Já existe um usuário com este e-mail.'
            : 'Não foi possível salvar. Tente de novo.'}
        </Text>
      ) : null}

      <TextField
        label="Nome completo"
        required
        value={values.fullName}
        onChange={(value) => set('fullName', value)}
        error={errors.fullName}
        testID="user-form-fullname"
      />

      <TextField
        label="E-mail"
        required
        value={values.email}
        onChange={(value) => set('email', value)}
        keyboardType="email-address"
        error={errors.email}
        testID="user-form-email"
      />

      {!isEditing ? (
        <TextField
          label="Senha"
          required
          value={values.password}
          onChange={(value) => set('password', value)}
          secureTextEntry
          error={errors.password}
          helpText="Mínimo de 8 caracteres."
          testID="user-form-password"
        />
      ) : null}

      {canChangeRole ? (
        <>
          <ChoiceField
            label="Perfil de acesso"
            required
            testID="user-form-role"
            options={roleOptions}
            selected={[values.role]}
            onToggle={(value) => set('role', value)}
            error={errors.role}
          />
          <Text style={[styles.description, { color: theme.textMute }]} testID="user-form-role-description">
            {USER_ROLE_DESCRIPTIONS[values.role as UserRole]}
          </Text>
        </>
      ) : null}

      {isEditing && canChangeRole ? (
        <ChoiceField
          label="Situação"
          required={false}
          testID="user-form-active"
          options={[{ value: 'active', label: 'Conta ativa' }]}
          selected={values.isActive ? ['active'] : []}
          multiple
          onToggle={() => set('isActive', !values.isActive)}
          helpText="Conta desativada não consegue entrar no sistema."
        />
      ) : null}

      <Button
        label={isEditing ? 'Salvar alterações' : 'Criar usuário'}
        loading={isSubmitting}
        onPress={handleSubmit}
        testID="user-form-submit"
      />
    </View>
  )
}

type UserFormErrorsState = Partial<Record<string, string>>

const styles = StyleSheet.create({
  form: { gap: 14 },
  error: { fontSize: 13 },
  description: { fontSize: 12, lineHeight: 17, marginTop: -6 },
})
