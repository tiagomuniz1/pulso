# Publicação do app nas lojas

O que o repositório já resolve, o que precisa de uma conta, e em que ordem.
Tudo que é código ou configuração está feito e versionado; o que sobra exige
titularidade — conta de desenvolvedor, cartão e aceite de contrato — e por isso
tem de ser feito por uma pessoa, não pela automação.

---

## O que já está pronto no repositório

| Item | Onde |
|---|---|
| Identificador do app (iOS e Android) | `center.pulso.app`, em `apps/mobile/app.config.ts` |
| Perfis de build | `apps/mobile/eas.json` — `development`, `preview`, `production` |
| Permissões, declaradas uma a uma | `app.config.ts` → `android.permissions` / `blockedPermissions` |
| Textos de permissão do iOS | `app.config.ts` → `ios.infoPlist` |
| Política de privacidade publicada | `https://pulso.center/privacidade` (`apps/website/app/privacidade/`) |
| Ícone, ícone adaptativo e monocromático | `apps/mobile/assets/` |

As permissões e os textos têm teste (`apps/mobile/src/tests/app-config.spec.ts`).
O manifesto gerado é `.gitignore` — se a declaração sumir do `app.config.ts`,
só o teste avisa, e o custo de descobrir na submissão é um ciclo de revisão.

### As permissões que o app pede, e por quê

| Permissão | Para quê |
|---|---|
| `INTERNET` | Falar com a API |
| `CAMERA` | Foto da consulta pela câmera |
| `READ_MEDIA_IMAGES` | Anexar imagem da galeria e resultado de exame |

Negadas de propósito: `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`,
`WRITE_EXTERNAL_STORAGE`, `READ_EXTERNAL_STORAGE`. O seletor de imagem do Expo
pede as quatro por padrão; nenhuma corresponde a algo que o app faça.

`USE_BIOMETRIC` e `USE_FINGERPRINT` continuam no manifesto: vêm do
`expo-secure-store`, que é onde o refresh token vive (Keychain no iOS, Keystore
no Android). São legítimas e não entram em formulário de permissão sensível.

---

## O que depende de conta — e só o titular faz

### 1. Contas de desenvolvedor

| Loja | Custo | Observação |
|---|---|---|
| Apple Developer Program | US$ 99/ano | Pessoa jurídica exige número D-U-N-S, que leva dias |
| Google Play Console | US$ 25, uma vez | Conta de empresa exige verificação de identidade |

> A verificação da Apple para pessoa jurídica é o item de maior prazo de todo
> este documento. Começar por ele.

### 2. Conta Expo e primeiro build

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init          # cria o projeto na conta Expo e grava o id
npx eas-cli@latest build --profile preview --platform android
```

O `preview` gera um APK que instala direto no aparelho, aponta para a API de
produção e serve para validar antes de qualquer loja. O build roda na nuvem da
Expo e consome crédito da conta.

A assinatura de release é gerada e guardada pela EAS no primeiro build de
produção — não há keystore no repositório, e não deve haver.

### 3. Formulários de privacidade

As duas lojas perguntam o que o app coleta. **Dado de saúde é categoria
sensível nas duas**, e a resposta precisa bater com a política publicada.

**Google Play — Segurança dos Dados.** Declarar:

- Informações pessoais: nome, e-mail, documento — coletadas, não compartilhadas
- Informações de saúde: prontuário, imagens clínicas — coletadas, não compartilhadas
- Fotos: coletadas, não compartilhadas
- Dados criptografados em trânsito: sim
- Exclusão de dados: sim, mediante solicitação a `privacidade@pulso.center`

**Apple — Privacy Nutrition Labels.** Mesmas categorias, marcadas como
*vinculadas à identidade do usuário* e **não** usadas para rastreamento. O app
não embarca SDK de publicidade nem de analytics de terceiros.

### 4. Exclusão de conta

A Apple exige exclusão de conta dentro do app **quando o app cria contas**.
Aqui a conta é criada pela clínica, nunca no aplicativo, e o app sequer tem
cadastro. A política descreve o caminho de exclusão pelo contato da clínica e
por `privacidade@pulso.center`.

> Isso **provavelmente** isenta, mas é julgamento do revisor. Se a primeira
> submissão for reprovada por aqui, a resposta é apontar que não há criação de
> conta no app — e, se não bastar, a saída é um item "Excluir minha conta" que
> abre uma solicitação, não uma exclusão imediata: quem apaga prontuário é a
> clínica, que responde pela guarda de 20 anos.

### 5. Material da listagem

Precisa ser produzido fora do repositório:

- Capturas de tela: iPhone 6,7" e 6,5"; Android telefone e tablet 7"/10"
- Ícone 1024×1024 (já existe em `assets/icon.png`)
- Descrição curta e longa, em português
- URL de suporte e URL da política (`https://pulso.center/privacidade`)
- Classificação indicativa — questionário em cada console

