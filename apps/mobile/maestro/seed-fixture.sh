#!/usr/bin/env bash
# Cria o cenário que o fluxo 03 precisa, pela API, e imprime as credenciais.
#
# Existe porque o banco de desenvolvimento não é um seed limpo: as suítes
# `-real` do Cypress deixam centenas de profissionais e consultas nele, e um
# fluxo que dependesse de "a consulta de dois dias atrás" quebraria na
# primeira rodada seguinte. É a mesma escolha que os specs `-real` fazem —
# cada um monta o próprio cenário.
#
#   eval "$(maestro/seed-fixture.sh)" && yarn workspace @app/mobile maestro:test
set -euo pipefail

API="${MAESTRO_API_URL:-http://localhost:3011}"
CLINIC_SLUG="${MAESTRO_CLINIC:-pulso}"
TS=$(date +%s)
PASSWORD='Password123!'
EMAIL="maestro.${TS}@e2e.test"

json() { python3 -c "import json,sys;d=json.load(sys.stdin);print(d$1)"; }

token() {
  curl -sS -X POST "$API/auth/token" -H 'Content-Type: application/json' -d "$1" | json "['accessToken']"
}

ADMIN=$(token "{\"email\":\"admin@pulso.center\",\"password\":\"123123123\",\"slug\":\"$CLINIC_SLUG\"}")
PLATFORM=$(token '{"email":"platform@pulso.center","password":"123123123"}')

# Falha alto: um POST recusado que segue em silêncio deixa o fluxo caindo
# três passos depois, num `tapOn` que não acha nada.
post() {
  local response
  response=$(curl -sS -X POST "$API/$1" -H 'Content-Type: application/json' \
    -H "Authorization: Bearer $2" -d "$3")
  if ! printf '%s' "$response" | grep -q '"id"'; then
    echo "seed-fixture: POST /$1 falhou: $response" >&2
    exit 1
  fi
  printf '%s' "$response"
}

# Especialidade própria: o catálogo é da plataforma, e reaproveitar uma
# existente amarraria o fluxo a dados de outra pessoa.
SPECIALTY_ID=$(post "specialties" "$PLATFORM" "{\"name\":\"Especialidade Maestro $TS\",\"description\":null}" | json "['id']")
CLINIC_ID=$(curl -sS "$API/clinics/slug/$CLINIC_SLUG" | json "['id']")
# Sem o vínculo, o modelo de prontuário é recusado com 422: a especialidade
# existe no catálogo da plataforma, mas não nesta clínica.
link=$(curl -sS -o /dev/null -w '%{http_code}' -X POST \
  "$API/clinics/$CLINIC_ID/specialties/$SPECIALTY_ID" -H "Authorization: Bearer $PLATFORM")
if [ "$link" -ge 300 ]; then
  echo "seed-fixture: vincular especialidade à clínica falhou ($link)" >&2
  exit 1
fi

USER_ID=$(post "users" "$ADMIN" \
  "{\"fullName\":\"Dr. Maestro $TS\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"role\":\"professional\"}" | json "['id']")

PROFESSIONAL_ID=$(post "professionals" "$ADMIN" \
  "{\"userId\":\"$USER_ID\",\"registrations\":[{\"councilType\":\"crm\",\"number\":\"${TS: -6}\",\"state\":\"SP\",\"isPrimary\":true}],\"specialties\":[{\"specialtyId\":\"$SPECIALTY_ID\"}]}" | json "['id']")

# Amanhã, e não hoje: o backend recusa agendar no passado, e às 20h de hoje
# qualquer horário comercial já passou. Amanhã é determinístico a qualquer
# hora do dia — o fluxo avança um dia na barra.
TODAY=$(date -v+1d +%F 2>/dev/null || date -d tomorrow +%F)
WEEKDAY=$(date -v+1d +%A 2>/dev/null || date -d tomorrow +%A)
WEEKDAY=$(printf '%s' "$WEEKDAY" | tr '[:lower:]' '[:upper:]')
case "$WEEKDAY" in
  MONDAY|SEGUNDA*) DAY=MONDAY ;; TUESDAY|TERÇA*|TERCA*) DAY=TUESDAY ;;
  WEDNESDAY|QUARTA*) DAY=WEDNESDAY ;; THURSDAY|QUINTA*) DAY=THURSDAY ;;
  FRIDAY|SEXTA*) DAY=FRIDAY ;; SATURDAY|SÁBADO*|SABADO*) DAY=SATURDAY ;; *) DAY=SUNDAY ;;
esac

post "schedules" "$ADMIN" \
  "{\"professionalId\":\"$PROFESSIONAL_ID\",\"dayOfWeek\":\"$DAY\",\"startTime\":\"07:00\",\"endTime\":\"08:00\",\"slotDurationInMinutes\":30}" > /dev/null

PATIENT_ID=$(curl -sS "$API/patients?limit=1" -H "Authorization: Bearer $ADMIN" | json "['data'][0]['id']")

post "appointments" "$ADMIN" \
  "{\"professionalId\":\"$PROFESSIONAL_ID\",\"patientId\":\"$PATIENT_ID\",\"date\":\"$TODAY\",\"startTime\":\"07:00\",\"specialtyId\":\"$SPECIALTY_ID\"}" > /dev/null

# Um modelo no escopo da especialidade, senão o prontuário abre sem seletor.
post "medical-record-templates" "$ADMIN" \
  "{\"name\":\"Modelo Maestro $TS\",\"specialtyId\":\"$SPECIALTY_ID\",\"fields\":[{\"key\":\"queixa\",\"label\":\"Queixa principal\",\"type\":\"text\",\"required\":false,\"order\":1,\"canonical\":false}]}" > /dev/null

echo "export MAESTRO_EMAIL='$EMAIL'"
echo "export MAESTRO_PASSWORD='$PASSWORD'"
echo "export MAESTRO_CLINIC='$CLINIC_SLUG'"
