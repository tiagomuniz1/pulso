import { downloadBlob } from '@/lib/download-blob'
import { medicalRecordsService } from '../services/medical-records.service'

export async function downloadMedicalRecordPdfUseCase(
  id: string,
  fileName?: string,
): Promise<void> {
  const blob = await medicalRecordsService.downloadPdf(id)
  downloadBlob(blob, fileName ?? `prontuario-${id}.pdf`)
}
