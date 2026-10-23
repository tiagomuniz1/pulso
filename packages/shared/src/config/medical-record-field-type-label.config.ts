import { MedicalRecordFieldType } from '../enums/medical-record-field-type.enum'

/**
 * Os rótulos dos tipos de campo de prontuário.
 *
 * Estavam copiados em **cinco** componentes da web — três do construtor de
 * modelos e dois do catálogo canônico do backoffice — e o app precisaria de
 * um sexto. Duas das cópias já tinham divergido na forma: escreviam as
 * chaves como literais (`textarea:`) em vez do enum, o que as deixava
 * mudas quando um tipo novo entrasse.
 */
export const MEDICAL_RECORD_FIELD_TYPE_LABELS: Record<MedicalRecordFieldType, string> = {
  [MedicalRecordFieldType.TEXT]: 'Texto',
  [MedicalRecordFieldType.TEXTAREA]: 'Texto longo',
  [MedicalRecordFieldType.NUMBER]: 'Número',
  [MedicalRecordFieldType.BOOLEAN]: 'Sim/Não',
  [MedicalRecordFieldType.DATE]: 'Data',
  [MedicalRecordFieldType.SELECT]: 'Seleção única',
  [MedicalRecordFieldType.MULTISELECT]: 'Seleção múltipla',
}
