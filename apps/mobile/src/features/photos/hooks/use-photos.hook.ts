import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import {
  deleteConsultationPhotoUseCase,
  listAppointmentPhotosUseCase,
  uploadConsultationPhotosUseCase,
  type IApiError,
  type UploadFile,
} from '@app/core'

export function useConsultationPhotos(appointmentId: string) {
  return useQuery({
    queryKey: ['consultation-photos', appointmentId],
    queryFn: () => listAppointmentPhotosUseCase(appointmentId),
  })
}

export function useUploadPhotos(appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation<unknown, IApiError, UploadFile[]>({
    mutationFn: (files) => uploadConsultationPhotosUseCase(appointmentId, files),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['consultation-photos', appointmentId] })
    },
  })
}

export function useDeletePhoto(appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation<void, IApiError, string>({
    mutationFn: (id) => deleteConsultationPhotoUseCase(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['consultation-photos', appointmentId] })
    },
  })
}

/**
 * O que o seletor devolve, no formato que o `FormData` do React Native
 * entende: `{ uri, name, type }`, e não o `File` do navegador.
 */
export function toUploadFiles(assets: ImagePicker.ImagePickerAsset[]): UploadFile[] {
  return assets.map((asset, index) => ({
    uri: asset.uri,
    // O seletor nem sempre devolve nome — vindo da câmera, quase nunca.
    name: asset.fileName ?? `foto-${Date.now()}-${index}.jpg`,
    type: asset.mimeType ?? 'image/jpeg',
  }))
}

/**
 * Abre a câmera. Pede a permissão na hora, e não na abertura do app: o
 * sistema mostra o pedido junto do motivo, que é o que faz a pessoa aceitar.
 */
export async function pickFromCamera(): Promise<UploadFile[] | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync()
  if (!permission.granted) return null

  const result = await ImagePicker.launchCameraAsync({ quality: 0.7 })
  if (result.canceled) return []

  return toUploadFiles(result.assets)
}

/** Abre a galeria, com seleção múltipla. */
export async function pickFromLibrary(): Promise<UploadFile[] | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!permission.granted) return null

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    quality: 0.7,
  })
  if (result.canceled) return []

  return toUploadFiles(result.assets)
}
