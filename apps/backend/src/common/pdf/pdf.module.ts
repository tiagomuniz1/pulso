import { Module } from '@nestjs/common'
import { PdfDocumentService } from './pdf-document.service'

/** A base compartilhada de geração de PDF. */
@Module({
  providers: [PdfDocumentService],
  exports: [PdfDocumentService],
})
export class PdfModule {}
