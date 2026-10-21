import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ErrorState, LoadingState } from '../../../components/ui/screen'
import { useTheme } from '../../../theme/theme-context'
import { formatShortDate } from '../../appointments/utils/agenda-date.util'
import {
  useActiveVaccines,
  useCreateVaccination,
  useDeleteVaccination,
  usePatientVaccinations,
} from '../hooks/use-vaccines.hook'
import { VaccinationForm } from './vaccination-form'

/**
 * A caderneta de vacinação do paciente.
 *
 * **Ancorada no paciente, não na consulta** — é a única entidade clínica
 * do sistema cujo `appointment_id` é opcional, porque a dose aplicada anos
 * atrás em outro serviço não tem consulta a que se amarrar. Por isso o
 * mesmo componente serve a ficha do paciente e o atendimento: quando nasce
 * dentro de um, o vínculo é gravado; fora dele, não há o que vincular.
 *
 * Registrar depende da **ficha**, não de ser o dono do atendimento: não há
 * assinatura em jogo, só quem transcreveu.
 */
export function VaccinationHistory({
  patientId,
  appointmentId,
  hasFicha,
}: {
  patientId: string
  /** Ausente na ficha do paciente: ali a dose não pertence a consulta alguma. */
  appointmentId?: string
  hasFicha: boolean
}) {
  const theme = useTheme()
  const [isDoseOpen, setDoseOpen] = useState(false)

  const vaccines = useActiveVaccines()
  const vaccinations = usePatientVaccinations(patientId)
  const createDose = useCreateVaccination(patientId)
  const removeDose = useDeleteVaccination(patientId)

  const catalog = vaccines.data?.data ?? []
  const doses = vaccinations.data?.data ?? []

  return (
    <View style={styles.wrapper} testID="vaccination-history">
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>Caderneta de vacinação</Text>
        </View>
        {hasFicha ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setDoseOpen(true)}
            testID="vaccination-new"
            style={[
              styles.newButton,
              { borderRadius: theme.radius.md, backgroundColor: theme.accentSoft },
            ]}
          >
            <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600' }}>
              + Registrar dose
            </Text>
          </Pressable>
        ) : null}
      </View>

      {vaccinations.isLoading ? <LoadingState testID="vaccinations-loading" /> : null}
      {vaccinations.isError ? (
        <ErrorState
          testID="vaccinations-error"
          message="Não foi possível carregar a caderneta."
          onRetry={() => void vaccinations.refetch()}
        />
      ) : null}
      {!vaccinations.isLoading && !vaccinations.isError && doses.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textMute }]} testID="vaccinations-empty">
          Nenhuma dose registrada.
        </Text>
      ) : null}
      {doses.map((dose) => (
        <View
          key={dose.id}
          style={[styles.item, { borderRadius: theme.radius.md, borderColor: theme.line }]}
          testID={`vaccination-item-${dose.id}`}
        >
          <View style={styles.itemText}>
            <Text style={[styles.itemTitle, { color: theme.text }]}>{dose.vaccineName}</Text>
            <Text style={[styles.itemMeta, { color: theme.textMute }]}>
              {dose.doseLabel ? `${dose.doseLabel} · ` : ''}
              {formatShortDate(dose.appliedAt)}
              {dose.appliedAtDescription ? ` · ${dose.appliedAtDescription}` : ''}
            </Text>
          </View>
          {hasFicha ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => removeDose.mutate(dose.id)}
              testID={`vaccination-delete-${dose.id}`}
              hitSlop={8}
            >
              <Text style={{ color: theme.danger, fontSize: 13 }}>Excluir</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      {createDose.isError ? (
        <Text style={[styles.notice, { color: theme.danger }]} testID="vaccination-create-error">
          Não foi possível salvar. Tente de novo.
        </Text>
      ) : null}

      <VaccinationForm
        patientId={patientId}
        appointmentId={appointmentId}
        vaccines={catalog}
        isOpen={isDoseOpen}
        isSaving={createDose.isPending}
        onClose={() => setDoseOpen(false)}
        onSubmit={(input) => createDose.mutate(input, { onSuccess: () => setDoseOpen(false) })}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  headerText: { flex: 1 },
  newButton: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '600' },
  empty: { fontSize: 13, paddingVertical: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 14 },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '500' },
  itemMeta: { fontSize: 12 },
  notice: { fontSize: 13, textAlign: 'center' },
})
