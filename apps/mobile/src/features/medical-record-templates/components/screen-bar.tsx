import { Pressable, StyleSheet, Text, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import { useTheme } from '../../../theme/theme-context'

/** Barra de voltar com o título da tela, igual à das demais telas internas. */
export function ScreenBar({
  title,
  onBack,
  testID,
}: {
  title: string
  onBack: () => void
  testID: string
}) {
  const theme = useTheme()

  return (
    <View style={[styles.bar, { borderColor: theme.line }]} testID={`${testID}-bar`}>
      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        hitSlop={12}
        testID={`${testID}-back`}
        style={styles.back}
      >
        <Feather name="arrow-left" size={18} color={theme.accent} />
        <Text style={{ color: theme.accent, fontWeight: '600' }}>Voltar</Text>
      </Pressable>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 16, fontWeight: '700' },
})
