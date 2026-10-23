import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import { Button } from '../../../components/ui/button'
import { TextField } from '../../../components/ui/fields'
import { DocumentSheet } from '../../documents/components/document-sheet'
import { useTheme } from '../../../theme/theme-context'
import { useCreateScheduleException } from '../hooks/use-schedule-exceptions.hook'

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * Bloquear horário.
 *
 * Montada só enquanto aberta: é assim que o formulário volta em branco a
 * cada abertura, sem um efeito que zera campo por campo — reabrir numa
 * outra data com o horário da vez anterior bloquearia o dia errado.
 *
 * O ADMIN bloqueia a agenda de quem estiver selecionado; o profissional, a
 * própria — e aí o `professionalId` não vai, porque o servidor já sabe quem
 * é. Mesma regra da web, e é só isso que o papel decide aqui.
 */
export function BlockTimeSheet({
  isOpen,
  onClose,
  date,
  isAdmin,
  professionalId,
}: {
  isOpen: boolean
  onClose: () => void
  date: string
  isAdmin: boolean
  professionalId?: string
}) {
  const theme = useTheme()
  const create = useCreateScheduleException()

  const [allDay, setAllDay] = useState(false)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    if (!allDay) {
      if (!TIME.test(startTime)) return setError('Horário inicial obrigatório (HH:MM).')
      if (!TIME.test(endTime)) return setError('Horário final obrigatório (HH:MM).')
      if (startTime >= endTime) return setError('O horário final deve ser após o inicial.')
    }
    setError(null)

    create.mutate(
      {
        professionalId: isAdmin ? professionalId : undefined,
        date,
        startTime: allDay ? null : startTime,
        endTime: allDay ? null : endTime,
        reason: reason.trim() ? reason.trim() : null,
      },
      { onSuccess: onClose },
    )
  }

  // O 409 tem causa específica e solução específica — repeti-lo como erro
  // genérico faria a pessoa tentar de novo sem saber o que mudar.
  const conflict = create.error?.status === 409

  return (
    <DocumentSheet
      title="Bloquear horário"
      isOpen={isOpen}
      onClose={onClose}
      testID="block-time-sheet"
      footer={
        <Button
          label="Bloquear"
          loading={create.isPending}
          onPress={handleSubmit}
          testID="block-submit"
        />
      }
    >
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.text }]}>Data</Text>
        <Text style={[styles.readOnly, { color: theme.textDim }]} testID="block-date">
          {date.split('-').reverse().join('/')}
        </Text>
        {/* A data é a da agenda aberta, e não um campo: na web ela vem
            preenchida e mexer nela aqui bloquearia um dia que não está à
            vista. */}
      </View>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: allDay }}
        onPress={() => setAllDay(!allDay)}
        testID="block-all-day"
        style={styles.checkbox}
      >
        <Feather
          name={allDay ? 'check-square' : 'square'}
          size={18}
          color={allDay ? theme.accent : theme.textDim}
        />
        <Text style={{ color: theme.text, fontSize: 14 }}>Dia inteiro</Text>
      </Pressable>

      {allDay ? null : (
        <>
          <TextField
            label="Início"
            value={startTime}
            onChange={setStartTime}
            placeholder="HH:MM"
            testID="block-start-time"
          />
          <TextField
            label="Fim"
            value={endTime}
            onChange={setEndTime}
            placeholder="HH:MM"
            testID="block-end-time"
          />
        </>
      )}

      <TextField
        label="Motivo (opcional)"
        value={reason}
        onChange={setReason}
        multiline
        placeholder="Congresso, compromisso particular..."
        testID="block-reason"
      />

      {error ? (
        <Text style={{ color: theme.danger, fontSize: 12 }} testID="block-validation-error">
          {error}
        </Text>
      ) : null}

      {conflict ? (
        <Text style={{ color: theme.danger, fontSize: 13 }} testID="block-conflict-error">
          Existe consulta agendada nesse período. Remarque ou cancele a consulta antes de bloquear
          o horário.
        </Text>
      ) : null}

      {create.isError && !conflict ? (
        <Text style={{ color: theme.danger, fontSize: 13 }} testID="block-error">
          Ocorreu um erro ao bloquear o horário. Tente novamente.
        </Text>
      ) : null}
    </DocumentSheet>
  )
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  readOnly: { fontSize: 14 },
  checkbox: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
})
