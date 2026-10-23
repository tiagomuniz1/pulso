import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { DayOfWeek, UserRole } from '@app/shared'
import {
  DAY_OF_WEEK_LABELS,
  type IApiError,
  type ICreateScheduleInput,
  type IScheduleModel,
  type IUpdateScheduleInput,
} from '@app/core'
import { Button } from '../../../components/ui/button'
import { ChoiceField, TextField } from '../../../components/ui/fields'
import { SelectField } from '../../../components/ui/select-field'
import { useTheme } from '../../../theme/theme-context'
import { applyDateMask, fromIsoDate, toIsoDate } from '../../../lib/date-input'
import { useSessionStore } from '../../auth/session.store'
import { useAgendaProfessionals } from '../../appointments/hooks/use-agenda-filters.hook'
import {
  applyTimeMask,
  validateScheduleForm,
  type IScheduleFormValues,
} from '../schedule-form.validation'

const DAY_OPTIONS = Object.values(DayOfWeek).map((value) => ({
  value,
  label: DAY_OF_WEEK_LABELS[value],
}))

function initialValues(schedule: IScheduleModel | null): IScheduleFormValues {
  return {
    professionalId: schedule?.professionalId ?? '',
    dayOfWeek: schedule?.dayOfWeek ?? '',
    startTime: schedule ? schedule.startTime.slice(0, 5) : '',
    endTime: schedule ? schedule.endTime.slice(0, 5) : '',
    slotDurationInMinutes: schedule ? String(schedule.slotDurationInMinutes) : '30',
    validFrom: schedule?.validFrom ? fromIsoDate(new Date(`${schedule.validFrom}T00:00:00`)) : '',
    validUntil: schedule?.validUntil ? fromIsoDate(new Date(`${schedule.validUntil}T00:00:00`)) : '',
  }
}

/**
 * O cadastro de agenda.
 *
 * **O ADMIN escolhe de quem é a agenda; o PROFESSIONAL não.** Ele cria só a
 * própria, e o servidor a deduz do `userId` — oferecer-lhe o seletor seria
 * oferecer um caminho que termina em `403`. Na edição ninguém troca o dono:
 * seria mover a agenda de uma pessoa para outra com as consultas junto.
 */
export function ScheduleForm({
  schedule,
  isSubmitting,
  submitError,
  onSubmit,
}: {
  schedule: IScheduleModel | null
  isSubmitting: boolean
  submitError: IApiError | null
  onSubmit: (input: ICreateScheduleInput | IUpdateScheduleInput) => void
}) {
  const theme = useTheme()
  const isEditing = schedule !== null
  const role = useSessionStore((state) => state.user?.role)
  const needsProfessional = !isEditing && role === UserRole.ADMIN

  const [values, setValues] = useState<IScheduleFormValues>(() => initialValues(schedule))
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})

  const professionals = useAgendaProfessionals()

  function set<K extends keyof IScheduleFormValues>(field: K, value: IScheduleFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function handleSubmit() {
    const found = validateScheduleForm(values, needsProfessional)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    const shared = {
      dayOfWeek: values.dayOfWeek as DayOfWeek,
      startTime: values.startTime,
      endTime: values.endTime,
      slotDurationInMinutes: Number(values.slotDurationInMinutes),
    }

    if (isEditing) {
      onSubmit({
        ...shared,
        // `null` e não `undefined`: apagar a data tem de **remover** o
        // limite, e `undefined` diria ao backend "não mexa neste campo".
        validFrom: values.validFrom ? toIsoDate(values.validFrom) : null,
        validUntil: values.validUntil ? toIsoDate(values.validUntil) : null,
      })
      return
    }

    onSubmit({
      ...shared,
      ...(needsProfessional ? { professionalId: values.professionalId } : {}),
      validFrom: values.validFrom ? (toIsoDate(values.validFrom) as string) : undefined,
      validUntil: values.validUntil ? (toIsoDate(values.validUntil) as string) : undefined,
    })
  }

  return (
    <View style={styles.form} testID="schedule-form">
      {submitError ? (
        <Text style={[styles.error, { color: theme.danger }]} testID="schedule-form-error">
          {submitError.status === 409
            ? 'Já existe uma agenda deste profissional neste horário.'
            : 'Não foi possível salvar. Tente de novo.'}
        </Text>
      ) : null}

      {needsProfessional ? (
        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>
            Profissional <Text style={{ color: theme.danger }}>*</Text>
          </Text>
          <SelectField
            value={values.professionalId || null}
            placeholder="Selecione o profissional"
            testID="schedule-form-professional"
            options={(professionals.data ?? []).map((professional) => ({
              value: professional.id,
              label: professional.user.fullName,
            }))}
            onChange={(value) => set('professionalId', value)}
          />
          {errors.professionalId ? (
            <Text
              style={[styles.error, { color: theme.danger }]}
              testID="schedule-form-professional-error"
            >
              {errors.professionalId}
            </Text>
          ) : null}
        </View>
      ) : null}

      <ChoiceField
        label="Dia da semana"
        required
        testID="schedule-form-day"
        options={DAY_OPTIONS}
        selected={values.dayOfWeek ? [values.dayOfWeek] : []}
        onToggle={(value) => set('dayOfWeek', value)}
        error={errors.dayOfWeek}
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <TextField
            label="Início"
            required
            value={values.startTime}
            onChange={(value) => set('startTime', applyTimeMask(value))}
            placeholder="08:00"
            keyboardType="numeric"
            error={errors.startTime}
            testID="schedule-form-start"
          />
        </View>
        <View style={styles.half}>
          <TextField
            label="Fim"
            required
            value={values.endTime}
            onChange={(value) => set('endTime', applyTimeMask(value))}
            placeholder="17:00"
            keyboardType="numeric"
            error={errors.endTime}
            testID="schedule-form-end"
          />
        </View>
      </View>

      <TextField
        label="Duração da consulta (min)"
        required
        value={values.slotDurationInMinutes}
        onChange={(value) => set('slotDurationInMinutes', value.replace(/\D/g, '').slice(0, 3))}
        keyboardType="numeric"
        error={errors.slotDurationInMinutes}
        testID="schedule-form-duration"
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <TextField
            label="Válido de"
            value={values.validFrom}
            onChange={(value) => set('validFrom', applyDateMask(value))}
            placeholder="DD/MM/AAAA"
            keyboardType="numeric"
            error={errors.validFrom}
            testID="schedule-form-valid-from"
          />
        </View>
        <View style={styles.half}>
          <TextField
            label="Válido até"
            value={values.validUntil}
            onChange={(value) => set('validUntil', applyDateMask(value))}
            placeholder="DD/MM/AAAA"
            keyboardType="numeric"
            error={errors.validUntil}
            testID="schedule-form-valid-until"
          />
        </View>
      </View>

      <Text style={[styles.help, { color: theme.textMute }]}>
        Sem datas, a agenda vale por tempo indeterminado.
      </Text>

      <Button
        label={isEditing ? 'Salvar alterações' : 'Criar agenda'}
        loading={isSubmitting}
        onPress={handleSubmit}
        testID="schedule-form-submit"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  form: { gap: 14 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  error: { fontSize: 12 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  help: { fontSize: 12, marginTop: -6 },
})
