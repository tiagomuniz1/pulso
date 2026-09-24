import { MedicalRecordFieldType } from '@app/shared'
import { MedicalRecordTemplateField } from '../../../modules/medical-record-templates/entities/medical-record-template.entity'

/**
 * Os quatro formulários que a clínica usava no IClinic, reconstruídos a partir
 * do próprio export (campo `tab` de cada bloco do prontuário).
 *
 * Decisões que valem para os quatro:
 *
 * - **Todo campo é opcional.** Prontuário importado quase nunca tem todos os
 *   campos preenchidos, e um `required` travaria a primeira edição.
 * - **`key` vem do rótulo original**, mesmo quando o rótulo tinha erro de
 *   digitação ("Queixa Princial", "EXAMES COMPLENTARES"): é a chave que casa o
 *   bloco do export com o campo do modelo. O `label` sai corrigido.
 * - **CID e IMC viram `textarea`.** `multiselect` exigiria congelar a lista de
 *   opções, e a próxima paciente teria um CID que o modelo não conhece.
 */

export interface IClinicTemplateDefinition {
  /** Valor do campo `tab` no export — é por ele que o prontuário acha o modelo. */
  tab: string
  /** Nome no Pulso. Único por escopo (clínica + especialidade), sem caixa. */
  name: string
  /** A quem pertence: a clínica principal ou a de ortopedia. */
  scope: 'main' | 'orthopedics'
  fields: MedicalRecordTemplateField[]
}

function field(
  key: string,
  label: string,
  type: MedicalRecordFieldType,
  order: number,
): MedicalRecordTemplateField {
  return {
    key,
    label,
    type,
    required: false,
    order,
    options: null,
    placeholder: null,
    helpText: null,
    canonical: false,
    canonicalKey: null,
    sectionKey: null,
  }
}

const TEXTAREA = MedicalRecordFieldType.TEXTAREA
const TEXT = MedicalRecordFieldType.TEXT
const DATE = MedicalRecordFieldType.DATE

export const ICLINIC_TEMPLATES: IClinicTemplateDefinition[] = [
  {
    tab: 'ATENDIMENTO 1 PRÉ-NATAL',
    name: 'Atendimento 1 Pré-Natal',
    scope: 'main',
    fields: [
      field('informacoes_pessoais', 'Informações Pessoais', TEXTAREA, 0),
      field('historia_obstetrica', 'História Obstétrica', TEXTAREA, 1),
      field('carteira_de_vacinacao', 'Carteira de Vacinação', TEXTAREA, 2),
      field('historico_ginecologico', 'Histórico Ginecológico', TEXTAREA, 3),
      field('historico_obstetrico_familiar', 'Histórico Obstétrico Familiar', TEXTAREA, 4),
      field('historia_pregressa_e_social', 'História Pregressa e Social', TEXTAREA, 5),
      field('avaliacao_odontologica', 'Avaliação Odontológica', TEXT, 6),
      field('medicacoes_em_uso', 'Medicações em Uso', TEXTAREA, 7),
      field('alergias', 'Alergias', TEXT, 8),
      field('queixa_principal', 'Queixa principal', TEXT, 9),
      field('calculo_imc', 'Cálculo IMC', TEXTAREA, 10),
      field('hipotese_diagnostica', 'Hipótese diagnóstica', TEXTAREA, 11),
      field('exame_fisico', 'Exame físico', TEXTAREA, 12),
      field('exames_complementares', 'Exames Complementares', TEXTAREA, 13),
      field('condutas', 'Condutas', TEXTAREA, 14),
      field('historia_da_molestia_atual', 'História da moléstia atual', TEXTAREA, 15),
    ],
  },
  {
    tab: 'ATENDIMENTO CONSULTAS PRÉ-NATAL',
    name: 'Atendimento Consultas Pré-Natal',
    scope: 'main',
    fields: [
      field('data', 'Data', DATE, 0),
      field('informacoes_da_gestacao', 'Informações da gestação', TEXTAREA, 1),
      field('nome_do_acompanhante', 'Nome do acompanhante', TEXT, 2),
      field('exame_fisico', 'Exame físico', TEXTAREA, 3),
      field('medicacoes_em_uso', 'Medicações em uso', TEXTAREA, 4),
      field('queixas', 'Queixas', TEXTAREA, 5),
      field('exames_complentares', 'Exames complementares', TEXTAREA, 6),
      field('conduta', 'Conduta', TEXTAREA, 7),
    ],
  },
  {
    tab: 'ATENDIMENTO GINECOLOGICO',
    name: 'Atendimento Ginecológico',
    scope: 'main',
    fields: [
      field('identificacao_da_paciente', 'Identificação da Paciente', TEXTAREA, 0),
      field('historia_ginecologica', 'História Ginecológica', TEXTAREA, 1),
      field('historico_obstetrico', 'Histórico Obstétrico', TEXTAREA, 2),
      field('historico_familiar', 'Histórico Familiar', TEXTAREA, 3),
      field('historia_pregressa_e_social', 'História Pregressa e Social', TEXTAREA, 4),
      field('medicacoes_em_uso', 'Medicações em Uso', TEXTAREA, 5),
      field('alergia', 'Alergia', TEXTAREA, 6),
      field('queixa_princial', 'Queixa Principal', TEXTAREA, 7),
      field('historia_da_doenca_atual', 'História da Doença Atual', TEXTAREA, 8),
      field('exame_fisico', 'Exame Físico', TEXTAREA, 9),
      field('exames_complementares', 'Exames Complementares', TEXTAREA, 10),
      field('conduta', 'Conduta', TEXTAREA, 11),
    ],
  },
  {
    tab: 'CONSULTA ORTOPEDIA',
    name: 'Consulta Ortopedia',
    scope: 'orthopedics',
    fields: [
      field('informacoes_paciente', 'Informações do paciente', TEXTAREA, 0),
      field('historia_da_doenca_atual', 'História da doença atual', TEXTAREA, 1),
      field('exames_complementares', 'Exames complementares', TEXTAREA, 2),
      field('comorbidades_e_alergias', 'Comorbidades e alergias', TEXTAREA, 3),
      field('conduta', 'Conduta', TEXTAREA, 4),
      field('exame_fisico', 'Exame físico', TEXTAREA, 5),
    ],
  },
]

