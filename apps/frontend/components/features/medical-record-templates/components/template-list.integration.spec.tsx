jest.mock('next/navigation', () => ({ useRouter: jest.fn() }))
jest.mock('@/lib/slug-context', () => ({ useSlug: jest.fn(() => 'clinic-slug'), useBasePath: () => '/clinic-slug' }))
jest.mock('@/stores/auth.store')
jest.mock('../services/medical-record-templates.service')
jest.mock('@/components/features/clinic-specialties/services/clinic-specialties.service')

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRouter } from 'next/navigation'
import { UserRole, MedicalRecordFieldType, CouncilType } from '@app/shared'
import { useAuthStore } from '@/stores/auth.store'
import { medicalRecordTemplatesService } from '../services/medical-record-templates.service'
import { clinicSpecialtiesService } from '@/components/features/clinic-specialties/services/clinic-specialties.service'
import { renderWithProviders } from '@/tests/utils/render-with-providers'
import { TemplateList } from './template-list'

;(useRouter as jest.Mock).mockReturnValue({ push: jest.fn() })

function mockAuthStoreAs(role: UserRole) {
  ;(useAuthStore as unknown as jest.Mock).mockImplementation(
    (selector: (s: {
      user: { id: string; fullName: string; email: string; role: UserRole; clinicId: string }
    }) => unknown) =>
      selector({
        user: {
          id: 'user-uuid',
          fullName: 'Test User',
          email: 'test@example.com',
          role,
          clinicId: 'clinic-uuid',
        },
      }),
  )
}

const makeDto = (overrides = {}) => ({
  id: 'uuid-1',
  specialtyId: 'spec-uuid',
  specialtyName: 'Cardiologia',
  name: 'Anamnese Cardíaca',
  fields: [{ key: 'k1', label: 'Sintoma', type: MedicalRecordFieldType.TEXT, required: true, order: 0, options: null, placeholder: null, helpText: null, canonical: false, canonicalKey: null }],
  isActive: true,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T10:00:00.000Z',
  ...overrides,
})

const makePaginated = (items = [makeDto()]) => ({
  data: items,
  total: items.length,
  page: 1,
  limit: 20,
})

