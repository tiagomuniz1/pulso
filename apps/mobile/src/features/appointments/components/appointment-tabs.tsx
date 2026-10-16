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

export interface AppointmentTab {
  id: AppointmentTabId
  label: string
  /** Ausente quando a aba não conta nada — Resumo, Prontuário e Histórico. */
  count?: number
}

/**
 * A fileira de abas da consulta.
 *
 * Quais aparecem é decisão de quem chama, porque depende do papel e da posse
 * do atendimento: a recepção só tem Resumo, e o profissional que não atendeu
 * esta consulta não tem as de documento. O backend recusa de qualquer forma,
 * mas oferecer uma aba que só devolve 403 é entregar erro no lugar de
 * ausência.
 */
export function AppointmentTabs({
  tabs,
  activeId,
  onChange,
}: {
  tabs: AppointmentTab[]
  activeId: AppointmentTabId
  onChange: (id: AppointmentTabId) => void
}) {
  const theme = useTheme()

  return (
    <View
      style={[styles.card, { borderRadius: theme.radius.lg, borderColor: theme.line }]}
      testID="appointment-tabs"
    >
      {tabs.map((tab) => {
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
            {/* Zero também aparece, como na web: "nenhuma receita" é
                informação, e a contagem sumindo mudaria a largura da aba a
                cada emissão. */}
            {tab.count === undefined ? null : (
              <View
                style={[
                  styles.badge,
                  {
                    borderRadius: theme.radius.xl,
                    backgroundColor: isActive ? theme.accent : theme.surface2,
                  },
                ]}
                testID={`appointment-tab-${tab.id}-count`}
              >
                <Text
                  style={{
                    color: isActive ? theme.surface : theme.textDim,
                    fontSize: 11,
                    fontWeight: '600',
                  }}
                >
                  {tab.count}
                </Text>
              </View>
            )}
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
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
  },
  badge: { minWidth: 18, paddingHorizontal: 5, paddingVertical: 1, alignItems: 'center' },
})
