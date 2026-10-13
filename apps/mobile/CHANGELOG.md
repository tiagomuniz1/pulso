# Changelog — Mobile

## [0.1.0] - 2026-10-13

Fundação do app. Ainda não vai para loja nenhuma: o que esta versão entrega é a
camada que as telas da fase 2 em diante vão consumir, provada de ponta a ponta
por um login real contra o backend.

### Added
- **`apps/mobile`, app Expo no mesmo workspace**, consumindo `@app/shared`. Managed workflow com Continuous Native Generation — `ios/` e `android/` não existem no repositório e não devem ser criados à mão
- **Login com seletor de clínica**, pelos endpoints `/auth/token*` do backend. O slug só existe nesta tela: dali em diante o `clinicId` vem do próprio JWT, e o app não manda `x-clinic-slug` em requisição nenhuma
- **Sessão no `expo-secure-store`** (Keychain no iOS, Keystore no Android). `AsyncStorage` entraria em backup do aparelho em texto claro, levando junto sete dias de acesso a prontuário. Access e refresh token são lidos como par: um sem o outro é sessão quebrada, não parcial, e o app trataria como logado até a primeira requisição falhar
- **`api-client` com renovação de voo único.** O backend rotaciona o refresh token — emitir um novo revoga o anterior —, então várias telas expirando juntas disparavam refreshes concorrentes e as perdedoras caíam no login no meio de uma sessão válida. É bug já pago na web; no celular é a regra, não a exceção, porque o app volta do segundo plano com tudo vencido ao mesmo tempo. A renovação usa uma instância sem interceptors, senão o 401 do próprio refresh dispararia outro
- **Tema da clínica derivado de `@app/shared`**, das mesmas quatro funções que a web usa. O que muda é só a entrega: lá, variáveis CSS; aqui, um contexto. A escala de raio sai em número, convertida uma vez na borda — `borderRadius: '16px'` é ignorado em silêncio pelo React Native, o canto fica reto e nada avisa

### Testing
- 41 testes, 100% de cobertura de linha, ramo e função. Quatro defeitos injetados (raio em string, `useTheme` devolvendo padrão em vez de lançar, verbo HTTP trocado, URL de API chutada) e cada um pego pelo teste pretendido
- `tsconfig.json` declara `types: ["jest"]`: o `@types` do monorepo é compartilhado e o app herdaria os tipos de `express` e `bcrypt`, que não existem em runtime nenhum do celular
