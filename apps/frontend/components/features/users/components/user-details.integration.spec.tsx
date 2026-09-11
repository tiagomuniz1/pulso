jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/components/features/professionals/services/professionals.service')
jest.mock('../services/users.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { UserRole } from '@app/shared'
import { professionalsService } from '@/components/features/professionals/services/professionals.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { userService } from '../services/users.service'
import { UserDetails } from './user-details'
import type { IUserModel } from '../types/user-model.types'

const mockPush = jest.fn()

const user: IUserModel = {
  id: 'uuid-1',
  fullName: 'Alice Costa',
  email: 'alice@example.com',
  role: UserRole.ADMIN,
  isActive: true,
  isProfessional: false,
  isPatient: false,
  councilType: null,
  createdAt: new Date('2024-01-15'),
  updatedAt: new Date('2024-01-16'),
}

const professionalDto = {
  id: 'professional-uuid-1',
  user: { id: 'uuid-professional-1', fullName: 'Ana Nutri', email: 'ana@example.com', isActive: true },
  registrations: [{ id: 'reg-1', councilType: 'crn', number: '12345', state: 'SP', isPrimary: true }],
  specialties: [],
  bio: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('UserDetails (integration)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('renders all user fields', () => {
    renderWithProviders(<UserDetails user={user} canDelete canSendSetPasswordEmail={false} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('user-details-name')).toHaveTextContent('Alice Costa')
    expect(screen.getByTestId('user-details-email')).toHaveTextContent('alice@example.com')
    expect(screen.getByTestId('user-details-status')).toHaveTextContent('Ativo')
    expect(screen.getByTestId('user-details-role')).toHaveTextContent('Administrador')
    expect(screen.getByTestId('user-details-created-at')).toBeInTheDocument()
  })

  it('shows a description of what the role can do', () => {
    renderWithProviders(<UserDetails user={user} canDelete canSendSetPasswordEmail={false} onDeleteClick={jest.fn()} />)

    expect(screen.getByText(/Acesso total/)).toBeInTheDocument()
  })

  it('renders "Inativo" for inactive user', () => {
    renderWithProviders(<UserDetails user={{ ...user, isActive: false }} canDelete canSendSetPasswordEmail={false} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('user-details-status')).toHaveTextContent('Inativo')
  })

  it('renders "Recepcionista" role label for USER role', () => {
    renderWithProviders(<UserDetails user={{ ...user, role: UserRole.USER }} canDelete canSendSetPasswordEmail={false} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('user-details-role')).toHaveTextContent('Recepcionista')
  })

  it('does not show a profession row for a user with no professional profile', () => {
    renderWithProviders(<UserDetails user={{ ...user, role: UserRole.USER, isProfessional: false }} canDelete canSendSetPasswordEmail={false} onDeleteClick={jest.fn()} />)

    expect(screen.queryByTestId('user-details-profession-cell')).not.toBeInTheDocument()
  })

  it('renders edit button linking to edit page', () => {
    renderWithProviders(<UserDetails user={user} canDelete canSendSetPasswordEmail={false} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('user-details-edit-button')).toBeInTheDocument()
  })

  it('shows delete button when canDelete is true', () => {
    renderWithProviders(<UserDetails user={user} canDelete canSendSetPasswordEmail={false} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('user-details-delete-button')).toBeInTheDocument()
  })

  it('hides delete button when canDelete is false', () => {
    renderWithProviders(<UserDetails user={user} canDelete={false} canSendSetPasswordEmail={false} onDeleteClick={jest.fn()} />)

    expect(screen.queryByTestId('user-details-delete-button')).not.toBeInTheDocument()
  })

  it('calls onDeleteClick when delete button is clicked', async () => {
    const onDeleteClick = jest.fn()

    renderWithProviders(<UserDetails user={user} canDelete canSendSetPasswordEmail={false} onDeleteClick={onDeleteClick} />)

    await userEvent.click(screen.getByTestId('user-details-delete-button'))

    expect(onDeleteClick).toHaveBeenCalledTimes(1)
  })
})

