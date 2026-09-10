import { AppointmentLabelColor } from '../enums/appointment-label-color.enum'

/**
 * Os nomes que o ADMIN vê ao escolher a cor.
 *
 * São honestos quanto ao tom: a paleta é deliberadamente mais surda que o
 * instinto pede, para nunca competir com a cor da marca da clínica. Chamar
 * `#896026` de "Amarelo" faria alguém escolher esperando um amarelo-limão.
 */
export const APPOINTMENT_LABEL_COLOR_LABELS: Record<AppointmentLabelColor, string> = {
  [AppointmentLabelColor.ROSE]: 'Rosa',
  [AppointmentLabelColor.RED]: 'Vermelho',
  [AppointmentLabelColor.TERRACOTTA]: 'Terracota',
  [AppointmentLabelColor.BRONZE]: 'Bronze',
  [AppointmentLabelColor.MUSTARD]: 'Mostarda',
  [AppointmentLabelColor.MOSS]: 'Musgo',
  [AppointmentLabelColor.GREEN]: 'Verde',
  [AppointmentLabelColor.EMERALD]: 'Esmeralda',
  [AppointmentLabelColor.PETROL]: 'Petróleo',
  [AppointmentLabelColor.BLUE]: 'Azul',
  [AppointmentLabelColor.INDIGO]: 'Índigo',
  [AppointmentLabelColor.VIOLET]: 'Violeta',
  [AppointmentLabelColor.PLUM]: 'Ameixa',
  [AppointmentLabelColor.MAGENTA]: 'Magenta',
  [AppointmentLabelColor.STONE]: 'Pedra',
  [AppointmentLabelColor.SLATE]: 'Ardósia',
}

/**
 * A ordem em que as cores aparecem no seletor: o círculo cromático, e os dois
 * neutros ao fim. Alfabética embaralharia tons vizinhos e faria a grade parecer
 * aleatória.
 */
export const APPOINTMENT_LABEL_COLOR_ORDER: AppointmentLabelColor[] = [
  AppointmentLabelColor.ROSE,
  AppointmentLabelColor.RED,
  AppointmentLabelColor.TERRACOTTA,
  AppointmentLabelColor.BRONZE,
  AppointmentLabelColor.MUSTARD,
  AppointmentLabelColor.MOSS,
  AppointmentLabelColor.GREEN,
  AppointmentLabelColor.EMERALD,
  AppointmentLabelColor.PETROL,
  AppointmentLabelColor.BLUE,
  AppointmentLabelColor.INDIGO,
  AppointmentLabelColor.VIOLET,
  AppointmentLabelColor.PLUM,
  AppointmentLabelColor.MAGENTA,
  AppointmentLabelColor.STONE,
  AppointmentLabelColor.SLATE,
]
