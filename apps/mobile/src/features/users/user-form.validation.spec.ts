import { UserRole } from '@app/shared'
import { selectableRoles, validateUserForm, type IUserFormValues } from './user-form.validation'

const valid: IUserFormValues = {
  fullName: 'Ana Paula Souza',
  email: 'ana@pulso.test',
  password: 'senha-forte-123',
  role: UserRole.USER,
  isActive: true,
}

const form = (overrides: Partial<IUserFormValues> = {}) => ({ ...valid, ...overrides })

describe('validateUserForm', () => {
  it('o formulário preenchido não tem erro', () => {
    expect(validateUserForm(valid, false)).toEqual({})
  })

  it.each([
    ['nome curto', { fullName: 'An' }, 'fullName'],
    ['nome só com espaços', { fullName: '   ' }, 'fullName'],
    ['e-mail sem arroba', { email: 'ana.pulso.test' }, 'email'],
    ['senha curta', { password: '1234567' }, 'password'],
    ['perfil inválido', { role: 'chefe' }, 'role'],
  ])('recusa %s', (_caso, overrides, field) => {
    expect(validateUserForm(form(overrides), false)[field]).toBeDefined()
  })

  /**
   * Na edição a senha não é pedida: ela é trocada pelo link de definição,
   * que o ADMIN envia a partir da ficha. Pedi-la aqui faria o administrador
   * escolher a senha de outra pessoa.
   */
  it('editando, não pede senha', () => {
    expect(validateUserForm(form({ password: '' }), true)).toEqual({})
  })
})

describe('selectableRoles', () => {
  /**
   * `PATIENT` não faz login e `PLATFORM_ADMIN` é da plataforma — nenhum dos
   * dois é escolha de quem administra uma clínica.
   */
  it('oferece recepção e administração', () => {
    expect(selectableRoles(false)).toEqual([UserRole.USER, UserRole.ADMIN])
  })

  /**
   * `PROFESSIONAL` só entra para quem já o é, para que o valor atual seja
   * representável e a troca tenha volta. Virar profissional acontece ao
   * criar a ficha, não ao escolher um perfil.
   */
  it('inclui profissional só para quem já tem ficha', () => {
    expect(selectableRoles(true)).toContain(UserRole.PROFESSIONAL)
    expect(selectableRoles(false)).not.toContain(UserRole.PROFESSIONAL)
  })
})
