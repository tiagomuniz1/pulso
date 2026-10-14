import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../../theme/theme-context'

/**
 * A faixa de ações, presa na base.
 *
 * Na web em celular ela fica fixa no rodapé, fora da rolagem — concluir e
 * cancelar não podem depender de a pessoa ter rolado até o fim de um
 * prontuário longo.
 */
export function AppointmentActionsBar({
  canComplete,
  isCompleting,
  isCancelling,
  onReassign,
  onCancel,
  onComplete,
}: {
  canComplete: boolean
  isCompleting: boolean
  isCancelling: boolean
  onReassign: () => void
  onCancel: () => void
  onComplete: () => void
}) {
  const theme = useTheme()

  return (
    <SafeAreaView
      edges={['bottom']}
      style={[styles.bar, { backgroundColor: theme.bg, borderColor: theme.line }]}
      testID="appointment-actions"
    >
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          onPress={onReassign}
          testID="action-reassign"
          style={[styles.button, { borderRadius: theme.radius.md, borderColor: theme.line }]}
        >
          <Text style={{ color: theme.text, fontSize: 14 }}>Trocar</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ busy: isCancelling }}
          disabled={isCancelling}
          onPress={onCancel}
          testID="action-cancel"
          style={[
            styles.button,
            {
              borderRadius: theme.radius.md,
              borderColor: theme.danger,
              opacity: isCancelling ? 0.5 : 1,
            },
          ]}
        >
          <Text style={{ color: theme.danger, fontSize: 14 }}>Cancelar</Text>
        </Pressable>

        {/* Concluir consulta futura o backend recusa com 422; oferecer o
            botão seria oferecer um caminho que só termina em erro. */}
        {canComplete ? (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: isCompleting }}
            disabled={isCompleting}
            onPress={onComplete}
            testID="action-complete"
            style={[
              styles.button,
              styles.primary,
              {
                borderRadius: theme.radius.md,
                backgroundColor: theme.accentSoft,
                borderColor: theme.accentSoft,
                opacity: isCompleting ? 0.5 : 1,
              },
            ]}
          >
            <Text style={{ color: theme.accent, fontSize: 14, fontWeight: '600' }}>
              Concluir consulta
            </Text>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: 1 },
  row: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  button: {
    flex: 1,
    borderWidth: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  primary: { flex: 1.3 },
})
