import { useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { login } from '../features/auth/auth.service'
import { useSessionStore } from '../features/auth/session.store'
import { useTheme } from '../theme/theme-context'
import { ThemeToggle } from '../components/ui/theme-toggle'
import type { IApiError } from '../lib/api-client'

export default function LoginScreen() {
  const theme = useTheme()
  const setAuthenticated = useSessionStore((state) => state.setAuthenticated)

  const [slug, setSlug] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = slug.trim() !== '' && email.trim() !== '' && password !== '' && !isSubmitting

  async function handleSubmit() {
    setError(null)
    setIsSubmitting(true)
    try {
      const user = await login({ email: email.trim(), password, slug: slug.trim().toLowerCase() })
      setAuthenticated(user)
    } catch (caught) {
      const apiError = caught as IApiError
      // O captcha da web é um widget Turnstile, que não existe aqui. Enquanto
      // não houver equivalente nativo, a saída honesta é dizer o que aconteceu
      // em vez de repetir "credenciais inválidas" para sempre.
      setError(
        apiError.requiresCaptcha
          ? 'Muitas tentativas. Entre pelo site para continuar.'
          : 'E-mail, senha ou clínica incorretos.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const radius = theme.radius.md
  // Cor e geometria separadas: `StyleSheet.create` roda no escopo do módulo,
  // onde não há hook e portanto não há tema.
  const inputStyle = {
    borderRadius: radius,
    borderColor: theme.line,
    backgroundColor: theme.surface,
    color: theme.text,
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <ThemeToggle />
      </View>
      <View style={styles.form}>
        <Text style={[styles.title, { color: theme.accent }]}>Pulso</Text>

        {/* A web tira o slug do subdomínio; aqui não há host de onde tirá-lo.
            Campo de texto é o mínimo honesto — vale rever quando houver uma
            forma de a clínica distribuir um link ou QR de acesso. */}
        <TextInput
          value={slug}
          onChangeText={setSlug}
          placeholder="clínica"
          placeholderTextColor={theme.textMute}
          autoCapitalize="none"
          autoCorrect={false}
          style={[styles.input, inputStyle]}
          testID="login-slug"
        />
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="e-mail"
          placeholderTextColor={theme.textMute}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          style={[styles.input, inputStyle]}
          testID="login-email"
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="senha"
          placeholderTextColor={theme.textMute}
          secureTextEntry
          style={[styles.input, inputStyle]}
          testID="login-password"
        />

        {error && (
          <Text style={[styles.error, { color: theme.danger }]} testID="login-error">
            {error}
          </Text>
        )}

        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={[
            styles.button,
            { backgroundColor: theme.accent, borderRadius: radius, opacity: canSubmit ? 1 : 0.5 },
          ]}
          testID="login-submit"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonLabel}>Entrar</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 8 },
  form: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  title: { fontSize: 30, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, padding: 14, fontSize: 16 },
  error: { fontSize: 14 },
  button: { padding: 16, alignItems: 'center', marginTop: 4 },
  buttonLabel: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
