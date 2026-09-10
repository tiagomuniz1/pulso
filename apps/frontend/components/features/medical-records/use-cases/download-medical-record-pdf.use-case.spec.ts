jest.mock('../services/medical-records.service')
jest.mock('@/lib/download-blob')

import { downloadBlob } from '@/lib/download-blob'
import { medicalRecordsService } from '../services/medical-records.service'
import { downloadMedicalRecordPdfUseCase } from './download-medical-record-pdf.use-case'

const mockService = medicalRecordsService as jest.Mocked<typeof medicalRecordsService>
const mockDownloadBlob = downloadBlob as jest.MockedFunction<typeof downloadBlob>

describe('downloadMedicalRecordPdfUseCase', () => {
  beforeEach(() => jest.clearAllMocks())

  // O backend também manda `prontuario-<id>.pdf` no `Content-Disposition`, mas
  // o interceptor do api-client descarta a resposta e devolve só `data` — o
  // header nunca chega aqui. As duas pontas seguem a convenção por acordo.
  it('names the file after the record by default', async () => {
    const blob = new Blob(['%PDF'], { type: 'application/pdf' })
    mockService.downloadPdf.mockResolvedValue(blob)

    await downloadMedicalRecordPdfUseCase('record-uuid')

    expect(mockService.downloadPdf).toHaveBeenCalledWith('record-uuid')
    expect(mockDownloadBlob).toHaveBeenCalledWith(blob, 'prontuario-record-uuid.pdf')
  })

  it('accepts a custom file name', async () => {
    mockService.downloadPdf.mockResolvedValue(new Blob(['%PDF']))

    await downloadMedicalRecordPdfUseCase('record-uuid', 'prontuario-ana.pdf')

    expect(mockDownloadBlob).toHaveBeenCalledWith(expect.any(Blob), 'prontuario-ana.pdf')
  })

  it('propagates the error without handing anything to the browser', async () => {
    mockService.downloadPdf.mockRejectedValue({ status: 404 })

    await expect(downloadMedicalRecordPdfUseCase('record-uuid')).rejects.toMatchObject({ status: 404 })
    expect(mockDownloadBlob).not.toHaveBeenCalled()
  })
})
