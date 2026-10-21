import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useTheme } from '../../theme/theme-context'

/**
 * O cartão de listagem, igual ao da web em celular.
 *
 * A web tem tabela e cartão: `<table className="hidden md:block">` para a
 * mesa e `MobileListCard` abaixo de 768px. O app copia o segundo, que é o
 * desenho que a casa já escolheu para esta largura — título, pares
 * rótulo/valor alinhados às bordas, e uma fileira de ações separada por um
 * traço. Reinventar aqui faria a mesma clínica parecer dois produtos.
 */
export interface IListCardRow {
  label: string
  /** Texto, ou o que for preciso desenhar — uma pastilha de cor, um selo. */
  value: ReactNode
}

export function ListCard({
  title,
  subtitle,
  leading,
  rows,
  actions,
  testID,
}: {
  title: string
  subtitle?: string | null
  /** O que vem antes do título — a bolinha com iniciais, na lista de usuários. */
  leading?: ReactNode
  rows: IListCardRow[]
  actions?: ReactNode
  testID: string
}) {
  const theme = useTheme()

  return (
    <View
      style={[
        styles.card,
        { borderRadius: theme.radius.lg, borderColor: theme.line, backgroundColor: theme.surface },
      ]}
      testID={testID}
    >
      <View style={styles.header}>
        {leading}
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]} testID={`${testID}-title`}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.textDim }]} testID={`${testID}-subtitle`}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.rows}>
        {rows.map((row) => (
          <View key={row.label} style={styles.row}>
            <Text style={[styles.rowLabel, { color: theme.textMute }]}>{row.label}</Text>
            <View style={styles.rowValue}>
              {typeof row.value === 'string' ? (
                <Text style={[styles.rowValueText, { color: theme.text }]}>{row.value}</Text>
              ) : (
                row.value
              )}
            </View>
          </View>
        ))}
      </View>

      {actions ? (
        <View style={[styles.actions, { borderTopColor: theme.line }]}>{actions}</View>
      ) : null}
    </View>
  )
}

/**
 * Uma ação da fileira de baixo.
 *
 * Não é o `Button`: ali cada ação viraria um bloco de 48pt de altura e o
 * cartão teria mais botão do que conteúdo. Aqui é texto, como na web — mas
 * com `hitSlop`, que é o que devolve o alvo de toque sem engordar o desenho.
 */
export function ListCardAction({
  label,
  onPress,
  testID,
  tone = 'neutral',
  disabled = false,
}: {
  label: string
  onPress: () => void
  testID: string
  tone?: 'neutral' | 'danger'
  disabled?: boolean
}) {
  const theme = useTheme()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      hitSlop={12}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <Text
        style={[styles.actionLabel, { color: tone === 'danger' ? theme.danger : theme.textDim }]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

/** Empurra o que vem depois para a direita, como o `ml-auto` da web. */
export function ListCardActionSpacer() {
  return <View style={styles.spacer} />
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 16, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '700' },
  subtitle: { fontSize: 12 },
  rows: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowLabel: { fontSize: 13, flexShrink: 0 },
  rowValue: { flex: 1, alignItems: 'flex-end' },
  rowValueText: { fontSize: 13, textAlign: 'right' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, borderTopWidth: 1, paddingTop: 12 },
  actionLabel: { fontSize: 13, fontWeight: '500' },
  spacer: { flex: 1 },
})
