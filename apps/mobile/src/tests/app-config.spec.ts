import config from '../../app.config'

/**
 * O que o app pede ao aparelho, travado por teste.
 *
 * Isto não verifica estilo: cada item aqui é uma reprovação de loja ou uma
 * quebra em runtime se sumir. Uma dependência nova que peça microfone, ou um
 * `expo prebuild` depois de alguém apagar um bloco do `app.config.ts`, passa
 * despercebido até a submissão — e aí custa um ciclo de revisão. O manifesto
 * gerado é `.gitignore`, então a declaração é o único lugar onde dá para
 * vigiar isso no repositório.
 */

function plugin(name: string): Record<string, unknown> {
  const entry = config.plugins?.find((p) => Array.isArray(p) && p[0] === name)
  return (entry as [string, Record<string, unknown>])[1]
}

describe('app.config', () => {
  /**
   * Sem a string de uso, o iOS **encerra o app** no instante em que a câmera
   * abre — não é um diálogo negado, é crash. E a Apple rejeita antes disso.
   */
  describe('iOS', () => {
    it.each([
      ['NSCameraUsageDescription'],
      ['NSPhotoLibraryUsageDescription'],
      ['NSPhotoLibraryAddUsageDescription'],
    ])('%s existe e explica o uso', (key) => {
      const text = config.ios?.infoPlist?.[key] as string | undefined

      expect(text).toBeDefined()
      expect(text!.length).toBeGreaterThan(20)
      expect(text).toMatch(/Pulso/)
    })
  })

  describe('Android', () => {
    /**
     * Lista fechada. Cada permissão vira uma linha no formulário de
     * Segurança dos Dados do Google, e num app de saúde isso é lido. Pedir
     * o que não se usa é, na melhor hipótese, risco de reprovação; na pior,
     * declaração falsa.
     */
    it('pede só o que usa', () => {
      expect(config.android?.permissions).toEqual([
        'android.permission.INTERNET',
        'android.permission.CAMERA',
        'android.permission.READ_MEDIA_IMAGES',
      ])
    })

    // O seletor de imagem do Expo pede estas por padrão, para gravar vídeo e
    // para o armazenamento legado — nada no app faz nem uma coisa nem outra.
    it.each([
      ['android.permission.RECORD_AUDIO'],
      ['android.permission.SYSTEM_ALERT_WINDOW'],
      ['android.permission.WRITE_EXTERNAL_STORAGE'],
      ['android.permission.READ_EXTERNAL_STORAGE'],
    ])('nega %s', (permission) => {
      expect(config.android?.blockedPermissions).toContain(permission)
    })
  })

  /**
   * `microphonePermission: false` é o que remove `RECORD_AUDIO` na origem,
   * no iOS **e** no Android. Bloquear no manifesto resolve metade: no iOS o
   * plugin ainda escreveria `NSMicrophoneUsageDescription`, e aí a etiqueta
   * de privacidade declara um microfone que o app não usa.
   */
  it('o seletor de imagem não pede microfone', () => {
    expect(plugin('expo-image-picker').microphonePermission).toBe(false)
  })

  /**
   * O fundo escuro é o que de fato se perde: a tela de abertura padrão é
   * branca, e sem este bloco o app pisca branco antes de pintar a interface
   * escura. O claro quebraria de forma visível; este, só em metade dos
   * aparelhos, e passa despercebido em quem desenvolve no modo claro.
   */
  it('a tela de abertura tem fundo nos dois temas', () => {
    const splash = plugin('expo-splash-screen')

    expect(splash.backgroundColor).toBe('#FFFFFF')
    expect(splash.dark).toEqual({ backgroundColor: '#111A2E' })
  })

  it('o seletor de imagem explica câmera e fotos', () => {
    const picker = plugin('expo-image-picker')

    expect(picker.cameraPermission).toMatch(/Pulso/)
    expect(picker.photosPermission).toMatch(/Pulso/)
  })

  /**
   * O padrão certo é produção: um build feito sem a variável de ambiente
   * configurada fala com a API real, em vez de ficar mudo apontando para o
   * `localhost` de quem gerou o bundle.
   */
  it('sem variável de ambiente, aponta para produção', () => {
    const original = process.env.EXPO_PUBLIC_API_URL
    delete process.env.EXPO_PUBLIC_API_URL

    try {
      jest.isolateModules(() => {
        /* eslint-disable-next-line @typescript-eslint/no-require-imports */
        const semEnv = require('../../app.config').default as typeof config

        expect(semEnv.extra?.apiUrl).toBe('https://api.pulso.center')
      })
    } finally {
      if (original !== undefined) process.env.EXPO_PUBLIC_API_URL = original
    }
  })
})
