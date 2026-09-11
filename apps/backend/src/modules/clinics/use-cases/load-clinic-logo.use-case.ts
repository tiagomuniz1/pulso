import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import sharp from 'sharp'
import { BaseUseCase } from '../../../common/base.use-case'
import { IStorageAdapter } from '../../../common/adapters/storage.adapter.interface'
import { IClinicsRepository } from '../repositories/clinics.repository.interface'


const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
}

/**
 * O logo da clínica como data-URI, para embutir num PDF.
 *
 * **Lê direto do storage.** Antes isso era feito por HTTP contra a própria URL
 * pública da API (`https://api.../clinics/:slug/logo`): o backend saía pela
 * internet, passava por DNS, TLS, CloudFront e balanceador, e voltava para o
 * próprio container — para ler um arquivo que estava do lado dele. Qualquer
 * soluço em qualquer um desses saltos derrubava o logo do documento, em
 * silêncio, e foi o que aconteceu em produção.
 *
 * O data-URI é obrigatório e não uma conveniência: o pdfmake roda com
 * `setUrlAccessPolicy(() => false)` e não busca imagem nenhuma por conta
 * própria.
 *
 * **Nunca lança.** Um logo ilegível não pode impedir a emissão de uma receita
 * — devolve `null` e o documento sai sem ele. Mas agora o motivo vai para o
 * log: um `catch` que descartava o erro foi o que tornou o problema anterior
 * impossível de diagnosticar sem acesso à máquina.
 */
@Injectable()
export class LoadClinicLogoUseCase extends BaseUseCase {
  private readonly logger = new Logger(LoadClinicLogoUseCase.name)

  constructor(
    dataSource: DataSource,
    private readonly clinicsRepository: IClinicsRepository,
    private readonly storageAdapter: IStorageAdapter,
  ) {
    super(dataSource)
  }

  async execute(clinicId: string): Promise<string | null> {
    try {
      const clinic = await this.clinicsRepository.findById(clinicId)
      if (!clinic?.logoPath) return null

      const extension = clinic.logoPath.slice(clinic.logoPath.lastIndexOf('.') + 1).toLowerCase()
      const contentType = CONTENT_TYPE_BY_EXTENSION[extension]
      if (!contentType) {
        this.logger.warn('Unsupported logo format — generating PDF without logo', {
          context: LoadClinicLogoUseCase.name,
          clinicId,
          extension,
        })
        return null
      }

      const buffer = await this.storageAdapter.download(clinic.logoPath)

      // Ler os bytes antes de confiar na extensão. O upload só valida o
      // `mimetype` que o cliente manda, então um arquivo que apenas se diz PNG
      // chega intacto até aqui — e o pdfmake responde a uma imagem corrompida
      // com exceção, derrubando o documento inteiro. Uma clínica com um logo
      // ruim perderia toda receita, atestado e pedido de exame que emitisse.
      if (contentType === 'image/webp') {
        const converted = await sharp(buffer).png().toBuffer()
        return `data:image/png;base64,${converted.toString('base64')}`
      }

      await sharp(buffer).metadata()
      return `data:${contentType};base64,${buffer.toString('base64')}`
    } catch (error) {
      this.logger.warn('Could not read the clinic logo — generating PDF without logo', {
        context: LoadClinicLogoUseCase.name,
        clinicId,
        reason: error instanceof Error ? error.message : String(error),
      })
      return null
    }
  }
}
