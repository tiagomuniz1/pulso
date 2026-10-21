import { useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import { UserRole } from '@app/shared'
import type { IPatientModel } from '@app/core'
import { ConfirmSheet } from '../../../components/ui/confirm-sheet'
import { ListHeader, SearchField, SuccessBanner } from '../../../components/ui/list-screen'
import { EmptyState, ErrorState, LoadingState, Screen } from '../../../components/ui/screen'
import { useSessionStore } from '../../auth/session.store'
import { PatientCard } from '../components/patient-card'
import { useDeletePatient, usePatients } from '../hooks/use-patients.hook'

/**
 * A lista de pacientes.
 *
 * A web mostra tabela em tela larga e cartões abaixo de 768px; aqui só a
 * segunda forma existe, com os mesmos campos e as mesmas ações.
 *
 * A busca é do servidor, não um filtro sobre o que já veio: a clínica tem
 * milhares de pacientes e a listagem é paginada. Filtrar no cliente acharia
 * só quem estivesse na primeira página.
 */
export function PatientListScreen() {
  const router = useRouter()
  const role = useSessionStore((state) => state.user?.role)
  const canManage = role === UserRole.ADMIN

  const [search, setSearch] = useState('')
  const [toDelete, setToDelete] = useState<IPatientModel | null>(null)
  const [deleted, setDeleted] = useState<string | null>(null)

  const { data: patients, isPending, isError, refetch } = usePatients(
    search ? { search } : undefined,
  )
  const remove = useDeletePatient()

  /**
   * Recebe o paciente por parâmetro, e não do estado.
   *
   * A folha só é montada quando há um escolhido, então ler do estado
   * exigiria uma guarda `if (!toDelete) return` que nada alcança — e uma
   * guarda inalcançável é um ramo que o teste não cobre e que esconde a
   * pergunta de quando ela seria verdadeira.
   */
  function confirmDelete(patient: IPatientModel) {
    const name = patient.fullName
    remove.mutate(patient.id, {
      onSuccess: () => {
        setToDelete(null)
        setDeleted(`Paciente ${name} excluído com sucesso.`)
      },
      onError: () => setToDelete(null),
    })
  }

  const count = patients?.length ?? 0

  return (
    <Screen testID="patient-list-screen">
      <View style={styles.top}>
        <ListHeader
          testID="patient-list-header"
          title="Pacientes"
          subtitle={
            isPending || isError
              ? null
              : count === 1
                ? '1 paciente cadastrado'
                : `${count} pacientes cadastrados`
          }
          action={
            canManage
              ? {
                  label: '+ Novo paciente',
                  onPress: () => router.push('/(app)/patients/new'),
                  testID: 'patient-list-new',
                }
              : undefined
          }
        />
        <SearchField
          placeholder="Buscar por nome..."
          onSearch={setSearch}
          testID="patient-list-search"
        />
        {deleted ? <SuccessBanner message={deleted} testID="patient-list-success" /> : null}
      </View>

      {isPending ? <LoadingState testID="patient-list-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="patient-list-error"
          message="Não foi possível carregar a lista de pacientes."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isPending && !isError && count === 0 ? (
        <EmptyState
          testID="patient-list-empty"
          message={
            search
              ? 'Nenhum paciente encontrado para a busca realizada.'
              : 'Nenhum paciente encontrado.'
          }
        />
      ) : null}

      {!isPending && !isError && count > 0 ? (
        <FlatList
          data={patients}
          keyExtractor={(patient) => patient.id}
          contentContainerStyle={styles.list}
          testID="patient-list"
          renderItem={({ item }) => (
            <PatientCard
              patient={item}
              canManage={canManage}
              onOpen={() => router.push(`/(app)/patients/${item.id}`)}
              onEdit={() => router.push(`/(app)/patients/${item.id}/edit`)}
              onAppointments={() => router.push(`/(app)/patients/${item.id}/appointments`)}
              onDelete={() => setToDelete(item)}
            />
          )}
        />
      ) : null}

      {toDelete ? (
        <ConfirmSheet
          testID="patient-delete-dialog"
          title="Excluir paciente"
          message={`Tem certeza que deseja excluir o paciente ${toDelete.fullName}? Esta ação não pode ser desfeita.`}
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
