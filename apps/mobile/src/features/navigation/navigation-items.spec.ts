import { UserRole } from '@app/shared'
import { initialsOf, NAVIGATION_ITEMS, navigationItemsFor } from './navigation-items'

describe('NAVIGATION_ITEMS', () => {
  it('não repete id', () => {
    const ids = NAVIGATION_ITEMS.map((item) => item.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('todo item tem rótulo, ícone e ao menos um perfil', () => {
    NAVIGATION_ITEMS.forEach((item) => {
      expect(item.label).toBeTruthy()
      expect(item.icon).toBeTruthy()
      expect(item.roles.length).toBeGreaterThan(0)
    })
  })

  // A ordem é a da sidebar da web; trocá-la faria o mesmo sistema ter dois
  // mapas diferentes.
  it('mantém a ordem da web', () => {
    expect(NAVIGATION_ITEMS.map((item) => item.id)).toEqual([
      'dashboard',
      'users',
      'patients',
      'professionals',
      'medical-record-templates',
      'prescription-templates',
      'appointments',
      'appointment-labels',
      'schedules',
    ])
  })
})

describe('navigationItemsFor', () => {
  it.each([
    [UserRole.ADMIN, 9],
    [UserRole.PROFESSIONAL, 6],
    [UserRole.USER, 4],
  ])('%s vê %s itens', (role, count) => {
    expect(navigationItemsFor(role)).toHaveLength(count)
  })

  // As mesmas regras do `permissions.md`: a recepção não acessa prontuário
  // nem modelo, e não gerencia usuário.
  it('a recepção não vê usuários, modelos nem agendas', () => {
    const ids = navigationItemsFor(UserRole.USER).map((item) => item.id)

    expect(ids).toEqual(['dashboard', 'patients', 'professionals', 'appointments'])
  })

  it('o profissional não vê usuários, pacientes nem rótulos', () => {
    const ids = navigationItemsFor(UserRole.PROFESSIONAL).map((item) => item.id)

    expect(ids).not.toContain('users')
    expect(ids).not.toContain('patients')
    expect(ids).not.toContain('appointment-labels')
  })

  it('sem perfil, nenhum item', () => {
    expect(navigationItemsFor(undefined)).toEqual([])
  })
})

describe('initialsOf', () => {
  it.each([
    ['Ana Paula Souza', 'AS'],
    ['Administrator', 'A'],
    ['dra. brenna', 'DB'],
    ['  Maria   Silva  ', 'MS'],
  ])('%s vira %s', (fullName, expected) => {
    expect(initialsOf(fullName)).toBe(expected)
  })
})
