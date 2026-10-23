import { examsService } from '@app/core'
import { downloadBlob } from '@/lib/download-blob'

export async function downloadExamRequestPdfUseCase(id: string, fileName?: string): Promise<void> {
  const blob = await examsService.downloadPdf(id)
  downloadBlob(blob, fileName ?? `pedido-exames-${id}.pdf`)
}
