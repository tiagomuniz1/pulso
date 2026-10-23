# Fluxos Maestro

E2E do app, em YAML. Maestro e não Detox: não compila um app de teste, roda no
mesmo binário de desenvolvimento e o fluxo é legível por quem não escreve
React Native.

As credenciais vêm de variáveis de ambiente, e quem as produz é o
`seed-fixture.sh`: ele cria pela API o cenário do fluxo 03 — especialidade
vinculada à clínica, profissional com agenda amanhã, consulta e modelo de
prontuário — e imprime o `export` das três variáveis.

```bash
eval "$(maestro/seed-fixture.sh)"
yarn workspace @app/mobile maestro:test
```

> **O Maestro roda contra o binário de desenvolvimento, que busca o bundle
> no Metro.** Por isso todo fluxo abre esperando a primeira tela com
> `extendedWaitUntil`, e não com `assertVisible` seco: numa máquina fria o
> bundle leva dezenas de segundos, e a falha aparece como "login-slug não
> existe" — a mensagem errada para "o app ainda está carregando".

> **Não rode nada pesado enquanto a bateria corre.** O `inputText` do
> Maestro tem limite fixo de 120s e fala com o aparelho por gRPC: com o
> jest do monorepo competindo pela CPU, ele estoura no meio de um login e
> a falha sai como `DEADLINE_EXCEEDED`, sem relação nenhuma com o app.
> Editar arquivo em `src/` também atrapalha — o Fast Refresh recarrega o
> bundle no meio do fluxo.

## O `.env` entra no APK, e não no Metro

`EXPO_PUBLIC_API_URL` vira `extra.apiUrl` em `assets/app.config` **dentro do
APK**, no momento do `assembleDebug`. Reiniciar o Metro com outro valor não
muda nada: o app lê o arquivo embutido.

Isso custou uma hora. O IP da máquina no `.env` estava de uma semana antes,
a rede tinha dado outro, e o sintoma era o app dizendo "e-mail, senha ou
clínica incorretos" com o servidor no ar e a senha certa — a tela usava a
mesma mensagem para qualquer falha, inclusive de rede. Os dois foram
corrigidos: a mensagem agora distingue `401` de "não consegui falar com o
servidor", e fica registrado aqui que **trocar o `.env` exige recompilar**:

```bash
ipconfig getifaddr en0          # confere o IP de hoje
printf 'EXPO_PUBLIC_API_URL=http://<ip>:3011\n' > .env
./android/gradlew -p android :app:assembleDebug
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Verificar depois, sem subir o app:

```bash
unzip -p android/app/build/outputs/apk/debug/app-debug.apk assets/app.config \
  | python3 -c "import json,sys; print(json.load(sys.stdin)['extra'])"
```

O fixture existe porque o banco de desenvolvimento **não** é um seed limpo:
as suítes `-real` do Cypress deixam centenas de profissionais e consultas
nele. Um fluxo que dependesse de "a consulta de dois dias atrás" passaria
hoje e quebraria amanhã. É a mesma escolha que os specs `-real` fazem.

Pelo mesmo motivo, **tudo que um fluxo cria leva o `MAESTRO_RUN_ID`** no
nome. O do modelo de prontuário é único dentro do escopo: com nome fixo, o
fluxo passava na primeira execução e tomava `409` na segunda — e a falha
aparecia como "template-details-name não existe", que não diz nada sobre
nome repetido.

## Estado

São oito fluxos, em emulador Android, contra a stack local.

Ficar sem rodar custa caro, e já custou duas vezes. Na primeira, quando a
agenda virou grade de horários e o prontuário virou aba da consulta, **oito
dos vinte e dois** `testID` citados aqui deixaram de existir e nada
reclamou; aquela execução também achou um defeito de verdade — o cabeçalho
não respeitava a área segura e metade do avatar ficava sob a barra de
status, o que no Android torna o botão de sair intocável.

Na segunda, a primeira execução dos fluxos da fase 6 achou o defeito que
vinha derrubando a suíte e que nenhum teste de unidade pegaria: o desvio de
navegação do arranque chamava `router.replace()` enquanto o
`ContextNavigator` do expo-router ainda montava. O React avisava "state
update on a component that hasn't mounted yet" e, em desenvolvimento, o
LogBox **cobre a tela inteira** — o fluxo seguia tocando num overlay e
falhava passos adiante, apontando para o lugar errado. Trocado por
`<Redirect>`, que navega no `useFocusEffect`, depois da montagem.

Achou também dois `testID` que o guard estático **não** pega: quando o id é
montado na origem (`appointment-tab-${tab.id}`), só o prefixo pode ser
verificado e o sufixo vem de dado — `appointment-tab-documents` passava no
guard e não existia na tela.

`src/tests/maestro-flows.spec.ts` guarda contra a parte barata do problema:
falha quando um fluxo cita identificador que o app não expõe. Roda junto com
a suíte de unidade, sem emulador, e é o que o `.github/workflows/mobile.yml`
executa no CI. **Os fluxos em si não rodam em CI**: precisariam de emulador,
backend, banco e seed. Rodam aqui, antes de entregar.

## Montar a máquina

```bash
brew install openjdk@17                      # o Gradle do Android não roda no 26
brew install --cask android-commandlinetools
curl -fsSL "https://get.maestro.mobile.dev" | bash

