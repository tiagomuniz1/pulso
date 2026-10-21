import { StyleSheet, Text, View } from 'react-native'
import type { IAddressFormValues } from '@app/shared'
import { TextField } from '../../../components/ui/fields'
import { useTheme } from '../../../theme/theme-context'
import type { PatientFormErrors } from '../patient-form.validation'

/** "01000000" → "01000-000". */
export function applyZipCodeMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 5) return digits
  return `${digits.slice(0, 5)}-${digits.slice(5)}`
}

/**
 * O bloco de endereço, opcional em bloco.
 *
 * Na web Logradouro/Número e Cidade/UF dividem a linha; aqui também, que é o
 * que o desenho de 390px já faz lá. O resto é uma coluna.
 */
export function AddressFields({
  address,
  onChangeField,
  errors,
  testID,
}: {
  address: IAddressFormValues
  /**
   * Campo e valor, não o endereço inteiro.
   *
   * A primeira versão montava `{ ...address, [field]: value }` aqui — e
   * `address` é prop, portanto o valor do último render. Duas mudanças antes
   * de o React redesenhar e a primeira some. No aparelho isso aparece como
   * campo que "não guarda", difícil de reproduzir; no teste, como um
   * endereço com um campo só. Quem faz a mesclagem é o pai, em cima do
   * estado atual.
   */
  onChangeField: (field: keyof IAddressFormValues, value: string) => void
  errors: PatientFormErrors
  testID: string
}) {
  const theme = useTheme()
  const set = onChangeField

  return (
    <View
      style={[styles.block, { borderRadius: theme.radius.lg, borderColor: theme.line }]}
      testID={testID}
    >
      <Text style={[styles.legend, { color: theme.textMute }]}>ENDEREÇO</Text>

      <View style={styles.row}>
        <View style={styles.grow}>
          <TextField
            label="Logradouro"
            value={address.street ?? ''}
            onChange={(value) => set('street', value)}
            placeholder="Rua das Flores"
            error={errors['address.street']}
            testID={`${testID}-street`}
          />
        </View>
        <View style={styles.narrow}>
          <TextField
            label="Número"
            value={address.number ?? ''}
            onChange={(value) => set('number', value)}
            placeholder="123"
            error={errors['address.number']}
            testID={`${testID}-number`}
          />
        </View>
      </View>

      <TextField
        label="Complemento"
        value={address.complement ?? ''}
        onChange={(value) => set('complement', value)}
        placeholder="Apto 42 (opcional)"
        testID={`${testID}-complement`}
      />

      <TextField
        label="Bairro"
        value={address.neighborhood ?? ''}
        onChange={(value) => set('neighborhood', value)}
        placeholder="Centro"
        error={errors['address.neighborhood']}
        testID={`${testID}-neighborhood`}
      />

      <View style={styles.row}>
        <View style={styles.grow}>
          <TextField
            label="Cidade"
            value={address.city ?? ''}
            onChange={(value) => set('city', value)}
            placeholder="São Paulo"
            error={errors['address.city']}
            testID={`${testID}-city`}
          />
        </View>
        <View style={styles.narrow}>
          <TextField
            label="UF"
            value={address.state ?? ''}
            onChange={(value) => set('state', value.toUpperCase().slice(0, 2))}
            placeholder="SP"
            error={errors['address.state']}
            testID={`${testID}-state`}
          />
        </View>
      </View>

      <TextField
        label="CEP"
        value={address.zipCode ?? ''}
        onChange={(value) => set('zipCode', applyZipCodeMask(value))}
        placeholder="00000-000"
        keyboardType="numeric"
        error={errors['address.zipCode']}
        testID={`${testID}-zipcode`}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  block: { borderWidth: 1, padding: 14, gap: 12 },
  legend: { fontSize: 11, fontWeight: '600', letterSpacing: 0.8 },
  row: { flexDirection: 'row', gap: 10 },
  grow: { flex: 2 },
  narrow: { flex: 1 },
})
