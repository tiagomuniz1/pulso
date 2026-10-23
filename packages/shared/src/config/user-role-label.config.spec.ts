import { UserRole } from '../enums/user-role.enum'
import {
  USER_ROLE_DESCRIPTIONS,
  USER_ROLE_LABELS,
  USER_ROLE_SHORT_LABELS,
} from './user-role-label.config'

const ALL_ROLES = Object.values(UserRole)

describe.each([
  ['USER_ROLE_LABELS', USER_ROLE_LABELS],
  ['USER_ROLE_SHORT_LABELS', USER_ROLE_SHORT_LABELS],
  ['USER_ROLE_DESCRIPTIONS', USER_ROLE_DESCRIPTIONS],
])('%s', (_name, map) => {
  /**
   * Um perfil novo no enum sem entrada aqui não quebra a compilação se
   * alguém puser um `as` no caminho — e a tela passa a exibir `undefined`
   * no lugar do cargo de alguém.
   */
  it('cobre todos os perfis', () => {
    expect(Object.keys(map)).toHaveLength(ALL_ROLES.length)
    ALL_ROLES.forEach((role) => {
      expect(map[role]).toEqual(expect.any(String))
      expect(map[role].length).toBeGreaterThan(0)
    })
  })
})

/**
 * As duas formas existem porque os dois lugares têm larguras diferentes: o
 * selo da listagem cabe "Admin", o seletor de perfil cabe "Administrador".
 * Se alguém as igualar, um dos dois fica errado.
 */
describe('as duas formas', () => {
  it('a longa é descritiva', () => {
    expect(USER_ROLE_LABELS[UserRole.USER]).toBe('Recepcionista')
    expect(USER_ROLE_LABELS[UserRole.ADMIN]).toBe('Administrador')
  })

  it('a curta cabe num selo', () => {
    expect(USER_ROLE_SHORT_LABELS[UserRole.USER]).toBe('Usuário')
    expect(USER_ROLE_SHORT_LABELS[UserRole.ADMIN]).toBe('Admin')
  })
})