describe('TemplateList (integration)', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('as ADMIN', () => {
    beforeEach(() => mockAuthStoreAs(UserRole.ADMIN))

    it('renders skeleton while loading', () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockReturnValue(new Promise(() => {}))

      renderWithProviders(<TemplateList />)

      expect(screen.getByTestId('template-list-skeleton')).toBeInTheDocument()
    })

    it('renders table with templates on success', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(makePaginated())

      renderWithProviders(<TemplateList />)

      await waitFor(() => {
        expect(screen.getByTestId('template-list-table')).toBeInTheDocument()
      })

      expect(screen.getByTestId('template-name-uuid-1')).toHaveTextContent('Anamnese Cardíaca')
      expect(screen.getByTestId('template-profession-uuid-1')).toHaveTextContent('Medicina')
      expect(screen.getByTestId('template-specialty-uuid-1')).toHaveTextContent('Cardiologia')
      expect(screen.getByTestId('template-fields-count-uuid-1')).toHaveTextContent('1')
      expect(screen.getByTestId('template-status-uuid-1')).toHaveTextContent('Ativo')
    })

    it('renders a mobile card per template with name, specialty and status', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(makePaginated())

      renderWithProviders(<TemplateList />)

      await waitFor(() => expect(screen.getByTestId('template-card-uuid-1')).toBeInTheDocument())

      expect(screen.getByTestId('template-card-uuid-1-title')).toHaveTextContent('Anamnese Cardíaca')
      expect(screen.getByTestId('template-card-uuid-1')).toHaveTextContent('Cardiologia')
      expect(screen.getByTestId('template-card-view-link-uuid-1')).toHaveAttribute(
        'href',
        '/clinic-slug/medical-record-templates/uuid-1',
      )
    })

    it('shows the profession for a generalist (null specialty) template and names it Generalista', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(
        makePaginated([makeDto({ specialtyId: null, specialtyName: null, councilType: CouncilType.CRM })]),
      )

      renderWithProviders(<TemplateList />)

      await waitFor(() => expect(screen.getByTestId('template-list-table')).toBeInTheDocument())

      expect(screen.getByTestId('template-profession-uuid-1')).toHaveTextContent('Medicina')
      expect(screen.getByTestId('template-specialty-uuid-1')).toHaveTextContent('Generalista')
      expect(screen.getByTestId('template-card-uuid-1')).toHaveTextContent('Medicina')
    })

    it('renders Inativo status for inactive template', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(makePaginated([makeDto({ isActive: false })]))

      renderWithProviders(<TemplateList />)

      await waitFor(() => {
        expect(screen.getByTestId('template-list-table')).toBeInTheDocument()
      })

      expect(screen.getByTestId('template-status-uuid-1')).toHaveTextContent('Inativo')
    })

    it('renders empty state when no templates returned', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(makePaginated([]))

      renderWithProviders(<TemplateList />)

      await waitFor(() => {
        expect(screen.getByTestId('template-list-empty')).toBeInTheDocument()
      })

      expect(screen.queryByTestId('template-list-table')).not.toBeInTheDocument()
    })

    it('renders error state on fetch failure', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockRejectedValue(new Error('Network error'))

      renderWithProviders(<TemplateList />)

      await waitFor(() => {
        expect(screen.getByTestId('template-list-error')).toBeInTheDocument()
      })
    })

    it('shows new template button for ADMIN', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(makePaginated([]))

      renderWithProviders(<TemplateList />)

      await waitFor(() => expect(screen.getByTestId('template-list-empty')).toBeInTheDocument())

      expect(screen.getByTestId('template-list-new-button')).toBeInTheDocument()
    })

    it('view details link navigates to template page', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(makePaginated())

      renderWithProviders(<TemplateList />)

      await waitFor(() => expect(screen.getByTestId('template-list-table')).toBeInTheDocument())

      expect(screen.getByTestId('template-view-link-uuid-1')).toHaveAttribute(
        'href',
        '/clinic-slug/medical-record-templates/uuid-1',
      )
    })
  })

  describe('as PROFESSIONAL', () => {
    beforeEach(() => mockAuthStoreAs(UserRole.PROFESSIONAL))

    // Criar deixou de ser do profissional: o modelo é da clínica, e dois
    // médicos da mesma especialidade compartilham o mesmo. Gerir é do ADMIN.
    it('não mostra o botão de novo modelo ao profissional', () => {
      renderWithProviders(<TemplateList />)

      expect(screen.queryByTestId('template-list-new-button')).not.toBeInTheDocument()
    })
  })

  describe('as USER', () => {
    beforeEach(() => mockAuthStoreAs(UserRole.USER))

    it('does not show the new template button', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(makePaginated([]))

      renderWithProviders(<TemplateList />)

      await waitFor(() => expect(screen.getByTestId('template-list-empty')).toBeInTheDocument())

      expect(screen.queryByTestId('template-list-new-button')).not.toBeInTheDocument()
    })
  })

  describe('profession and specialty columns', () => {
    beforeEach(() => mockAuthStoreAs(UserRole.ADMIN))

    it('shows the profession for a non-CRM (specialty-less) template and names it Generalista', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(
        makePaginated([makeDto({ specialtyId: null, specialtyName: null, councilType: CouncilType.CRN })]),
      )

      renderWithProviders(<TemplateList />)

      await waitFor(() => {
        expect(screen.getByTestId('template-profession-uuid-1')).toHaveTextContent('Nutrição')
      })
      expect(screen.getByTestId('template-specialty-uuid-1')).toHaveTextContent('Generalista')
    })

    it('shows Medicina as the profession for a CRM template with a specialty', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(makePaginated())

      renderWithProviders(<TemplateList />)

      await waitFor(() => {
        expect(screen.getByTestId('template-profession-uuid-1')).toHaveTextContent('Medicina')
      })
      expect(screen.getByTestId('template-specialty-uuid-1')).toHaveTextContent('Cardiologia')
    })
  })

  describe('paginação e filtro', () => {
    beforeEach(() => {
      mockAuthStoreAs(UserRole.ADMIN)
      ;(clinicSpecialtiesService.getAll as jest.Mock).mockResolvedValue({
        data: [
          { id: 'cs-1', clinicId: 'clinic-uuid', specialtyId: 'spec-uuid', name: 'Cardiologia', description: null, linkedAt: '2024-01-01T00:00:00.000Z' },
        ],
        total: 1,
        page: 1,
        limit: 100,
      })
    })

    // A listagem não paginava e o backend corta em 20 — com vários modelos por
    // especialidade, o resto sumia sem aviso.
    it('walks through the pages', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue({
        data: [makeDto()],
        total: 45,
        page: 1,
        limit: 20,
      })

      renderWithProviders(<TemplateList />)

      await waitFor(() => expect(screen.getByTestId('template-list-pagination')).toBeInTheDocument())
      expect(screen.getByTestId('template-list-page-info')).toHaveTextContent('Página 1 de 3')
      expect(screen.getByTestId('template-list-prev-page')).toBeDisabled()

      await userEvent.click(screen.getByTestId('template-list-next-page'))

      await waitFor(() => {
        expect(medicalRecordTemplatesService.getAll).toHaveBeenCalledWith(
          expect.objectContaining({ page: 2, limit: 20 }),
        )
      })
      expect(screen.getByTestId('template-list-page-info')).toHaveTextContent('Página 2 de 3')

      await userEvent.click(screen.getByTestId('template-list-prev-page'))
      await waitFor(() => {
        expect(screen.getByTestId('template-list-page-info')).toHaveTextContent('Página 1 de 3')
      })
    })

    it('filters by specialty', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(makePaginated())

      renderWithProviders(<TemplateList />)
      // As especialidades da clínica chegam depois do select: escolher antes
      // erraria por opção inexistente.
      await screen.findByRole('option', { name: 'Cardiologia' })

      await userEvent.selectOptions(screen.getByTestId('template-list-filter-scope'), 'spec-uuid')

      await waitFor(() => {
        expect(medicalRecordTemplatesService.getAll).toHaveBeenCalledWith(
          expect.objectContaining({ specialtyId: 'spec-uuid' }),
        )
      })
    })

    // Escopo por profissão e por especialidade são mutuamente exclusivos no
    // backend — o seletor é um só para a UI não pedir uma combinação que o
    // servidor descarta em silêncio.
    it('filters by profession without sending a specialty', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue(makePaginated())

      renderWithProviders(<TemplateList />)
      await waitFor(() => expect(screen.getByTestId('template-list-filter-scope')).toBeInTheDocument())

      await userEvent.selectOptions(
        screen.getByTestId('template-list-filter-scope'),
        `generalist:${CouncilType.CRN}`,
      )

      await waitFor(() => {
        const ultima = (medicalRecordTemplatesService.getAll as jest.Mock).mock.calls.at(-1)![0]
        expect(ultima).toMatchObject({ councilType: CouncilType.CRN })
        expect(ultima.specialtyId).toBeUndefined()
      })
    })

    // Trocar o filtro na página 3 deixaria a tela vazia num resultado que tem
    // itens.
    it('goes back to the first page when the filter changes', async () => {
      ;(medicalRecordTemplatesService.getAll as jest.Mock).mockResolvedValue({
        data: [makeDto()],
        total: 45,
        page: 1,
        limit: 20,
      })

      renderWithProviders(<TemplateList />)
      await waitFor(() => expect(screen.getByTestId('template-list-next-page')).toBeInTheDocument())
      await userEvent.click(screen.getByTestId('template-list-next-page'))
      await waitFor(() => {
        expect(screen.getByTestId('template-list-page-info')).toHaveTextContent('Página 2 de 3')
      })

      await screen.findByRole('option', { name: 'Cardiologia' })
      await userEvent.selectOptions(screen.getByTestId('template-list-filter-scope'), 'spec-uuid')

      await waitFor(() => {
        expect(screen.getByTestId('template-list-page-info')).toHaveTextContent('Página 1 de 3')
      })
    })
  })
})
