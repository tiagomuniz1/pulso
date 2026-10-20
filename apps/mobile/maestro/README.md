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

O fixture existe porque o banco de desenvolvimento **não** é um seed limpo:
as suítes `-real` do Cypress deixam centenas de profissionais e consultas
nele. Um fluxo que dependesse de "a consulta de dois dias atrás" passaria
hoje e quebraria amanhã. É a mesma escolha que os specs `-real` fazem.

## Estado

Os três fluxos **passam**, em emulador Android, contra a stack local. Duas
rodadas seguidas com fixture novo, 2m10s cada.

Ficaram sem rodar por tempo demais, e isso custou: quando a agenda virou
grade de horários e o prontuário virou aba da consulta, **oito dos vinte e
dois** `testID` citados aqui deixaram de existir e nada reclamou. A primeira
execução também encontrou um defeito de verdade no app — o cabeçalho não
respeitava a área segura e metade do avatar ficava sob a barra de status, o
que no Android torna o botão de sair intocável.

`src/tests/maestro-flows.spec.ts` guarda contra a parte barata do problema:
falha quando um fluxo cita identificador que o app não expõe. Roda junto com
a suíte de unidade, sem emulador.

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
emulator -avd pulso-e2e -no-snapshot -no-boot-anim -gpu swiftshader_indirect &
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
