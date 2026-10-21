import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import type { ICreateVaccinationInput, IVaccineModel } from '@app/core'
import { Button } from '../../../components/ui/button'
import { TextField } from '../../../components/ui/fields'
import { SelectField } from '../../../components/ui/select-field'
import { DocumentSheet } from '../../documents/components/document-sheet'
import { useTheme } from '../../../theme/theme-context'
import { todayIsoDate } from '../../appointments/utils/agenda-date.util'

/**
 * Registrar uma dose na caderneta.
 *
 * A dose nem sempre foi aplicada aqui: a caderneta frequentemente transcreve
 * o que a paciente tomou anos atrás noutro serviço, e é por isso que existe
 * "onde foi aplicada" — e que o vínculo com a consulta é opcional.
 */
export function VaccinationForm({
  patientId,
  appointmentId,
  vaccines,
  isOpen,
  isSaving,
  onClose,
  onSubmit,
}: {
  patientId: string
  /**
   * Ausente na ficha do paciente, onde não há consulta a que amarrar — e
   * sem ela a própria pergunta "aplicada nesta clínica" deixa de existir.
   */
  appointmentId?: string
  vaccines: IVaccineModel[]
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onSubmit: (input: ICreateVaccinationInput) => void
}) {
  const theme = useTheme()
  const [vaccineId, setVaccineId] = useState('')
  const [doseLabel, setDoseLabel] = useState('')
  const [appliedAt, setAppliedAt] = useState(todayIsoDate())
  const [atOurClinic, setAtOurClinic] = useState(false)
  const [where, setWhere] = useState('')
  const [lotNumber, setLotNumber] = useState('')
  const [manufacturer, setManufacturer] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  function handleSubmit() {
    if (!vaccineId) {
      setError('Escolha a vacina.')
      return
    }
    setError(null)

    onSubmit({
      patientId,
      vaccineId,
      // Aplicada aqui é desta consulta; transcrita de fora não tem consulta
      // a que se amarrar, e o vínculo fica de fora.
      ...(appointmentId && atOurClinic ? { appointmentId, appliedAtOurClinic: true } : {}),
      doseLabel: doseLabel.trim(),
      appliedAt,
      ...(!atOurClinic && where.trim() ? { appliedAtDescription: where.trim() } : {}),
      ...(lotNumber.trim() ? { lotNumber: lotNumber.trim() } : {}),
      ...(manufacturer.trim() ? { manufacturer: manufacturer.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    })
  }

  return (
    <DocumentSheet
      title="Registrar dose"
      isOpen={isOpen}
      onClose={onClose}
      testID="vaccination-form"
      footer={
        <Button
          label="Registrar dose"
          loading={isSaving}
          onPress={handleSubmit}
          testID="vaccination-submit"
        />
      }
    >
      <View style={styles.field}>
        <Text style={[styles.label, { color: theme.text }]}>
          Vacina<Text style={{ color: theme.danger }}> *</Text>
        </Text>
        <SelectField
          value={vaccineId || null}
          options={vaccines.map((vaccine) => ({ value: vaccine.id, label: vaccine.name }))}
          onChange={setVaccineId}
          placeholder="Selecione a vacina"
          testID="vaccination-vaccine"
        />
        {error ? (
          <Text style={{ color: theme.danger, fontSize: 12 }} testID="vaccination-error">
            {error}
          </Text>
        ) : null}
      </View>

      <TextField
        label="Dose"
        value={doseLabel}
        onChange={setDoseLabel}
        placeholder="1ª dose, reforço..."
        testID="vaccination-dose"
      />
      <TextField
        label="Data de aplicação"
        value={appliedAt}
        onChange={setAppliedAt}
        placeholder="AAAA-MM-DD"
        testID="vaccination-applied-at"
      />

      {appointmentId ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: atOurClinic }}
          onPress={() => setAtOurClinic(!atOurClinic)}
          testID="vaccination-at-our-clinic"
          style={styles.checkbox}
        >
          <Feather
            name={atOurClinic ? 'check-square' : 'square'}
            size={18}
            color={atOurClinic ? theme.accent : theme.textDim}
          />
          <Text style={{ color: theme.text, fontSize: 14 }}>Aplicada nesta clínica</Text>
        </Pressable>
      ) : null}

      {atOurClinic ? null : (
        <TextField
          label="Onde foi aplicada"
          value={where}
          onChange={setWhere}
          placeholder="UBS Centro, clínica de imunização..."
          testID="vaccination-where"
        />
      )}

      <TextField
        label="Lote (opcional)"
        value={lotNumber}
        onChange={setLotNumber}
        testID="vaccination-lot"
      />
      <TextField
        label="Fabricante (opcional)"
        value={manufacturer}
        onChange={setManufacturer}
        testID="vaccination-manufacturer"
      />
      <TextField
        label="Observações (opcional)"
        value={notes}
        onChange={setNotes}
        multiline
        testID="vaccination-notes"
      />
    </DocumentSheet>
  )
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  checkbox: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
})
