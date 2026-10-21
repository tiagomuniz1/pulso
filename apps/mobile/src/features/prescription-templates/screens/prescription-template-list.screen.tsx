import { useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { UserRole } from '@app/shared'
import type { IPrescriptionTemplateModel } from '@app/core'
import { ConfirmSheet } from '../../../components/ui/confirm-sheet'
import { ListCard, ListCardAction, ListCardActionSpacer } from '../../../components/ui/list-card'
import { Badge, ListHeader, SuccessBanner } from '../../../components/ui/list-screen'
import { EmptyState, ErrorState, LoadingState, Screen } from '../../../components/ui/screen'
import { useSessionStore } from '../../auth/session.store'
import { useMyProfessional } from '../../documents/hooks/use-can-issue.hook'
import { PrescriptionTemplateSheet } from '../components/prescription-template-sheet'
import {
  useCreatePrescriptionTemplate,
  useDeletePrescriptionTemplate,
  usePrescriptionTemplates,
  useUpdatePrescriptionTemplate,
} from '../hooks/use-prescription-templates.hook'

/**
 * Os modelos de receita do profissional.
 *
 * **Criar depende da ficha, não do cargo.** Um ADMIN sem ficha de
 * profissional é zelador dos modelos da clínica: edita e exclui qualquer
 * um, mas não cria sob a própria ficha — ele não tem uma. É a mesma divisão
 * de "Cargo e Ofício" que vale para receita e atestado.
 */
export function PrescriptionTemplateListScreen() {
  const role = useSessionStore((state) => state.user?.role)
  const myProfessional = useMyProfessional()
  const hasFicha = Boolean(myProfessional)
  const isAdmin = role === UserRole.ADMIN

  const [isCreating, setCreating] = useState(false)
  const [editing, setEditing] = useState<IPrescriptionTemplateModel | null>(null)
  const [toDelete, setToDelete] = useState<IPrescriptionTemplateModel | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const { data, isPending, isError, refetch } = usePrescriptionTemplates()
  const create = useCreatePrescriptionTemplate()
  const update = useUpdatePrescriptionTemplate(editing?.id ?? '')
  const remove = useDeletePrescriptionTemplate()

  function confirmDelete(template: IPrescriptionTemplateModel) {
    remove.mutate(template.id, {
      onSuccess: () => {
        setToDelete(null)
        setDone(`Modelo ${template.name} excluído com sucesso.`)
      },
      onError: () => setToDelete(null),
    })
  }

  const templates = data ?? []

  return (
    <Screen testID="prescription-template-list-screen">
      <View style={styles.top}>
        <ListHeader
          testID="prescription-template-list-header"
          title="Modelos de receita"
          subtitle={
            isPending || isError
              ? null
              : templates.length === 1
                ? '1 modelo cadastrado'
                : `${templates.length} modelos cadastrados`
          }
          action={
            hasFicha
              ? {
                  label: '+ Novo modelo',
                  onPress: () => {
                    create.reset()
                    setCreating(true)
                  },
                  testID: 'prescription-template-list-new',
                }
              : undefined
          }
        />
        {/* Um ADMIN sem ficha chega aqui para zelar pelos modelos da
            clínica, e precisa saber por que não pode criar. */}
        {!hasFicha && isAdmin && !isPending ? (
          <Badge
            label="Criar modelo exige ficha de profissional"
            tone="neutral"
            testID="prescription-template-list-no-ficha"
          />
        ) : null}
        {done ? (
          <SuccessBanner message={done} testID="prescription-template-list-success" />
        ) : null}
      </View>

      {isPending ? <LoadingState testID="prescription-template-list-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="prescription-template-list-error"
          message="Não foi possível carregar os modelos."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isPending && !isError && templates.length === 0 ? (
        <EmptyState
          testID="prescription-template-list-empty"
          message="Nenhum modelo cadastrado."
        />
      ) : null}

      {!isPending && !isError && templates.length > 0 ? (
        <FlatList
          data={templates}
          keyExtractor={(template) => template.id}
          contentContainerStyle={styles.list}
          testID="prescription-template-list"
          renderItem={({ item }) => (
            <ListCard
              testID={`prescription-template-card-${item.id}`}
              title={item.name}
              rows={[
                { label: 'Profissional', value: item.professionalName },
                {
                  label: 'Medicamentos',
                  value:
                    item.items.length === 1
                      ? '1 medicamento'
                      : `${item.items.length} medicamentos`,
                },
                {
                  label: 'Status',
                  value: (
                    <Badge
                      label={item.isActive ? 'Ativo' : 'Inativo'}
                      tone={item.isActive ? 'good' : 'danger'}
                      testID={`prescription-template-status-${item.id}`}
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
                    testID={`prescription-template-delete-${item.id}`}
                  />
                  <ListCardActionSpacer />
                  <ListCardAction
                    label="Editar"
                    onPress={() => {
                      update.reset()
                      setEditing(item)
                    }}
                    testID={`prescription-template-edit-${item.id}`}
                  />
                </>
              }
            />
          )}
        />
      ) : null}

      {isCreating ? (
        <PrescriptionTemplateSheet
          template={null}
          isOpen
          isPending={create.isPending}
          submitError={create.error ?? null}
          onClose={() => setCreating(false)}
          onSubmit={({ name, items, notes }) =>
            create.mutate(
              { name, items, ...(notes ? { notes } : {}) },
              {
                onSuccess: () => {
                  setCreating(false)
                  setDone(`Modelo ${name} criado com sucesso.`)
                },
              },
            )
          }
        />
      ) : null}

      {editing ? (
        <PrescriptionTemplateSheet
          template={editing}
          isOpen
          isPending={update.isPending}
          submitError={update.error ?? null}
          onClose={() => setEditing(null)}
          onSubmit={({ name, items, notes, isActive }) =>
            update.mutate(
              { name, items, notes: notes ?? '', isActive },
              {
                onSuccess: () => {
                  setEditing(null)
                  setDone(`Modelo ${name} atualizado com sucesso.`)
                },
              },
            )
          }
        />
      ) : null}

      {toDelete ? (
        <ConfirmSheet
          testID="prescription-template-delete-dialog"
          title="Excluir modelo"
          message={`Tem certeza que deseja excluir o modelo ${toDelete.name}? As receitas já emitidas a partir dele não mudam.`}
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
