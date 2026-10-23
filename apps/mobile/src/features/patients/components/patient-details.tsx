import { Pressable, StyleSheet, Text, View } from 'react-native'
import { KINSHIP_TYPE_LABELS, PATIENT_GENDER_LABELS, formatCpf, formatPhone } from '@app/shared'
import type { IPatientModel } from '@app/core'
import { useTheme } from '../../../theme/theme-context'

/** Rótulo em caixa alta e valor abaixo — o `DetailRow` da web. */
function DetailRow({ label, value, testID }: { label: string; value: string; testID: string }) {
  const theme = useTheme()
  return (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: theme.textMute }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: theme.text }]} testID={testID}>
        {value}
      </Text>
    </View>
  )
}

function Section({
  title,
  children,
  testID,
}: {
  title?: string
  children: React.ReactNode
  testID?: string
}) {
  const theme = useTheme()
  return (
    <View
      style={[
        styles.section,
        { borderRadius: theme.radius.lg, borderColor: theme.line, backgroundColor: theme.surface },
      ]}
      testID={testID}
    >
      {title ? (
        <Text style={[styles.sectionTitle, { color: theme.textMute }]}>{title}</Text>
      ) : null}
      {children}
    </View>
  )
}

/**
 * Os dados do paciente, no mesmo recorte da web.
 *
 * A web desenha duas colunas acima de 640px e uma abaixo; aqui só a de baixo
 * existe. Data de nascimento por extenso e cadastro em mês abreviado são da
 * web também — e a diferença entre as duas é proposital: a de nascimento é
 * dado da pessoa, a de cadastro é metadado.
 */
export function PatientDetails({
  patient,
  canManage,
  onEdit,
  onDelete,
  onOpenPatient,
}: {
  patient: IPatientModel
  canManage: boolean
  onEdit: () => void
  onDelete: () => void
  /** Titular e dependentes são links para a ficha deles, como na web. */
  onOpenPatient: (id: string) => void
}) {
  const theme = useTheme()

  return (
    <View style={styles.wrapper} testID="patient-details">
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={[styles.name, { color: theme.text }]} testID="patient-details-name">
            {patient.fullName}
          </Text>
          <Text style={[styles.email, { color: theme.textDim }]} testID="patient-details-email">
            {patient.email}
          </Text>
        </View>
      </View>

      {canManage ? (
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            onPress={onEdit}
            hitSlop={12}
            testID="patient-details-edit"
          >
            <Text style={[styles.action, { color: theme.accent }]}>Editar</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onDelete}
            hitSlop={12}
            testID="patient-details-delete"
          >
            <Text style={[styles.action, { color: theme.danger }]}>Excluir</Text>
          </Pressable>
        </View>
      ) : null}

      <Section>
        <DetailRow
          label="TELEFONE"
          value={formatPhone(patient.phoneNumber)}
          testID="patient-details-phone"
        />
        <DetailRow
          label="DATA DE NASCIMENTO"
          value={patient.birthDate.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
          testID="patient-details-birthdate"
        />
        <DetailRow
          label="DOCUMENTO (CPF)"
          // Dependente pode não ter CPF: recém-nascido e menor sem documento
          // emitido são o motivo de o campo ser opcional no cadastro.
          value={patient.documentNumber ? formatCpf(patient.documentNumber) : 'Não informado'}
          testID="patient-details-document"
        />
        <DetailRow
          label="GÊNERO"
          value={PATIENT_GENDER_LABELS[patient.gender]}
          testID="patient-details-gender"
        />
        <DetailRow
          label="CADASTRADO EM"
          value={patient.createdAt.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
          testID="patient-details-created-at"
        />
      </Section>

      {patient.address ? (
        <Section title="ENDEREÇO" testID="patient-details-address">
          <DetailRow
            label="LOGRADOURO"
            value={`${patient.address.street}, ${patient.address.number}`}
            testID="patient-details-address-street"
          />
          {patient.address.complement ? (
            <DetailRow
              label="COMPLEMENTO"
              value={patient.address.complement}
              testID="patient-details-address-complement"
            />
          ) : null}
          <DetailRow
            label="BAIRRO"
            value={patient.address.neighborhood}
            testID="patient-details-address-neighborhood"
          />
          <DetailRow
            label="CIDADE / UF"
            value={`${patient.address.city} — ${patient.address.state}`}
            testID="patient-details-address-city"
          />
          <DetailRow
            label="CEP"
            value={patient.address.zipCode}
            testID="patient-details-address-zipcode"
          />
        </Section>
      ) : (
        <Section testID="patient-details-no-address">
          <Text style={{ color: theme.textMute, fontSize: 13 }}>Endereço não cadastrado.</Text>
        </Section>
      )}

      {patient.responsiblePatient && patient.kinshipType ? (
        <Section title="VINCULADO A">
          <Pressable
            accessibilityRole="link"
            onPress={() => onOpenPatient(patient.responsiblePatient!.id)}
            testID="patient-details-responsible"
          >
            <Text style={{ color: theme.accent, fontWeight: '600' }}>
              {patient.responsiblePatient.fullName}
              <Text style={{ color: theme.text, fontWeight: '400' }}>
                {` — ${KINSHIP_TYPE_LABELS[patient.kinshipType]}`}
              </Text>
            </Text>
          </Pressable>
        </Section>
      ) : null}

      {patient.dependents.length > 0 ? (
        <Section title="DEPENDENTES" testID="patient-details-dependents">
          {patient.dependents.map((dependent) => (
            <Pressable
              key={dependent.id}
              accessibilityRole="link"
              onPress={() => onOpenPatient(dependent.id)}
              testID={`patient-details-dependent-${dependent.id}`}
            >
              <Text style={{ color: theme.accent, fontWeight: '600' }}>
                {dependent.fullName}
                <Text style={{ color: theme.text, fontWeight: '400' }}>
                  {` — ${KINSHIP_TYPE_LABELS[dependent.kinshipType]}`}
                </Text>
              </Text>
            </Pressable>
          ))}
        </Section>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  headerText: { flex: 1, gap: 2 },
  headerActions: { flexDirection: 'row', gap: 20 },
  name: { fontSize: 22, fontWeight: '700' },
  email: { fontSize: 13 },
  action: { fontSize: 14, fontWeight: '600' },
  section: { borderWidth: 1, padding: 16, gap: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  detailRow: { gap: 2 },
  detailLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  detailValue: { fontSize: 14 },
})
