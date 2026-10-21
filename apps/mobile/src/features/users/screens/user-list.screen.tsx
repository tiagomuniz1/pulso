import { useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import type { IUserModel } from '@app/core'
import { ConfirmSheet } from '../../../components/ui/confirm-sheet'
import { ListHeader, SearchField, SuccessBanner } from '../../../components/ui/list-screen'
import { EmptyState, ErrorState, LoadingState, Screen } from '../../../components/ui/screen'
import { useSessionStore } from '../../auth/session.store'
import { UserCard } from '../components/user-card'
import { useDeleteUser, useUsers } from '../hooks/use-users.hook'

/**
 * A lista de usuários — só o ADMIN chega aqui.
 *
 * O item nem aparece no menu para os outros perfis, e o backend recusa a
 * listagem. Por isso não há recorte de papel dentro da tela: quem a abre
 * pode tudo o que ela oferece.
 */
export function UserListScreen() {
  const router = useRouter()
  const currentUserId = useSessionStore((state) => state.user?.id)

  const [search, setSearch] = useState('')
  const [toDelete, setToDelete] = useState<IUserModel | null>(null)
  const [deleted, setDeleted] = useState<string | null>(null)

  const { data: users, isPending, isError, refetch } = useUsers(search ? { search } : undefined)
  const remove = useDeleteUser()

  function confirmDelete(user: IUserModel) {
    remove.mutate(user.id, {
      onSuccess: () => {
        setToDelete(null)
        setDeleted(`Usuário ${user.fullName} excluído com sucesso.`)
      },
      onError: () => setToDelete(null),
    })
  }

  const count = users?.length ?? 0

  return (
    <Screen testID="user-list-screen">
      <View style={styles.top}>
        <ListHeader
          testID="user-list-header"
          title="Usuários"
          subtitle={
            isPending || isError
              ? null
              : count === 1
                ? '1 usuário cadastrado'
                : `${count} usuários cadastrados`
          }
          action={{
            label: '+ Novo usuário',
            onPress: () => router.push('/(app)/users/new'),
            testID: 'user-list-new',
          }}
        />
        <SearchField
          placeholder="Buscar por nome..."
          onSearch={setSearch}
          testID="user-list-search"
        />
        {deleted ? <SuccessBanner message={deleted} testID="user-list-success" /> : null}
      </View>

      {isPending ? <LoadingState testID="user-list-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="user-list-error"
          message="Não foi possível carregar a lista de usuários."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isPending && !isError && count === 0 ? (
        <EmptyState
          testID="user-list-empty"
          message={
            search
              ? 'Nenhum usuário encontrado para a busca realizada.'
              : 'Nenhum usuário encontrado.'
          }
        />
      ) : null}

      {!isPending && !isError && count > 0 ? (
        <FlatList
          data={users}
          keyExtractor={(user) => user.id}
          contentContainerStyle={styles.list}
          testID="user-list"
          renderItem={({ item }) => (
            <UserCard
              user={item}
              isCurrentUser={item.id === currentUserId}
              onOpen={() => router.push(`/(app)/users/${item.id}`)}
              onEdit={() => router.push(`/(app)/users/${item.id}/edit`)}
              onDelete={() => setToDelete(item)}
            />
          )}
        />
      ) : null}

      {toDelete ? (
        <ConfirmSheet
          testID="user-delete-dialog"
          title="Excluir usuário"
          message={`Tem certeza que deseja excluir o usuário ${toDelete.fullName}? Esta ação não pode ser desfeita.`}
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
