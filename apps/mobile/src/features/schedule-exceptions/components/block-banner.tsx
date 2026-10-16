import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { IScheduleExceptionModel } from '@app/core'
import { useTheme } from '../../../theme/theme-context'
import { withAlpha } from '../../appointments/utils/color.util'
import { formatTime } from '../../appointments/utils/agenda-date.util'
import { useDeleteScheduleException } from '../hooks/use-schedule-exceptions.hook'

/**
 * A faixa que diz que o dia, ou parte dele, está bloqueado.
 *
 * Sem ela o app mostrava a agenda de um dia de férias igual à de um dia
 * normal — com os horários simplesmente ausentes, o que se lê como "sem
 * agenda cadastrada" e não como "bloqueado".
 */
export function BlockBanner({
  exception,
  canManage,
}: {
  exception: IScheduleExceptionModel
  canManage: boolean
}) {
  const theme = useTheme()
  const remove = useDeleteScheduleException()

  // Sem janela é o dia inteiro — o backend grava os dois horários ou nenhum.
  const window =
    exception.startTime && exception.endTime
      ? `${formatTime(exception.startTime)} – ${formatTime(exception.endTime)}`
      : 'Dia inteiro'

  return (
    <View
      style={[
        styles.banner,
        {
          borderRadius: theme.radius.md,
          borderColor: withAlpha(theme.danger, 30),
          backgroundColor: withAlpha(theme.danger, 10),
        },
      ]}
      testID={`block-banner-${exception.id}`}
    >
      <View style={styles.text}>
        <Text style={[styles.window, { color: theme.danger }]} testID="block-banner-window">
          {window} · Bloqueado
        </Text>
        {exception.reason ? (
          <Text
            style={[styles.reason, { color: theme.textMute }]}
            numberOfLines={1}
            testID="block-banner-reason"
          >
            {exception.reason}
          </Text>
        ) : null}
      </View>

      {canManage ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remover bloqueio"
          disabled={remove.isPending}
          onPress={() => remove.mutate(exception.id)}
          testID={`block-banner-remove-${exception.id}`}
          hitSlop={8}
        >
          <Text style={{ color: theme.danger, fontSize: 13, opacity: remove.isPending ? 0.5 : 1 }}>
            Remover
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 44,
  },
  text: { flex: 1 },
  window: { fontSize: 13, fontWeight: '600' },
  reason: { fontSize: 12 },
})
