import { useEffect, useState } from 'react'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { useTheme } from '../../theme/theme-context'
import { Button } from './button'

/**
 * O topo de toda tela de cadastro: título, contagem e o botão de criar.
 *
 * Na web o botão fica à direita do título em telas largas e vira largura
 * cheia abaixo de 640px (`w-full sm:w-auto`). Aqui só existe a segunda
 * forma.
 */
export function ListHeader({
  title,
  subtitle,
  action,
  testID,
}: {
  title: string
  subtitle?: string | null
  action?: { label: string; onPress: () => void; testID: string }
  testID: string
}) {
  const theme = useTheme()

  return (
    <View style={styles.header} testID={testID}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.textDim }]} testID={`${testID}-subtitle`}>
          {subtitle}
        </Text>
      ) : null}
      {action ? (
        <Button label={action.label} onPress={action.onPress} testID={action.testID} />
      ) : null}
    </View>
  )
}

/**
 * Busca com o mesmo atraso de 300ms da web.
 *
 * O atraso não é enfeite: sem ele cada letra vira uma requisição, e numa
 * rede de celular as respostas voltam fora de ordem — a lista pisca com o
 * resultado de "ana" depois do de "anal". O componente guarda o que foi
 * digitado e só avisa o pai quando a digitação para.
 */
export function SearchField({
  placeholder,
  onSearch,
  testID,
  delayInMilliseconds = 300,
}: {
  placeholder: string
  onSearch: (term: string) => void
  testID: string
  delayInMilliseconds?: number
}) {
  const theme = useTheme()
  const [term, setTerm] = useState('')

  useEffect(() => {
    const timer = setTimeout(() => onSearch(term), delayInMilliseconds)
    return () => clearTimeout(timer)
    // `onSearch` fica de fora: quem chama costuma passar uma função nova a
    // cada render, e incluí-la reiniciaria o relógio sem a busca ter mudado.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, delayInMilliseconds])

  return (
    <TextInput
      value={term}
      onChangeText={setTerm}
      placeholder={placeholder}
      placeholderTextColor={theme.textMute}
      autoCorrect={false}
      testID={testID}
      style={[
        styles.search,
        {
          borderRadius: theme.radius.md,
          borderColor: theme.line,
          backgroundColor: theme.surface,
          color: theme.text,
        },
      ]}
    />
  )
}

/** Selo de texto curto — "Ativo", o cargo, o tipo de conselho. */
export function Badge({
  label,
  tone = 'neutral',
  testID,
}: {
  label: string
  tone?: 'neutral' | 'good' | 'danger' | 'accent'
  testID?: string
}) {
  const theme = useTheme()
  const palette = {
    neutral: { background: theme.surface2, text: theme.textDim },
    good: { background: theme.goodSoft, text: theme.good },
    danger: { background: theme.dangerSoft, text: theme.danger },
    accent: { background: theme.accentSoft, text: theme.accent },
  }[tone]

  return (
    <View
      style={[styles.badge, { backgroundColor: palette.background, borderRadius: theme.radius.sm }]}
      testID={testID}
    >
      <Text style={[styles.badgeLabel, { color: palette.text }]}>{label}</Text>
    </View>
  )
}

/**
 * Página anterior e próxima, com a posição no meio.
 *
 * Não é rolagem infinita: a listagem de modelos chega a centenas de
 * entradas e a web numera as páginas. Trocar a forma aqui faria "página 3"
 * querer dizer coisas diferentes nas duas telas.
 */
export function Pagination({
  page,
  totalPages,
  onChange,
  testID,
}: {
  page: number
  totalPages: number
  onChange: (page: number) => void
  testID: string
}) {
  const theme = useTheme()

  return (
    <View style={styles.pagination} testID={testID}>
      <Text style={[styles.pageInfo, { color: theme.textDim }]} testID={`${testID}-info`}>
        Página {page} de {totalPages}
      </Text>
      <View style={styles.pageButtons}>
        <Button
          label="Anterior"
          variant="outline"
          disabled={page <= 1}
          onPress={() => onChange(page - 1)}
          testID={`${testID}-prev`}
        />
        <Button
          label="Próxima"
          variant="outline"
          disabled={page >= totalPages}
          onPress={() => onChange(page + 1)}
          testID={`${testID}-next`}
        />
      </View>
    </View>
  )
}

/** A faixa verde que confirma o que acabou de acontecer, como na web. */
export function SuccessBanner({ message, testID }: { message: string; testID: string }) {
  const theme = useTheme()
  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: theme.goodSoft, borderRadius: theme.radius.md, borderColor: theme.good },
      ]}
      testID={testID}
    >
      <Text style={{ color: theme.good, fontSize: 13 }}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  pagination: { gap: 12 },
  pageInfo: { fontSize: 13, textAlign: 'center' },
  pageButtons: { flexDirection: 'row', gap: 12 },
  header: { gap: 8 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 13 },
  search: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, minHeight: 48 },
  badge: { paddingHorizontal: 8, paddingVertical: 3 },
  badgeLabel: { fontSize: 12, fontWeight: '600' },
  banner: { borderWidth: 1, padding: 12 },
})
