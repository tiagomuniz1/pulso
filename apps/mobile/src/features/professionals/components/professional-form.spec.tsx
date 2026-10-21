import { CouncilType, UserRole } from '@app/shared'
import { listClinicSpecialtiesUseCase, userService, type IProfessionalModel } from '@app/core'
import { act, fireEvent, screen } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { useSessionStore } from '../../auth/session.store'
import { ProfessionalForm } from './professional-form'

jest.mock('@app/core/src/features/clinic-specialties/use-cases/list-clinic-specialties.use-case')
jest.mock('@app/core/src/features/users/services/users.service')

const mockSpecialties = listClinicSpecialtiesUseCase as jest.MockedFunction<
  typeof listClinicSpecialtiesUseCase
>
const mockUsers = userService as jest.Mocked<typeof userService>

const onSubmit = jest.fn()

const existing = (overrides: Partial<IProfessionalModel> = {}): IProfessionalModel =>
  ({
    id: 'prof-1',
    user: { id: 'u-2', fullName: 'Mauro Lima', email: 'mauro@pulso.test', isActive: true },
    registrations: [
      { id: 'reg-1', councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true },
    ],
    specialties: [{ id: 'spec-1', name: 'Ginecologia', registryNumber: '54321' }],
    bio: 'Atende gestantes.',
    createdAt: new Date(2026, 9, 20),
    updatedAt: new Date(2026, 9, 20),
    ...overrides,
  }) as IProfessionalModel

function render(props: Partial<React.ComponentProps<typeof ProfessionalForm>> = {}) {
  return renderWithProviders(
    <ProfessionalForm
      professional={null}
      isSubmitting={false}
      submitError={null}
      onSubmit={onSubmit}
      {...props}
    />,
  )
}

async function preencherRegistro() {
  await act(async () => {
    screen.getByTestId('professional-form-registration-number-0').props.onChangeText('12345')
    screen.getByTestId('professional-form-registration-state-0').props.onChangeText('sp')
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  useSessionStore.setState({
    status: 'authenticated',
    user: {
      id: 'u-1',
      fullName: 'Dra. Ana',
      email: 'a@b.c',
      role: UserRole.ADMIN,
      clinicId: 'c1',
    } as never,
  })
  mockSpecialties.mockResolvedValue({
    data: [
      { id: 'spec-1', name: 'Ginecologia' },
      { id: 'spec-2', name: 'Obstetrícia' },
    ],
    total: 2,
    page: 1,
    limit: 20,
  } as never)
  mockUsers.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 } as never)
})

