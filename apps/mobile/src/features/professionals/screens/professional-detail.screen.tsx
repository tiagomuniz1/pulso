import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { UserRole } from '@app/shared'
import { ConfirmSheet } from '../../../components/ui/confirm-sheet'
import { ErrorState, LoadingState, Screen, ScreenScroll } from '../../../components/ui/screen'
import { useTheme } from '../../../theme/theme-context'
import { useSessionStore } from '../../auth/session.store'
import { ProfessionalDetails } from '../components/professional-details'
import { useDeleteProfessional, useProfessional } from '../hooks/use-professionals.hook'

export function ProfessionalDetailScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const role = useSessionStore((state) => state.user?.role)
  const canManage = role === UserRole.ADMIN

  const [isDeleting, setDeleting] = useState(false)
  const { data: professional, isPending, isError, refetch } = useProfessional(id)
  const remove = useDeleteProfessional()

  function confirmDelete() {
    remove.mutate(id, {
      onSuccess: () => {
        setDeleting(false)
        router.back()
      },
      onError: () => setDeleting(false),
    })
  }

  return (
    <Screen testID="professional-detail-screen">
      <View style={[styles.bar, { borderColor: theme.line }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={12}
          testID="professional-detail-back"
          style={styles.back}
        >
          <Feather name="arrow-left" size={18} color={theme.accent} />
          <Text style={{ color: theme.accent, fontWeight: '600' }}>Voltar</Text>
        </Pressable>
      </View>

      {isPending ? <LoadingState testID="professional-detail-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="professional-detail-error"
          message="Não foi possível carregar os dados do profissional."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isPending && !isError && professional ? (
        <>
          <ScreenScroll testID="professional-detail-content">
            <ProfessionalDetails
              professional={professional}
              canManage={canManage}
              onEdit={() => router.push(`/(app)/professionals/${professional.id}/edit`)}
              onDelete={() => setDeleting(true)}
            />
          </ScreenScroll>

          {isDeleting ? (
            <ConfirmSheet
              testID="professional-detail-delete-dialog"
              title="Excluir profissional"
              message={`Tem certeza que deseja excluir o profissional ${professional.user.fullName}? Esta ação não pode ser desfeita.`}
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
  bar: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6 },
})
