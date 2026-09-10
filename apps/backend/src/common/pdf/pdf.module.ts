import { Module } from '@nestjs/common'
import { LogoFetcherService } from '../services/logo-fetcher.service'
import { PdfDocumentService } from './pdf-document.service'

/**
 * A base compartilhada de geração de PDF.
 *
 * O `LogoFetcherService` mora aqui porque todo documento com cabeçalho precisa
 * dele — antes era re-registrado nos quatro módulos que emitem documento, o que
 * criava quatro instâncias do mesmo serviço sem estado.
 */
@Module({
  providers: [PdfDocumentService, LogoFetcherService],
  exports: [PdfDocumentService, LogoFetcherService],
})
export class PdfModule {}