describe('ProfessionalForm', () => {
  it('cria com nome, e-mail e registro', async () => {
    await render()
    await act(async () => {
      screen.getByTestId('professional-form-fullname').props.onChangeText('Mauro Lima')
      screen.getByTestId('professional-form-email').props.onChangeText('mauro@pulso.test')
    })
    await preencherRegistro()
    await act(async () => {
      fireEvent.press(screen.getByTestId('professional-form-submit'))
    })

    expect(onSubmit).toHaveBeenCalledWith({
      fullName: 'Mauro Lima',
      email: 'mauro@pulso.test',
      registrations: [
        { councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true },
      ],
      specialties: [],
      bio: undefined,
    })
  })

  it('não envia sem registro válido e aponta o erro', async () => {
    await render()
    await act(async () => {
      screen.getByTestId('professional-form-fullname').props.onChangeText('Mauro Lima')
      screen.getByTestId('professional-form-email').props.onChangeText('mauro@pulso.test')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('professional-form-submit'))
    })

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByTestId('professional-form-registrations-error')).toBeTruthy()
  })

  describe('registros', () => {
    it('acrescenta e remove um registro', async () => {
      await render()

      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-registration-add'))
      })
      expect(screen.getByTestId('professional-form-registration-1')).toBeTruthy()

      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-registration-remove-1'))
      })
      expect(screen.queryByTestId('professional-form-registration-1')).toBeNull()
    })

    // Com um registro só não há o que remover, e o backend exige pelo menos
    // um — o botão não aparece em vez de aparecer e falhar.
    it('o único registro não pode ser removido', async () => {
      await render()

      expect(screen.queryByTestId('professional-form-registration-remove-0')).toBeNull()
    })

    /**
     * Principal é um só. Marcar o segundo desmarca o primeiro, em vez de
     * mandar dois principais que o backend recusaria.
     */
    it('marcar um principal desmarca o outro', async () => {
      await render()
      await preencherRegistro()

      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-registration-add'))
      })
      await act(async () => {
        screen.getByTestId('professional-form-registration-number-1').props.onChangeText('999')
        screen.getByTestId('professional-form-registration-state-1').props.onChangeText('SP')
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-registration-primary-1'))
      })
      await act(async () => {
        screen.getByTestId('professional-form-fullname').props.onChangeText('Mauro Lima')
        screen.getByTestId('professional-form-email').props.onChangeText('mauro@pulso.test')
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-submit'))
      })

      const sent = onSubmit.mock.calls[0][0].registrations
      expect(sent.filter((r: { isPrimary: boolean }) => r.isPrimary)).toHaveLength(1)
      expect(sent[1].isPrimary).toBe(true)
    })

    /**
     * Remover o principal deixaria a ficha sem nenhum, e o backend recusa.
     * O primeiro que sobra assume.
     */
    it('remover o principal promove o primeiro que sobra', async () => {
      await render()
      await preencherRegistro()
      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-registration-add'))
      })
      await act(async () => {
        screen.getByTestId('professional-form-registration-number-1').props.onChangeText('999')
        screen.getByTestId('professional-form-registration-state-1').props.onChangeText('SP')
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-registration-remove-0'))
      })

      expect(screen.getByTestId('professional-form-registration-primary-0')).toHaveTextContent(
        /● Principal/,
      )
    })

    // O formato do número muda com o conselho: guardar o antigo deixaria um
    // CRM de seis dígitos dentro de um CREFITO.
    it('trocar o conselho limpa o número', async () => {
      await render()
      await preencherRegistro()

      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-registration-council-0'))
      })
      await act(async () => {
        fireEvent.press(
          await screen.findByTestId('professional-form-registration-council-0-option-crn'),
        )
      })

      expect(screen.getByTestId('professional-form-registration-number-0').props.value).toBe('')
    })
  })

  describe('especialidades', () => {
    it('marca e desmarca', async () => {
      await render()
      await preencherRegistro()
      await act(async () => {
        screen.getByTestId('professional-form-fullname').props.onChangeText('Mauro Lima')
        screen.getByTestId('professional-form-email').props.onChangeText('mauro@pulso.test')
      })

      await act(async () => {
        fireEvent.press(await screen.findByTestId('professional-form-specialty-spec-1'))
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-submit'))
      })
      expect(onSubmit.mock.calls[0][0].specialties).toEqual([{ specialtyId: 'spec-1' }])

      onSubmit.mockClear()
      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-specialty-spec-1'))
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-submit'))
      })
      expect(onSubmit.mock.calls[0][0].specialties).toEqual([])
    })

    /**
     * RQE é exclusivo da medicina. O campo só aparece quando o registro
     * **principal** é CRM — pedi-lo a um nutricionista seria pedir um dado
     * que não existe.
     */
    it('o RQE só aparece com CRM principal', async () => {
      await render()
      await act(async () => {
        fireEvent.press(await screen.findByTestId('professional-form-specialty-spec-1'))
      })
      expect(screen.getByTestId('professional-form-specialty-rqe-spec-1')).toBeTruthy()

      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-registration-council-0'))
      })
      await act(async () => {
        fireEvent.press(
          await screen.findByTestId('professional-form-registration-council-0-option-crn'),
        )
      })

      expect(screen.queryByTestId('professional-form-specialty-rqe-spec-1')).toBeNull()
    })

    it('o RQE com letra é recusado, dizendo por quê', async () => {
      await render()
      await preencherRegistro()
      await act(async () => {
        screen.getByTestId('professional-form-fullname').props.onChangeText('Mauro Lima')
        screen.getByTestId('professional-form-email').props.onChangeText('mauro@pulso.test')
      })
      await act(async () => {
        fireEvent.press(await screen.findByTestId('professional-form-specialty-spec-1'))
      })
      await act(async () => {
        screen.getByTestId('professional-form-specialty-rqe-spec-1').props.onChangeText('12a34')
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-submit'))
      })

      expect(onSubmit).not.toHaveBeenCalled()
      expect(screen.getByTestId('professional-form-specialties-error')).toHaveTextContent(
        /apenas dígitos/,
      )
    })

    // Apagar o RQE devolve a especialidade sem ele, e não com string vazia:
    // o backend trata `''` como valor, e a ficha ficaria com um RQE em
    // branco em vez de nenhum.
    it('apagar o RQE manda a especialidade sem ele', async () => {
      await render({ professional: existing() })
      await screen.findByTestId('professional-form-specialty-rqe-spec-1')

      await act(async () => {
        screen.getByTestId('professional-form-specialty-rqe-spec-1').props.onChangeText('')
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-submit'))
      })

      expect(onSubmit.mock.calls[0][0].specialties).toEqual([
        { specialtyId: 'spec-1', registryNumber: undefined },
      ])
    })

    // Especialidade cadastrada sem RQE abre o campo vazio, não com "null".
    it('especialidade sem RQE abre o campo vazio', async () => {
      await render({
        professional: existing({
          specialties: [{ id: 'spec-1', name: 'Ginecologia', registryNumber: null }] as never,
        }),
      })

      expect(
        (await screen.findByTestId('professional-form-specialty-rqe-spec-1')).props.value,
      ).toBe('')
    })

    /**
     * Escrever o RQE de uma especialidade não pode tocar na outra. Era o
     * caminho natural para o defeito de fechamento velho que o bloco de
     * endereço do paciente teve: mesclar a partir da prop, não do estado.
     */
    it('o RQE de uma especialidade não mexe na outra', async () => {
      await render()
      await preencherRegistro()
      await act(async () => {
        screen.getByTestId('professional-form-fullname').props.onChangeText('Mauro Lima')
        screen.getByTestId('professional-form-email').props.onChangeText('mauro@pulso.test')
      })
      await act(async () => {
        fireEvent.press(await screen.findByTestId('professional-form-specialty-spec-1'))
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-specialty-spec-2'))
      })
      await act(async () => {
        screen.getByTestId('professional-form-specialty-rqe-spec-2').props.onChangeText('54321')
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-submit'))
      })

      expect(onSubmit.mock.calls[0][0].specialties).toEqual([
        { specialtyId: 'spec-1' },
        { specialtyId: 'spec-2', registryNumber: '54321' },
      ])
    })

    it('diz quando a clínica não tem especialidade habilitada', async () => {
      mockSpecialties.mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 } as never)

      await render()

      expect(await screen.findByTestId('professional-form-specialties-empty')).toBeTruthy()
    })
  })

  describe('edição', () => {
    it('abre preenchido e salva com a situação', async () => {
      await render({ professional: existing() })

      expect(screen.getByTestId('professional-form-registration-number-0').props.value).toBe('12345')
      expect(screen.getByTestId('professional-form-bio').props.value).toBe('Atende gestantes.')

      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-submit'))
      })

      expect(onSubmit).toHaveBeenCalledWith({
        registrations: [
          { councilType: CouncilType.CRM, number: '12345', state: 'SP', isPrimary: true },
        ],
        specialties: [{ specialtyId: 'spec-1', registryNumber: '54321' }],
        bio: 'Atende gestantes.',
        isActive: true,
      })
    })

    it('não há escolha de usuário', async () => {
      await render({ professional: existing() })

      expect(screen.queryByTestId('professional-form-user-mode')).toBeNull()
      expect(screen.queryByTestId('professional-form-fullname')).toBeNull()
    })

    it('desativa a conta', async () => {
      await render({ professional: existing() })

      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-active-active'))
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-submit'))
      })

      expect(onSubmit.mock.calls[0][0].isActive).toBe(false)
    })
  })

  describe('usuário existente', () => {
    it('troca nome e e-mail pela busca', async () => {
      await render()

      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-user-mode-existing'))
      })

      expect(screen.queryByTestId('professional-form-fullname')).toBeNull()
      expect(screen.getByTestId('professional-form-user')).toBeTruthy()
    })

    /**
     * É assim que uma recepcionista que começou a atender vira profissional
     * sem perder o histórico: a ficha nasce sobre o usuário que já existe.
     */
    it('envia o userId escolhido', async () => {
      mockUsers.getAll.mockResolvedValue({
        data: [{ id: 'u-9', fullName: 'Joana Reis', email: 'joana@pulso.test' }],
        total: 1,
        page: 1,
        limit: 10,
      } as never)

      await render()
      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-user-mode-existing'))
      })
      await preencherRegistro()
      await act(async () => {
        screen.getByTestId('professional-form-user').props.onChangeText('Joana')
      })
      // O `findByTestId` fica **fora** do `act`: dentro dele os temporizadores
      // não avançam, e a espera de 300ms da busca nunca termina.
      const option = await screen.findByTestId('professional-form-user-option-u-9')
      await act(async () => {
        fireEvent.press(option)
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-submit'))
      })

      const sent = onSubmit.mock.calls[0][0]
      expect(sent.userId).toBe('u-9')
      expect(sent.fullName).toBeUndefined()
    })

    it('trocar limpa a escolha', async () => {
      mockUsers.getAll.mockResolvedValue({
        data: [{ id: 'u-9', fullName: 'Joana Reis', email: 'joana@pulso.test' }],
        total: 1,
        page: 1,
        limit: 10,
      } as never)

      await render()
      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-user-mode-existing'))
      })
      await act(async () => {
        screen.getByTestId('professional-form-user').props.onChangeText('Joana')
      })
      // O `findByTestId` fica **fora** do `act`: dentro dele os temporizadores
      // não avançam, e a espera de 300ms da busca nunca termina.
      const option = await screen.findByTestId('professional-form-user-option-u-9')
      await act(async () => {
        fireEvent.press(option)
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-user-clear'))
      })
      await preencherRegistro()
      await act(async () => {
        fireEvent.press(screen.getByTestId('professional-form-submit'))
      })

      expect(onSubmit).not.toHaveBeenCalled()
      expect(screen.getByTestId('professional-form-user-error')).toBeTruthy()
    })
  })

  it('a bio tem contador e limite', async () => {
    await render()

    await act(async () => {
      screen.getByTestId('professional-form-bio').props.onChangeText('a'.repeat(501))
    })
    await preencherRegistro()
    await act(async () => {
      screen.getByTestId('professional-form-fullname').props.onChangeText('Mauro Lima')
      screen.getByTestId('professional-form-email').props.onChangeText('mauro@pulso.test')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('professional-form-submit'))
    })

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByTestId('professional-form-bio-error')).toBeTruthy()
  })

  it.each([
    [409, /Já existe um cadastro/],
    [500, /Não foi possível salvar/],
  ])('explica o erro %s', async (status, expected) => {
    await render({ submitError: { status, title: 'x', detail: 'y' } })

    expect(screen.getByTestId('professional-form-error')).toHaveTextContent(expected)
  })

  /**
   * Sem clínica na sessão não há catálogo a buscar — e pedir
   * `/clinics/undefined/specialties` devolveria erro numa tela que ainda
   * nem foi usada.
   */
  it('sem clínica na sessão, não busca especialidade', async () => {
    useSessionStore.setState({
      status: 'authenticated',
      user: { id: 'u-1', fullName: 'A', email: 'a@b.c', role: UserRole.ADMIN } as never,
    })

    await render()

    expect(mockSpecialties).not.toHaveBeenCalled()
  })

  it('apaga o botão enquanto salva', async () => {
    await render({ isSubmitting: true })

    expect(screen.getByTestId('professional-form-submit')).toBeDisabled()
  })
})
