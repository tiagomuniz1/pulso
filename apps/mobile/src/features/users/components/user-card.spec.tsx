import { CouncilType, UserRole } from '@app/shared'
import { screen } from '@testing-library/react-native'
import type { IUserModel } from '@app/core'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { UserCard, userTypeLabel } from './user-card'

const user = (overrides: Partial<IUserModel> = {}): IUserModel =>
  ({
    id: 'u-2',
    fullName: 'Mauro Lima',
    email: 'mauro@pulso.test',
    role: UserRole.PROFESSIONAL,
    isActive: true,
    isProfessional: true,
    isPatient: false,
    councilType: CouncilType.CRM,
    createdAt: new Date(2026, 9, 20),
    updatedAt: new Date(2026, 9, 20),
    ...overrides,
  }) as IUserModel

describe('userTypeLabel', () => {
  it.each([
    ['profissional com conselho', { isProfessional: true, councilType: CouncilType.CRM }, 'Médico'],
    ['profissional sem conselho', { isProfessional: true, councilType: null }, 'Profissional'],
    ['paciente', { isProfessional: false, isPatient: true }, 'Paciente'],
    ['nenhum dos dois', { isProfessional: false, isPatient: false }, '—'],
  ])('%s', (_caso, overrides, expected) => {
    expect(userTypeLabel(user(overrides))).toBe(expected)
  })
})

describe('UserCard', () => {
  // O selo do ADMIN usa o acento da clínica; os outros, o neutro. É o que
  // faz o administrador saltar numa lista de vinte recepcionistas.
  it.each([
    ['o admin', UserRole.ADMIN, 'Admin'],
    ['a recepção', UserRole.USER, 'Usuário'],
  ])('mostra o perfil de %s', async (_caso, role, label) => {
    await renderWithProviders(
      <UserCard
        user={user({ role })}
        isCurrentUser={false}
        onOpen={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    )

    expect(screen.getByTestId('user-card-u-2')).toHaveTextContent(new RegExp(label))
  })

  it('as iniciais aparecem no avatar', async () => {
    await renderWithProviders(
      <UserCard
        user={user()}
        isCurrentUser={false}
        onOpen={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    )

    expect(screen.getByTestId('user-card-u-2')).toHaveTextContent(/ML/)
  })
})
