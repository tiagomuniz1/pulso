import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import { ErrorState, LoadingState } from '../../../components/ui/screen'
import { useTheme } from '../../../theme/theme-context'
import {
  pickFromCamera,
  pickFromLibrary,
  useConsultationPhotos,
  useDeletePhoto,
  useUploadPhotos,
} from '../hooks/use-photos.hook'

/**
 * A aba Fotos.
 *
 * Na web o botão abre um seletor de arquivo; aqui abre **a câmera**, que é o
 * motivo de o app existir. A galeria vem junto porque a foto nem sempre é
 * tirada na hora — a paciente manda por mensagem e o profissional anexa.
 *
 * As fotos aparecem por data de envio, não da consulta, como no backend.
 */
export function PhotoSection({
  appointmentId,
  canIssue,
}: {
  appointmentId: string
  canIssue: boolean
}) {
  const theme = useTheme()
  const [permissionDenied, setPermissionDenied] = useState(false)

  const { data, isLoading, isError, refetch } = useConsultationPhotos(appointmentId)
  const upload = useUploadPhotos(appointmentId)
  const remove = useDeletePhoto(appointmentId)

  const photos = data ?? []

  async function pick(open: () => Promise<Awaited<ReturnType<typeof pickFromCamera>>>) {
    const files = await open()
    // `null` é permissão negada; lista vazia é a pessoa ter desistido — e
    // desistir não merece aviso nenhum.
    if (files === null) {
      setPermissionDenied(true)
      return
    }
    setPermissionDenied(false)
    if (files.length > 0) upload.mutate(files)
  }

  return (
    <View style={styles.wrapper} testID="photo-section">
      <Text style={[styles.title, { color: theme.text }]}>Fotos</Text>
      <Text style={[styles.subtitle, { color: theme.textMute }]}>
        Fotos de evolução do tratamento, organizadas por data de envio.
      </Text>

      {canIssue ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            disabled={upload.isPending}
            onPress={() => void pick(pickFromCamera)}
            testID="photo-camera"
            style={[
              styles.action,
              { borderRadius: theme.radius.md, backgroundColor: theme.accentSoft },
            ]}
          >
            <Feather name="camera" size={16} color={theme.accent} />
            <Text style={{ color: theme.accent, fontSize: 14, fontWeight: '600' }}>
              Tirar foto
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            disabled={upload.isPending}
            onPress={() => void pick(pickFromLibrary)}
            testID="photo-library"
            style={[styles.action, { borderRadius: theme.radius.md, borderColor: theme.line, borderWidth: 1 }]}
          >
            <Feather name="image" size={16} color={theme.text} />
            <Text style={{ color: theme.text, fontSize: 14 }}>Da galeria</Text>
          </Pressable>
        </View>
      ) : null}

      {permissionDenied ? (
        <Text style={[styles.notice, { color: theme.danger }]} testID="photo-permission-denied">
          Sem acesso à câmera ou às fotos. Libere nos ajustes do aparelho.
        </Text>
      ) : null}

      {upload.isPending ? <LoadingState testID="photo-uploading" /> : null}

      {upload.isError ? (
        <Text style={[styles.notice, { color: theme.danger }]} testID="photo-upload-error">
          Não foi possível enviar. Tente de novo.
        </Text>
      ) : null}

      {isLoading ? <LoadingState testID="photo-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="photo-error"
          message="Não foi possível carregar as fotos."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && photos.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textMute }]} testID="photo-empty">
          Nenhuma foto enviada.
        </Text>
      ) : null}

      {photos.map((photo) => (
        <View
          key={photo.id}
          style={[styles.item, { borderRadius: theme.radius.md, borderColor: theme.line }]}
          testID={`photo-item-${photo.id}`}
        >
          <Feather name="image" size={18} color={theme.textDim} />
          <View style={styles.itemText}>
            <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
              {photo.fileName}
            </Text>
            <Text style={[styles.itemMeta, { color: theme.textMute }]}>
              {photo.createdAt.toLocaleDateString('pt-BR')} ·{' '}
              {Math.max(1, Math.round(photo.fileSizeBytes / 1024))} KB
            </Text>
          </View>
          {canIssue ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Excluir ${photo.fileName}`}
              disabled={remove.isPending}
              onPress={() => remove.mutate(photo.id)}
              testID={`photo-delete-${photo.id}`}
              hitSlop={8}
            >
              <Feather name="trash-2" size={16} color={theme.danger} />
            </Pressable>
          ) : null}
        </View>
      ))}

      {remove.isError ? (
        <Text style={[styles.notice, { color: theme.danger }]} testID="photo-delete-error">
          Não foi possível excluir. Tente de novo.
        </Text>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  title: { fontSize: 17, fontWeight: '600' },
  subtitle: { fontSize: 13, marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 8 },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
  },
  empty: { fontSize: 13, paddingVertical: 8 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 12 },
  itemText: { flex: 1 },
  itemName: { fontSize: 14 },
  itemMeta: { fontSize: 12 },
  notice: { fontSize: 13, textAlign: 'center' },
})
