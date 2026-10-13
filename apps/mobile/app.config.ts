import type { ExpoConfig } from 'expo/config'

/**
 * Configuração do app.
 *
 * É `.ts` e não `.json` por causa de `extra.apiUrl`: a URL da API muda entre o
 * desenvolvimento (a máquina de quem roda o backend) e produção, e JSON não lê
 * ambiente. O padrão aponta para produção — errar para o lado do ambiente certo
 * é melhor do que um app que não fala com nada.
 */
const config: ExpoConfig = {
  name: 'Pulso',
  slug: 'pulso',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  // Acompanha o tema do sistema, como a web acompanha `prefers-color-scheme`.
  userInterfaceStyle: 'automatic',
  scheme: 'pulso',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'center.pulso.app',
  },
  android: {
    package: 'center.pulso.app',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.pulso.center',
  },
}

export default config
