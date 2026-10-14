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
  /** Falso enquanto o conteúdo não foi portado. */
  available: boolean
}

/**
 * As oito abas da web, na mesma ordem.
 *
 * As cinco ainda não portadas aparecem **apagadas**, não escondidas: a fileira
 * de abas é o índice do atendimento, e uma versão com três faria parecer que o
 * app tem menos a oferecer do que o sistema tem.
 */
export const APPOINTMENT_TABS: Tab[] = [
  { id: 'resumo', label: 'Resumo', available: true },
  { id: 'prontuario', label: 'Prontuário', available: true },
  { id: 'historico', label: 'Histórico', available: true },
  { id: 'receitas', label: 'Receitas', available: true },
  { id: 'atestados', label: 'Atestados', available: true },
  { id: 'exames', label: 'Exames', available: true },
  { id: 'fotos', label: 'Fotos', available: false },
  { id: 'vacinas', label: 'Vacinas', available: false },
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
            accessibilityState={{ selected: isActive, disabled: !tab.available }}
            disabled={!tab.available}
            onPress={tab.available ? () => onChange(tab.id) : undefined}
            testID={`appointment-tab-${tab.id}`}
            style={[
              styles.tab,
              {
                borderRadius: theme.radius.md,
                backgroundColor: isActive ? theme.accentSoft : 'transparent',
                opacity: tab.available ? 1 : 0.4,
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