/** Rótulo do bloco no export → `key` do campo, por `tab`. */
export const FIELD_KEY_BY_TAB_AND_LABEL: Record<string, Record<string, string>> = {
  'ATENDIMENTO 1 PRÉ-NATAL': {
    'Informações Pessoais': 'informacoes_pessoais',
    'História Obstetrica': 'historia_obstetrica',
    'Carteira de Vacinação': 'carteira_de_vacinacao',
    'Histórico Ginecologico': 'historico_ginecologico',
    'Histórico Obstétrico Familiar': 'historico_obstetrico_familiar',
    'História Pregressa e Social': 'historia_pregressa_e_social',
    'Avaliação Odontologica': 'avaliacao_odontologica',
    'Medicações em Uso': 'medicacoes_em_uso',
    Alergias: 'alergias',
    'Queixa principal:': 'queixa_principal',
    'Cálculo IMC:': 'calculo_imc',
    'Hipótese diagnóstica:': 'hipotese_diagnostica',
    'Exame fisico:': 'exame_fisico',
    'Exames Complementares': 'exames_complementares',
    'Condutas:': 'condutas',
    'História da moléstia atual:': 'historia_da_molestia_atual',
  },
  'ATENDIMENTO CONSULTAS PRÉ-NATAL': {
    DATA: 'data',
    'INFORMAÇÕES DA GESTAÇÃO': 'informacoes_da_gestacao',
    'NOME DO ACOMPANHANTE': 'nome_do_acompanhante',
    'EXAME FÍSICO': 'exame_fisico',
    'MEDICAÇÕES EM USO': 'medicacoes_em_uso',
    QUEIXAS: 'queixas',
    'EXAMES COMPLENTARES': 'exames_complentares',
    CONDUTA: 'conduta',
  },
  'ATENDIMENTO GINECOLOGICO': {
    'Identificação da Paciente': 'identificacao_da_paciente',
    'História Ginecologica': 'historia_ginecologica',
    'Histórico Obstétrico': 'historico_obstetrico',
    'Histórico Familiar': 'historico_familiar',
    'História Pregressa e Social': 'historia_pregressa_e_social',
    'Medicações em Uso': 'medicacoes_em_uso',
    Alergia: 'alergia',
    'Queixa Princial': 'queixa_princial',
    'História da Doença Atual': 'historia_da_doenca_atual',
    'Exame Físico': 'exame_fisico',
    'Exames Complementares': 'exames_complementares',
    Conduta: 'conduta',
  },
  'CONSULTA ORTOPEDIA': {
    'INFORMAÇÕES PACIENTE': 'informacoes_paciente',
    'HISTÓRIA DA DOENÇA ATUAL': 'historia_da_doenca_atual',
    'EXAMES COMPLEMENTARES': 'exames_complementares',
    'COMORBIDADES E ALERGIAS': 'comorbidades_e_alergias',
    CONDUTA: 'conduta',
    'EXAME FÍSICO': 'exame_fisico',
  },
}
