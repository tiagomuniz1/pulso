/**
 * Paleta curada dos rótulos de consulta.
 *
 * O banco guarda este identificador, nunca um hex: um hex não tem variante para
 * o modo escuro, e a mesma "verde" precisa ser dois valores diferentes. O
 * mapeamento slug → cor vive no frontend, que é quem sabe o modo em vigor.
 *
 * Os nomes são de cor, não de significado (`URGENTE`, `ATENÇÃO`): o significado
 * é o nome que a clínica dá ao rótulo. Um enum semântico obrigaria a inventar
 * dezesseis significados e envelheceria mal.
 */
export enum AppointmentLabelColor {
  ROSE = 'rose',
  RED = 'red',
  TERRACOTTA = 'terracotta',
  BRONZE = 'bronze',
  MUSTARD = 'mustard',
  MOSS = 'moss',
  GREEN = 'green',
  EMERALD = 'emerald',
  PETROL = 'petrol',
  BLUE = 'blue',
  INDIGO = 'indigo',
  VIOLET = 'violet',
  PLUM = 'plum',
  MAGENTA = 'magenta',
  STONE = 'stone',
  SLATE = 'slate',
}