describe('UserDetails (integration) — users who hold a professional profile', () => {
  const professionalUser: IUserModel = {
    ...user,
    id: 'uuid-professional-1',
    role: UserRole.PROFESSIONAL,
    isProfessional: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue({ push: mockPush })
  })

  it('shows the linked professional profession, separate from the access role', async () => {
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({
      data: [professionalDto],
      total: 1,
      page: 1,
      limit: 100,
    })

    renderWithProviders(<UserDetails user={professionalUser} canDelete canSendSetPasswordEmail={false} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('user-details-role')).toHaveTextContent('Profissional')

    await waitFor(() => {
      expect(screen.getByTestId('user-details-profession')).toHaveTextContent('CRN 12345/SP')
    })
  })

  it('omits the profession row when no linked professional is found', async () => {
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({ data: [], total: 0, page: 1, limit: 100 })

    renderWithProviders(<UserDetails user={professionalUser} canDelete canSendSetPasswordEmail={false} onDeleteClick={jest.fn()} />)

    await waitFor(() => {
      expect(screen.queryByTestId('user-details-profession-cell')).not.toBeInTheDocument()
    })
  })

  it('omits the profession row when the lookup fails', async () => {
    ;(professionalsService.getAll as jest.Mock).mockRejectedValue(new Error('Network error'))

    renderWithProviders(<UserDetails user={professionalUser} canDelete canSendSetPasswordEmail={false} onDeleteClick={jest.fn()} />)

    await waitFor(() => {
      expect(screen.queryByTestId('user-details-profession-cell')).not.toBeInTheDocument()
    })
  })

  // Cargo dá escopo, ficha dá exercício: a médica que administra a própria
  // clínica é ADMIN e tem CRM. Amarrar a linha ao cargo escondia o registro
  // dela — mesmo defeito que `user-form.tsx:156` já tinha corrigido.
  it('shows the profession for an ADMIN who also holds a professional profile', async () => {
    ;(professionalsService.getAll as jest.Mock).mockResolvedValue({
      data: [professionalDto],
      total: 1,
      page: 1,
      limit: 100,
    })

    const adminWhoPractises: IUserModel = { ...professionalUser, role: UserRole.ADMIN }
    renderWithProviders(<UserDetails user={adminWhoPractises} canDelete canSendSetPasswordEmail={false} onDeleteClick={jest.fn()} />)

    expect(screen.getByTestId('user-details-role')).toHaveTextContent('Administrador')

    await waitFor(() => {
      expect(screen.getByTestId('user-details-profession')).toHaveTextContent('CRN 12345/SP')
    })
  })

  it('does not look up a profile for a PROFESSIONAL whose profile was removed', async () => {
    const withoutProfile: IUserModel = { ...professionalUser, isProfessional: false }
    renderWithProviders(<UserDetails user={withoutProfile} canDelete canSendSetPasswordEmail={false} onDeleteClick={jest.fn()} />)

    await waitFor(() => {
      expect(screen.queryByTestId('user-details-profession-cell')).not.toBeInTheDocument()
    })
    expect(professionalsService.getAll).not.toHaveBeenCalled()
  })

  describe('enviar link de definição de senha', () => {
    const mockUserService = userService as jest.Mocked<typeof userService>

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('esconde o botão de quem não é ADMIN', () => {
      renderWithProviders(<UserDetails user={user} canDelete canSendSetPasswordEmail={false} onDeleteClick={jest.fn()} />)
      expect(screen.queryByTestId('user-details-send-set-password-button')).not.toBeInTheDocument()
    })

    it('mostra o botão para o ADMIN', () => {
      renderWithProviders(<UserDetails user={user} canDelete canSendSetPasswordEmail onDeleteClick={jest.fn()} />)
      expect(screen.getByTestId('user-details-send-set-password-button')).toBeInTheDocument()
    })

    // PATIENT não faz login: o link não teria para onde levar.
    it('esconde o botão para paciente, mesmo do ADMIN', () => {
      renderWithProviders(
        <UserDetails user={{ ...user, role: UserRole.PATIENT }} canDelete canSendSetPasswordEmail onDeleteClick={jest.fn()} />,
      )
      expect(screen.queryByTestId('user-details-send-set-password-button')).not.toBeInTheDocument()
    })

    // O link morreria no login com "conta inativa" e quem clicou não entenderia.
    it('desabilita para usuário inativo, dizendo por quê', () => {
      renderWithProviders(
        <UserDetails user={{ ...user, isActive: false }} canDelete canSendSetPasswordEmail onDeleteClick={jest.fn()} />,
      )
      const botao = screen.getByTestId('user-details-send-set-password-button')
      expect(botao).toBeDisabled()
      expect(botao).toHaveAttribute('title', expect.stringContaining('Ative o usuário'))
    })

    it('envia e confirma com o e-mail do destinatário', async () => {
      mockUserService.sendSetPasswordEmail.mockResolvedValue({ sent: true })
      renderWithProviders(<UserDetails user={user} canDelete canSendSetPasswordEmail onDeleteClick={jest.fn()} />)

      await userEvent.click(screen.getByTestId('user-details-send-set-password-button'))

      await waitFor(() => {
        expect(mockUserService.sendSetPasswordEmail).toHaveBeenCalledWith(user.id)
      })
      expect(await screen.findByTestId('user-details-send-set-password-success')).toHaveTextContent(user.email)
    })

    // O motivo da mudança inteira: o envio pulado não pode virar confirmação.
    it('não confirma sucesso quando o backend responde 503', async () => {
      mockUserService.sendSetPasswordEmail.mockRejectedValue({ status: 503 })
      renderWithProviders(<UserDetails user={user} canDelete canSendSetPasswordEmail onDeleteClick={jest.fn()} />)

      await userEvent.click(screen.getByTestId('user-details-send-set-password-button'))

      expect(await screen.findByTestId('user-details-send-set-password-error')).toHaveTextContent(
        'não estar configurado',
      )
      expect(screen.queryByTestId('user-details-send-set-password-success')).not.toBeInTheDocument()
    })

    it('traduz o 422 em instrução acionável', async () => {
      mockUserService.sendSetPasswordEmail.mockRejectedValue({ status: 422 })
      renderWithProviders(<UserDetails user={user} canDelete canSendSetPasswordEmail onDeleteClick={jest.fn()} />)

      await userEvent.click(screen.getByTestId('user-details-send-set-password-button'))

      expect(await screen.findByTestId('user-details-send-set-password-error')).toHaveTextContent('Ative o usuário')
    })

    it('mostra mensagem genérica para erro inesperado', async () => {
      mockUserService.sendSetPasswordEmail.mockRejectedValue({ status: 500 })
      renderWithProviders(<UserDetails user={user} canDelete canSendSetPasswordEmail onDeleteClick={jest.fn()} />)

      await userEvent.click(screen.getByTestId('user-details-send-set-password-button'))

      expect(await screen.findByTestId('user-details-send-set-password-error')).toHaveTextContent('Ocorreu um erro')
    })

    // Nunca mostrar o `detail` técnico do backend ao usuário.
    it('não vaza o detalhe técnico do erro', async () => {
      mockUserService.sendSetPasswordEmail.mockRejectedValue({
        status: 503,
        detail: 'SMTP_HOST não configurado no Parameter Store',
      })
      renderWithProviders(<UserDetails user={user} canDelete canSendSetPasswordEmail onDeleteClick={jest.fn()} />)

      await userEvent.click(screen.getByTestId('user-details-send-set-password-button'))

      await screen.findByTestId('user-details-send-set-password-error')
      expect(screen.queryByText(/SMTP_HOST/)).not.toBeInTheDocument()
    })
  })
})
