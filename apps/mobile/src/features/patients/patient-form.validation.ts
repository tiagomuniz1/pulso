import { hasAnyAddressValue, type IAddressFormValues } from '@app/shared'
import { isFutureDate, toIsoDate } from '../../lib/date-input'

/**
 * As regras do formulário de paciente, separadas da tela.
 *
 * As mesmas do zod da web (`patient-form.tsx`), escritas como função pura
 * porque o app não carrega zod nem react-hook-form — e porque validação que
 * mora dentro do componente só se testa renderizando.
 */
export interface IPatientFormValues {
  /** Na criação a pessoa escolhe entre criar o usuário ou reaproveitar um. */
  userMode: 'new' | 'existing'
  userId: string
  fullName: string
  email: string
  phoneNumber: string
  /** Como a pessoa digitou: DD/MM/AAAA. */
  birthDate: string
  documentNumber: string
  gender: string
  isDependent: boolean
  responsiblePatientId: string
  kinshipType: string
  address: IAddressFormValues
}

export type PatientFormErrors = Partial<Record<string, string>>

/**
 * O resultado da validação.
 *
 * Devolve a data já convertida para o formato da API junto com os erros, em
 * vez de deixar quem chama converter de novo: a segunda conversão precisaria
 * de um `?? ''` para o caso que a validação acabou de descartar — um ramo
 * que nenhum teste consegue alcançar e que esconderia um dia em que a
 * validação e a conversão discordassem.
 */
export interface IPatientFormValidation {
  errors: PatientFormErrors
  /** `null` quando a data não é válida — e aí `errors.birthDate` explica. */
  birthDate: string | null
}

const PHONE = /^\(\d{2}\) \d{4,5}-\d{4}$/
const DOCUMENT = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/
const ZIP_CODE = /^\d{5}-?\d{3}$/

/**
 * @param isEditing na edição não se troca o usuário, então o par
 * nome/e-mail é sempre pedido e o modo "usuário existente" não existe.
 */
export function validatePatientForm(
  values: IPatientFormValues,
  isEditing: boolean,
): IPatientFormValidation {
  const errors: PatientFormErrors = {}

  if (!isEditing && values.userMode === 'existing') {
    if (!values.userId) errors.userId = 'Selecione um usuário'
  } else {
    if (values.fullName.trim().length < 3) errors.fullName = 'Nome deve ter no mínimo 3 caracteres'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'E-mail inválido'
  }

  if (!PHONE.test(values.phoneNumber)) {
    errors.phoneNumber = 'Telefone inválido. Ex: (11) 99999-9999'
  }

  const isoBirthDate = toIsoDate(values.birthDate)
  if (!values.birthDate.trim()) {
    errors.birthDate = 'Data de nascimento obrigatória'
  } else if (!isoBirthDate) {
    errors.birthDate = 'Data inválida. Ex: 15/05/1990'
  } else if (isFutureDate(isoBirthDate)) {
    errors.birthDate = 'Data de nascimento não pode ser futura'
  }

  if (!values.gender) errors.gender = 'Selecione um gênero válido'

  /**
   * Dependente dispensa CPF e exige titular — é o caso do recém-nascido e do
   * menor sem documento emitido. Quem não é dependente precisa do CPF.
   */
  if (values.isDependent) {
    if (!values.responsiblePatientId) {
      errors.responsiblePatientId = 'Selecione o paciente titular'
    }
    if (!values.kinshipType) errors.kinshipType = 'Selecione o grau de parentesco'
  } else if (!DOCUMENT.test(values.documentNumber)) {
    errors.documentNumber = 'Documento deve ter 11 dígitos numéricos'
  }

  // O endereço é opcional em bloco: intocado passa, começado tem de
  // terminar. Meio endereço não entrega carta nenhuma.
  if (hasAnyAddressValue(values.address)) {
    const { street, number, neighborhood, city, state, zipCode } = values.address
    if (!street?.trim()) errors['address.street'] = 'Logradouro obrigatório'
    if (!number?.trim()) errors['address.number'] = 'Número obrigatório'
    if (!neighborhood?.trim()) errors['address.neighborhood'] = 'Bairro obrigatório'
    if (!city?.trim()) errors['address.city'] = 'Cidade obrigatória'
    if (!state?.trim()) errors['address.state'] = 'UF obrigatória'
    else if (state.trim().length !== 2) errors['address.state'] = 'UF deve ter 2 letras'
    if (!zipCode?.trim()) errors['address.zipCode'] = 'CEP obrigatório'
    else if (!ZIP_CODE.test(zipCode.trim())) errors['address.zipCode'] = 'CEP inválido. Ex: 00000-000'
  }

  return { errors, birthDate: isoBirthDate }
}
