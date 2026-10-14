import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../../theme/theme-context'

export type AppointmentTabId =
  | 'resumo'
  | 'prontuario'
  | 'historico'
  | 'receitas'
  | 'atestados'
  | 'exames'
  | 'fotos'
  | 'vacinas'

interface Tab {
  id: AppointmentTabId
  label: string
}

/** As oito abas da web, na mesma ordem. */
export const APPOINTMENT_TABS: Tab[] = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'prontuario', label: 'Prontuário' },
  { id: 'historico', label: 'Histórico' },
  { id: 'receitas', label: 'Receitas' },
  { id: 'atestados', label: 'Atestados' },
  { id: 'exames', label: 'Exames' },
  { id: 'fotos', label: 'Fotos' },
  { id: 'vacinas', label: 'Vacinas' },
]

export function AppointmentTabs({
  activeId,
  onChange,
}: {
  activeId: AppointmentTabId
  onChange: (id: AppointmentTabId) => void
}) {
  const theme = useTheme()

  return (
    <View
      style={[styles.card, { borderRadius: theme.radius.lg, borderColor: theme.line }]}
      testID="appointment-tabs"
    >
      {APPOINTMENT_TABS.map((tab) => {
        const isActive = tab.id === activeId
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            onPress={() => onChange(tab.id)}
            testID={`appointment-tab-${tab.id}`}
            style={[
              styles.tab,
              {
                borderRadius: theme.radius.md,
                backgroundColor: isActive ? theme.accentSoft : 'transparent',
              },
            ]}
          >
            <Text
              style={{
                color: isActive ? theme.accent : theme.textDim,
                fontSize: 13,
                fontWeight: isActive ? '600' : '400',
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    padding: 8,
  },
  tab: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
})
