import { useMemo, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import {
  MAXIMUM_RECURRING_OCCURRENCES,
  MINIMUM_RECURRING_OCCURRENCES,
  RECURRENCE_INTERVAL_LABELS,
  RECURRENCE_STATUS_LABELS,
  RecurrenceInterval,
} from '@app/shared'
import { Button } from '../../../components/ui/button'
import { TextField } from '../../../components/ui/fields'
import { SelectField } from '../../../components/ui/select-field'
import { ErrorState, LoadingState } from '../../../components/ui/screen'
import { DocumentSheet } from '../../documents/components/document-sheet'
import { useTheme } from '../../../theme/theme-context'
import {
  useBookAppointment,
  useBookRecurringAppointments,
  useBookablePatients,
  useProfessionalSpecialties,
  useRecurrencePreview,
} from '../hooks/use-book-appointment.hook'
import { formatShortDate, formatTime } from '../utils/agenda-date.util'

/**
 * Agendar a partir de um horário livre da grade.
 *
 * Dois passos, como na web: no primeiro escolhe-se paciente, especialidade e
 * se a consulta se repete; no segundo, só quando se repete, revisam-se as
 * datas que a série geraria. O segundo passo existe porque a série atravessa
 * meses — e o horário que está livre hoje pode estar ocupado em maio.
 *
 * Montada só enquanto aberta: é assim que ela volta em branco a cada
 * horário, sem um efeito que zera campo por campo — reabrir noutro slot com
 * o paciente da vez anterior agendaria a pessoa errada com um toque.
 */
export function BookAppointmentSheet({
  isOpen,
  onClose,
  date,
  startTime,
  endTime,
  professionalId,
}: {
  isOpen: boolean
  onClose: () => void
  date: string
  startTime: string
  endTime: string
  /** Ausente para o PROFESSIONAL: o servidor usa a ficha dele. */
  professionalId?: string
}) {
  const theme = useTheme()

  const [step, setStep] = useState<1 | 2>(1)
  const [patientId, setPatientId] = useState('')
  const [chosenSpecialtyId, setChosenSpecialtyId] = useState('')
  const [reason, setReason] = useState('')
  const [isRecurring, setRecurring] = useState(false)
  const [interval, setInterval] = useState<RecurrenceInterval>(RecurrenceInterval.EVERY_WEEK)
  const [occurrenceCount, setOccurrenceCount] = useState('4')
  /**
   * O que o usuário **desmarcou**, e não o que está marcado.
   *
   * Toda data disponível começa marcada, e guardar a seleção obrigaria a
   * preenchê-la num efeito quando a previsão chegasse — cascata de render
   * que o compilador do React reprova, com razão. Guardando a exceção, a
   * seleção é derivada e a lista nova já nasce certa.
   */
  const [deselected, setDeselected] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const patients = useBookablePatients(isOpen)
  const professional = useProfessionalSpecialties(professionalId, isOpen)
  const book = useBookAppointment()
  const bookRecurring = useBookRecurringAppointments()

  const specialties = useMemo(() => professional.data?.specialties ?? [], [professional.data])
  // Com uma especialidade só, ela vai no corpo sem ninguém escolher.
  const specialtyId = specialties.length === 1 ? specialties[0].id : chosenSpecialtyId

  const previewParams = useMemo(() => {
    if (step !== 2) return null
    return {
      professionalId,
      patientId,
      date,
      startTime,
      recurrenceInterval: interval,
      occurrenceCount: Number(occurrenceCount),
    }
  }, [step, professionalId, patientId, date, startTime, interval, occurrenceCount])

  const preview = useRecurrencePreview(previewParams)

  const selectable = (preview.data?.occurrences ?? []).filter((o) => o.selectable)
  // Toda data disponível começa marcada: desmarcar o que não serve é menos
  // trabalho do que marcar vinte que servem.
  const selectedDates = selectable
    .map((o) => o.date)
    .filter((date) => !deselected.includes(date))
  const allSelected = selectable.length > 0 && selectedDates.length === selectable.length

  function validate(): boolean {
    if (!patientId) {
      setError('Selecione um paciente.')
      return false
    }
    if (specialties.length > 1 && !specialtyId) {
      setError('Selecione uma especialidade.')
      return false
    }
    if (isRecurring) {
      const parsed = Number(occurrenceCount)
      if (
        !Number.isInteger(parsed) ||
        parsed < MINIMUM_RECURRING_OCCURRENCES ||
        parsed > MAXIMUM_RECURRING_OCCURRENCES
      ) {
        setError(
          `Informe entre ${MINIMUM_RECURRING_OCCURRENCES} e ${MAXIMUM_RECURRING_OCCURRENCES} consultas.`,
        )
        return false
      }
    }
    setError(null)
    return true
  }

  function handleSubmit() {
    if (!validate()) return

    if (isRecurring) {
      setStep(2)
      return
    }

    book.mutate(
      {
        professionalId,
        patientId,
        date,
        startTime,
        reason: reason.trim() || undefined,
        specialtyId: specialtyId || undefined,
      },
      { onSuccess: onClose },
    )
  }

  function handleConfirmSeries() {
    bookRecurring.mutate(
      {
        professionalId,
        specialtyId: specialtyId || undefined,
        patientId,
        startTime,
        recurrenceInterval: interval,
        dates: selectedDates,
        occurrenceCount: Number(occurrenceCount),
        reason: reason.trim() || undefined,
      },
      { onSuccess: onClose },
    )
  }

  const bookError = book.error
  const bookMessage =
    bookError?.status === 409
      ? 'Este horário acabou de ser reservado. Escolha outro.'
      : bookError?.status === 422
        ? 'Horário inválido ou no passado. Escolha outro.'
        : bookError
          ? 'Ocorreu um erro ao agendar. Tente novamente.'
          : null

  const conflicting = bookRecurring.error?.conflictingOccurrences ?? []
  const seriesMessage =
    bookRecurring.error?.status === 409
      ? conflicting.length > 0
        ? `Estas datas deixaram de estar disponíveis: ${conflicting
            .map((o) => formatShortDate(o.date))
            .join(', ')}. Revise a lista e tente de novo.`
        : 'Algumas datas deixaram de estar disponíveis. Revise a lista e tente de novo.'
      : bookRecurring.error
        ? 'Ocorreu um erro ao agendar a série. Tente novamente.'
        : null


  return (
    <DocumentSheet
      title={step === 1 ? 'Agendar consulta' : 'Revisar datas'}
      isOpen={isOpen}
      onClose={onClose}
      testID="book-appointment-sheet"
      footer={
        step === 1 ? (
          <Button
            label={isRecurring ? 'Revisar datas' : 'Agendar'}
            loading={book.isPending}
            onPress={handleSubmit}
            testID="book-submit"
          />
        ) : (
          <Button
            label={`Agendar ${selectedDates.length} consultas`}
            disabled={selectedDates.length === 0}
            loading={bookRecurring.isPending}
            onPress={handleConfirmSeries}
            testID="book-confirm-series"
          />
        )
      }
    >
      {step === 1 ? (
        <>
          <View
            style={[styles.slot, { borderRadius: theme.radius.md, backgroundColor: theme.surface2 }]}
          >
            <Text style={{ color: theme.textMute, fontSize: 12 }}>Data e horário</Text>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }} testID="book-slot">
              {formatShortDate(date)} · {formatTime(startTime)} – {formatTime(endTime)}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.text }]}>
              Paciente<Text style={{ color: theme.danger }}> *</Text>
            </Text>
            <SelectField
              value={patientId || null}
              options={(patients.data ?? []).map((patient) => ({
                value: patient.id,
                label: patient.fullName,
              }))}
              onChange={setPatientId}
              placeholder="Selecione um paciente"
              testID="book-patient"
            />
          </View>

          {/* Com uma especialidade só não há escolha a fazer, e o backend a
              recebe de qualquer forma. */}
          {specialties.length > 1 ? (
            <View style={styles.field}>
              <Text style={[styles.label, { color: theme.text }]}>
                Especialidade<Text style={{ color: theme.danger }}> *</Text>
              </Text>
              <SelectField
                value={specialtyId || null}
                options={specialties.map((specialty) => ({
                  value: specialty.id,
                  label: specialty.name,
                }))}
                onChange={setChosenSpecialtyId}
                placeholder="Selecione uma especialidade"
                testID="book-specialty"
              />
            </View>
          ) : null}

          <TextField
            label="Motivo (opcional)"
            value={reason}
            onChange={setReason}
            multiline
            testID="book-reason"
          />

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: isRecurring }}
            onPress={() => setRecurring(!isRecurring)}
            testID="book-recurring-toggle"
            style={styles.checkbox}
          >
            <Feather
              name={isRecurring ? 'check-square' : 'square'}
              size={18}
              color={isRecurring ? theme.accent : theme.textDim}
            />
            <Text style={{ color: theme.text, fontSize: 14 }}>Consulta recorrente</Text>
          </Pressable>

          {isRecurring ? (
            <View style={styles.field} testID="book-recurrence-fields">
              <Text style={[styles.label, { color: theme.text }]}>Repetir</Text>
              <SelectField
                value={interval}
                options={Object.values(RecurrenceInterval).map((value) => ({
                  value,
                  label: RECURRENCE_INTERVAL_LABELS[value],
                }))}
                onChange={(value) => setInterval(value as RecurrenceInterval)}
                placeholder="A cada 1 semana"
                testID="book-recurrence-interval"
              />
              <TextField
                label="Quantas consultas"
                value={occurrenceCount}
                onChange={setOccurrenceCount}
                keyboardType="numeric"
                testID="book-occurrence-count"
              />
            </View>
          ) : null}

          {error ? (
            <Text style={{ color: theme.danger, fontSize: 12 }} testID="book-validation-error">
              {error}
            </Text>
          ) : null}

          {bookMessage ? (
            <Text style={{ color: theme.danger, fontSize: 13 }} testID="book-error">
              {bookMessage}
            </Text>
          ) : null}
        </>
      ) : (
        <>
          {preview.isLoading ? <LoadingState testID="preview-loading" /> : null}

          {preview.isError ? (
            <ErrorState
              testID="preview-error"
              message="Erro ao calcular as datas da série."
              onRetry={() => void preview.refetch()}
            />
          ) : null}

          {preview.data ? (
            <>
              <View style={styles.previewHeader}>
                <Text style={{ color: theme.textDim, fontSize: 13 }} testID="preview-summary">
                  {preview.data.occurrences.length} datas ·{' '}
                  {preview.data.availableOccurrenceCount} disponíveis ·{' '}
                  {preview.data.unavailableOccurrenceCount} indisponíveis
                </Text>
                <Pressable
                  accessibilityRole="button"
                  disabled={selectable.length === 0}
                  onPress={() =>
                    setDeselected(allSelected ? selectable.map((o) => o.date) : [])
                  }
                  testID="preview-toggle-all"
                  hitSlop={8}
                >
                  <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600' }}>
                    {allSelected ? 'Desmarcar todas' : 'Marcar todas'}
                  </Text>
                </Pressable>
              </View>

              {preview.data.truncatedByMaximumOccurrences ? (
                <Text style={{ color: theme.warn, fontSize: 12 }} testID="preview-truncated">
                  A série foi limitada ao máximo de consultas permitido.
                </Text>
              ) : null}
              {preview.data.truncatedByHorizon ? (
                <Text style={{ color: theme.warn, fontSize: 12 }} testID="preview-truncated-horizon">
                  A série foi limitada a um ano a partir da primeira consulta.
                </Text>
              ) : null}

              <ScrollView style={styles.previewList} testID="preview-list">
                {preview.data.occurrences.map((occurrence) => {
                  const checked = selectedDates.includes(occurrence.date)
                  return (
                    <Pressable
                      key={occurrence.date}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked, disabled: !occurrence.selectable }}
                      // Data indisponível o servidor recusaria de qualquer
                      // forma — deixá-la marcável só produziria um 409 certo.
                      disabled={!occurrence.selectable}
                      onPress={() =>
                        setDeselected((current) =>
                          current.includes(occurrence.date)
                            ? current.filter((d) => d !== occurrence.date)
                            : [...current, occurrence.date],
                        )
                      }
                      testID={`preview-item-${occurrence.date}`}
                      style={[
                        styles.previewItem,
                        {
                          borderRadius: theme.radius.md,
                          borderColor: theme.line,
                          opacity: occurrence.selectable ? 1 : 0.5,
                        },
                      ]}
                    >
                      <Feather
                        name={checked ? 'check-square' : 'square'}
                        size={18}
                        color={checked ? theme.accent : theme.textDim}
                      />
                      <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>
                        {formatShortDate(occurrence.date)}
                      </Text>
                      <Text
                        style={[styles.previewStatus, { color: theme.textMute }]}
                        testID={`preview-status-${occurrence.date}`}
                      >
                        {RECURRENCE_STATUS_LABELS[occurrence.availability]}
                      </Text>
                    </Pressable>
                  )
                })}
              </ScrollView>

              <Text style={{ color: theme.text, fontSize: 13, fontWeight: '500' }} testID="preview-selected-count">
                {selectedDates.length} datas selecionadas
              </Text>
            </>
          ) : null}

          {seriesMessage ? (
            <Text style={{ color: theme.danger, fontSize: 13 }} testID="book-series-error">
              {seriesMessage}
            </Text>
          ) : null}

          <Button
            label="Voltar"
            variant="outline"
            onPress={() => setStep(1)}
            testID="book-back-to-form"
          />
        </>
      )}
    </DocumentSheet>
  )
}

const styles = StyleSheet.create({
  slot: { padding: 12, gap: 2 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  checkbox: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  previewList: { maxHeight: 320 },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    marginBottom: 6,
  },
  previewStatus: { fontSize: 11, marginLeft: 'auto' },
})
