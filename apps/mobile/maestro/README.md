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

> **Estes fluxos nunca foram executados.** Foram escritos junto com as telas,
> contra os `testID` que elas expõem, mas rodar exige simulador ou aparelho com
> o app instalado — o que não aconteceu até aqui. Tratar como revisável, não
> como verde.

A suíte de unidade e integração (`yarn workspace @app/mobile test`) cobre as
mesmas telas com 100% de linha, ramo e função, e é essa que prova o
comportamento hoje.
