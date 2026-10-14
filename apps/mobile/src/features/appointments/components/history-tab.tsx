import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { listPatientMedicalHistoryUseCase } from '@app/core'
import { ErrorState, LoadingState } from '../../../components/ui/screen'
import { useTheme } from '../../../theme/theme-context'
import { formatShortDate, formatTime } from '../utils/agenda-date.util'

/**
 * O histórico da paciente **nesta especialidade**.
 *
 * O recorte não é cosmético: um nutricionista não lê o prontuário de
 * ginecologia, e o servidor aplica a mesma regra. `specialtyId: 'null'` pede
 * exatamente os atendimentos sem especialidade — omitir significaria "todas",
 * que é outra coisa.
 *
 * Ao contrário das outras abas, esta não vem em cartão: a web a desenha solta
 * sobre o fundo, com um título e a lista abaixo.
 */
export function HistoryTab({
  patientId,
  specialtyId,
  appointmentId,
}: {
  patientId: string
  specialtyId: string | null
  appointmentId: string
}) {
  const theme = useTheme()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['medical-records', 'history', patientId, specialtyId, appointmentId],
    queryFn: () =>
      listPatientMedicalHistoryUseCase(patientId, {
        specialtyId: specialtyId ?? 'null',
        excludeAppointmentId: appointmentId,
        limit: 20,
      }),
  })

  // Derivado aqui, e não no corpo: durante o carregamento `data` é mesmo
  // `undefined`, e é o único lugar onde isso precisa ser dito.
  const records = data?.data ?? []

  return (
    <View style={styles.wrapper} testID="appointment-history-section">
      <Text style={[styles.title, { color: theme.text }]}>Histórico desta paciente</Text>
      <Text style={[styles.subtitle, { color: theme.textDim }]}>
        Atendimentos anteriores na mesma especialidade. Toque para ver o que foi registrado.
      </Text>

      {isLoading ? <LoadingState testID="appointment-history-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="appointment-history-error"
          message="Erro ao carregar o histórico."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && records.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textMute }]} testID="appointment-history-empty">
          Nenhum atendimento anterior desta paciente nesta especialidade.
        </Text>
      ) : null}

      {records.map((record) => (
        <Pressable
          key={record.id}
          accessibilityRole="button"
          testID={`appointment-history-item-${record.id}`}
          style={[styles.item, { borderRadius: theme.radius.md, borderColor: theme.line }]}
        >
          <Text style={[styles.itemDate, { color: theme.text }]}>
            {formatShortDate(record.appointmentDate)} às{' '}
            {formatTime(record.appointmentStartTime)}
          </Text>
          <Text style={[styles.itemProfessional, { color: theme.textMute }]} numberOfLines={1}>
            {record.professionalName}
            {record.specialtyName ? ` • ${record.specialtyName}` : ''}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  title: { fontSize: 17, fontWeight: '600' },
  subtitle: { fontSize: 13, marginBottom: 4 },
  empty: { fontSize: 13, paddingVertical: 8 },
  item: { borderWidth: 1, padding: 14, gap: 2 },
  itemDate: { fontSize: 14, fontWeight: '500' },
  itemProfessional: { fontSize: 12 },
})
