import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { UserRole } from '@app/shared'
import { ConfirmSheet } from '../../../components/ui/confirm-sheet'
import { ErrorState, LoadingState, Screen, ScreenScroll } from '../../../components/ui/screen'
import { useTheme } from '../../../theme/theme-context'
import { useSessionStore } from '../../auth/session.store'
import { TemplateDetails } from '../components/template-details'
import { useDeleteTemplate, useTemplate } from '../hooks/use-medical-record-templates.hook'

/**
 * Um modelo em leitura.
 *
 * Editar e excluir são do ADMIN — o modelo é da clínica, e mexer nele muda
 * o formulário de todos os colegas da especialidade. O profissional chega
 * aqui para conferir o que vai preencher.
 */
export function TemplateDetailsScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const role = useSessionStore((state) => state.user?.role)
  const canManage = role === UserRole.ADMIN

  const [isDeleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data: template, isPending, isError, refetch } = useTemplate(id)
  const remove = useDeleteTemplate()

  function confirmDelete() {
    remove.mutate(id, {
      onSuccess: () => {
        setDeleting(false)
        router.back()
      },
      onError: () => {
        setDeleting(false)
        setDeleteError('Não foi possível excluir o modelo. Tente novamente.')
      },
    })
  }

  return (
    <Screen testID="template-details-screen">
      <View style={[styles.bar, { borderColor: theme.line }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={12}
          testID="template-details-back"
          style={styles.back}
        >
          <Feather name="arrow-left" size={18} color={theme.accent} />
          <Text style={{ color: theme.accent, fontWeight: '600' }}>Voltar</Text>
        </Pressable>

        {canManage && template ? (
          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => router.push(`/(app)/medical-record-templates/${id}/edit`)}
              testID="template-details-edit"
            >
              <Text style={{ color: theme.accent, fontWeight: '600' }}>Editar</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              hitSlop={12}
              onPress={() => setDeleting(true)}
              testID="template-details-delete"
            >
              <Text style={{ color: theme.danger, fontWeight: '600' }}>Excluir</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {isPending ? <LoadingState testID="template-details-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="template-details-error"
          message="Não foi possível carregar o modelo."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isPending && !isError && template ? (
        <>
          <ScreenScroll testID="template-details-content">
            {deleteError ? (
              <Text
                style={[styles.error, { color: theme.danger }]}
                testID="template-details-delete-error"
              >
                {deleteError}
              </Text>
            ) : null}
            <TemplateDetails template={template} />
          </ScreenScroll>

          {isDeleting ? (
            <ConfirmSheet
              testID="template-details-delete-dialog"
              title="Excluir modelo"
              message={`Tem certeza que deseja excluir o modelo ${template.name}? Os prontuários já preenchidos com ele continuam íntegros — o schema fica congelado em cada registro. Para apenas tirá-lo do seletor, desative-o.`}
              confirmLabel="Excluir"
              isOpen
              isPending={remove.isPending}
              onClose={() => setDeleting(false)}
              onConfirm={confirmDelete}
            />
          ) : null}
        </>
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  actions: { flexDirection: 'row', gap: 16 },
  error: { fontSize: 13, marginBottom: 8 },
})
