import { AppointmentLabelColor } from '../enums/appointment-label-color.enum'

/**
 * Os hexadecimais da paleta de rótulos, claro e escuro.
 *
 * Estavam só em `globals.css`, como variáveis CSS — o que serve à web e deixa
 * o app sem paleta nenhuma. Um "Mostarda" diferente de cada lado não é um
 * detalhe: o rótulo existe para a profissional reconhecer de relance, e
 * reconhecer exige que seja sempre a mesma cor.
 *
 * A fonte continua sendo o CSS, porque é dele que as classes do Tailwind
 * saem — e um spec do frontend compara os dois, para a divergência falhar em
 * teste em vez de aparecer na tela de alguém.
 *
 * `base` é a cor da faixa e do texto; `soft` é o fundo da pastilha.
 */
export interface IAppointmentLabelPalette {
  base: string
  soft: string
}

export const APPOINTMENT_LABEL_COLOR_HEX: Record<
  AppointmentLabelColor,
  { light: IAppointmentLabelPalette; dark: IAppointmentLabelPalette }
> = {
  [AppointmentLabelColor.ROSE]: {
    light: { base: '#984D67', soft: '#FFEAF1' },
    dark: { base: '#E8A9BC', soft: '#391E27' },
  },
  [AppointmentLabelColor.RED]: {
    light: { base: '#9C4E4C', soft: '#FFEBE9' },
    dark: { base: '#E8ACA8', soft: '#39201F' },
  },
  [AppointmentLabelColor.TERRACOTTA]: {
    light: { base: '#99542F', soft: '#FFECE1' },
    dark: { base: '#E8AF93', soft: '#392115' },
  },
  [AppointmentLabelColor.BRONZE]: {
    light: { base: '#896026', soft: '#FDF0E0' },
    dark: { base: '#E4B478', soft: '#372308' },
  },
  [AppointmentLabelColor.MUSTARD]: {
    light: { base: '#746A27', soft: '#F5F3E0' },
    dark: { base: '#CBC076', soft: '#2D2807' },
  },
  [AppointmentLabelColor.MOSS]: {
    light: { base: '#5A732A', soft: '#EDF6E1' },
    dark: { base: '#AEC986', soft: '#212C0F' },
  },
  [AppointmentLabelColor.GREEN]: {
    light: { base: '#337A49', soft: '#E4F8E8' },
    dark: { base: '#90D09F', soft: '#132F1B' },
  },
  [AppointmentLabelColor.EMERALD]: {
    light: { base: '#2C7865', soft: '#E3F7F1' },
    dark: { base: '#78D2B9', soft: '#032F26' },
  },
  [AppointmentLabelColor.PETROL]: {
    light: { base: '#2C757E', soft: '#E3F6F9' },
    dark: { base: '#77CEDA', soft: '#002E33' },
  },
  [AppointmentLabelColor.BLUE]: {
    light: { base: '#2B7096', soft: '#E2F5FF' },
    dark: { base: '#90C6E7', soft: '#122B39' },
  },
  [AppointmentLabelColor.INDIGO]: {
    light: { base: '#4568A5', soft: '#E7F3FF' },
    dark: { base: '#A7BFE7', soft: '#1E2839' },
  },
  [AppointmentLabelColor.VIOLET]: {
    light: { base: '#635FA3', soft: '#EFF0FF' },
    dark: { base: '#B9B8E7', soft: '#262539' },
  },
  [AppointmentLabelColor.PLUM]: {
    light: { base: '#7B5696', soft: '#F8EDFF' },
    dark: { base: '#CEAFE7', soft: '#2F2139' },
  },
  [AppointmentLabelColor.MAGENTA]: {
    light: { base: '#8D5082', soft: '#FFEBFA' },
    dark: { base: '#E4A7D7', soft: '#361E32' },
  },
  [AppointmentLabelColor.STONE]: {
    light: { base: '#70675E', soft: '#F4F1EE' },
    dark: { base: '#C8BBAD', soft: '#2C2721' },
  },
  [AppointmentLabelColor.SLATE]: {
    light: { base: '#5C6B7A', soft: '#EEF2F7' },
    dark: { base: '#ABC0D7', soft: '#1F2932' },
  },
}
