import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { UserRole } from '@app/shared'
import {
  APPOINTMENT_STATUS_LABELS,
  listAppointmentsUseCase,
  listProfessionalsUseCase,
} from '@app/core'
import { ListCard, ListCardAction, ListCardActionSpacer } from '../../../components/ui/list-card'
import { Badge } from '../../../components/ui/list-screen'
import { SelectField } from '../../../components/ui/select-field'
import { EmptyState, ErrorState, LoadingState, Screen } from '../../../components/ui/screen'
import { useTheme } from '../../../theme/theme-context'
import { useSessionStore } from '../../auth/session.store'
import { formatShortDate } from '../../appointments/utils/agenda-date.util'
import { usePatient } from '../hooks/use-patients.hook'

const TAMANHO_DA_PAGINA = 10
const TODOS = '__todos__'

/**
 * As consultas de um paciente, da mais recente para a mais antiga.
 *
 * **O seletor de profissional só aparece para quem enxerga a clínica
 * inteira.** O backend já recorta o PROFESSIONAL às próprias consultas, e
 * oferecer-lhe o filtro sugeriria que existe algo a mais para ver.
 */
export function PatientAppointmentsScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const role = useSessionStore((state) => state.user?.role)

  const canFilterByProfessional = role === UserRole.ADMIN || role === UserRole.USER

  const [professionalId, setProfessionalId] = useState<string>(TODOS)
  const [page, setPage] = useState(1)

  const patient = usePatient(id)

  const professionals = useQuery({
    queryKey: ['professionals', { limit: 100 }],
    queryFn: () => listProfessionalsUseCase({ limit: 100 }),
    enabled: canFilterByProfessional,
  })

  const filter = professionalId === TODOS ? undefined : professionalId
  const appointments = useQuery({
    queryKey: ['appointments', { patientId: id, professionalId: filter, page }],
    queryFn: () =>
      listAppointmentsUseCase({
        patientId: id,
        professionalId: filter,
        page,
        limit: TAMANHO_DA_PAGINA,
      }),
    enabled: Boolean(id),
  })

  const rows = appointments.data?.data ?? []
  const total = appointments.data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / TAMANHO_DA_PAGINA))

  return (
    <Screen testID="patient-appointments-screen">
      <View style={[styles.bar, { borderColor: theme.line }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={12}
          testID="patient-appointments-back"
          style={styles.back}
        >
          <Feather name="arrow-left" size={18} color={theme.accent} />
          <Text style={{ color: theme.accent, fontWeight: '600' }}>Voltar</Text>
        </Pressable>
      </View>

      <View style={styles.top}>
        <Text style={[styles.title, { color: theme.text }]} testID="patient-appointments-title">
          {patient.data ? `Consultas de ${patient.data.fullName}` : 'Consultas'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textDim }]}>
          Da mais recente para a mais antiga.
        </Text>

        {canFilterByProfessional ? (
          <SelectField
            value={professionalId}
            placeholder="Todos os profissionais"
            testID="patient-appointments-professional"
            options={[
              { value: TODOS, label: 'Todos os profissionais' },
              ...(professionals.data ?? []).map((professional) => ({
                value: professional.id,
                label: professional.user.fullName,
              })),
            ]}
            onChange={(value) => {
              setProfessionalId(value)
              setPage(1)
            }}
          />
        ) : null}
      </View>

      {appointments.isPending ? <LoadingState testID="patient-appointments-loading" /> : null}

      {appointments.isError ? (
        <ErrorState
          testID="patient-appointments-error"
          message="Não foi possível carregar as consultas."
          onRetry={() => void appointments.refetch()}
        />
      ) : null}

      {!appointments.isPending && !appointments.isError && rows.length === 0 ? (
        <EmptyState
          testID="patient-appointments-empty"
          message={
            filter
              ? 'Nenhuma consulta com este profissional.'
              : 'Nenhuma consulta registrada para este paciente.'
          }
        />
      ) : null}

      {!appointments.isPending && !appointments.isError && rows.length > 0 ? (
        <FlatList
          data={rows}
          keyExtractor={(appointment) => appointment.id}
          contentContainerStyle={styles.list}
          testID="patient-appointments-list"
          ListFooterComponent={
            totalPages > 1 ? (
              <View style={styles.pagination} testID="patient-appointments-pagination">
                <ListCardAction
                  label="‹ Anterior"
                  disabled={page === 1}
                  onPress={() => setPage((current) => current - 1)}
                  testID="patient-appointments-previous"
                />
                <Text style={{ color: theme.textDim, fontSize: 13 }}>
                  {`Página ${page} de ${totalPages}`}
                </Text>
                <ListCardAction
                  label="Próxima ›"
                  disabled={page === totalPages}
                  onPress={() => setPage((current) => current + 1)}
                  testID="patient-appointments-next"
                />
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <ListCard
              testID={`patient-appointment-${item.id}`}
              title={`${formatShortDate(item.date)} · ${item.startTime}`}
              rows={[
                { label: 'Profissional', value: item.professionalName },
                {
                  label: 'Situação',
                  value: <Badge label={APPOINTMENT_STATUS_LABELS[item.status]} />,
                },
              ]}
              actions={
                <>
                  <ListCardActionSpacer />
                  <ListCardAction
                    label="Ver consulta ›"
                    onPress={() => router.push(`/(app)/appointments/${item.id}`)}
                    testID={`patient-appointment-open-${item.id}`}
                  />
                </>
              }
            />
          )}
        />
      ) : null}
    </Screen>
  )
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  top: { padding: 16, gap: 8 },
  title: { fontSize: 22, fontWeight: '700' },
  subtitle: { fontSize: 13 },
  list: { paddingHorizontal: 16, paddingBottom: 32, gap: 12 },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
})
