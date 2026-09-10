import { atestadosService } from '../services/atestados.service'
import { downloadBlob } from '@/lib/download-blob'

export async function downloadAtestadoPdfUseCase(id: string, fileName?: string): Promise<void> {
  const blob = await atestadosService.downloadPdf(id)
  downloadBlob(blob, fileName ?? `atestado-${id}.pdf`)
}
