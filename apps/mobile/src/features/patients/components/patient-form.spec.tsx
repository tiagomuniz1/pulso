import { KinshipType, PatientGender } from '@app/shared'
import { patientsService, userService, type IPatientModel } from '@app/core'
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native'
import { renderWithProviders } from '../../../tests/render-with-providers'
import { PatientForm } from './patient-form'

jest.mock('@app/core/src/features/patients/services/patients.service')
jest.mock('@app/core/src/features/users/services/users.service')

const mockPatients = patientsService as jest.Mocked<typeof patientsService>
const mockUsers = userService as jest.Mocked<typeof userService>

const onSubmit = jest.fn()

const existing = (overrides: Partial<IPatientModel> = {}): IPatientModel =>
  ({
    id: 'pat-1',
    fullName: 'Ana Paula Souza',
    email: 'ana@pulso.test',
    phoneNumber: '11999998888',
    birthDate: new Date(1990, 4, 15),
    documentNumber: '92115862811',
    gender: PatientGender.FEMALE,
    responsiblePatientId: null,
    kinshipType: null,
    responsiblePatient: null,
    dependents: [],
    address: null,
    createdAt: new Date(2026, 9, 15),
    updatedAt: new Date(2026, 9, 15),
    ...overrides,
  }) as IPatientModel

function render(props: Partial<React.ComponentProps<typeof PatientForm>> = {}) {
  return renderWithProviders(
    <PatientForm
      patient={null}
      isSubmitting={false}
      submitError={null}
      onSubmit={onSubmit}
      {...props}
    />,
  )
}

/**
 * Preenche o formulário todo de uma vez.
 *
 * Num `act` só, de propósito: `fireEvent` seguidos produzem chamadas de
 * `act()` sobrepostas, que corrompem os testes seguintes do arquivo.
 */
async function fill(overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    'patient-form-fullname': 'Ana Paula Souza',
    'patient-form-email': 'ana@pulso.test',
    'patient-form-phone': '11999998888',
    'patient-form-birthdate': '15051990',
    'patient-form-document': '92115862811',
    ...overrides,
  }

  await act(async () => {
    Object.entries(values).forEach(([testID, value]) => {
      const field = screen.queryByTestId(testID)
      if (field) field.props.onChangeText(value)
    })
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockPatients.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 } as never)
  mockUsers.getAll.mockResolvedValue({ data: [], total: 0, page: 1, limit: 10 } as never)
})

