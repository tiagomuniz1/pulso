import { consultationPhotosService, type UploadFile } from '../services/consultation-photos.service'
import { toConsultationPhotoModel } from '../mappers/to-consultation-photo-model.mapper'
import type { IConsultationPhotoModel } from '../types/consultation-photo-model.types'

export async function uploadConsultationPhotosUseCase(
  appointmentId: string,
  files: UploadFile[],
): Promise<IConsultationPhotoModel[]> {
  const dtos = await consultationPhotosService.upload(appointmentId, files)
  return dtos.map(toConsultationPhotoModel)
}
