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
  version: '0.5.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  // Acompanha o tema do sistema, como a web acompanha `prefers-color-scheme`.
  userInterfaceStyle: 'automatic',
  scheme: 'pulso',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'center.pulso.app',
    infoPlist: {
      // O que a pessoa lê no diálogo do sistema. A Apple rejeita app que usa
      // câmera ou fotos sem explicar para quê, e o app **quebra** ao abrir a
      // câmera se a string não existir.
      NSCameraUsageDescription:
        'O Pulso usa a câmera para registrar imagens clínicas durante o atendimento.',
      NSPhotoLibraryUsageDescription:
        'O Pulso usa suas fotos para anexar imagens clínicas ao atendimento da paciente.',
      // Só anexa o que a pessoa escolhe — nunca grava na galeria.
      NSPhotoLibraryAddUsageDescription:
        'O Pulso salva no seu aparelho os documentos e laudos que você baixar.',
    },
  },
  android: {
    package: 'center.pulso.app',
    // Lista fechada: o que não está aqui não entra no manifesto, por mais
    // que uma dependência peça. `INTERNET` é a API; `CAMERA` e
    // `READ_MEDIA_IMAGES` são a foto da consulta e o anexo de exame.
    permissions: ['android.permission.INTERNET', 'android.permission.CAMERA', 'android.permission.READ_MEDIA_IMAGES'],
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.SYSTEM_ALERT_WINDOW',
      'android.permission.VIBRATE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.READ_EXTERNAL_STORAGE',
    ],
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  /**
   * As permissões, declaradas uma a uma — e as que o app não usa, negadas.
   *
   * Sem isto o manifesto saía com nove: `RECORD_AUDIO` (padrão do seletor de
   * imagem, para vídeo), `SYSTEM_ALERT_WINDOW`, `VIBRATE`,
   * `WRITE_EXTERNAL_STORAGE` e as de biometria. Num app de saúde cada
   * permissão vira uma linha no formulário de segurança de dados do Google e
   * numa etiqueta de privacidade da Apple: declarar gravação de áudio que
   * não existe é risco de reprovação e, pior, é mentira na etiqueta.
   *
   * O texto da permissão é o que a pessoa lê no diálogo do sistema. A Apple
   * **rejeita** app que usa câmera sem ele, e sem a string o app quebra ao
   * abrir a câmera no iOS.
   */
  plugins: [
    [
      /**
       * A tela de abertura.
       *
       * Sem isto o app abre num branco fixo e só então pinta a interface —
       * que no modo escuro é azul-marinho. O pulo é visível em todo
       * lançamento, e `userInterfaceStyle: 'automatic'` significa que metade
       * dos aparelhos o vê. Os dois fundos são os mesmos tons de `surface`
       * do `@app/shared`, que é o que a primeira tela de fato pinta.
       *
       * O acento da clínica não entra aqui: a tela de abertura existe antes
       * do login, e antes do login não se sabe de que clínica é a pessoa.
       */
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 180,
        resizeMode: 'contain',
        backgroundColor: '#FFFFFF',
        dark: { backgroundColor: '#111A2E' },
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'O Pulso usa suas fotos para anexar imagens clínicas ao atendimento da paciente.',
        cameraPermission:
          'O Pulso usa a câmera para registrar imagens clínicas durante o atendimento.',
        // Nada no app grava áudio ou vídeo.
        microphonePermission: false,
      },
    ],
    [
      'expo-document-picker',
      {
        // Só leitura de arquivo escolhido pela pessoa: nenhum acesso amplo
        // ao armazenamento.
        iCloudContainerEnvironment: 'Production',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://api.pulso.center',
  },
}

export default config
