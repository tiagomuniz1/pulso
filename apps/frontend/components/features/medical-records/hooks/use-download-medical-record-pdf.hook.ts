'use client'

import { useMutation } from '@tanstack/react-query'
import { downloadMedicalRecordPdfUseCase } from '../use-cases/download-medical-record-pdf.use-case'

export function useDownloadMedicalRecordPdf() {
  return useMutation({
    mutationFn: ({ id, fileName }: { id: string; fileName?: string }) =>
      downloadMedicalRecordPdfUseCase(id, fileName),
  })
}
