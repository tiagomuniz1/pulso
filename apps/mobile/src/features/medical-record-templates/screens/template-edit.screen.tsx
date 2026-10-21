import { useLocalSearchParams, useRouter } from 'expo-router'
import { ErrorState, LoadingState, Screen, ScreenScroll } from '../../../components/ui/screen'
import { ScreenBar } from '../components/screen-bar'
import { TemplateForm } from '../components/template-form'
import { useTemplate, useUpdateTemplate } from '../hooks/use-medical-record-templates.hook'

/**
 * Editar um modelo.
 *
 * O escopo não aparece: mudar a especialidade de um modelo que já tem
 * prontuários mudaria a quem eles pertencem, e o backend não aceita.
 */
export function TemplateEditScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const { data: template, isPending, isError, refetch } = useTemplate(id)
  const update = useUpdateTemplate(id)

  return (
    <Screen testID="template-edit-screen">
      <ScreenBar title="Editar modelo" onBack={() => router.back()} testID="template-edit" />

      {isPending ? <LoadingState testID="template-edit-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="template-edit-error"
          message="Não foi possível carregar o modelo."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isPending && !isError && template ? (
        <ScreenScroll testID="template-edit-content">
          <TemplateForm
            template={template}
            specialties={[]}
            showProfession={false}
            allowSpecialty={false}
            isPending={update.isPending}
            submitError={update.error ?? null}
            onCancel={() => router.back()}
            onSubmit={({ name, fields, sections }) =>
              update.mutate({ name, fields, sections }, { onSuccess: () => router.back() })
            }
          />
        </ScreenScroll>
      ) : null}
    </Screen>
  )
}
