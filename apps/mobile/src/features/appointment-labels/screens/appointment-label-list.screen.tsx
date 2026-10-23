import { useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import {
  APPOINTMENT_LABEL_COLOR_HEX,
  APPOINTMENT_LABEL_COLOR_LABELS,
} from '@app/shared'
import type { IAppointmentLabelModel } from '@app/core'
import { ConfirmSheet } from '../../../components/ui/confirm-sheet'
import { ListCard, ListCardAction, ListCardActionSpacer } from '../../../components/ui/list-card'
import { Badge, ListHeader, SuccessBanner } from '../../../components/ui/list-screen'
import { EmptyState, ErrorState, LoadingState, Screen } from '../../../components/ui/screen'
import { useTheme } from '../../../theme/theme-context'
import { LabelSheet } from '../components/label-sheet'
import {
  useAppointmentLabels,
  useCreateAppointmentLabel,
  useDeleteAppointmentLabel,
  useUpdateAppointmentLabel,
} from '../hooks/use-appointment-labels.hook'

/** A amostra da cor ao lado do nome, como a faixa que ela pinta na agenda. */
function ColorSwatch({
  color,
  testID,
}: {
  color: IAppointmentLabelModel['color']
  testID: string
}) {
  const theme = useTheme()
  const palette = APPOINTMENT_LABEL_COLOR_HEX[color][theme.isDark ? 'dark' : 'light']
  return <View style={[styles.swatch, { backgroundColor: palette.base }]} testID={testID} />
}

/**
 * O catálogo de rótulos da clínica — gestão exclusiva do ADMIN.
 *
 * O item nem aparece no menu dos outros perfis e o backend recusa, então
 * não há recorte de papel dentro da tela.
 */
export function AppointmentLabelListScreen() {
  const [editing, setEditing] = useState<IAppointmentLabelModel | null>(null)
  const [isCreating, setCreating] = useState(false)
  const [toDelete, setToDelete] = useState<IAppointmentLabelModel | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const { data: labels, isPending, isError, refetch } = useAppointmentLabels()
  const create = useCreateAppointmentLabel()
  const update = useUpdateAppointmentLabel(editing?.id ?? '')
  const remove = useDeleteAppointmentLabel()

  function confirmDelete(label: IAppointmentLabelModel) {
    remove.mutate(label.id, {
      onSuccess: () => {
        setToDelete(null)
        setDone(`Rótulo ${label.name} excluído com sucesso.`)
      },
      onError: () => setToDelete(null),
    })
  }

  const rows = labels?.data ?? []

  return (
    <Screen testID="appointment-label-list-screen">
      <View style={styles.top}>
        <ListHeader
          testID="appointment-label-list-header"
          title="Rótulos de consulta"
          subtitle="Cores para distinguir as consultas na agenda de relance. Cada consulta recebe um rótulo."
          action={{
            label: '+ Novo rótulo',
            onPress: () => {
              create.reset()
              setCreating(true)
            },
            testID: 'appointment-label-list-new',
          }}
        />
        {done ? <SuccessBanner message={done} testID="appointment-label-list-success" /> : null}
      </View>

      {isPending ? <LoadingState testID="appointment-label-list-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="appointment-label-list-error"
          message="Não foi possível carregar os rótulos."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isPending && !isError && rows.length === 0 ? (
        <EmptyState
          testID="appointment-label-list-empty"
          message="Nenhum rótulo cadastrado."
        />
      ) : null}

      {!isPending && !isError && rows.length > 0 ? (
        <FlatList
          data={rows}
          keyExtractor={(label) => label.id}
          contentContainerStyle={styles.list}
          testID="appointment-label-list"
          renderItem={({ item }) => (
            <ListCard
              testID={`appointment-label-card-${item.id}`}
              title={item.name}
              leading={
                <ColorSwatch color={item.color} testID={`appointment-label-swatch-${item.id}`} />
              }
              rows={[
                { label: 'Cor', value: APPOINTMENT_LABEL_COLOR_LABELS[item.color] },
                {
                  label: 'Status',
                  value: (
                    <Badge
                      label={item.isActive ? 'Ativo' : 'Inativo'}
                      tone={item.isActive ? 'good' : 'danger'}
                      testID={`appointment-label-status-${item.id}`}
                    />
                  ),
                },
              ]}
              actions={
                <>
                  <ListCardAction
                    label="Excluir"
                    tone="danger"
                    onPress={() => setToDelete(item)}
                    testID={`appointment-label-delete-${item.id}`}
                  />
                  <ListCardActionSpacer />
                  <ListCardAction
                    label="Editar"
                    onPress={() => {
                      update.reset()
                      setEditing(item)
                    }}
                    testID={`appointment-label-edit-${item.id}`}
                  />
                </>
              }
            />
          )}
        />
      ) : null}

      {isCreating ? (
        <LabelSheet
          label={null}
          isOpen
          isPending={create.isPending}
          submitError={create.error ?? null}
          onClose={() => setCreating(false)}
          onSubmit={({ name, color }) =>
            create.mutate(
              { name, color },
              {
                onSuccess: () => {
                  setCreating(false)
                  setDone(`Rótulo ${name} criado com sucesso.`)
                },
              },
            )
          }
        />
      ) : null}

      {/* Sem `key` por rótulo: a folha é montada só enquanto há um escolhido,
          então fechá-la já descarta o estado. A chave estava aqui por
          precaução e era código que nada alcançava — o teste "editar outro
          rótulo abre com os dados dele" prova que a desmontagem basta. */}
      {editing ? (
        <LabelSheet
          label={editing}
          isOpen
          isPending={update.isPending}
          submitError={update.error ?? null}
          onClose={() => setEditing(null)}
          onSubmit={({ name, color, isActive }) =>
            update.mutate(
              { name, color, isActive },
              {
                onSuccess: () => {
                  setEditing(null)
                  setDone(`Rótulo ${name} atualizado com sucesso.`)
                },
              },
            )
          }
        />
      ) : null}

      {toDelete ? (
        <ConfirmSheet
          testID="appointment-label-delete-dialog"
          title="Excluir rótulo"
          message={`Tem certeza que deseja excluir o rótulo ${toDelete.name}? Ele some das consultas que já o usam. Para apenas tirá-lo de circulação, desative-o.`}
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
  swatch: { width: 6, height: 28, borderRadius: 3 },
})
