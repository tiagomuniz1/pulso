import { useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { UserRole } from '@app/shared'
import type { IProfessionalModel } from '@app/core'
import { ConfirmSheet } from '../../../components/ui/confirm-sheet'
import { ListHeader, SearchField, SuccessBanner } from '../../../components/ui/list-screen'
import { EmptyState, ErrorState, LoadingState, Screen } from '../../../components/ui/screen'
import { useSessionStore } from '../../auth/session.store'
import { ProfessionalCard } from '../components/professional-card'
import { useDeleteProfessional, useProfessionals } from '../hooks/use-professionals.hook'

/**
 * A lista de profissionais.
 *
 * **O PROFESSIONAL recebe só a própria ficha** — o recorte é do servidor
 * (`GET /professionals` devolve apenas ele). A tela não precisa saber disso;
 * o que ela decide é quem vê os botões de gestão, que são do ADMIN.
 */
export function ProfessionalListScreen() {
  const router = useRouter()
  const role = useSessionStore((state) => state.user?.role)
  const canManage = role === UserRole.ADMIN

  const [search, setSearch] = useState('')
  const [toDelete, setToDelete] = useState<IProfessionalModel | null>(null)
  const [deleted, setDeleted] = useState<string | null>(null)

  const { data: professionals, isPending, isError, refetch } = useProfessionals(
    search ? { search } : undefined,
  )
  const remove = useDeleteProfessional()

  function confirmDelete(professional: IProfessionalModel) {
    remove.mutate(professional.id, {
      onSuccess: () => {
        setToDelete(null)
        setDeleted(`Profissional ${professional.user.fullName} excluído com sucesso.`)
      },
      onError: () => setToDelete(null),
    })
  }

  const count = professionals?.length ?? 0

  return (
    <Screen testID="professional-list-screen">
      <View style={styles.top}>
        <ListHeader
          testID="professional-list-header"
          title="Profissionais"
          subtitle={
            isPending || isError
              ? null
              : count === 1
                ? '1 profissional cadastrado'
                : `${count} profissionais cadastrados`
          }
          action={
            canManage
              ? {
                  label: '+ Novo profissional',
                  onPress: () => router.push('/(app)/professionals/new'),
                  testID: 'professional-list-new',
                }
              : undefined
          }
        />
        <SearchField
          placeholder="Buscar por nome ou especialidade..."
          onSearch={setSearch}
          testID="professional-list-search"
        />
        {deleted ? <SuccessBanner message={deleted} testID="professional-list-success" /> : null}
      </View>

      {isPending ? <LoadingState testID="professional-list-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="professional-list-error"
          message="Não foi possível carregar a lista de profissionais."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isPending && !isError && count === 0 ? (
        <EmptyState
          testID="professional-list-empty"
          message={
            search
              ? 'Nenhum profissional encontrado para a busca realizada.'
              : 'Nenhum profissional encontrado.'
          }
        />
      ) : null}

      {!isPending && !isError && count > 0 ? (
        <FlatList
          data={professionals}
          keyExtractor={(professional) => professional.id}
          contentContainerStyle={styles.list}
          testID="professional-list"
          renderItem={({ item }) => (
            <ProfessionalCard
              professional={item}
              canManage={canManage}
              onOpen={() => router.push(`/(app)/professionals/${item.id}`)}
              onEdit={() => router.push(`/(app)/professionals/${item.id}/edit`)}
              onAppointments={() =>
                router.push({ pathname: '/(app)', params: { professionalId: item.id } })
              }
              onDelete={() => setToDelete(item)}
            />
          )}
        />
      ) : null}

      {toDelete ? (
        <ConfirmSheet
          testID="professional-delete-dialog"
          title="Excluir profissional"
          message={`Tem certeza que deseja excluir o profissional ${toDelete.user.fullName}? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          isOpen
          isPending={remove.isPending}
          onClose={() => setToDelete(null)}
          onConfirm={() => confirmDelete(toDelete)}
        />
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { padding: 16, gap: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
})
