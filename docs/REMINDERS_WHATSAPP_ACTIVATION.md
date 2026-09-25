# Ativação dos Lembretes por WhatsApp (produção)

Runbook para **ligar** os lembretes de consulta por **WhatsApp via Infobip** depois
que a feature já está deployada. A AWS negou o SMS nesta conta, então o canal é
WhatsApp pela Infobip (HTTPS externo — sem infra AWS de mensageria).

Enquanto os passos abaixo não forem feitos, o código roda em produção mas **não
envia**: o cron fica em no-op (`REMINDERS_ENABLED=false`) e o adapter faz skip
gracioso enquanto as credenciais Infobip / o template não existirem (nesse caso o
claim é **liberado**, então nada é perdido — os lembretes saem sozinhos quando
tudo estiver configurado e a flag ligada).

Pré-requisito: AWS CLI logado no profile `pulso-workload` (para o SSM) e uma conta
**Infobip**.

---

## 0. Onboarding Infobip + WhatsApp (externo)

É o caminho crítico: medido em dias e fora do nosso controle. Nada do código
depende dele — dá para implantar dormente e ligar depois.

1. **Conta Infobip** → no portal, anote a **Base URL da conta** (algo como
   `xyz123.api.infobip.com`, específica da sua conta — não é domínio compartilhado)
   e gere uma **API Key**.
2. **Remetente de WhatsApp** (*Channels → WhatsApp → Senders*). A Infobip conduz o
   cadastro pelo *embedded signup* da Meta. O que a **Meta** exige, e nenhum
   intermediário dispensa:
   - conta **Meta Business**;
   - um **número que você controle e que não esteja em uso no WhatsApp** — serve só
     para receber o código de verificação; nenhuma mensagem trafega por ele depois.
     Um chip parado ou um fixo brasileiro resolve. **Não compre número no provedor
     para isso** — foi o que gerou a cobrança de A2P 10DLC na Twilio, um regime de
     SMS americano que não tem nada a ver com WhatsApp;
   - a verificação do negócio **não bloqueia o primeiro envio** (começa com limites
     reduzidos e verifica depois), mas deixá-la pendente limita volume.

   O remetente fica em E.164 simples: `55XXXXXXXXXXX`, **sem** prefixo `whatsapp:`.
3. **Template aprovado** (obrigatório para mensagem iniciada pela empresa): crie um
   template **utilitário** (categoria *Utility* — *Marketing* custa várias vezes
   mais por conversa) com **4 placeholders posicionais**, na ordem exata que o
   backend envia:
   `{{1}}` primeiro nome do paciente · `{{2}}` profissional · `{{3}}` data (DD/MM) · `{{4}}` hora (HH:MM).
   Corpo em produção:
   > `Olá, {{1}}! Lembrete da sua consulta com {{2}} em {{3}} às {{4}}. Se precisar remarcar, fale com a clínica.`

   **A clínica não é placeholder**: ela já é o *display name* do remetente no celular
   da paciente. Se um dia várias clínicas dividirem o mesmo remetente, ela precisa
   voltar — ao template e ao `buildTemplateVariables`.

   Sem header, footer nem botões: cada elemento a mais é superfície de reprovação na
   revisão da Meta, e nenhum carrega informação que o lembrete precise.

   Anote o **nome** do template e o **código de idioma** (`pt_BR`). Mudar a ordem ou
   a quantidade de placeholders exige mexer em `buildTemplateVariables`.

> **Testar antes de ir a produção:** a conta de teste da Infobip entrega **apenas
> para o número cadastrado no signup**. Cadastre um paciente de teste com o seu
> próprio número, marque uma consulta dentro da janela do offset menor e rode local
> com `REMINDERS_ENABLED=true`.

---

## 1. Infra (Terraform) — opcional, só limpeza

Não há infra AWS nova para o WhatsApp. Este branch **removeu** as peças da tentativa
de SMS (policy IAM `sms-send`, `configuration_set` e `opt_out_list` do Pinpoint). Um
`terraform apply` vai **destruir** esses recursos órfãos (seguro — nada os usa):

```bash
cd infra/terraform/environments/production
terraform init -backend-config="profile=pulso-devops"
terraform plan  -var="aws_profile=pulso-workload" -var="frontend_url=https://pulso.center"
terraform apply -var="aws_profile=pulso-workload" -var="frontend_url=https://pulso.center"
```

> A AMI da EC2 continua **pinada** (`ami_id` no módulo `ec2_app`) — nenhum apply
> recria a instância. Passe sempre `frontend_url=https://pulso.center` (valor vivo)
> para não mexer no CORS.

---

## 2. SSM — ligar a flag + credenciais Infobip

Grave só as chaves de reminder (não precisa re-seedar tudo). A `INFOBIP_API_KEY`
é **SecureString**:

```bash
REGION=us-east-1
P=pulso-workload

aws ssm put-parameter --profile $P --region $REGION --overwrite \
  --name /pulso/production/backend/REMINDERS_ENABLED --type String --value "true"

# host específico da conta, com ou sem https:// (o adapter normaliza)
aws ssm put-parameter --profile $P --region $REGION --overwrite \
  --name /pulso/production/backend/INFOBIP_BASE_URL --type String --value "xyz123.api.infobip.com"

aws ssm put-parameter --profile $P --region $REGION --overwrite \
  --name /pulso/production/backend/INFOBIP_API_KEY --type SecureString --value "<api-key>"

# remetente aprovado, E.164 sem "+" e sem "whatsapp:"
aws ssm put-parameter --profile $P --region $REGION --overwrite \
  --name /pulso/production/backend/INFOBIP_WHATSAPP_FROM --type String --value "55XXXXXXXXXXX"

# nome do template aprovado
aws ssm put-parameter --profile $P --region $REGION --overwrite \
  --name /pulso/production/backend/INFOBIP_REMINDER_TEMPLATE_NAME --type String --value "pulso_appointment_reminder"
```

