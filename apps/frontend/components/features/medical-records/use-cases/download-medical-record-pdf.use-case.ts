import { downloadBlob } from '@/lib/download-blob'
import { medicalRecordsService } from '@app/core'

export async function downloadMedicalRecordPdfUseCase(
  id: string,
  fileName?: string,
): Promise<void> {
  const blob = await medicalRecordsService.downloadPdf(id)
  downloadBlob(blob, fileName ?? `prontuario-${id}.pdf`)
}
