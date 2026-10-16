import { examsService } from '@app/core'
import { downloadBlob } from '@/lib/download-blob'

export async function downloadExamResultFileUseCase(id: string, fileName: string): Promise<void> {
  const blob = await examsService.downloadResultFile(id)
  downloadBlob(blob, fileName)
}