#### Texto da listagem, para copiar

**Nome:** Pulso
**Subtítulo (Apple, até 30 caracteres):** A clínica no seu bolso
**Descrição curta (Play, até 80 caracteres):**

```
Agenda, prontuário e receita para a equipe da clínica, no celular.
```

**Descrição longa:**

```
O Pulso é o aplicativo da equipe da clínica — profissionais de saúde,
administração e recepção. Ele acompanha o atendimento de ponta a ponta, do
horário marcado ao documento assinado.

Para usar é preciso ter conta criada pela clínica. O aplicativo não faz
cadastro e não atende pacientes.

• Agenda do dia, com o que foi marcado, confirmado, concluído e cancelado
• Detalhe da consulta, com os dados da paciente e o histórico dela
• Prontuário pelos modelos da clínica, preenchido no atendimento
• Receita, atestado, pedido de exame e indicação de vacina, com PDF para
  compartilhar na hora
• Receita com QR Code, que a farmácia confere contra a fonte
• Caderneta de vacinação e o que o calendário aponta como pendente
• Imagem clínica pela câmera, anexada à consulta
• Resultado de exame anexado do próprio aparelho

O que cada pessoa vê depende do cargo: quem administra enxerga a clínica,
quem atende enxerga a própria agenda, a recepção consulta sem alterar.

Dado de saúde é tratado como categoria sensível, conforme a LGPD. A política
de privacidade está em pulso.center/privacidade.
```

**Palavras-chave (Apple, 100 caracteres):**

```
clínica,consultório,agenda,prontuário,receita,médico,saúde,atendimento,paciente
```

**Categoria:** Medicina (Apple) · Medicina (Play)
**Classificação indicativa:** Livre — o conteúdo é o dado da própria clínica,
sem conteúdo gerado por usuário visível a terceiros

> O texto diz, logo no segundo parágrafo, que a conta é criada pela clínica.
> Não é formalidade: o revisor que não enxerga como entrar reprova por
> "não foi possível avaliar a funcionalidade", e esse é o motivo de
> reprovação mais comum em app com login fechado.

> **O app é de uso interno da clínica e exige login.** As duas lojas pedem
> credencial de teste para o revisor. Criar um usuário de demonstração numa
> clínica de demonstração, com dados fictícios, e informar e-mail e senha no
> campo de notas da revisão. Não usar conta real de clínica.

### 6. Submissão

```bash
npx eas-cli@latest build  --profile production --platform all
npx eas-cli@latest submit --profile production --platform android
npx eas-cli@latest submit --profile production --platform ios
```

Primeira revisão costuma levar dias e reprovar por detalhe de metadado.
Planejar com folga.

---

## Versão

O `app.config.ts` carrega a versão que o usuário vê (`version`). O número de
build é remoto (`cli.appVersionSource: "remote"`) e o perfil de produção o
incrementa sozinho (`autoIncrement`) — não há número de build no repositório
para sair de sincronia.

A versão do app segue o versionamento da casa e ganha tag própria:

```bash
git tag mobile/v0.3.0 && git push origin mobile/v0.3.0
```
