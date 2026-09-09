import { groupFieldsBySection } from './group-fields-by-section.util'

const campo = (key: string, sectionKey: string | null) => ({ key, sectionKey })

describe('groupFieldsBySection', () => {
  it('groups fields under the section they declare', () => {
    const resultado = groupFieldsBySection(
      [campo('a', 's1'), campo('b', 's1'), campo('c', 's2')],
      [{ key: 's1' }, { key: 's2' }],
    )

    expect(resultado.get('s1')).toHaveLength(2)
    expect(resultado.get('s2')).toHaveLength(1)
  })

  it('keeps fields without a section under null', () => {
    const resultado = groupFieldsBySection([campo('a', null)], [{ key: 's1' }])

    expect(resultado.get(null)).toEqual([campo('a', null)])
  })

  // O prontuário congela os campos mas não as seções. Renomear ou remover uma
  // seção no modelo deixaria os campos dela sob uma chave sem aba — invisíveis
  // na tela, sem erro nenhum. Caindo em "sem seção" eles vão para a aba Geral.
  it('treats a field pointing at a section that no longer exists as unsectioned', () => {
    const resultado = groupFieldsBySection(
      [campo('a', 's1'), campo('orfao', 'apagada')],
      [{ key: 's1' }],
    )

    expect(resultado.get('s1')).toHaveLength(1)
    expect(resultado.get(null)).toEqual([campo('orfao', 'apagada')])
    expect(resultado.has('apagada')).toBe(false)
  })

  it('returns an empty map for no fields', () => {
    expect(groupFieldsBySection([], [{ key: 's1' }]).size).toBe(0)
  })
})
