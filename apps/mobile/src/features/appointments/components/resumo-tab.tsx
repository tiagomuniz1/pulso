import { StyleSheet, Text, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import { PATIENT_GENDER_LABELS } from '@app/shared'
import type { IAppointmentDetailModel } from '@app/core'
import { useTheme } from '../../../theme/theme-context'
import { formatShortDate } from '../utils/agenda-date.util'
import { ageFrom } from '../utils/age.util'

/**
 * A aba Resumo: quem é a paciente e o que a consulta já produziu.
 *
 * Em celular os dois cartões empilham e os campos ficam em coluna única — a
 * web usa `grid-cols-1 lg:grid-cols-3`, então esta é a forma dela aqui, não
 * uma simplificação nossa.
 */
export function ResumoTab({ appointment }: { appointment: IAppointmentDetailModel }) {
  const theme = useTheme()
  const patient = appointment.patient

  return (
    <View style={styles.wrapper} testID="resumo-tab">
      <View
        style={[styles.card, { borderRadius: theme.radius.lg, borderColor: theme.line }]}
        testID="patient-info-card"
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Dados do Paciente</Text>
          {/* A tela de consultas do paciente é da fase 5; até lá o link não
              existe, em vez de levar a lugar nenhum. */}
        </View>
        <Field label="Nome" value={patient.fullName} testID="patient-name" />
        <Field label="E-mail" value={patient.email} testID="patient-email" />
        <Field label="Telefone" value={patient.phoneNumber} testID="patient-phone" />
        <Field
          label="Data de nascimento"
          value={`${formatShortDate(toIsoDate(patient.birthDate))} (${ageFrom(patient.birthDate)} anos)`}
          testID="patient-birth-date"
        />
        <Field label="CPF" value={patient.documentNumber ?? '—'} testID="patient-document" />
        <Field
          label="Sexo"
          value={PATIENT_GENDER_LABELS[patient.gender]}
          testID="patient-gender"
        />
      </View>

      <View
        style={[styles.card, { borderRadius: theme.radius.lg, borderColor: theme.line }]}
        testID="resumo-tab-documents"
      >
        <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 8 }]}>
          Documentos da consulta
        </Text>
        {/* As contagens ficam em zero porque as abas que as produzem ainda
            não foram portadas — mostrar as linhas mantém o índice honesto. */}
        {(['Receitas', 'Atestados', 'Exames', 'Fotos'] as const).map((label, index) => (
          <View
            key={label}
            style={[
              styles.documentRow,
              { borderColor: theme.line, borderTopWidth: index === 0 ? 0 : 1 },
            ]}
            testID={`resumo-document-${label.toLowerCase()}`}
          >
            <Text style={{ color: theme.text, fontSize: 14 }}>{label}</Text>
            <View style={styles.documentRight}>
              <Text style={{ color: theme.textDim, fontSize: 13, fontWeight: '600' }}>0</Text>
              <Feather name="chevron-right" size={16} color={theme.textMute} />
            </View>
          </View>
        ))}
      </View>
    </View>
  )
}

function Field({ label, value, testID }: { label: string; value: string; testID: string }) {
  const theme = useTheme()
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.textMute }]}>{label.toUpperCase()}</Text>
      <Text style={[styles.fieldValue, { color: theme.text }]} testID={testID}>
        {value}
      </Text>
    </View>
  )
}

/** Local, nunca UTC — ver `agenda-date.util`. */
function toIsoDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
  card: { borderWidth: 1, padding: 20 },
  cardHeader: { marginBottom: 12 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  field: { paddingBottom: 14 },
  fieldLabel: { fontSize: 10, letterSpacing: 0.5 },
  fieldValue: { fontSize: 14, marginTop: 2 },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    minHeight: 48,
  },
  documentRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
})
