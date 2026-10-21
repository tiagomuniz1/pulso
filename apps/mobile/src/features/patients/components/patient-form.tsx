import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import {
  KINSHIP_TYPE_LABELS,
  KinshipType,
  PATIENT_GENDER_LABELS,
  PatientGender,
  applyCpfMask,
  applyPhoneMask,
  formatCpf,
  toNormalizedAddress,
} from '@app/shared'
import {
  patientsService,
  userService,
  type IApiError,
  type ICreatePatientInput,
  type IPatientModel,
  type IUpdatePatientInput,
} from '@app/core'
import { Button } from '../../../components/ui/button'
import { EntitySearch } from '../../../components/ui/entity-search'
import { ChoiceField, TextField } from '../../../components/ui/fields'
import { useTheme } from '../../../theme/theme-context'
import { applyDateMask, fromIsoDate } from '../../../lib/date-input'
import { validatePatientForm, type IPatientFormValues } from '../patient-form.validation'
import { AddressFields } from './address-fields'

const GENDER_OPTIONS = Object.values(PatientGender).map((value) => ({
  value,
  label: PATIENT_GENDER_LABELS[value],
}))

const KINSHIP_OPTIONS = Object.values(KinshipType).map((value) => ({
  value,
  label: KINSHIP_TYPE_LABELS[value],
}))

function initialValues(patient: IPatientModel | null): IPatientFormValues {
  return {
    userMode: 'new',
    userId: '',
    fullName: patient?.fullName ?? '',
    email: patient?.email ?? '',
    phoneNumber: patient ? applyPhoneMask(patient.phoneNumber) : '',
    birthDate: patient ? fromIsoDate(patient.birthDate) : '',
    documentNumber: patient?.documentNumber ? applyCpfMask(patient.documentNumber) : '',
    gender: patient?.gender ?? '',
    isDependent: Boolean(patient?.responsiblePatientId),
    responsiblePatientId: patient?.responsiblePatientId ?? '',
    kinshipType: patient?.kinshipType ?? '',
    address: patient?.address
      ? {
          street: patient.address.street,
          number: patient.address.number,
          complement: patient.address.complement ?? '',
          neighborhood: patient.address.neighborhood,
          city: patient.address.city,
          state: patient.address.state,
          zipCode: patient.address.zipCode,
          country: patient.address.country,
        }
      : {},
  }
}

/**
 * O cadastro de paciente, criando ou editando.
 *
 * Um componente só para os dois, como na web: os campos são os mesmos, e a
 * diferença cabe em duas regras — na edição não se troca o usuário do
 * paciente, e o botão muda de nome.
 */
