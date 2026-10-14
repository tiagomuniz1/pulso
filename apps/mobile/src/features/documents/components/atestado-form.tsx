import { useState } from 'react'
import { MedicalCertificateType } from '@app/shared'
import type { ICreateAtestadoInput } from '@app/core'
import { Button } from '../../../components/ui/button'
import { ChoiceField, TextField } from '../../../components/ui/fields'
import { DocumentSheet } from './document-sheet'

/**
 * Atestado: afastamento ou comparecimento.
 *
 * São dois documentos diferentes com o mesmo nome. O de afastamento diz
 * quantos dias e desde quando; o de comparecimento só confirma que a pessoa
 * esteve ali — e é por isso que `daysOff` é nulo nele, e não zero.
 */
export function AtestadoForm({
  appointmentId,
  isOpen,
  isSaving,
  onClose,
  onSubmit,
}: {
  appointmentId: string
  isOpen: boolean
  isSaving: boolean
  onClose: () => void
  onSubmit: (input: ICreateAtestadoInput) => void
}) {
  const [type, setType] = useState(MedicalCertificateType.LEAVE)
  const [daysOff, setDaysOff] = useState('')
  const [startDate, setStartDate] = useState('')
  const [cidCode, setCidCode] = useState('')
  const [observations, setObservations] = useState('')
  const [error, setError] = useState<string | null>(null)

  const isLeave = type === MedicalCertificateType.LEAVE

  function handleSubmit() {
    if (isLeave && !daysOff.trim()) {
      setError('Informe os dias de afastamento.')
      return
    }
    setError(null)

    onSubmit({
      appointmentId,
      type,
      ...(isLeave ? { daysOff: Number(daysOff) } : {}),
      ...(isLeave && startDate ? { startDate } : {}),
      ...(cidCode.trim() ? { cidCode: cidCode.trim() } : {}),
      ...(observations.trim() ? { observations: observations.trim() } : {}),
    })
  }

  return (
    <DocumentSheet
      title="Novo atestado"
      isOpen={isOpen}
      onClose={onClose}
      testID="atestado-form"
      footer={
        <Button
          label="Emitir atestado"
          loading={isSaving}
          onPress={handleSubmit}
          testID="atestado-submit"
        />
      }
    >
      <ChoiceField
        label="Tipo"
        required
        options={[
          { value: MedicalCertificateType.LEAVE, label: 'Afastamento' },
          { value: MedicalCertificateType.ATTENDANCE, label: 'Comparecimento' },
        ]}
        selected={[type]}
        onToggle={(value) => setType(value as MedicalCertificateType)}
        testID="atestado-type"
      />

      {isLeave ? (
        <>
          <TextField
            label="Dias de afastamento"
            required
            value={daysOff}
            onChange={setDaysOff}
            keyboardType="numeric"
            error={error}
            testID="atestado-days-off"
          />
          <TextField
            label="Data de início"
            value={startDate}
            onChange={setStartDate}
            placeholder="AAAA-MM-DD"
            testID="atestado-start-date"
          />
        </>
      ) : null}

      <TextField
        label="CID (opcional)"
        value={cidCode}
        onChange={setCidCode}
        placeholder="Ex: M54.5"
        testID="atestado-cid"
      />

      <TextField
        label="Observações (opcional)"
        value={observations}
        onChange={setObservations}
        multiline
        placeholder="Observações adicionais..."
        testID="atestado-observations"
      />
    </DocumentSheet>
  )
}