describe('PatientForm', () => {
  it('cria o paciente com o que foi digitado', async () => {
    await render()
    await fill()
    await act(async () => {
      fireEvent.press(screen.getByTestId('patient-form-gender-female'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('patient-form-submit'))
    })

    expect(onSubmit).toHaveBeenCalledWith({
      fullName: 'Ana Paula Souza',
      email: 'ana@pulso.test',
      phoneNumber: '(11) 99999-8888',
      birthDate: '1990-05-15',
      gender: PatientGender.FEMALE,
      // Só dígitos: o backend pede `/^\d{11}$/` e devolve `400` para o
      // valor mascarado. Este teste já afirmou o mascarado uma vez, e com
      // ele verde o cadastro de paciente falhava sempre no celular.
      documentNumber: '92115862811',
      responsiblePatientId: undefined,
      kinshipType: undefined,
      address: undefined,
    })
  })

  // As máscaras são do `@app/shared`, as mesmas da web: o backend recebe o
  // formato que ele espera, e quem digita vê o formato que reconhece.
  it('aplica máscara no telefone, no CPF e na data', async () => {
    await render()
    await fill()

    expect(screen.getByTestId('patient-form-phone').props.value).toBe('(11) 99999-8888')
    expect(screen.getByTestId('patient-form-document').props.value).toBe('921.158.628-11')
    expect(screen.getByTestId('patient-form-birthdate').props.value).toBe('15/05/1990')
  })

  it('não envia nada quando falta campo, e mostra onde', async () => {
    await render()

    await act(async () => {
      fireEvent.press(screen.getByTestId('patient-form-submit'))
    })

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByTestId('patient-form-fullname-error')).toBeTruthy()
    expect(screen.getByTestId('patient-form-email-error')).toBeTruthy()
    expect(screen.getByTestId('patient-form-phone-error')).toBeTruthy()
    expect(screen.getByTestId('patient-form-birthdate-error')).toBeTruthy()
    expect(screen.getByTestId('patient-form-gender-error')).toBeTruthy()
  })

  it('o formulário de edição abre preenchido', async () => {
    await render({ patient: existing() })

    expect(screen.getByTestId('patient-form-fullname').props.value).toBe('Ana Paula Souza')
    expect(screen.getByTestId('patient-form-phone').props.value).toBe('(11) 99999-8888')
    expect(screen.getByTestId('patient-form-birthdate').props.value).toBe('15/05/1990')
    expect(screen.getByTestId('patient-form-document').props.value).toBe('921.158.628-11')
  })

  it('editando, o endereço cadastrado vem preenchido', async () => {
    await render({
      patient: existing({
        address: {
          street: 'Rua das Flores',
          number: '123',
          complement: null,
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01000-000',
          country: 'BR',
        } as never,
      }),
    })

    expect(screen.getByTestId('patient-form-address-street').props.value).toBe('Rua das Flores')
    expect(screen.getByTestId('patient-form-address-city').props.value).toBe('São Paulo')
    // `null` no banco vira string vazia no campo — `null` num `TextInput`
    // controlado o torna não controlado, e aí o campo para de responder.
    expect(screen.getByTestId('patient-form-address-complement').props.value).toBe('')
  })

  it('editando, o botão muda de nome e não há escolha de usuário', async () => {
    await render({ patient: existing() })

    expect(screen.getByTestId('patient-form-submit')).toHaveTextContent(/Salvar alterações/)
    expect(screen.queryByTestId('patient-form-user-mode')).toBeNull()
  })

  it('criando, o botão diz criar', async () => {
    await render()

    expect(screen.getByTestId('patient-form-submit')).toHaveTextContent(/Criar paciente/)
  })

  describe('dependente', () => {
    it('troca o CPF pelo titular e pelo parentesco', async () => {
      await render()

      await act(async () => {
        fireEvent.press(screen.getByTestId('patient-form-dependent-dependent'))
      })

      expect(screen.queryByTestId('patient-form-document')).toBeNull()
      expect(screen.getByTestId('patient-form-responsible')).toBeTruthy()
      expect(screen.getByTestId('patient-form-kinship')).toBeTruthy()
    })

    // O CPF ao lado do nome é o que distingue dois "Maria Souza" na mesma
    // clínica. Titular sem CPF — ele próprio um dependente promovido — não
    // ganha parêntese vazio.
    it.each([
      ['com CPF', '92115862811', /Maria Souza \(921\.158\.628-11\)/],
      ['sem CPF', null, /^Maria SouzaTrocar$/],
    ])('o titular já vinculado aparece %s', async (_caso, documentNumber, expected) => {
      await render({
        patient: existing({
          responsiblePatientId: 'pat-9',
          kinshipType: KinshipType.FILHO,
          responsiblePatient: { id: 'pat-9', fullName: 'Maria Souza', documentNumber },
          documentNumber: null,
        }),
      })

      expect(screen.getByTestId('patient-form-responsible-selected')).toHaveTextContent(expected)
    })

    /**
     * Editar um dependente mantendo o vínculo manda o titular, não `null`.
     * É o caminho oposto ao de desfazer, e os dois saem da mesma linha.
     */
    it('editando um dependente, o vínculo é mantido', async () => {
      await render({
        patient: existing({
          responsiblePatientId: 'pat-9',
          kinshipType: KinshipType.FILHO,
          responsiblePatient: { id: 'pat-9', fullName: 'Maria Souza', documentNumber: null },
          documentNumber: null,
        }),
      })

      await act(async () => {
        fireEvent.press(screen.getByTestId('patient-form-submit'))
      })

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          responsiblePatientId: 'pat-9',
          kinshipType: KinshipType.FILHO,
        }),
      )
    })

    it('titular sem CPF na busca não mostra dica', async () => {
      mockPatients.getAll.mockResolvedValue({
        data: [{ id: 'pat-9', user: { fullName: 'Maria Souza' }, documentNumber: null }],
        total: 1,
        page: 1,
        limit: 10,
      } as never)

      await render()
      await act(async () => {
        fireEvent.press(screen.getByTestId('patient-form-dependent-dependent'))
      })
      await act(async () => {
        screen.getByTestId('patient-form-responsible').props.onChangeText('Maria')
      })

      expect(await screen.findByTestId('patient-form-responsible-option-pat-9')).toHaveTextContent(
        /^Maria Souza$/,
      )
    })

    it('busca o titular e envia o vínculo', async () => {
      mockPatients.getAll.mockResolvedValue({
        data: [
          { id: 'pat-9', user: { fullName: 'Maria Souza' }, documentNumber: '92115862811' },
        ],
        total: 1,
        page: 1,
        limit: 10,
      } as never)

      await render()
      await act(async () => {
        fireEvent.press(screen.getByTestId('patient-form-dependent-dependent'))
      })
      await fill({ 'patient-form-birthdate': '01012026' })

      await act(async () => {
        screen.getByTestId('patient-form-responsible').props.onChangeText('Maria')
      })
      await act(async () => {
        jest.advanceTimersByTime(0)
      })

      const option = await screen.findByTestId('patient-form-responsible-option-pat-9')
      await act(async () => {
        fireEvent.press(option)
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('patient-form-kinship-filho'))
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('patient-form-gender-female'))
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('patient-form-submit'))
      })

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          documentNumber: undefined,
          responsiblePatientId: 'pat-9',
          kinshipType: KinshipType.FILHO,
        }),
      )
    })

    /**
     * "Trocar" tem de limpar o id junto com o rótulo. Limpar só o que
     * aparece deixaria o formulário enviando o titular antigo com o campo
     * em branco — o pior dos dois mundos.
     */
    it('trocar o titular limpa a escolha', async () => {
      await render({
        patient: existing({
          responsiblePatientId: 'pat-9',
          kinshipType: KinshipType.FILHO,
          responsiblePatient: { id: 'pat-9', fullName: 'Maria Souza', documentNumber: null },
          documentNumber: null,
        }),
      })

      expect(screen.getByTestId('patient-form-responsible-selected')).toHaveTextContent(
        /Maria Souza/,
      )

      await act(async () => {
        fireEvent.press(screen.getByTestId('patient-form-responsible-clear'))
      })
      await fill({})
      await act(async () => {
        fireEvent.press(screen.getByTestId('patient-form-submit'))
      })

      expect(onSubmit).not.toHaveBeenCalled()
      expect(screen.getByTestId('patient-form-responsible-error')).toBeTruthy()
    })

    /**
     * O titular é buscado entre quem **não** é dependente e fora o próprio
     * paciente: um dependente não pode ser titular de outro, e ninguém pode
     * depender de si mesmo.
     */
    it('exclui dependentes e o próprio paciente da busca de titular', async () => {
      await render({ patient: existing() })

      await act(async () => {
        fireEvent.press(screen.getByTestId('patient-form-dependent-dependent'))
      })
      await act(async () => {
        screen.getByTestId('patient-form-responsible').props.onChangeText('Maria')
      })

      await waitFor(() =>
        expect(mockPatients.getAll).toHaveBeenCalledWith({
          search: 'Maria',
          excludeDependents: true,
          excludeId: 'pat-1',
          limit: 10,
        }),
      )
    })

    /**
     * Desfazer o vínculo manda `null`, não `undefined`: para o backend
     * `undefined` é "não mexa neste campo", e o dependente continuaria
     * dependente.
     */
    it('desfazer o vínculo manda null', async () => {
      await render({
        patient: existing({
          responsiblePatientId: 'pat-9',
          kinshipType: KinshipType.FILHO,
          responsiblePatient: { id: 'pat-9', fullName: 'Maria Souza', documentNumber: null },
          documentNumber: null,
        }),
      })

      await act(async () => {
        fireEvent.press(screen.getByTestId('patient-form-dependent-dependent'))
      })
      await fill({})
      await act(async () => {
        fireEvent.press(screen.getByTestId('patient-form-submit'))
      })

      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ responsiblePatientId: null, kinshipType: null }),
      )
    })
  })

  describe('usuário existente', () => {
    it('troca nome e e-mail pela busca de usuário', async () => {
      await render()

      await act(async () => {
        fireEvent.press(screen.getByTestId('patient-form-user-mode-existing'))
      })

      expect(screen.queryByTestId('patient-form-fullname')).toBeNull()
      expect(screen.getByTestId('patient-form-user')).toBeTruthy()
    })

    it('trocar o usuário limpa a escolha', async () => {
      mockUsers.getAll.mockResolvedValue({
        data: [{ id: 'u-9', fullName: 'João Silva', email: 'joao@pulso.test' }],
        total: 1,
        page: 1,
        limit: 10,
      } as never)

      await render()
      await act(async () => {
        fireEvent.press(screen.getByTestId('patient-form-user-mode-existing'))
      })
      await act(async () => {
        screen.getByTestId('patient-form-user').props.onChangeText('João')
      })
      const option = await screen.findByTestId('patient-form-user-option-u-9')
      await act(async () => {
        fireEvent.press(option)
      })

      await act(async () => {
        fireEvent.press(screen.getByTestId('patient-form-user-clear'))
      })
      await fill()
      await act(async () => {
        fireEvent.press(screen.getByTestId('patient-form-gender-female'))
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('patient-form-submit'))
      })

      expect(onSubmit).not.toHaveBeenCalled()
      expect(screen.getByTestId('patient-form-user-error')).toBeTruthy()
    })

    it('envia o userId escolhido, sem nome nem e-mail', async () => {
      mockUsers.getAll.mockResolvedValue({
        data: [{ id: 'u-9', fullName: 'João Silva', email: 'joao@pulso.test' }],
        total: 1,
        page: 1,
        limit: 10,
      } as never)

      await render()
      await act(async () => {
        fireEvent.press(screen.getByTestId('patient-form-user-mode-existing'))
      })
      await fill()
      await act(async () => {
        screen.getByTestId('patient-form-user').props.onChangeText('João')
      })

      const option = await screen.findByTestId('patient-form-user-option-u-9')
      await act(async () => {
        fireEvent.press(option)
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('patient-form-gender-female'))
      })
      await act(async () => {
        fireEvent.press(screen.getByTestId('patient-form-submit'))
      })

      const sent = onSubmit.mock.calls[0][0]
      expect(sent.userId).toBe('u-9')
      expect(sent.fullName).toBeUndefined()
      expect(sent.email).toBeUndefined()
    })
  })

  it('envia o endereço normalizado quando preenchido', async () => {
    await render()
    await fill()

    await act(async () => {
      screen.getByTestId('patient-form-address-street').props.onChangeText('Rua das Flores')
      screen.getByTestId('patient-form-address-number').props.onChangeText('123')
      screen.getByTestId('patient-form-address-neighborhood').props.onChangeText('Centro')
      screen.getByTestId('patient-form-address-city').props.onChangeText('São Paulo')
      screen.getByTestId('patient-form-address-complement').props.onChangeText('Apto 42')
      screen.getByTestId('patient-form-address-state').props.onChangeText('sp')
      screen.getByTestId('patient-form-address-zipcode').props.onChangeText('01000000')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('patient-form-gender-female'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('patient-form-submit'))
    })

    expect(onSubmit.mock.calls[0][0].address).toEqual({
      street: 'Rua das Flores',
      number: '123',
      complement: 'Apto 42',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01000-000',
      country: 'BR',
    })
  })

  /**
   * A UF sobe para maiúsculas **enquanto se digita**, e não só no envio.
   *
   * O `toNormalizedAddress` do `@app/shared` já normaliza o que vai para a
   * API, então o defeito aqui não apareceria no corpo da requisição — só na
   * tela, como um "sp" que a pessoa vê e desconfia. É o que esta linha faz,
   * e é o que este teste olha.
   */
  it('a UF aparece em maiúsculas e para em duas letras', async () => {
    await render()

    await act(async () => {
      screen.getByTestId('patient-form-address-state').props.onChangeText('spq')
    })

    expect(screen.getByTestId('patient-form-address-state').props.value).toBe('SP')
  })

  it('endereço pela metade não envia e aponta o que falta', async () => {
    await render()
    await fill()

    await act(async () => {
      screen.getByTestId('patient-form-address-city').props.onChangeText('São Paulo')
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('patient-form-gender-female'))
    })
    await act(async () => {
      fireEvent.press(screen.getByTestId('patient-form-submit'))
    })

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByTestId('patient-form-address-street-error')).toBeTruthy()
  })

  it('explica o conflito de e-mail ou documento', async () => {
    await render({ submitError: { status: 409, title: 'x', detail: 'y' } })

    expect(screen.getByTestId('patient-form-error')).toHaveTextContent(/Já existe um cadastro/)
  })

  it('avisa genericamente nos outros erros', async () => {
    await render({ submitError: { status: 500, title: 'x', detail: 'y' } })

    expect(screen.getByTestId('patient-form-error')).toHaveTextContent(/Não foi possível salvar/)
  })

  it('apaga o botão enquanto salva', async () => {
    await render({ isSubmitting: true })

    expect(screen.getByTestId('patient-form-submit')).toBeDisabled()
  })
})