> `INFOBIP_REMINDER_TEMPLATE_LANGUAGE` é **opcional** — o adapter usa `pt_BR`. Só
> grave se o template tiver sido registrado com outro código (`pt-BR`, `pt`); é
> justamente para corrigir esse tipo de divergência sem precisar de deploy.

> Alternativa (reseed completo): `REMINDERS_ENABLED=true INFOBIP_BASE_URL=... INFOBIP_API_KEY=... INFOBIP_WHATSAPP_FROM=... INFOBIP_REMINDER_TEMPLATE_NAME=... JWT_SECRET=... SMTP_PASS=... ... bash infra/scripts/seed-ssm.sh production apply` — só se tiver TODOS os segredos em mãos (o script reescreve o conjunto inteiro).

---

## 3. Recarregar a config no backend

O backend lê o SSM **no boot**. Reaplicar o mesmo commit não recria o container —
recrie o backend na instância via SSM Run Command (conta Workload):

```bash
INSTANCE_ID=i-005e1c16fbe738142   # EC2 de produção (confirme: aws ec2 describe-instances --profile pulso-workload --filters Name=tag:Name,Values=pulso-production Name=instance-state-name,Values=running --query 'Reservations[].Instances[].InstanceId')
aws ssm send-command --profile pulso-workload --region us-east-1 \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --comment "reload SSM env + recreate backend for reminders" \
  --parameters 'commands=["cd /opt/pulso || cd /home/ec2-user/pulso","docker compose -f docker-compose.prod.yml up -d --force-recreate backend"]'
```

---

## 4. Verificar

1. Cadastre uma consulta de teste ~24h e/ou ~3h à frente para um número que possa
   receber (na conta de teste, **o número do signup**) e aguarde o próximo tick (o
   cron roda a cada 10 min).
2. Confira a tabela de tracking:
   ```sql
   SELECT appointment_id, offset_label, channel, status, provider_message_id, created_at
   FROM production.appointment_reminders
   ORDER BY created_at DESC LIMIT 20;
   ```
   Esperado: `channel='whatsapp'`, `status='sent'` com `provider_message_id` (o
   `messageId` da Infobip). `status='sent'` significa **aceito pelo provedor**, não
   entregue. `skipped` = telefone inválido; `failed` + `error` = a Infobip recusou —
   e o `error` carrega o motivo dela (ex.: `... status code 400: Template not
   found`), não só o código HTTP; se o claim sumir, foi liberado por falta de config
   (Infobip ainda não setado) e o lembrete sai sozinho no tick seguinte.
3. Logs do backend (JSON): `Failed to send appointment reminder` / `Infobip WhatsApp
   not fully configured` — nunca deve aparecer telefone/CPF (só `appointmentId`).
4. **Entrega de verdade, do lado da Infobip.** `status='sent'` na nossa tabela significa
   só que o provedor aceitou; quem diz se chegou é o log dela:

   ```bash
   curl -s -H "Authorization: App $INFOBIP_API_KEY" \
     "https://$INFOBIP_BASE_URL/whatsapp/2/logs" | jq '.results[0]'
   ```

   É **`/whatsapp/2/logs`** — o `/whatsapp/1/logs` da documentação devolve `404`.
   Procure `status.name`: `DELIVERED_TO_HANDSET` é entrega confirmada no aparelho;
   `UNDELIVERABLE_REJECTED_OPERATOR` com `error.name = EC_INVALID_TEMPLATE` é template
   não aprovado.

   > Não use `/sms/1/inbox/reports` para conferir nada: é **fila que esvazia ao ler**, e
   > uma consulta consome a mensagem que você queria ver.

---

## Reverter / desligar rapidamente

```bash
aws ssm put-parameter --profile pulso-workload --region us-east-1 --overwrite \
  --name /pulso/production/backend/REMINDERS_ENABLED --type String --value "false"
# depois recarregue o backend (passo 3). O cron volta a no-op imediatamente.
```

---

## Notas de arquitetura

- Trocar de provedor é barato, e isso já foi exercido: a migração Twilio → Infobip
  mexeu em um arquivo de produção e uma linha de DI. Todo o pipeline (cron, janela
  24h+3h, dedup por `INSERT ... ON CONFLICT`, tracking, self-heal via `release`) é
  agnóstico; só a implementação de `IWhatsAppReminderAdapter` (hoje
  `InfobipWhatsAppAdapter`) conhece o provedor. Um SMS de fallback no futuro seria
  outro adapter + um branch de canal.
- O template é **posicional** (`{{1}}`..`{{4}}`) e o contrato do adapter carrega um
  **array ordenado**: se mudar a ordem/qtde das variáveis no template, ajuste
  `buildTemplateVariables` no `send-appointment-reminders.use-case.ts`. Não há
  validação de quantidade em lugar nenhum — sobra ou falta de valor só aparece como
  erro da Infobip no envio.
- A consulta de candidatos **mantém o JOIN com `clinics` sem selecionar coluna dele**:
  é ele que aplica `is_active = true` e o soft delete da clínica.
- O adapter **não faz retry**, de propósito: envio não é idempotente, e um timeout
  que na verdade entregou mandaria o lembrete duas vezes à paciente. A unique
  `(appointment_id, offset_label)` protege contra tick duplicado, não contra retry
  de HTTP dentro do mesmo tick. Timeout e circuit breaker, sim.
