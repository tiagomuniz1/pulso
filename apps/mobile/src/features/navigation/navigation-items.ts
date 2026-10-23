import { UserRole } from '@app/shared'

export interface INavigationItem {
  id: string
  label: string
  /** Ícone do Feather — o conjunto mais próximo do que a web usa. */
  icon: string
  route: string
  roles: UserRole[]
}

/**
 * Os mesmos itens da sidebar da web, na mesma ordem e com as mesmas regras de
 * perfil (`NAVIGATION_ITEMS` em `lib/constants.tsx`).
 *
 * Todos levam a uma tela. Durante a porta, os que ainda não tinham ficavam
 * apagados em vez de escondidos — a lista é o mapa do sistema, e esconder
 * metade dela faria o app parecer outro produto. Com a última tela portada
 * não sobrou nenhum, e o estado apagado saiu junto: um item que não navega
 * virou um caso que não existe mais.
 */
export const NAVIGATION_ITEMS: INavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'grid',
    route: '/(app)/dashboard',
    roles: [UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.USER],
  },
  { id: 'users', label: 'Usuários', icon: 'users', route: '/(app)/users', roles: [UserRole.ADMIN] },
  {
    id: 'patients',
    label: 'Pacientes',
    icon: 'user',
    route: '/(app)/patients',
    roles: [UserRole.ADMIN, UserRole.USER],
  },
  {
    id: 'professionals',
    label: 'Profissionais',
    icon: 'file-text',
    route: '/(app)/professionals',
    roles: [UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.USER],
  },
  {
    id: 'medical-record-templates',
    label: 'Modelos de prontuário',
    icon: 'check-square',
    route: '/(app)/medical-record-templates',
    roles: [UserRole.ADMIN, UserRole.PROFESSIONAL],
  },
  {
    id: 'prescription-templates',
    label: 'Modelos de receita',
    icon: 'link',
    route: '/(app)/prescription-templates',
    roles: [UserRole.ADMIN, UserRole.PROFESSIONAL],
  },
  {
    id: 'appointments',
    label: 'Consultas',
    icon: 'list',
    route: '/(app)',
    roles: [UserRole.ADMIN, UserRole.PROFESSIONAL, UserRole.USER],
  },
  {
    id: 'appointment-labels',
    label: 'Rótulos de consulta',
    icon: 'tag',
    route: '/(app)/appointment-labels',
    roles: [UserRole.ADMIN],
  },
  {
    id: 'schedules',
    label: 'Agendas',
    icon: 'calendar',
    route: '/(app)/schedules',
    roles: [UserRole.ADMIN, UserRole.PROFESSIONAL],
  },
]

export function navigationItemsFor(role: UserRole | undefined): INavigationItem[] {
  if (!role) return []
  return NAVIGATION_ITEMS.filter((item) => item.roles.includes(role))
}

/** "Ana Paula Souza" → "AS". O mesmo cálculo do avatar da web. */
export function initialsOf(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}