export function PatientForm({
  patient,
  isSubmitting,
  submitError,
  onSubmit,
}: {
  /** `null` ao criar. */
  patient: IPatientModel | null
  isSubmitting: boolean
  submitError: IApiError | null
  onSubmit: (input: ICreatePatientInput | IUpdatePatientInput) => void
}) {
  const theme = useTheme()
  const isEditing = patient !== null

  const [values, setValues] = useState<IPatientFormValues>(() => initialValues(patient))
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [responsibleLabel, setResponsibleLabel] = useState<string | null>(
    patient?.responsiblePatient
      ? `${patient.responsiblePatient.fullName}${
          patient.responsiblePatient.documentNumber
            ? ` (${formatCpf(patient.responsiblePatient.documentNumber)})`
            : ''
        }`
      : null,
  )
  const [userLabel, setUserLabel] = useState<string | null>(null)

  function set<K extends keyof IPatientFormValues>(field: K, value: IPatientFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit() {
    const { errors: found, birthDate } = validatePatientForm(values, isEditing)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const shared = {
      phoneNumber: values.phoneNumber,
      // Já convertida pela validação — converter de novo aqui exigiria um
      // ramo para o caso que ela acabou de descartar.
      birthDate: birthDate as string,
      gender: values.gender as PatientGender,
      documentNumber: values.isDependent ? undefined : values.documentNumber,
      responsiblePatientId: values.isDependent ? values.responsiblePatientId : undefined,
      kinshipType: values.isDependent ? (values.kinshipType as KinshipType) : undefined,
      address: toNormalizedAddress(values.address),
    }

    if (isEditing) {
      onSubmit({
        fullName: values.fullName,
        email: values.email,
        ...shared,
        // Na edição o backend precisa do `null` explícito para desfazer o
        // vínculo — `undefined` significaria "não mexa".
        responsiblePatientId: values.isDependent ? values.responsiblePatientId : null,
        kinshipType: values.isDependent ? (values.kinshipType as KinshipType) : null,
      })
      return
    }

    onSubmit(
      values.userMode === 'existing'
        ? { userId: values.userId, ...shared }
        : { fullName: values.fullName, email: values.email, ...shared },
    )
  }

  const usesExistingUser = !isEditing && values.userMode === 'existing'

  return (
    <View style={styles.form} testID="patient-form">
      {submitError ? (
        <Text style={[styles.error, { color: theme.danger }]} testID="patient-form-error">
          {submitError.status === 409
            ? 'Já existe um cadastro com este e-mail ou documento.'
            : 'Não foi possível salvar. Tente de novo.'}
        </Text>
      ) : null}

      {!isEditing ? (
        <ChoiceField
          label="Usuário"
          required
          testID="patient-form-user-mode"
          options={[
            { value: 'new', label: 'Novo usuário' },
            { value: 'existing', label: 'Usuário existente' },
          ]}
          selected={[values.userMode]}
          onToggle={(value) => set('userMode', value as 'new' | 'existing')}
        />
      ) : null}

      {usesExistingUser ? (
        <EntitySearch
          label="Usuário"
          placeholder="Buscar por nome..."
          queryKey="patient-form-user-search"
          selectedLabel={userLabel}
          error={errors.userId}
          testID="patient-form-user"
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
      ) : (
        <>
          <TextField
            label="Nome completo"
            required
            value={values.fullName}
            onChange={(value) => set('fullName', value)}
            error={errors.fullName}
            testID="patient-form-fullname"
          />
          <TextField
            label="E-mail"
            required
            value={values.email}
            onChange={(value) => set('email', value)}
            keyboardType="email-address"
            error={errors.email}
            testID="patient-form-email"
          />
        </>
      )}

      <TextField
        label="Telefone"
        required
        value={values.phoneNumber}
        onChange={(value) => set('phoneNumber', applyPhoneMask(value))}
        placeholder="(11) 99999-9999"
        keyboardType="numeric"
        error={errors.phoneNumber}
        testID="patient-form-phone"
      />

      <TextField
        label="Data de nascimento"
        required
        value={values.birthDate}
        onChange={(value) => set('birthDate', applyDateMask(value))}
        placeholder="DD/MM/AAAA"
        keyboardType="numeric"
        error={errors.birthDate}
        testID="patient-form-birthdate"
      />

      <ChoiceField
        label="Vínculo"
        required={false}
        testID="patient-form-dependent"
        options={[{ value: 'dependent', label: 'É dependente de outro paciente' }]}
        selected={values.isDependent ? ['dependent'] : []}
        multiple
        onToggle={() => set('isDependent', !values.isDependent)}
        helpText="Dependente dispensa CPF — cobre recém-nascido e menor sem documento."
      />

      {values.isDependent ? (
        <>
          <EntitySearch
            label="Paciente titular"
            placeholder="Buscar por nome..."
            queryKey="patient-form-titular-search"
            selectedLabel={responsibleLabel}
            error={errors.responsiblePatientId}
            testID="patient-form-responsible"
            onSearch={async (term) => {
              const { data } = await patientsService.getAll({
                search: term,
                excludeDependents: true,
                excludeId: patient?.id,
                limit: 10,
              })
              return data.map((found) => ({
                id: found.id,
                label: found.user.fullName,
                hint: found.documentNumber ? formatCpf(found.documentNumber) : null,
              }))
            }}
            onSelect={(option) => {
              set('responsiblePatientId', option.id)
              setResponsibleLabel(option.label)
            }}
            onClear={() => {
              set('responsiblePatientId', '')
              setResponsibleLabel(null)
            }}
          />
          <ChoiceField
            label="Grau de parentesco"
            required
            testID="patient-form-kinship"
            options={KINSHIP_OPTIONS}
            selected={values.kinshipType ? [values.kinshipType] : []}
            onToggle={(value) => set('kinshipType', value)}
            error={errors.kinshipType}
          />
        </>
      ) : (
        <TextField
          label="Número do documento (CPF)"
          required
          value={values.documentNumber}
          onChange={(value) => set('documentNumber', applyCpfMask(value))}
          placeholder="000.000.000-00"
          keyboardType="numeric"
          error={errors.documentNumber}
          testID="patient-form-document"
        />
      )}

      <ChoiceField
        label="Gênero"
        required
        testID="patient-form-gender"
        options={GENDER_OPTIONS}
        selected={values.gender ? [values.gender] : []}
        onToggle={(value) => set('gender', value)}
        error={errors.gender}
      />

      <AddressFields
        address={values.address}
        onChangeField={(field, value) =>
          setValues((current) => ({
            ...current,
            address: { ...current.address, [field]: value },
          }))
        }
        errors={errors}
        testID="patient-form-address"
      />

      <Button
        label={isEditing ? 'Salvar alterações' : 'Criar paciente'}
        loading={isSubmitting}
        onPress={handleSubmit}
        testID="patient-form-submit"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  error: { fontSize: 13 },
})
