import { useQuery } from '@tanstack/react-query'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { RECURRENCE_INTERVAL_LABELS } from '@app/shared'
import { APPOINTMENT_STATUS_LABELS, getAppointmentSeriesUseCase } from '@app/core'
import { ErrorState, LoadingState } from '../../../components/ui/screen'
import { DocumentSheet } from '../../documents/components/document-sheet'
import { useTheme } from '../../../theme/theme-context'
import { formatShortDate, formatTime, weekdayName } from '../utils/agenda-date.util'

/**
 * As ocorrências da série, para ir de uma sessão à outra.
 *
 * Na web é um diálogo aberto pelo "Ver série" no cabeçalho; aqui é a mesma
 * folha que os formulários usam. A sessão aberta fica destacada — numa série
 * de vinte, saber onde se está é metade do que a lista serve para responder.
 */
export function SeriesSheet({
  seriesId,
  currentAppointmentId,
  isOpen,
  onClose,
  onSelect,
}: {
  seriesId: string
  currentAppointmentId: string
  isOpen: boolean
  onClose: () => void
  onSelect: (appointmentId: string) => void
}) {
  const theme = useTheme()

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['appointment-series', seriesId],
    queryFn: () => getAppointmentSeriesUseCase(seriesId),
    enabled: isOpen,
  })

  return (
    <DocumentSheet
      title="Série de consultas"
      isOpen={isOpen}
      onClose={onClose}
      testID="series-sheet"
    >
      {isLoading ? <LoadingState testID="series-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="series-error"
          message="Erro ao carregar a série de consultas."
          onRetry={() => void refetch()}
        />
      ) : null}

      {data ? (
        <>
          <View
            style={[styles.summary, { borderRadius: theme.radius.md, backgroundColor: theme.surface2 }]}
            testID="series-summary"
          >
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>
              Toda {weekdayName(data.anchorDate)} às {formatTime(data.startTime)}
            </Text>
            <Text style={{ color: theme.textMute, fontSize: 13 }}>
              {RECURRENCE_INTERVAL_LABELS[data.recurrenceInterval]} ·{' '}
              {data.createdOccurrenceCount} consultas
            </Text>
          </View>

          <ScrollView style={styles.list} testID="series-list">
            {data.occurrences.map((occurrence, index) => {
              const isCurrent = occurrence.id === currentAppointmentId
              return (
                <Pressable
                  key={occurrence.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isCurrent }}
                  onPress={() => onSelect(occurrence.id)}
                  testID={`series-item-${occurrence.date}`}
                  style={[
                    styles.item,
                    {
                      borderRadius: theme.radius.md,
                      borderColor: isCurrent ? theme.accent : theme.line,
                    },
                  ]}
                >
                  <Text style={[styles.session, { color: theme.textMute }]}>Sessão {index + 1}</Text>
                  <Text style={{ color: theme.text, fontSize: 14, fontWeight: '500' }}>
                    {formatShortDate(occurrence.date)}
                  </Text>
                  <Text style={[styles.time, { color: theme.textDim }]}>
                    {formatTime(occurrence.startTime)}
                  </Text>
                  <Text
                    style={[styles.status, { color: theme.textDim }]}
                    testID={`series-status-${occurrence.date}`}
                  >
                    {APPOINTMENT_STATUS_LABELS[occurrence.status]}
                  </Text>
                </Pressable>
              )
            })}
          </ScrollView>
        </>
      ) : null}
    </DocumentSheet>
  )
}

const styles = StyleSheet.create({
  summary: { padding: 12, gap: 2 },
  list: { maxHeight: 420 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
    marginBottom: 6,
  },
  session: { fontSize: 11, width: 58 },
  time: { fontFamily: 'Courier', fontSize: 12 },
  status: { fontSize: 11, marginLeft: 'auto' },
})
