import { PATIENT_GENDER_LABELS, formatPhone } from '@app/shared'
import type { IPatientModel } from '@app/core'
import { ListCard, ListCardAction, ListCardActionSpacer } from '../../../components/ui/list-card'

/** 15/05/1990 — o mesmo formato curto que a lista da web usa. */
export function formatShortDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function PatientCard({
  patient,
  canManage,
  onOpen,
  onEdit,
  onDelete,
  onAppointments,
}: {
  patient: IPatientModel
  /**
   * Criar, editar e excluir paciente são exclusivos do ADMIN. A recepção tem
   * a lista no menu por desenho, e oferecer-lhe os três botões faria cada
   * toque terminar em `403`.
   */
  canManage: boolean
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
  onAppointments: () => void
}) {
  return (
    <ListCard
      testID={`patient-card-${patient.id}`}
      title={patient.fullName}
      subtitle={patient.email}
      rows={[
        { label: 'Telefone', value: formatPhone(patient.phoneNumber) },
        { label: 'Nascimento', value: formatShortDate(patient.birthDate) },
        { label: 'Gênero', value: PATIENT_GENDER_LABELS[patient.gender] },
      ]}
      actions={
        <>
          {canManage ? (
            <>
              <ListCardAction
                label="Excluir"
                tone="danger"
                onPress={onDelete}
                testID={`patient-card-delete-${patient.id}`}
              />
              <ListCardAction
                label="Editar"
                onPress={onEdit}
                testID={`patient-card-edit-${patient.id}`}
              />
            </>
          ) : null}
          <ListCardAction
            label="Consultas"
            onPress={onAppointments}
            testID={`patient-card-appointments-${patient.id}`}
          />
          <ListCardActionSpacer />
          <ListCardAction
            label="Ver detalhes ›"
            onPress={onOpen}
            testID={`patient-card-open-${patient.id}`}
          />
        </>
      }
    />
  )
}
