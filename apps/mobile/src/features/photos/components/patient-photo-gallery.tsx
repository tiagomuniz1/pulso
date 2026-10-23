import { StyleSheet, Text, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import { ErrorState, LoadingState } from '../../../components/ui/screen'
import { useTheme } from '../../../theme/theme-context'
import { usePatientPhotos } from '../hooks/use-photos.hook'

/**
 * As fotos do paciente, de todas as consultas dele.
 *
 * Só leitura, ao contrário da seção dentro da consulta: enviar é ato de
 * atendimento e exige a consulta a que a foto pertence. Excluir também fica
 * de fora pelo mesmo motivo — a foto é de um atendimento, e é de lá que se
 * mexe nela.
 */
export function PatientPhotoGallery({ patientId }: { patientId: string }) {
  const theme = useTheme()
  const { data, isLoading, isError, refetch } = usePatientPhotos(patientId)

  const photos = data?.data ?? []

  return (
    <View style={styles.wrapper} testID="patient-photo-gallery">
      {isLoading ? <LoadingState testID="patient-photos-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="patient-photos-error"
          message="Não foi possível carregar as fotos."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && photos.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textMute }]} testID="patient-photos-empty">
          Nenhuma foto registrada para este paciente ainda.
        </Text>
      ) : null}

      {photos.map((photo) => (
        <View
          key={photo.id}
          style={[styles.item, { borderRadius: theme.radius.md, borderColor: theme.line }]}
          testID={`patient-photo-${photo.id}`}
        >
          <Feather name="image" size={18} color={theme.textDim} />
          <View style={styles.itemText}>
            <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
              {photo.fileName}
            </Text>
            <Text style={[styles.itemMeta, { color: theme.textMute }]}>
              {photo.createdAt.toLocaleDateString('pt-BR')}
            </Text>
          </View>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  empty: { fontSize: 13 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, padding: 12 },
  itemText: { flex: 1, gap: 2 },
  itemName: { fontSize: 14, fontWeight: '500' },
  itemMeta: { fontSize: 12 },
})
