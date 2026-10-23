import { Pressable, StyleSheet, Text, View } from 'react-native'
import { MEDICAL_RECORD_FIELD_TYPE_LABELS, MedicalRecordFieldType } from '@app/shared'
import { Button } from '../../../components/ui/button'
import { ChoiceField, TextField } from '../../../components/ui/fields'
import { SelectField } from '../../../components/ui/select-field'
import { useTheme } from '../../../theme/theme-context'
import { needsOptions, type IFieldDraft } from '../utils/template-draft.util'

const TYPE_OPTIONS = Object.values(MedicalRecordFieldType).map((type) => ({
  value: type,
  label: MEDICAL_RECORD_FIELD_TYPE_LABELS[type],
}))

/**
 * Um campo do modelo, em edição.
 *
 * A web tem alça de arrastar **e** setas; aqui só as setas ficam. Arrastar
 * um cartão deste tamanho com o dedo, dentro de uma tela que também rola,
 * é outra interação — e a web já oferecia as setas como caminho
 * equivalente, então nada se perde.
 */
export function FieldEditor({
  field,
  index,
  total,
  labelError,
  optionsError,
  containers,
  onChange,
  onMoveUp,
  onMoveDown,
  onMoveTo,
  onRemove,
  testID,
}: {
  field: IFieldDraft
  index: number
  total: number
  labelError?: string
  optionsError?: string
  containers: { value: string; label: string }[]
  onChange: (next: IFieldDraft) => void
  onMoveUp: () => void
  onMoveDown: () => void
  onMoveTo: (container: string) => void
  onRemove: () => void
  testID: string
}) {
  const theme = useTheme()

  function patch(changes: Partial<IFieldDraft>) {
    onChange({ ...field, ...changes })
  }

  function patchOption(at: number, changes: { value?: string; label?: string }) {
    patch({
      options: field.options.map((option, position) =>
        position === at ? { ...option, ...changes } : option,
      ),
    })
  }

  return (
    <View
      style={[
        styles.card,
        { borderColor: theme.line, backgroundColor: theme.surface2, borderRadius: theme.radius.lg },
      ]}
      testID={testID}
    >
      <View style={styles.header}>
        <Text style={[styles.position, { color: theme.textMute }]}>CAMPO {index + 1}</Text>
        <View style={styles.arrows}>
          <ArrowButton
            label="↑"
            accessibilityLabel="Mover para cima"
            disabled={index === 0}
            onPress={onMoveUp}
            testID={`${testID}-move-up`}
          />
          <ArrowButton
            label="↓"
            accessibilityLabel="Mover para baixo"
            disabled={index === total - 1}
            onPress={onMoveDown}
            testID={`${testID}-move-down`}
          />
          <ArrowButton
            label="✕"
            accessibilityLabel="Remover campo"
            tone="danger"
            onPress={onRemove}
            testID={`${testID}-remove`}
          />
        </View>
      </View>

      <TextField
        label="Rótulo"
        required
        value={field.label}
        onChange={(label) => patch({ label })}
        placeholder="Ex: Pressão arterial"
        error={labelError}
        testID={`${testID}-label`}
      />

      <View style={styles.selectField}>
        <Text style={[styles.selectLabel, { color: theme.text }]}>
          Tipo<Text style={{ color: theme.danger }}> *</Text>
        </Text>
        <SelectField
          value={field.type}
          options={TYPE_OPTIONS}
          onChange={(type) => patch({ type: type as MedicalRecordFieldType })}
          placeholder="Tipo do campo"
          testID={`${testID}-type`}
        />
      </View>

      <ChoiceField
        label="Preenchimento"
        required={false}
        multiple
        options={[{ value: 'required', label: 'Campo obrigatório' }]}
        selected={field.required ? ['required'] : []}
        onToggle={() => patch({ required: !field.required })}
        testID={`${testID}-required`}
      />

      <TextField
        label="Placeholder"
        value={field.placeholder}
        onChange={(placeholder) => patch({ placeholder })}
        placeholder="Texto de exemplo"
        testID={`${testID}-placeholder`}
      />

      <TextField
        label="Texto de ajuda"
        value={field.helpText}
        onChange={(helpText) => patch({ helpText })}
        placeholder="Dica para o usuário"
        testID={`${testID}-help-text`}
      />

      {needsOptions(field.type) ? (
        <View style={styles.options} testID={`${testID}-options`}>
          <View style={styles.optionsHeader}>
            <Text style={[styles.selectLabel, { color: theme.text }]}>
              Opções<Text style={{ color: theme.danger }}> *</Text>
            </Text>
            <Button
              label="+ Adicionar opção"
              variant="outline"
              onPress={() => patch({ options: [...field.options, { value: '', label: '' }] })}
              testID={`${testID}-option-add`}
            />
          </View>

          {optionsError ? (
            <Text
              style={[styles.error, { color: theme.danger }]}
              testID={`${testID}-options-error`}
            >
              {optionsError}
            </Text>
          ) : null}

          {field.options.length === 0 ? (
            <Text
              style={{ color: theme.textMute, fontSize: 12 }}
              testID={`${testID}-options-empty`}
            >
              Nenhuma opção adicionada.
            </Text>
          ) : null}

          {field.options.map((option, at) => (
            <View key={at} style={styles.optionRow} testID={`${testID}-option-row-${at}`}>
              <View style={styles.optionInput}>
                <TextField
                  label="Valor interno"
                  value={option.value}
                  onChange={(value) => patchOption(at, { value })}
                  placeholder="pressao_alta"
                  testID={`${testID}-option-value-${at}`}
                />
              </View>
              <View style={styles.optionInput}>
                <TextField
                  label="Rótulo exibido"
                  value={option.label}
                  onChange={(label) => patchOption(at, { label })}
                  placeholder="Pressão alta"
                  testID={`${testID}-option-label-${at}`}
                />
              </View>
              <ArrowButton
                label="✕"
                accessibilityLabel="Remover opção"
                tone="danger"
                onPress={() => patch({ options: field.options.filter((_, p) => p !== at) })}
                testID={`${testID}-option-remove-${at}`}
              />
            </View>
          ))}
        </View>
      ) : null}

      {containers.length > 0 ? (
        <View style={styles.selectField}>
          <Text style={[styles.selectLabel, { color: theme.textDim }]}>Mover para</Text>
          <SelectField
            value={null}
            options={containers}
            onChange={onMoveTo}
            placeholder="Mover para outra seção..."
            testID={`${testID}-move-to`}
          />
        </View>
      ) : null}
    </View>
  )
}

/** Botão quadrado de ícone — seta, remoção. Alvo de 44pt, como o resto. */
export function ArrowButton({
  label,
  accessibilityLabel,
  onPress,
  testID,
  disabled = false,
  tone = 'neutral',
}: {
  label: string
  accessibilityLabel: string
  onPress: () => void
  testID: string
  disabled?: boolean
  tone?: 'neutral' | 'danger'
}) {
  const theme = useTheme()
  const color = tone === 'danger' ? theme.danger : theme.accent

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      hitSlop={8}
      style={[
        styles.arrow,
        {
          borderColor: theme.line,
          borderRadius: theme.radius.md,
          opacity: disabled ? 0.4 : 1,
        },
      ]}
    >
      <Text style={{ color, fontSize: 16 }}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 12, gap: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  position: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  arrows: { flexDirection: 'row', gap: 8 },
  arrow: { borderWidth: 1, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  selectField: { gap: 6 },
  selectLabel: { fontSize: 13, fontWeight: '600' },
  options: { gap: 8 },
  optionsHeader: { gap: 8 },
  optionRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  optionInput: { flex: 1 },
  error: { fontSize: 12 },
})
