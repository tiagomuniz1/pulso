import type { ReactNode } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Feather from '@expo/vector-icons/Feather'
import { useTheme } from '../../../theme/theme-context'

/**
 * A moldura dos formulários de emissão.
 *
 * Na web é um diálogo centrado; em celular vira folha que ocupa quase a tela
 * inteira, porque um diálogo de 300px com quatro campos e um teclado aberto
 * não sobra nada. O `KeyboardAvoidingView` é a diferença entre conseguir ver
 * o que se digita e não.
 */
export function DocumentSheet({
  title,
  isOpen,
  onClose,
  children,
  footer,
  testID,
}: {
  title: string
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  footer: ReactNode
  testID: string
}) {
  const theme = useTheme()

  return (
    <Modal visible={isOpen} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} testID={`${testID}-backdrop`} />
      <KeyboardAvoidingView
        // `select` e não um ternário sobre `Platform.OS`: o ramo da outra
        // plataforma seria código que o runner nunca executa.
        behavior={Platform.select({ ios: 'padding' })}
        style={styles.lift}
      >
        <SafeAreaView
          edges={['bottom']}
          style={[styles.sheet, { backgroundColor: theme.bg, borderColor: theme.line }]}
          testID={testID}
        >
          <View style={[styles.header, { borderColor: theme.line }]}>
            <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={onClose}
              testID={`${testID}-close`}
              hitSlop={12}
            >
              <Feather name="x" size={20} color={theme.textDim} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>

          <View style={[styles.footer, { borderColor: theme.line }]}>{footer}</View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  lift: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '92%', borderTopWidth: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: { fontSize: 18, fontWeight: '600' },
  body: { padding: 20, gap: 16 },
  footer: { paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1 },
})
