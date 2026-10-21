import { useState } from 'react'
import { StyleSheet, Text } from 'react-native'
import type { AppointmentLabelColor } from '@app/shared'
import type { IApiError, IAppointmentLabelModel } from '@app/core'
import { Button } from '../../../components/ui/button'
import { ChoiceField, TextField } from '../../../components/ui/fields'
import { DocumentSheet } from '../../documents/components/document-sheet'
import { useTheme } from '../../../theme/theme-context'
import { LabelColorPicker } from './label-color-picker'

const NAME_MINIMUM = 2
const NAME_MAXIMUM = 40

export function validateLabel(name: string, color: AppointmentLabelColor | null) {
  const errors: { name?: string; color?: string } = {}
  const trimmed = name.trim()
  if (trimmed.length < NAME_MINIMUM) errors.name = `Mínimo ${NAME_MINIMUM} caracteres`
  else if (trimmed.length > NAME_MAXIMUM) errors.name = `Máximo ${NAME_MAXIMUM} caracteres`
  if (!color) errors.color = 'Escolha uma cor'
  return errors
}

/**
 * Criar e editar rótulo, numa folha.
 *
 * Na web é um diálogo dentro da própria listagem, e aqui o equivalente é a
 * folha: são dois campos, e uma tela inteira com botão de voltar seria mais
 * navegação do que conteúdo.
 */
export function LabelSheet({
  label,
  isOpen,
  isPending,
  submitError,
  onClose,
  onSubmit,
}: {
  /** `null` ao criar. */
  label: IAppointmentLabelModel | null
  isOpen: boolean
  isPending: boolean
  submitError: IApiError | null
  onClose: () => void
  onSubmit: (values: {
    name: string
    color: AppointmentLabelColor
    isActive: boolean
  }) => void
}) {
  const theme = useTheme()
  const [name, setName] = useState(label?.name ?? '')
  const [color, setColor] = useState<AppointmentLabelColor | null>(label?.color ?? null)
  const [isActive, setActive] = useState(label?.isActive ?? true)
  const [errors, setErrors] = useState<{ name?: string; color?: string }>({})

  function handleSubmit() {
    const found = validateLabel(name, color)
    setErrors(found)
    if (Object.keys(found).length > 0) return

    onSubmit({ name: name.trim(), color: color as AppointmentLabelColor, isActive })
  }

  return (
    <DocumentSheet
      title={label ? 'Editar rótulo' : 'Novo rótulo'}
      isOpen={isOpen}
      onClose={onClose}
      testID="label-sheet"
      footer={
        <Button
          label={label ? 'Salvar alterações' : 'Criar rótulo'}
          loading={isPending}
          onPress={handleSubmit}
          testID="label-sheet-submit"
        />
      }
    >
      {submitError ? (
        <Text style={[styles.error, { color: theme.danger }]} testID="label-sheet-error">
          {submitError.status === 409
            ? 'Já existe um rótulo com este nome.'
            : 'Não foi possível salvar. Tente de novo.'}
        </Text>
      ) : null}

      <TextField
        label="Nome"
        required
        value={name}
        onChange={setName}
        placeholder="Retorno"
        error={errors.name}
        testID="label-sheet-name"
      />

      <LabelColorPicker
        value={color}
        onChange={setColor}
        error={errors.color}
        testID="label-sheet-color"
      />

      {/* Desativar e excluir são coisas diferentes: o desativado sai do
          seletor e **continua colorindo** as consultas que já o usam. */}
      {label ? (
        <ChoiceField
          label="Situação"
          required={false}
          testID="label-sheet-active"
          options={[{ value: 'active', label: 'Rótulo ativo' }]}
          selected={isActive ? ['active'] : []}
          multiple
          onToggle={() => setActive((current) => !current)}
          helpText="Rótulo inativo some do seletor, mas continua colorindo as consultas que já o usam."
        />
      ) : null}
    </DocumentSheet>
  )
}

const styles = StyleSheet.create({
  error: { fontSize: 13 },
})
