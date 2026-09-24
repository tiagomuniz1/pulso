import { htmlToPlainText } from './html-to-plain-text.util'

describe('htmlToPlainText', () => {
  it('returns an empty string for empty input', () => {
    expect(htmlToPlainText('')).toBe('')
    expect(htmlToPlainText(null)).toBe('')
    expect(htmlToPlainText(undefined)).toBe('')
  })

  it('leaves plain text untouched', () => {
    expect(htmlToPlainText('Nega alergias')).toBe('Nega alergias')
  })

  it('turns each paragraph into its own block', () => {
    expect(htmlToPlainText('<p>Primeira</p><p>Segunda</p>')).toBe('Primeira\n\nSegunda')
  })

  it('turns <br> into a single line break', () => {
    expect(htmlToPlainText('Linha um<br>Linha dois')).toBe('Linha um\nLinha dois')
    expect(htmlToPlainText('Linha um<br />Linha dois')).toBe('Linha um\nLinha dois')
  })

  it('drops formatting tags but keeps their text', () => {
    const html =
      '<p><strong><span style="color:rgb(116, 27, 71)">EXAME FÍSICO:</span></strong> <span>BEG, LOTE</span></p>'
    expect(htmlToPlainText(html)).toBe('EXAME FÍSICO: BEG, LOTE')
  })

  it('keeps struck-through text', () => {
    expect(htmlToPlainText('<p><s>cancelado</s></p>')).toBe('cancelado')
  })

  it('decodes the entities the export actually contains', () => {
    expect(htmlToPlainText('<p>PA &gt; 140x90</p>')).toBe('PA > 140x90')
    expect(htmlToPlainText('<p>a &lt; b &amp; c</p>')).toBe('a < b & c')
    expect(htmlToPlainText('<p>espaço&nbsp;fino</p>')).toBe('espaço fino')
    expect(htmlToPlainText('<p>&quot;aspas&quot; e &#39;apóstrofo&#39;</p>')).toBe(
      '"aspas" e \'apóstrofo\'',
    )
  })

  it('decodes numeric entities in both bases', () => {
    expect(htmlToPlainText('<p>&#65;&#x42;</p>')).toBe('AB')
  })

  it('leaves an unknown entity alone rather than mangling it', () => {
    expect(htmlToPlainText('<p>&naoexiste;</p>')).toBe('&naoexiste;')
  })

  it('collapses the empty paragraphs the IClinic editor produced', () => {
    expect(htmlToPlainText('<p>Antes</p><p>\n</p><p>Depois</p>')).toBe('Antes\n\nDepois')
  })

  it('trims leading and trailing whitespace', () => {
    expect(htmlToPlainText('<p>   Conduta   </p>')).toBe('Conduta')
  })

  it('renders list items with a bullet', () => {
    expect(htmlToPlainText('<ul><li>Exames</li><li>Retorno</li></ul>')).toBe('• Exames\n\n• Retorno')
  })

  it('normalizes CRLF', () => {
    expect(htmlToPlainText('linha\r\noutra')).toBe('linha\noutra')
  })
})
