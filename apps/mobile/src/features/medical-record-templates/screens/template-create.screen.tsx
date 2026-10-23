import { useRouter } from 'expo-router'
import { CouncilType, UserRole, getPrimaryCouncilType } from '@app/shared'
import { Screen, ScreenScroll } from '../../../components/ui/screen'
import { ScreenBar } from '../components/screen-bar'
import { useSessionStore } from '../../auth/session.store'
import { useMyProfessional } from '../../documents/hooks/use-can-issue.hook'
import { useClinicSpecialties } from '../../professionals/hooks/use-professionals.hook'
import { TemplateForm } from '../components/template-form'
import { useCreateTemplate } from '../hooks/use-medical-record-templates.hook'

/**
 * Criar um modelo de prontuário.
 *
 * **Escopo é escolhido aqui e nunca mais.** O ADMIN escolhe a profissão e,
 * se for Medicina, a especialidade; o profissional não escolhe profissão —
 * a dele vem da própria ficha, e confiar num seletor seria deixar o cliente
 * declarar o que o registro já diz.
 */
export function TemplateCreateScreen() {
  const router = useRouter()
  const role = useSessionStore((state) => state.user?.role)
  const clinicId = useSessionStore((state) => state.user?.clinicId)
  const isProfessional = role === UserRole.PROFESSIONAL

  const myProfessional = useMyProfessional()
  const { data: clinicSpecialties } = useClinicSpecialties(clinicId)

  const create = useCreateTemplate()

  const specialties =
    isProfessional && myProfessional
      ? myProfessional.specialties.map((specialty) => ({
          id: specialty.id,
          name: specialty.name,
        }))
      : (clinicSpecialties?.data ?? []).map((specialty) => ({
          id: specialty.specialtyId,
          name: specialty.name,
        }))

  /**
   * A profissão do profissional vem do registro dele.
   *
   * Sem ficha ainda carregada, CRM é o palpite — é o caso comum, e o
   * seletor de especialidade some sozinho quando a ficha chega dizendo
   * outra coisa, em vez de piscar escondido-e-visível no caminho comum.
   */
  const ownCouncilType = myProfessional
    ? getPrimaryCouncilType(myProfessional.registrations)
    : CouncilType.CRM

  return (
    <Screen testID="template-create-screen">
      <ScreenBar title="Novo modelo" onBack={() => router.back()} testID="template-create" />
      <ScreenScroll testID="template-create-content">
        <TemplateForm
          template={null}
          specialties={specialties}
          showProfession={!isProfessional}
          allowSpecialty={ownCouncilType === CouncilType.CRM}
          isPending={create.isPending}
          submitError={create.error ?? null}
          onCancel={() => router.back()}
          onSubmit={({ name, specialtyId, councilType, fields, sections }) =>
            create.mutate(
              {
                name,
                fields,
                sections,
                ...(specialtyId
                  ? { specialtyId }
                  : { councilType: isProfessional ? ownCouncilType : councilType }),
              },
              { onSuccess: (template) => router.replace(`/(app)/medical-record-templates/${template.id}`) },
            )
          }
        />
      </ScreenScroll>
    </Screen>
  )
}
