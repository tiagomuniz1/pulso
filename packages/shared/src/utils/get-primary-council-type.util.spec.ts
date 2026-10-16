import { CouncilType } from '../enums/council-type.enum'
import { getPrimaryCouncilType } from './get-primary-council-type.util'

/**
 * Há um homônimo no backend
 * (`modules/professionals/utils/get-primary-council-type.util.ts`) com outro
 * contrato de propósito: lá a ausência de registro principal **lança**,
 * porque o documento assinado sairia com o conselho errado. Aqui é a tela
 * decidindo o que oferecer, e cair em CRM é melhor do que quebrar o render.
 * Os dois precisam continuar diferentes, e cada um tem o seu teste.
 */
describe('getPrimaryCouncilType', () => {
  it('devolve o conselho do registro principal', () => {
    expect(
      getPrimaryCouncilType([
        { councilType: CouncilType.CRN, isPrimary: false },
        { councilType: CouncilType.CRM, isPrimary: true },
      ]),
    ).toBe(CouncilType.CRM)
  })

  it('funciona para profissão não médica', () => {
    expect(getPrimaryCouncilType([{ councilType: CouncilType.CREFITO, isPrimary: true }])).toBe(
      CouncilType.CREFITO,
    )
  })

  // Não deveria acontecer — o cadastro garante exatamente um principal —,
  // mas quem chama não precisa tratar `undefined` por causa disso.
  it('cai em CRM quando nenhum registro é principal', () => {
    expect(getPrimaryCouncilType([{ councilType: CouncilType.CRN, isPrimary: false }])).toBe(
      CouncilType.CRM,
    )
  })

  it('cai em CRM quando não há registro nenhum', () => {
    expect(getPrimaryCouncilType([])).toBe(CouncilType.CRM)
  })
})
