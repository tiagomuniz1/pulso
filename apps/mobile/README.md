# Pulso — app

App da equipe da clínica (ADMIN, PROFESSIONAL e recepção). `PATIENT` fica de fora: o backend bloqueia o login dele de propósito.

Expo managed, Continuous Native Generation — **`ios/` e `android/` não existem no repositório e não devem ser criados à mão**. Comportamento nativo se configura em `app.config.ts` e config plugins.

---

## Rodar local

### 1. A stack

```bash
docker compose up -d
```

Backend em `localhost:3011`, banco e Redis junto. Se o container do backend for antigo, reconstrua — endpoint que o app usa e que a web não tem (`/auth/token`) só existe em build recente:

```bash
docker compose up -d --build backend
```

### 2. Apontar o app para a sua máquina

O app lê `EXPO_PUBLIC_API_URL`. Crie `apps/mobile/.env` (fora do git):

```bash
echo "EXPO_PUBLIC_API_URL=http://$(ipconfig getifaddr en0):3011" > apps/mobile/.env
```

> **Nunca `localhost`.** No celular — e no emulador — `localhost` é o próprio aparelho: a requisição nem sai de lá. Tem de ser o IP da máquina na rede.

### 3. Subir o Metro

```bash
yarn workspace @app/mobile start
```

O script constrói `@app/shared` e `@app/core` antes, porque o Metro resolve os dois pelo `main` do pacote — o build, não o código-fonte. **Mudou algo neles? Reinicie**, senão o app segue com a versão anterior.

### 4. Abrir

| Como | O que precisa |
|---|---|
| **Expo Go no celular** | só o app da loja; escaneie o QR. É o caminho mais curto e não exige nada instalado na máquina |
| **Simulador iOS** | Xcode completo (~10 GB). `npx expo run:ios` |
| **Emulador Android** | Android Studio + um AVD. `npx expo run:android` |

Nenhum módulo nativo fora do que o Expo Go já traz, então **development build não é necessário** — até a fase 3 entrar com a câmera.

### 5. Entrar

Credenciais do seed de desenvolvimento: clínica `pulso`, senha `123123123`.

| Usuário | Para quê |
|---|---|
| `admin@pulso.center` | vê as consultas de toda a clínica |
| `generalista@pulso.center` | escopo de um profissional só |
| `nutricionista@pulso.center` | profissional com especialidade |

> **A agenda pode abrir vazia**, e isso não é defeito: o banco de desenvolvimento acumula resíduo das rodadas de Cypress, e as consultas de verdade raramente caem em hoje. Como `admin`, navegue com `›` até um dia que tenha algo. Para dados limpos: `docker compose down -v`, `migration:run` e `seed:run` — **apaga o banco local inteiro**.

---

## Testes

```bash
yarn workspace @app/mobile test            # unidade e integração
yarn workspace @app/mobile test:coverage   # falha abaixo de 100%
yarn workspace @app/mobile typecheck
yarn workspace @app/mobile lint
npx expo-doctor                            # saúde das dependências
```

E2E em Maestro, em `maestro/` — ver o README de lá. **Esses fluxos nunca foram executados**: exigem simulador ou aparelho com o app instalado.

---

## Como o app se divide

```
src/
  app/            rotas do Expo Router — arquivos finos, só reexportam a tela
  features/<f>/
    screens/      a tela, testável fora da árvore de rotas
    components/   pedaços dela
    hooks/        React Query sobre os use-cases do @app/core
    utils/        funções puras
  components/ui/  primitivas (Screen, Button, Card, campos)
  lib/            api-client, armazenamento de token, registro do core
  theme/          tema da clínica, derivado do @app/shared
```

A camada de dados — service, use-case, mapper — **não mora aqui**. Vem do `@app/core`, compartilhada com a web, para a mesma regra não ser escrita duas vezes. O app registra o seu cliente HTTP no bootstrap (`lib/core-client.ts`): aqui é `Bearer`, na web é cookie `httpOnly`.

### Duas armadilhas que já custaram caro

**Data nunca sai de `toISOString()`.** Ele devolve UTC, e entre 21h e a meia-noite no Brasil isso é o dia seguinte — a agenda abriria amanhã com o consultório ainda atendendo hoje. Use `agenda-date.util.ts`.

**Raio de borda é número, não string.** `borderRadius: '16px'` é ignorado em silêncio pelo React Native: o canto fica reto e nada avisa. O tema já entrega a escala convertida.
