import { primaryProfessionLabel, primaryRegistrationLabel, type IProfessionalModel } from '@app/core'
import { ListCard, ListCardAction, ListCardActionSpacer } from '../../../components/ui/list-card'
import { Badge } from '../../../components/ui/list-screen'

export function ProfessionalCard({
  professional,
  canManage,
  onOpen,
  onEdit,
  onDelete,
  onAppointments,
}: {
  professional: IProfessionalModel
  /** Criar, editar e excluir ficha são do ADMIN. */
  canManage: boolean
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
  onAppointments: () => void
}) {
  const specialties = professional.specialties

  return (
    <ListCard
      testID={`professional-card-${professional.id}`}
      title={professional.user.fullName}
      subtitle={professional.user.email}
      rows={[
        { label: 'Tipo', value: primaryProfessionLabel(professional.registrations) },
        { label: 'Registro', value: primaryRegistrationLabel(professional.registrations) },
        {
          label: 'Especialidade',
          value:
            specialties.length === 0 ? (
              '—'
            ) : (
              <Badge
                label={
                  specialties.length === 1
                    ? specialties[0].name
                    : `${specialties[0].name} +${specialties.length - 1}`
                }
                tone="accent"
              />
            ),
        },
      ]}
      actions={
        <>
          {canManage ? (
            <>
              <ListCardAction
                label="Excluir"
                tone="danger"
                onPress={onDelete}
                testID={`professional-card-delete-${professional.id}`}
              />
              <ListCardAction
                label="Editar"
                onPress={onEdit}
                testID={`professional-card-edit-${professional.id}`}
              />
            </>
          ) : null}
          <ListCardAction
            label="Consultas"
            onPress={onAppointments}
            testID={`professional-card-appointments-${professional.id}`}
          />
          <ListCardActionSpacer />
          <ListCardAction
            label="Ver detalhes ›"
            onPress={onOpen}
            testID={`professional-card-open-${professional.id}`}
          />
        </>
      }
    />
  )
}
