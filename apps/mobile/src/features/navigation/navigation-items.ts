import { UserRole } from '@app/shared'

export interface INavigationItem {
  id: string
  label: string
  /** Ícone do Feather — o conjunto mais próximo do que a web usa. */
  icon: string
  /** Rota do app. `null` enquanto a tela não existe. */
  route: string | null
  roles: UserRole[]
}

/**
 * Os mesmos itens da sidebar da web, na mesma ordem e com as mesmas regras de
 * perfil (`NAVIGATION_ITEMS` em `lib/constants.tsx`).
 *
 * Os itens cuja tela ainda não foi portada aparecem **apagados**, não
 * escondidos: a lista é o mapa do sistema, e esconder metade dela faria o app
 * parecer outro produto — que é exatamente o problema que estamos corrigindo.
 * O horário passado da própria agenda usa o mesmo recurso.
 */
export const NAVIGATION_ITEMS: INavigationItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: 'grid',
    route: null,
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
    route: null,
    roles: [UserRole.ADMIN, UserRole.PROFESSIONAL],
  },
  {
    id: 'prescription-templates',
    label: 'Modelos de receita',
    icon: 'link',
    route: null,
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
    route: null,
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
