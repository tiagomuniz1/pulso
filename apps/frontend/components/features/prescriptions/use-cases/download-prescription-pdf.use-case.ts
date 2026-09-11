import { prescriptionsService } from '../services/prescriptions.service'
import { downloadBlob } from '@/lib/download-blob'

export async function downloadPrescriptionPdfUseCase(id: string, fileName?: string): Promise<void> {
  const blob = await prescriptionsService.downloadPdf(id)
  downloadBlob(blob, fileName ?? `receita-${id}.pdf`)
}
