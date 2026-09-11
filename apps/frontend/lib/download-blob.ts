/**
 * Entrega um blob ao usuário como arquivo salvo.
 *
 * Estava copiado em cinco use-cases de download — receita, atestado, pedido de
 * exame, resultado de exame e indicação de vacina.
 *
 * Por que não um `<a href>` direto para a API: a autenticação é por cookie
 * `httpOnly` **e** o `api-client` injeta `x-clinic-slug` em cada requisição.
 * Um link comum não leva o header, cairia na clínica errada ou em 401. O
 * arquivo tem de vir por requisição autenticada e só então virar download.
 *
 * O `revokeObjectURL` vem logo depois do `click()` porque o navegador já
 * capturou a URL de forma síncrona ao processar o clique; segurá-la mais
 * tempo só vazaria memória.
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}
