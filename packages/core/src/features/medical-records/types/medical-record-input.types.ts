export interface ICreateMedicalRecordInput {
  appointmentId: string
  /** O modelo que o profissional escolheu. A consulta define o escopo; isto, qual dentro dele. */
  templateId: string
  data: Record<string, unknown>
  notes?: string
}

export interface IUpdateMedicalRecordInput {
  data?: Record<string, unknown>
  notes?: string
}
