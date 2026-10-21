import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import Feather from '@expo/vector-icons/Feather'
import { UserRole } from '@app/shared'
import { ConfirmSheet } from '../../../components/ui/confirm-sheet'
import { ErrorState, LoadingState, Screen, ScreenScroll } from '../../../components/ui/screen'
import { useTheme } from '../../../theme/theme-context'
import { useSessionStore } from '../../auth/session.store'
import { HistoryTab } from '../../appointments/components/history-tab'
import { useMyProfessional } from '../../documents/hooks/use-can-issue.hook'
import { VaccinationHistory } from '../../vaccines/components/vaccination-history'
import { VaccineStatusPanel } from '../../vaccine-schedules/components/vaccine-status-panel'
import { PatientPhotoGallery } from '../../photos/components/patient-photo-gallery'
import { PatientDetails } from '../components/patient-details'
import { useDeletePatient, usePatient } from '../hooks/use-patients.hook'

function SectionTitle({ children, testID }: { children: string; testID: string }) {
  const theme = useTheme()
  return (
    <Text style={[styles.sectionTitle, { color: theme.text }]} testID={testID}>
      {children}
    </Text>
  )
}

/**
 * A ficha do paciente.
 *
 * A web empilha quatro blocos: dados, histórico de prontuários, fotos de
 * evolução e vacinas. Os três primeiros estão aqui; **a situação vacinal
 * ainda não**, porque o calendário de vacinas é a única parte cuja camada de
 * dados não migrou para o `@app/core` — ela vem junto com o resto de vacinas.
 *
 * Histórico e fotos são dado clínico: a recepção não os vê, exatamente como
 * na web (`canSeeMedicalHistory`).
 */
export function PatientDetailScreen() {
  const theme = useTheme()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const role = useSessionStore((state) => state.user?.role)

  const canManage = role === UserRole.ADMIN
  const canSeeClinicalData = role === UserRole.ADMIN || role === UserRole.PROFESSIONAL
  // Registrar dose e registrar conduta dependem da **ficha**, não do cargo:
  // é exercício, não escopo (ver `ai/context/permissions.md`).
  const hasFicha = Boolean(useMyProfessional())

  const [isDeleting, setDeleting] = useState(false)
  const { data: patient, isPending, isError, refetch } = usePatient(id)
  const remove = useDeletePatient()

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
    <Screen testID="patient-detail-screen">
      <View style={[styles.bar, { borderColor: theme.line }]}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          hitSlop={12}
          testID="patient-detail-back"
          style={styles.back}
        >
          <Feather name="arrow-left" size={18} color={theme.accent} />
          <Text style={{ color: theme.accent, fontWeight: '600' }}>Voltar</Text>
        </Pressable>
      </View>

      {isPending ? <LoadingState testID="patient-detail-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="patient-detail-error"
          message="Não foi possível carregar os dados do paciente."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isPending && !isError && patient ? (
        <>
        <ScreenScroll testID="patient-detail-content">
          <PatientDetails
            patient={patient}
            canManage={canManage}
            onEdit={() => router.push(`/(app)/patients/${patient.id}/edit`)}
            onDelete={() => setDeleting(true)}
            onOpenPatient={(other) => router.push(`/(app)/patients/${other}`)}
          />

          {canSeeClinicalData ? (
            <>
              <SectionTitle testID="patient-history-title">Histórico de Prontuários</SectionTitle>
              <HistoryTab patientId={patient.id} />

              <SectionTitle testID="patient-photos-title">Fotos de Evolução</SectionTitle>
              <PatientPhotoGallery patientId={patient.id} />

              {/* A situação vem antes da caderneta: responde "o que falta",
                  que é a pergunta que se faz na consulta. A caderneta
                  responde "o que já tomou". */}
              <SectionTitle testID="patient-vaccines-title">Vacinas</SectionTitle>
              <VaccineStatusPanel patientId={patient.id} />
              <VaccinationHistory patientId={patient.id} hasFicha={hasFicha} />
            </>
          ) : null}
        </ScreenScroll>

        {/* Dentro do ramo que já tem o paciente: fora dele a mensagem
            precisaria de um `?? ''` para um caso que não acontece — a folha
            só abre a partir de um botão que não existe sem paciente. */}
        {isDeleting ? (
          <ConfirmSheet
            testID="patient-detail-delete-dialog"
            title="Excluir paciente"
            message={`Tem certeza que deseja excluir o paciente ${patient.fullName}? Esta ação não pode ser desfeita.`}
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
  sectionTitle: { fontSize: 15, fontWeight: '700', marginTop: 12 },
})
