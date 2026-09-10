import { AppointmentLabelColor } from '@app/shared'

/**
 * Slug do banco → classe do Tailwind.
 *
 * Precisa ser um mapa de strings literais: `bg-label-${slug}` não funciona,
 * porque o Tailwind varre o código como texto e não avalia expressões.
 *
 * E precisa morar sob `components/`, não sob `lib/` — o `content` do
 * tailwind.config cobre apenas `./app/**` e `./components/**`, então um mapa em
 * `lib/` teria as classes descartadas no build sem erro nenhum. (O
 * `lib/appointment-status.ts` só sobrevive porque as strings dele se repetem
 * dentro de `components/`.)
 */
export const LABEL_STRIP_CLASS: Record<AppointmentLabelColor, string> = {
  [AppointmentLabelColor.ROSE]: 'bg-label-rose',
  [AppointmentLabelColor.RED]: 'bg-label-red',
  [AppointmentLabelColor.TERRACOTTA]: 'bg-label-terracotta',
  [AppointmentLabelColor.BRONZE]: 'bg-label-bronze',
  [AppointmentLabelColor.MUSTARD]: 'bg-label-mustard',
  [AppointmentLabelColor.MOSS]: 'bg-label-moss',
  [AppointmentLabelColor.GREEN]: 'bg-label-green',
  [AppointmentLabelColor.EMERALD]: 'bg-label-emerald',
  [AppointmentLabelColor.PETROL]: 'bg-label-petrol',
  [AppointmentLabelColor.BLUE]: 'bg-label-blue',
  [AppointmentLabelColor.INDIGO]: 'bg-label-indigo',
  [AppointmentLabelColor.VIOLET]: 'bg-label-violet',
  [AppointmentLabelColor.PLUM]: 'bg-label-plum',
  [AppointmentLabelColor.MAGENTA]: 'bg-label-magenta',
  [AppointmentLabelColor.STONE]: 'bg-label-stone',
  [AppointmentLabelColor.SLATE]: 'bg-label-slate',
}

/** Pílula: fundo suave e texto na cor cheia, como os badges do projeto. */
export const LABEL_PILL_CLASS: Record<AppointmentLabelColor, string> = {
  [AppointmentLabelColor.ROSE]: 'bg-label-rose-soft text-label-rose',
  [AppointmentLabelColor.RED]: 'bg-label-red-soft text-label-red',
  [AppointmentLabelColor.TERRACOTTA]: 'bg-label-terracotta-soft text-label-terracotta',
  [AppointmentLabelColor.BRONZE]: 'bg-label-bronze-soft text-label-bronze',
  [AppointmentLabelColor.MUSTARD]: 'bg-label-mustard-soft text-label-mustard',
  [AppointmentLabelColor.MOSS]: 'bg-label-moss-soft text-label-moss',
  [AppointmentLabelColor.GREEN]: 'bg-label-green-soft text-label-green',
  [AppointmentLabelColor.EMERALD]: 'bg-label-emerald-soft text-label-emerald',
  [AppointmentLabelColor.PETROL]: 'bg-label-petrol-soft text-label-petrol',
  [AppointmentLabelColor.BLUE]: 'bg-label-blue-soft text-label-blue',
  [AppointmentLabelColor.INDIGO]: 'bg-label-indigo-soft text-label-indigo',
  [AppointmentLabelColor.VIOLET]: 'bg-label-violet-soft text-label-violet',
  [AppointmentLabelColor.PLUM]: 'bg-label-plum-soft text-label-plum',
  [AppointmentLabelColor.MAGENTA]: 'bg-label-magenta-soft text-label-magenta',
  [AppointmentLabelColor.STONE]: 'bg-label-stone-soft text-label-stone',
  [AppointmentLabelColor.SLATE]: 'bg-label-slate-soft text-label-slate',
}
