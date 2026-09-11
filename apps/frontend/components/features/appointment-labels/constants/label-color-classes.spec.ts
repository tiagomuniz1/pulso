import { AppointmentLabelColor } from '@app/shared'
import { LABEL_PILL_CLASS, LABEL_STRIP_CLASS } from './label-color-classes'

describe('mapas de cor dos rótulos', () => {
  // Pega "adicionei a cor 17 no enum e esqueci o mapa" — o sintoma seria uma
  // faixa sem cor nenhuma na agenda, sem erro em lugar algum.
  it('cobre todas as cores do enum nos dois mapas', () => {
    for (const color of Object.values(AppointmentLabelColor)) {
      expect(LABEL_STRIP_CLASS[color]).toBeTruthy()
      expect(LABEL_PILL_CLASS[color]).toBeTruthy()
    }
  })

  // Classe montada por interpolação não é gerada pelo Tailwind: o mapa existe
  // justamente para as strings aparecerem literais no código.
  it('usa classes literais registradas no tailwind', () => {
    expect(LABEL_STRIP_CLASS[AppointmentLabelColor.ROSE]).toBe('bg-label-rose')
    expect(LABEL_PILL_CLASS[AppointmentLabelColor.ROSE]).toBe('bg-label-rose-soft text-label-rose')
  })

  it('não repete a mesma classe entre cores diferentes', () => {
    const classes = Object.values(LABEL_STRIP_CLASS)
    expect(new Set(classes).size).toBe(classes.length)
  })
})
