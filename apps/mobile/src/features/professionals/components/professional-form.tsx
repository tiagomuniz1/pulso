import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import {
  COUNCIL_REGISTRATION_FORMATS,
  COUNCIL_TYPE_LABELS,
  CouncilType,
} from '@app/shared'
import {
  userService,
  type IApiError,
  type ICreateProfessionalInput,
  type IProfessionalModel,
  type IProfessionalRegistrationInput,
  type IUpdateProfessionalInput,
} from '@app/core'
import { Button } from '../../../components/ui/button'
import { EntitySearch } from '../../../components/ui/entity-search'
import { ChoiceField, TextField } from '../../../components/ui/fields'
import { SelectField } from '../../../components/ui/select-field'
import { useTheme } from '../../../theme/theme-context'
import { useSessionStore } from '../../auth/session.store'
import { useClinicSpecialties } from '../hooks/use-professionals.hook'
import {
  applyRegistrationNumberMask,
  showsRegistryNumber,
  validateProfessionalForm,
  type IProfessionalFormValues,
} from '../professional-form.validation'

const COUNCIL_OPTIONS = Object.values(CouncilType).map((value) => ({
  value,
  label: COUNCIL_TYPE_LABELS[value],
}))

const EMPTY_REGISTRATION: IProfessionalRegistrationInput = {
  councilType: CouncilType.CRM,
  number: '',
  state: '',
  isPrimary: true,
}

function initialValues(professional: IProfessionalModel | null): IProfessionalFormValues {
  return {
    userMode: 'new',
    userId: '',
    fullName: '',
    email: '',
    registrations: professional
      ? professional.registrations.map((registration) => ({
          councilType: registration.councilType,
          number: registration.number,
          state: registration.state,
          isPrimary: registration.isPrimary,
        }))
      : [EMPTY_REGISTRATION],
    specialties: professional
      ? professional.specialties.map((specialty) => ({
          specialtyId: specialty.id,
          registryNumber: specialty.registryNumber ?? undefined,
        }))
      : [],
    bio: professional?.bio ?? '',
    isActive: professional?.user.isActive ?? true,
  }
}

/**
 * O cadastro de profissional.
 *
 * É o formulário mais composto do sistema: um ou mais **registros** (o
 * fisioterapeuta que também é educador físico tem dois), uma ou mais
 * **especialidades** com RQE opcional, e a bio. Na criação ainda escolhe
 * entre criar o usuário ou reaproveitar um que já existe — é assim que uma
 * recepcionista que começou a atender vira profissional sem perder o
 * histórico.
 */
