# @app/core

A camada de dados compartilhada entre a web e o app: **services, use-cases, mappers e types**.

O `@app/shared` responde *o que a API fala* — DTOs, enums, utils puros. Este pacote responde *como se conversa com ela*: montar a query string, chamar o endpoint, transformar a resposta no modelo que a tela consome. É o pedaço que não muda entre um navegador e um celular.

## O que **não** entra aqui

| | Onde mora | Por quê |
|---|---|---|
| Componentes | em cada app | React DOM e React Native não compartilham uma linha de JSX |
| Hooks | em cada app | os de mutação navegam e mostram toast — `next/navigation` de um lado, `expo-router` do outro |
| Entrega de arquivo | em cada app | `createObjectURL` na web, `expo-file-system` no app. O core busca o blob; quem o salva é o app |
| Cliente HTTP | em cada app | cookie `httpOnly` + `x-clinic-slug` na web, `Bearer` no app |

## Como o app liga o cliente HTTP

O core descreve o que precisa (`IApiClient`) e o app registra a implementação **uma vez, no bootstrap**:

```ts
import { setApiClient } from '@app/core'
import { apiClient } from '@/lib/api-client'

setApiClient(apiClient)
```

Esquecer essa chamada não devolve um dublê silencioso: o primeiro service lança dizendo exatamente o que falta. Uma tela vazia sem erro mandaria a investigação para o backend.

## Importar

Sempre pelo índice, como no `@app/shared`:

```ts
import { listAppointmentsUseCase, type IAppointmentModel } from '@app/core'
```

A exceção é `jest.mock`, que precisa do caminho interno — trocar um export do barril não intercepta quem o importa *de dentro* do pacote, e um use-case real continuaria falando com o service real:

```ts
jest.mock('@app/core/src/features/appointments/services/appointments.service')
```

## Build

O frontend resolve o pacote pelo código-fonte (alias no `tsconfig`, no `next.config` e no `jest`). O app mobile resolve pelo `main` do pacote, então precisa do build:

```bash
yarn workspace @app/core build
```

O `yarn workspace @app/mobile start` já faz isso antes de subir o Metro.
