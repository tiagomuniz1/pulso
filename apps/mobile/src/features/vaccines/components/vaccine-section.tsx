import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ErrorState, LoadingState } from '../../../components/ui/screen'
import { useTheme } from '../../../theme/theme-context'
import { formatShortDate } from '../../appointments/utils/agenda-date.util'
import {
  useActiveVaccines,
  useCreateVaccination,
  useCreateVaccineIndication,
  useDeleteVaccination,
  useDeleteVaccineIndication,
  usePatientVaccinations,
  useVaccineIndications,
} from '../hooks/use-vaccines.hook'
import { VaccinationForm } from './vaccination-form'
import { VaccineIndicationForm } from './vaccine-indication-form'

/**
 * A aba Vacinas: duas seções que a web mostra juntas e que são coisas
 * diferentes.
 *
 * **Indicação** é documento emitido — o que o profissional recomenda, com
 * assinatura, e por isso exige ser o profissional desta consulta.
 * **Caderneta** é registro do que a paciente já tomou, ancorado nela e não na
 * consulta: registrar depende da ficha, mas **não** de ser o dono do
 * atendimento, porque não há assinatura em jogo — frequentemente se
 * transcreve uma dose aplicada anos atrás noutro serviço.
 */
export function VaccineSection({
  appointmentId,
  patientId,
  canIssue,
  hasFicha,
}: {
  appointmentId: string
  patientId: string
  canIssue: boolean
  hasFicha: boolean
}) {
  const theme = useTheme()
  const [isIndicationOpen, setIndicationOpen] = useState(false)
  const [isDoseOpen, setDoseOpen] = useState(false)

  const vaccines = useActiveVaccines()
  const indications = useVaccineIndications(appointmentId)
  const vaccinations = usePatientVaccinations(patientId)
  const createIndication = useCreateVaccineIndication(appointmentId)
  const removeIndication = useDeleteVaccineIndication(appointmentId)
  const createDose = useCreateVaccination(patientId)
  const removeDose = useDeleteVaccination(patientId)

  const catalog = vaccines.data?.data ?? []
  // Derivadas uma vez: espalhar `?? []` por cada uso criaria ramos que só a
  // ausência de dado exercitaria, e aqui ela não acontece.
  const issued = indications.data ?? []
  const doses = vaccinations.data?.data ?? []

  return (
    <View style={styles.wrapper} testID="vaccine-section">
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>Indicações de vacina</Text>
          <Text style={[styles.subtitle, { color: theme.textMute }]}>
            Vacinas indicadas nesta consulta, para aplicação em serviço de imunização.
          </Text>
        </View>
        {canIssue ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setIndicationOpen(true)}
            testID="indication-new"
            style={[styles.newButton, { borderRadius: theme.radius.md, backgroundColor: theme.accentSoft }]}
          >
            <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600' }}>
              + Nova indicação
            </Text>
          </Pressable>
        ) : null}
      </View>

      {indications.isLoading ? <LoadingState testID="indications-loading" /> : null}
      {indications.isError ? (
        <ErrorState
          testID="indications-error"
          message="Não foi possível carregar as indicações."
          onRetry={() => void indications.refetch()}
        />
      ) : null}
      {!indications.isLoading && !indications.isError && issued.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textMute }]} testID="indications-empty">
          Nenhuma indicação emitida.
        </Text>
      ) : null}
      {issued.map((indication) => (
        <View
          key={indication.id}
          style={[styles.item, { borderRadius: theme.radius.md, borderColor: theme.line }]}
          testID={`indication-item-${indication.id}`}
        >
          <View style={styles.itemText}>
            <Text style={[styles.itemTitle, { color: theme.text }]}>
              {indication.items.length}{' '}
              {indication.items.length === 1 ? 'vacina indicada' : 'vacinas indicadas'}
            </Text>
            <Text style={[styles.itemMeta, { color: theme.textMute }]}>
              {indication.issuedAt.toLocaleDateString('pt-BR')}
            </Text>
          </View>
          {canIssue ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => removeIndication.mutate(indication.id)}
              testID={`indication-delete-${indication.id}`}
              hitSlop={8}
            >
              <Text style={{ color: theme.danger, fontSize: 13 }}>Excluir</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      <View style={[styles.header, styles.secondHeader]}>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: theme.text }]}>Caderneta de vacinação</Text>
        </View>
        {/* Registrar depende da ficha, não de ser o dono do atendimento: não
            há assinatura em jogo, e a caderneta transcreve o que a paciente
            tomou onde quer que tenha sido. */}
        {hasFicha ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setDoseOpen(true)}
            testID="vaccination-new"
            style={[styles.newButton, { borderRadius: theme.radius.md, backgroundColor: theme.accentSoft }]}
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

      {createIndication.isError || createDose.isError ? (
        <Text style={[styles.notice, { color: theme.danger }]} testID="vaccine-create-error">
          Não foi possível salvar. Tente de novo.
        </Text>
      ) : null}

      <VaccineIndicationForm
        appointmentId={appointmentId}
        vaccines={catalog}
        isOpen={isIndicationOpen}
        isSaving={createIndication.isPending}
        onClose={() => setIndicationOpen(false)}
        onSubmit={(input) =>
          createIndication.mutate(input, { onSuccess: () => setIndicationOpen(false) })
        }
      />

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
  secondHeader: { marginTop: 16 },
  headerText: { flex: 1 },
  newButton: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  title: { fontSize: 17, fontWeight: '600' },
  subtitle: { fontSize: 13 },
  empty: { fontSize: 13, paddingVertical: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 14 },
  itemText: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '500' },
  itemMeta: { fontSize: 12 },
  notice: { fontSize: 13, textAlign: 'center' },
})
