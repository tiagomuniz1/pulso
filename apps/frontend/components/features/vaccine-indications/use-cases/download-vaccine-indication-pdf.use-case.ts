import { vaccineIndicationsService } from '@app/core'
import { downloadBlob } from '@/lib/download-blob'

export async function downloadVaccineIndicationPdfUseCase(id: string, fileName?: string): Promise<void> {
  const blob = await vaccineIndicationsService.downloadPdf(id)
  downloadBlob(blob, fileName ?? `indicacao-vacina-${id}.pdf`)
}
