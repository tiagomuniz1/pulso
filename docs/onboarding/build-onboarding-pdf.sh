#!/usr/bin/env bash
#
# Gera o PDF de qualquer guia de onboarding deste diretório.
#
# Mesmo pipeline do build-pdf.sh, que continua existindo e servindo o guia
# principal: o HTML versionado referencia o Google Fonts por <link> — o que
# mantém o arquivo pequeno e o diff legível —, e aqui as fontes são baixadas,
# embutidas como data URI e impressas. O PDF sai autossuficiente, e a leitura
# não depende de o Google Fonts estar acessível.
#
#   ./docs/onboarding/build-onboarding-pdf.sh guia-vacinas.html
#   ./docs/onboarding/build-onboarding-pdf.sh guia-vacinas.html "Vacinas-no-Pulso"
#
# Saída: docs/onboarding/build/<nome>.pdf

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC_NAME="${1:-}"

if [ -z "$SRC_NAME" ]; then
  echo "Uso: $0 <arquivo.html> [nome-do-pdf]" >&2
  echo "Ex.: $0 guia-vacinas.html \"Vacinas-no-Pulso\"" >&2
  exit 1
fi

SRC="$DIR/$SRC_NAME"
if [ ! -f "$SRC" ]; then
  echo "✖ arquivo não encontrado: $SRC" >&2
  exit 1
fi

BASENAME="${2:-$(basename "$SRC_NAME" .html)}"
OUT_DIR="$DIR/build"
INLINED="$OUT_DIR/${BASENAME}-inlined.html"
PDF="$OUT_DIR/${BASENAME}.pdf"

CHROME="${CHROME_BIN:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"

if [ ! -x "$CHROME" ]; then
  echo "✖ Chrome não encontrado em: $CHROME" >&2
  echo "  Defina CHROME_BIN apontando para o executável do Chrome ou Chromium." >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

echo "→ baixando e embutindo as fontes"
SRC="$SRC" OUT="$INLINED" python3 - <<'PY'
import base64, io, os, re, subprocess, sys

UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/120 Safari/537.36")

# Só os subsets que o texto em português usa. `latin` cobre os acentos; a
# família inteira multiplicaria o tamanho sem servir a nada aqui.
SUBSETS = {"latin", "latin-ext"}

FAMILIES = [
    "Bricolage+Grotesque:opsz,wght@12..96,700",
    "Source+Sans+3:ital,wght@0,400;0,600;1,400",
    "JetBrains+Mono:wght@500",
]


def fetch(url, binary=False):
    result = subprocess.run(["curl", "-sSL", "-m", "60", "-A", UA, url], capture_output=True)
    if result.returncode != 0:
        sys.exit(f"✖ falha ao baixar {url}: {result.stderr.decode(errors='replace')}")
    return result.stdout if binary else result.stdout.decode("utf-8", "replace")


faces = []
for family in FAMILIES:
    css = fetch(f"https://fonts.googleapis.com/css2?family={family}&display=swap")
    # O CSS do Google separa cada @font-face por um comentário com o subset.
    parts = re.split(r"/\*\s*([a-z0-9\-]+)\s*\*/", css)
    for i in range(1, len(parts) - 1, 2):
        subset, face = parts[i], parts[i + 1]
        if subset not in SUBSETS:
            continue
        match = re.search(r"src:\s*url\((https://[^)]+\.woff2)\)", face)
        if not match:
            continue
        payload = base64.b64encode(fetch(match.group(1), binary=True)).decode()
        face = face.replace(match.group(1), f"data:font/woff2;base64,{payload}")
        # unicode-range só faz sentido quando o navegador escolhe entre arquivos;
        # com tudo embutido, ele apenas impediria a fonte de ser usada.
        faces.append(re.sub(r"unicode-range:[^;]+;", "", face).strip())

if not faces:
    sys.exit("✖ nenhuma fonte baixada — verifique o acesso a fonts.googleapis.com")

html = io.open(os.environ["SRC"], encoding="utf-8").read()
links = re.search(r'<link rel="preconnect".*?display=swap">\n', html, re.S)
if not links:
    sys.exit("✖ bloco de <link> das fontes não encontrado no HTML de origem")

html = html.replace(links.group(0), "<style>\n" + "\n".join(faces) + "\n</style>\n", 1)
io.open(os.environ["OUT"], "w", encoding="utf-8").write(html)
print(f"  {len(faces)} faces embutidas")
PY

echo "→ imprimindo o PDF"
"$CHROME" \
  --headless \
  --disable-gpu \
  --no-pdf-header-footer \
  --virtual-time-budget=15000 \
  --print-to-pdf="$PDF" \
  "file://$INLINED" 2>/dev/null

echo "✔ $PDF"
