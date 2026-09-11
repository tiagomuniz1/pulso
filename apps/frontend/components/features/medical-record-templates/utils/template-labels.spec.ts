import { CouncilType } from '@app/shared'
import type { ITemplateModel } from '../types/template-model.types'
import { professionLabel, specialtyLabel } from './template-labels'

const template = (overrides: Partial<ITemplateModel>) => overrides as ITemplateModel

describe('professionLabel', () => {
  // Especialidade só existe para Medicina, e um modelo de especialidade não
  // carrega councilType próprio — daí a profissão dele ser sempre CRM.
  it('reads Medicina from a specialty template, which has no councilType of its own', () => {
    expect(professionLabel(template({ specialtyId: 'spec-1', councilType: null }))).toBe('Medicina')
  })

  it('reads the profession directly from a generalist template', () => {
    expect(professionLabel(template({ specialtyId: null, councilType: CouncilType.CRN }))).toBe(
      'Nutrição',
    )
  })

  // O backend garante specialty XOR council; isto é defesa contra dado torto.
  it('falls back to a dash when neither is set', () => {
    expect(professionLabel(template({ specialtyId: null, councilType: null }))).toBe('—')
  })
})

describe('specialtyLabel', () => {
  it('names the specialty when there is one', () => {
    expect(specialtyLabel(template({ specialtyName: 'Cardiologia' }))).toBe('Cardiologia')
  })

  // "Generalista" e não um travessão: vale para a profissão inteira, o que é
  // diferente de faltar preencher.
  it('names a specialty-less template Generalista', () => {
    expect(specialtyLabel(template({ specialtyName: null }))).toBe('Generalista')
  })
})