export JAVA_HOME=/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$HOME/.maestro/bin:$PATH"

yes | sdkmanager --licenses
sdkmanager platform-tools emulator "platforms;android-36" "build-tools;36.0.0" \
  "system-images;android-36;google_apis;arm64-v8a"
avdmanager create avd -n pulso-e2e -k "system-images;android-36;google_apis;arm64-v8a"
```

O cask `temurin@17` pede `sudo`; a fórmula `openjdk@17` não. Em iOS o Maestro
só fala com **simulador**, nunca com aparelho físico — exige o Xcode completo
(~10 GB), e não o Expo Go que usamos para ver o app no iPhone.

## Rodar

```bash
# `-gpu host` usa o Metal da máquina; `swiftshader_indirect` é software puro
# e **custa caro**: com ele o QEMU passa de 240% de CPU e o `inputText` do
# Maestro estoura o próprio limite de 120s no meio de um login. O sintoma é
# um fluxo que demora o triplo e falha sem erro de aplicação nenhum.
emulator -avd pulso-e2e -no-snapshot -no-boot-anim -gpu host -memory 4096 -cores 4 &
adb reverse tcp:8081 tcp:8081

# 10.0.2.2 é o alias do host dentro do emulador: `localhost` ali é o aparelho.
EXPO_PUBLIC_API_URL=http://10.0.2.2:3011 npx expo run:android
EXPO_PUBLIC_API_URL=http://10.0.2.2:3011 npx expo start --dev-client

eval "$(maestro/seed-fixture.sh)"
yarn workspace @app/mobile maestro:test
```

A suíte de unidade e integração (`yarn workspace @app/mobile test`) cobre as
mesmas telas com 100% de linha, ramo e função, e continua sendo a que prova o
comportamento no detalhe.

## iOS, no simulador

**Até 22/10/2026 nenhum fluxo tinha rodado em iOS** — os oito foram
exercitados só no emulador Android. Não é escolha: o Maestro não fala com
aparelho físico em iOS, e esta máquina tem apenas as Command Line Tools, sem
simulador nenhum.

O que já está pronto para quando o Xcode entrar:

- **O identificador é o mesmo nas duas plataformas** (`center.pulso.app` em
  `bundleIdentifier` e em `package`), então o `appId` dos fluxos vale nos
  dois sem alteração.
- **A configuração gera limpa.** `npx expo prebuild --platform ios
  --no-install` foi rodado e produziu `ios/` com o bundle correto — o que
  faltava era o Xcode, não o nosso lado.
- `ios/` e `android/` são **gerados, não versionados** (estão no
  `.gitignore`): prebuild é parte do preparo da máquina, não do repositório.

```bash
# 1. Xcode completo (~10 GB) pela App Store, e depois:
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
brew install cocoapods

# 2. Gerar o projeto nativo e compilar para o simulador.
cd apps/mobile
npx expo prebuild --platform ios
# `localhost`, e não `10.0.2.2`: o simulador divide a rede com o Mac,
# ao contrário do emulador Android. A URL é embutida no app no build.
EXPO_PUBLIC_API_URL=http://localhost:3011 npx expo run:ios

# 3. Os mesmos oito fluxos, no simulador.
eval "$(maestro/seed-fixture.sh)"
yarn workspace @app/mobile maestro:test:ios
```

> **Confira o `git diff` do `package.json` depois do prebuild.** Ele
> reescreve `android` e `ios` para `expo run:*` sem avisar — aconteceu de
> novo em 22/10/2026, no prebuild de validação acima. `src/tests/package-scripts.spec.ts`
> reprova quando isso passa despercebido.

**O que mais provavelmente quebra primeiro em iOS**, já que o app tem um
único ramo por plataforma (`Platform.select({ ios: 'padding' })` no
`DocumentSheet`): o teclado sobre os formulários longos, a área segura do
entalhe — no Android um defeito desses escondeu o botão de sair —, o
teclado numérico sem tecla de retorno nos campos de CPF, telefone e data, e
os gráficos SVG do dashboard, que nunca foram vistos lá.