export function ProfessionalForm({
  professional,
  isSubmitting,
  submitError,
  onSubmit,
}: {
  professional: IProfessionalModel | null
  isSubmitting: boolean
  submitError: IApiError | null
  onSubmit: (input: ICreateProfessionalInput | IUpdateProfessionalInput) => void
}) {
  const theme = useTheme()
  const isEditing = professional !== null
  const clinicId = useSessionStore((state) => state.user?.clinicId)

  const [values, setValues] = useState<IProfessionalFormValues>(() => initialValues(professional))
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})
  const [userLabel, setUserLabel] = useState<string | null>(null)

  const specialties = useClinicSpecialties(clinicId ?? undefined)
  const catalog = specialties.data?.data ?? []

  function set<K extends keyof IProfessionalFormValues>(
    field: K,
    value: IProfessionalFormValues[K],
  ) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  /**
   * Mexe num registro pelo índice, sempre a partir do estado atual.
   *
   * Nunca a partir de `values.registrations` lido aqui: duas mudanças antes
   * de o React redesenhar e a primeira some — foi o defeito que o bloco de
   * endereço do paciente teve.
   */
  function updateRegistration(index: number, patch: Partial<IProfessionalRegistrationInput>) {
    setValues((current) => ({
      ...current,
      registrations: current.registrations.map((registration, position) =>
        position === index ? { ...registration, ...patch } : registration,
      ),
    }))
  }

  function setPrimary(index: number) {
    setValues((current) => ({
      ...current,
      // Principal é um só: marcar um desmarca os outros, em vez de deixar
      // dois principais que o backend recusaria.
      registrations: current.registrations.map((registration, position) => ({
        ...registration,
        isPrimary: position === index,
      })),
    }))
  }

  function addRegistration() {
    setValues((current) => ({
      ...current,
      registrations: [...current.registrations, { ...EMPTY_REGISTRATION, isPrimary: false }],
    }))
  }

  function removeRegistration(index: number) {
    setValues((current) => {
      const remaining = current.registrations.filter((_, position) => position !== index)
      // Tirar o principal deixaria a ficha sem nenhum: o primeiro assume.
      const hasPrimary = remaining.some((registration) => registration.isPrimary)
      return {
        ...current,
        registrations:
          hasPrimary || remaining.length === 0
            ? remaining
            : remaining.map((registration, position) => ({
                ...registration,
                isPrimary: position === 0,
              })),
      }
    })
  }

  function toggleSpecialty(specialtyId: string) {
    setValues((current) => ({
      ...current,
      specialties: current.specialties.some((specialty) => specialty.specialtyId === specialtyId)
        ? current.specialties.filter((specialty) => specialty.specialtyId !== specialtyId)
        : [...current.specialties, { specialtyId }],
    }))
  }

  function setRegistryNumber(specialtyId: string, registryNumber: string) {
    setValues((current) => ({
      ...current,
      specialties: current.specialties.map((specialty) =>
        specialty.specialtyId === specialtyId
          ? { ...specialty, registryNumber: registryNumber || undefined }
          : specialty,
      ),
    }))
  }

  function handleSubmit() {
    const found = validateProfessionalForm(values, isEditing)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const shared = {
      registrations: values.registrations,
      specialties: values.specialties,
      bio: values.bio ? values.bio : undefined,
    }

    if (isEditing) {
      onSubmit({ ...shared, isActive: values.isActive })
      return
    }

    onSubmit(
      values.userMode === 'existing'
        ? { userId: values.userId, ...shared }
        : { fullName: values.fullName, email: values.email, ...shared },
    )
  }

  const usesExistingUser = !isEditing && values.userMode === 'existing'
  const asksRegistryNumber = showsRegistryNumber(values.registrations)

  return (
    <View style={styles.form} testID="professional-form">
      {submitError ? (
        <Text style={[styles.error, { color: theme.danger }]} testID="professional-form-error">
          {submitError.status === 409
            ? 'Já existe um cadastro com este e-mail ou registro.'
            : 'Não foi possível salvar. Tente de novo.'}
        </Text>
      ) : null}

      {!isEditing ? (
        <ChoiceField
          label="Usuário"
          required
          testID="professional-form-user-mode"
          options={[
            { value: 'new', label: 'Novo usuário' },
            { value: 'existing', label: 'Usuário existente' },
          ]}
          selected={[values.userMode]}
          onToggle={(value) => set('userMode', value as 'new' | 'existing')}
        />
      ) : null}

      {!isEditing && usesExistingUser ? (
        <EntitySearch
          label="Usuário"
          placeholder="Buscar por nome..."
          queryKey="professional-form-user-search"
          selectedLabel={userLabel}
          error={errors.userId}
          testID="professional-form-user"
          onSearch={async (term) => {
            const { data } = await userService.getAll({ search: term, limit: 10 })
            return data.map((user) => ({ id: user.id, label: user.fullName, hint: user.email }))
          }}
          onSelect={(option) => {
            set('userId', option.id)
            setUserLabel(option.label)
          }}
          onClear={() => {
            set('userId', '')
            setUserLabel(null)
          }}
        />
      ) : null}

      {!isEditing && !usesExistingUser ? (
        <>
          <TextField
            label="Nome completo"
            required
            value={values.fullName}
            onChange={(value) => set('fullName', value)}
            error={errors.fullName}
            testID="professional-form-fullname"
          />
          <TextField
            label="E-mail"
            required
            value={values.email}
            onChange={(value) => set('email', value)}
            keyboardType="email-address"
            error={errors.email}
            testID="professional-form-email"
          />
        </>
      ) : null}

      <View style={styles.block} testID="professional-form-registrations">
        <Text style={[styles.blockLabel, { color: theme.text }]}>
          Registros profissionais <Text style={{ color: theme.danger }}>*</Text>
        </Text>

        {values.registrations.map((registration, index) => (
          <View
            key={index}
            style={[styles.registration, { borderColor: theme.line, borderRadius: theme.radius.md }]}
            testID={`professional-form-registration-${index}`}
          >
            <SelectField
              value={registration.councilType}
              options={COUNCIL_OPTIONS}
              placeholder="Conselho"
              testID={`professional-form-registration-council-${index}`}
              onChange={(value) =>
                updateRegistration(index, {
                  councilType: value as CouncilType,
                  // O formato muda com o conselho: guardar o número antigo
                  // deixaria um CRM de seis dígitos num CREFITO.
                  number: '',
                })
              }
            />

            <View style={styles.row}>
              <View style={styles.grow}>
                <TextField
                  label="Número"
                  required
                  value={registration.number}
                  onChange={(value) =>
                    updateRegistration(index, {
                      number: applyRegistrationNumberMask(value, registration.councilType),
                    })
                  }
                  placeholder={COUNCIL_REGISTRATION_FORMATS[registration.councilType].numberPlaceholder}
                  testID={`professional-form-registration-number-${index}`}
                />
              </View>
              <View style={styles.narrow}>
                <TextField
                  label="UF"
                  required
                  value={registration.state}
                  onChange={(value) =>
                    updateRegistration(index, { state: value.toUpperCase().slice(0, 2) })
                  }
                  placeholder="SP"
                  testID={`professional-form-registration-state-${index}`}
                />
              </View>
            </View>

            <View style={styles.registrationActions}>
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: registration.isPrimary }}
                onPress={() => setPrimary(index)}
                hitSlop={10}
                testID={`professional-form-registration-primary-${index}`}
              >
                <Text
                  style={{
                    color: registration.isPrimary ? theme.accent : theme.textMute,
                    fontSize: 13,
                    fontWeight: registration.isPrimary ? '600' : '400',
                  }}
                >
                  {registration.isPrimary ? '● Principal' : '○ Tornar principal'}
                </Text>
              </Pressable>

              {values.registrations.length > 1 ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => removeRegistration(index)}
                  hitSlop={10}
                  testID={`professional-form-registration-remove-${index}`}
                >
                  <Text style={{ color: theme.danger, fontSize: 13 }}>Remover</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ))}

        <Pressable
          accessibilityRole="button"
          onPress={addRegistration}
          testID="professional-form-registration-add"
          style={[styles.add, { borderColor: theme.accent, borderRadius: theme.radius.md }]}
        >
          <Text style={{ color: theme.accent, fontWeight: '600' }}>+ Outro registro</Text>
        </Pressable>

        {errors.registrations ? (
          <Text
            style={[styles.error, { color: theme.danger }]}
            testID="professional-form-registrations-error"
          >
            {errors.registrations}
          </Text>
        ) : null}
      </View>

      <View style={styles.block} testID="professional-form-specialties">
        <Text style={[styles.blockLabel, { color: theme.text }]}>Especialidades</Text>

        {specialties.isPending ? (
          <Text style={{ color: theme.textMute, fontSize: 13 }} testID="professional-form-specialties-loading">
            Carregando especialidades...
          </Text>
        ) : null}

        {!specialties.isPending && catalog.length === 0 ? (
          <Text style={{ color: theme.textMute, fontSize: 13 }} testID="professional-form-specialties-empty">
            A clínica não tem especialidades habilitadas.
          </Text>
        ) : null}

        {catalog.map((specialty) => {
          const chosen = values.specialties.find((item) => item.specialtyId === specialty.id)
          return (
            <View key={specialty.id} style={styles.specialty}>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: Boolean(chosen) }}
                onPress={() => toggleSpecialty(specialty.id)}
                testID={`professional-form-specialty-${specialty.id}`}
                style={[
                  styles.choice,
                  {
                    borderRadius: theme.radius.xl,
                    borderColor: chosen ? theme.accent : theme.line,
                    backgroundColor: chosen ? theme.accent : theme.surface,
                  },
                ]}
              >
                <Text style={{ color: chosen ? theme.surface : theme.text }}>{specialty.name}</Text>
              </Pressable>

              {chosen && asksRegistryNumber ? (
                <TextField
                  label={`RQE — ${specialty.name}`}
                  value={chosen.registryNumber ?? ''}
                  // Sem recorte de caracteres, como na web: o teclado já é
                  // numérico, e colar um texto com letra tem de **dizer** o
                  // que está errado em vez de apagar em silêncio o que a
                  // pessoa colou.
                  onChange={(value) => setRegistryNumber(specialty.id, value)}
                  placeholder="12345"
                  keyboardType="numeric"
                  testID={`professional-form-specialty-rqe-${specialty.id}`}
                />
              ) : null}
            </View>
          )
        })}

        {errors.specialties ? (
          <Text
            style={[styles.error, { color: theme.danger }]}
            testID="professional-form-specialties-error"
          >
            {errors.specialties}
          </Text>
        ) : null}
      </View>

      <TextField
        label="Bio"
        value={values.bio}
        onChange={(value) => set('bio', value)}
        multiline
        helpText={`${values.bio.length}/500`}
        error={errors.bio}
        testID="professional-form-bio"
      />

      {isEditing ? (
        <ChoiceField
          label="Situação"
          required={false}
          testID="professional-form-active"
          options={[{ value: 'active', label: 'Conta ativa' }]}
          selected={values.isActive ? ['active'] : []}
          multiple
          onToggle={() => set('isActive', !values.isActive)}
          helpText="Conta desativada não consegue entrar no sistema."
        />
      ) : null}

      <Button
        label={isEditing ? 'Salvar alterações' : 'Criar profissional'}
        loading={isSubmitting}
        onPress={handleSubmit}
        testID="professional-form-submit"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  error: { fontSize: 12 },
  block: { gap: 10 },
  blockLabel: { fontSize: 13, fontWeight: '600' },
  registration: { borderWidth: 1, padding: 12, gap: 10 },
  registrationActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', gap: 10 },
  grow: { flex: 2 },
  narrow: { flex: 1 },
  add: { borderWidth: 1, borderStyle: 'dashed', paddingVertical: 12, alignItems: 'center' },
  specialty: { gap: 8 },
  choice: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, justifyContent: 'center' },
})
