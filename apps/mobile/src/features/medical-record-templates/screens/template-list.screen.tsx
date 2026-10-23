import { useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import { useRouter } from 'expo-router'
import {
  CouncilType,
  COUNCIL_TYPE_PROFESSION_LABELS,
  UserRole,
} from '@app/shared'
import { professionLabel, specialtyLabel } from '@app/core'
import { ListCard, ListCardAction } from '../../../components/ui/list-card'
import { Badge, ListHeader, Pagination } from '../../../components/ui/list-screen'
import { SelectField } from '../../../components/ui/select-field'
import { EmptyState, ErrorState, LoadingState, Screen } from '../../../components/ui/screen'
import { useSessionStore } from '../../auth/session.store'
import { useClinicSpecialties } from '../../professionals/hooks/use-professionals.hook'
import { TEMPLATES_PAGE_SIZE, useTemplates } from '../hooks/use-medical-record-templates.hook'

/**
 * O backend trata `councilType` e `specialtyId` como mutuamente exclusivos —
 * o ramo generalista vem primeiro e ignora a especialidade. O seletor é um
 * só para a tela não oferecer uma combinação que o servidor descarta em
 * silêncio.
 */
const GENERALIST_PREFIX = 'generalist:'

function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR')
}

/**
 * Os modelos de prontuário da clínica.
 *
 * **Criar e editar são gestão do ADMIN**: o modelo é da clínica, não do
 * profissional, e mexer nele mudaria o formulário dos colegas da mesma
 * especialidade. Ao profissional cabe consultar — e a listagem que ele
 * recebe já vem recortada pelo servidor ao escopo que ele exerce.
 */
export function TemplateListScreen() {
  const router = useRouter()
  const role = useSessionStore((state) => state.user?.role)
  const clinicId = useSessionStore((state) => state.user?.clinicId)
  const isAdmin = role === UserRole.ADMIN

  const [page, setPage] = useState(1)
  const [scope, setScope] = useState('')

  const { data: clinicSpecialties } = useClinicSpecialties(clinicId)

  const councilType = scope.startsWith(GENERALIST_PREFIX)
    ? (scope.slice(GENERALIST_PREFIX.length) as CouncilType)
    : undefined
  const specialtyId = scope && !councilType ? scope : undefined

  const { data: paginated, isPending, isError, refetch } = useTemplates(page, {
    ...(specialtyId ? { specialtyId } : {}),
    ...(councilType ? { councilType } : {}),
  })

  const rows = paginated?.data ?? []
  const total = paginated?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / TEMPLATES_PAGE_SIZE))

  /**
   * Trocar o filtro volta à primeira página.
   *
   * A página 3 do filtro anterior raramente existe no novo, e manter o
   * número deixaria a tela vazia num resultado que tem itens.
   */
  function changeScope(value: string) {
    setScope(value)
    setPage(1)
  }

  const scopeOptions = [
    { value: '', label: 'Todos os escopos' },
    ...(clinicSpecialties?.data ?? []).map((specialty) => ({
      value: specialty.specialtyId,
      label: specialty.name,
    })),
    ...Object.values(CouncilType).map((council) => ({
      value: `${GENERALIST_PREFIX}${council}`,
      label: `Generalista · ${COUNCIL_TYPE_PROFESSION_LABELS[council]}`,
    })),
  ]

  return (
    <Screen testID="template-list-screen">
      <View style={styles.top}>
        <ListHeader
          testID="template-list-header"
          title="Modelos de prontuário"
          subtitle={
            isPending || isError
              ? null
              : total === 1
                ? '1 modelo cadastrado'
                : `${total} modelos cadastrados`
          }
          action={
            isAdmin
              ? {
                  label: '+ Novo modelo',
                  onPress: () => router.push('/(app)/medical-record-templates/new'),
                  testID: 'template-list-new',
                }
              : undefined
          }
        />
        <SelectField
          value={scope}
          options={scopeOptions}
          onChange={changeScope}
          placeholder="Filtrar por escopo"
          testID="template-list-scope"
        />
      </View>

      {isPending ? <LoadingState testID="template-list-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="template-list-error"
          message="Não foi possível carregar a lista de modelos."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isPending && !isError && rows.length === 0 ? (
        <EmptyState
          testID="template-list-empty"
          message="Nenhum modelo de prontuário encontrado."
        />
      ) : null}

      {!isPending && !isError && rows.length > 0 ? (
        <FlatList
          data={rows}
          keyExtractor={(template) => template.id}
          contentContainerStyle={styles.list}
          testID="template-list"
          ListFooterComponent={
            <Pagination
              page={page}
              totalPages={totalPages}
              onChange={setPage}
              testID="template-list-pagination"
            />
          }
          renderItem={({ item }) => (
            <ListCard
              testID={`template-card-${item.id}`}
              title={item.name}
              rows={[
                { label: 'Profissão', value: professionLabel(item) },
                { label: 'Especialidade', value: specialtyLabel(item) },
                { label: 'Campos', value: String(item.fields.length) },
                { label: 'Atualizado em', value: formatDate(item.updatedAt) },
                {
                  label: 'Status',
                  value: (
                    <Badge
                      label={item.isActive ? 'Ativo' : 'Inativo'}
                      tone={item.isActive ? 'good' : 'danger'}
                      testID={`template-status-${item.id}`}
                    />
                  ),
                },
              ]}
              actions={
                <ListCardAction
                  label="Ver detalhes"
                  onPress={() => router.push(`/(app)/medical-record-templates/${item.id}`)}
                  testID={`template-view-${item.id}`}
                />
              }
            />
          )}
        />
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  top: { padding: 16, gap: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
})
