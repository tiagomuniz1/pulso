# Fluxos Maestro

E2E do app, em YAML. Maestro e não Detox: não compila um app de teste, roda no
mesmo binário de desenvolvimento e o fluxo é legível por quem não escreve
React Native.

## Rodar

```bash
# uma vez
curl -fsSL "https://get.maestro.mobile.dev" | bash

# com o app já instalado num simulador ou aparelho
yarn workspace @app/mobile maestro:test
```

Os fluxos usam `cypress.env`-equivalente nenhum: as credenciais vêm de
variáveis de ambiente, para não entrarem no repositório.

```bash
MAESTRO_EMAIL=... MAESTRO_PASSWORD=... MAESTRO_CLINIC=... yarn workspace @app/mobile maestro:test
```

## Estado

> **Estes fluxos nunca foram executados.** Rodar exige Maestro instalado mais
> um simulador ou aparelho com o app — e a máquina de desenvolvimento não tem
> nenhum dos três: sem Maestro, sem Xcode (só Command Line Tools, portanto
> sem simulador iOS) e sem SDK Android. Tratar como revisável, não como verde.

O que isso custou já aconteceu: quando a agenda virou grade de horários e o
prontuário virou aba da consulta, **oito dos vinte e dois** `testID` citados
aqui deixaram de existir e nada reclamou. Os fluxos foram reescritos contra as
telas de hoje, e `src/tests/maestro-flows.spec.ts` passou a falhar quando um
fluxo cita identificador que o app não expõe. É o que a máquina consegue
afirmar sem um aparelho — não substitui rodar.

A suíte de unidade e integração (`yarn workspace @app/mobile test`) cobre as
mesmas telas com 100% de linha, ramo e função, e é essa que prova o
comportamento hoje.

## Para executar de verdade

O caminho mais leve é Android — o emulador vem no SDK e o Maestro fala com ele
direto:

```bash
curl -fsSL "https://get.maestro.mobile.dev" | bash   # ~50 MB
# SDK Android + uma imagem de emulador                # ~2 GB
npx expo run:android                                  # gera o dev build
MAESTRO_EMAIL=... MAESTRO_PASSWORD=... MAESTRO_CLINIC=pulso \
  yarn workspace @app/mobile maestro:test
```

Em iOS o Maestro só fala com **simulador**, nunca com aparelho físico — o que
exige o Xcode completo (~10 GB), e não o Expo Go que usamos para ver o app no
iPhone.
