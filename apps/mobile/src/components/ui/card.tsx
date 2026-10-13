import type { ReactNode } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme/theme-context'

export function Card({ children, testID }: { children: ReactNode; testID?: string }) {
  const theme = useTheme()
  return (
    <View
      style={[styles.card, { borderRadius: theme.radius.lg, borderColor: theme.accentSoft }]}
      testID={testID}
    >
      {children}
    </View>
  )
}

export function CardTitle({ children }: { children: ReactNode }) {
  const theme = useTheme()
  return <Text style={[styles.title, { color: theme.accent }]}>{children}</Text>
}

/** Rótulo em cima, valor embaixo: numa tela estreita, lado a lado trunca. */
export function Row({ label, value, testID }: { label: string; value: string; testID?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} testID={testID}>
        {value}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 16, gap: 10, backgroundColor: 'rgba(127,127,127,0.06)' },
  title: { fontSize: 17, fontWeight: '700' },
  row: { gap: 2 },
  rowLabel: { fontSize: 12, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5 },
  rowValue: { fontSize: 15, color: '#111827' },
})
