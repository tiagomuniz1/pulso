import { PatientGender } from '../enums/patient-gender.enum'

/**
 * Os rótulos de sexo da paciente.
 *
 * Estavam copiados em dois componentes da web, e o app precisaria de um
 * terceiro. Três cópias de um mapa de três entradas é onde uma delas fica
 * para trás quando o enum muda.
 */
export const PATIENT_GENDER_LABELS: Record<PatientGender, string> = {
  [PatientGender.MALE]: 'Masculino',
  [PatientGender.FEMALE]: 'Feminino',
  [PatientGender.OTHER]: 'Outro',
}
