import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useTheme } from '../../theme/theme-context'
import { Button } from './button'

/**
 * A confirmação de exclusão, como diálogo — não como cartão na página.
 *
 * O detalhe da consulta confirma num `Card` embutido, e ali faz sentido: há
 * uma tela só e o cartão nasce ao lado do botão. Numa listagem o cartão
 * apareceria longe da linha que a pessoa tocou, ou pior, fora da tela depois
 * de rolar. Aqui a pergunta cobre o que está atrás, como o `Modal` da web.
 *
 * Fecha pelo fundo e pelo botão de voltar do Android (`onRequestClose`) —
 * mas **não** enquanto a exclusão está em curso: sair no meio deixaria a
 * pessoa sem saber se apagou.
 */
export function ConfirmSheet({
  title,
  message,
  confirmLabel,
  isOpen,
  isPending,
  onClose,
  onConfirm,
  testID,
}: {
  title: string
  message: string
  confirmLabel: string
  isOpen: boolean
  isPending: boolean
  onClose: () => void
  onConfirm: () => void
  testID: string
}) {
  const theme = useTheme()
  const dismiss = isPending ? () => {} : onClose

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={dismiss}>
      <Pressable style={styles.backdrop} onPress={dismiss} testID={`${testID}-backdrop`} />
      <View style={styles.centering} pointerEvents="box-none">
        <SafeAreaView
          edges={['bottom']}
          style={[
            styles.dialog,
            { backgroundColor: theme.surface, borderColor: theme.line, borderRadius: theme.radius.lg },
          ]}
          testID={testID}
        >
          <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
          <Text style={[styles.message, { color: theme.textDim }]} testID={`${testID}-message`}>
            {message}
          </Text>
          <Button
            label={confirmLabel}
            variant="danger"
            loading={isPending}
            onPress={onConfirm}
            testID={`${testID}-confirm`}
          />
          <Button
            label="Cancelar"
            variant="outline"
            disabled={isPending}
            onPress={onClose}
            testID={`${testID}-cancel`}
          />
        </SafeAreaView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  centering: { flex: 1, justifyContent: 'center', padding: 20 },
  dialog: { borderWidth: 1, padding: 20, gap: 12 },
  title: { fontSize: 17, fontWeight: '700' },
  message: { fontSize: 14, lineHeight: 20 },
})
