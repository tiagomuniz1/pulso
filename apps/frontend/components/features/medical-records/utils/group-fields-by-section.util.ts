/**
 * Agrupa os campos pela seção a que pertencem, tratando seção inexistente como
 * ausência de seção.
 *
 * O prontuário congela os campos, mas **não as seções** — estas vêm do modelo
 * vivo. Se alguém renomeia ou remove uma seção no modelo, os campos que
 * apontavam para ela ficariam sob uma chave sem aba correspondente e sumiriam da
 * tela, sem erro nenhum. Caindo em "sem seção" eles vão para a aba Geral, que
 * passa a existir justamente por haver campo sem seção.
 */
export function groupFieldsBySection<T extends { sectionKey: string | null }>(
  fields: T[],
  sections: { key: string }[],
): Map<string | null, T[]> {
  const declaradas = new Set(sections.map((s) => s.key))
  const agrupado = new Map<string | null, T[]>()

  for (const field of fields) {
    const key = field.sectionKey && declaradas.has(field.sectionKey) ? field.sectionKey : null
    if (!agrupado.has(key)) agrupado.set(key, [])
    agrupado.get(key)!.push(field)
  }

  return agrupado
}
