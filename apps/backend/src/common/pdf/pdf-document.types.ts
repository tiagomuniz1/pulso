import { CouncilType } from '@app/shared'

/**
 * As partes que todo documento em PDF compartilha.
 *
 * Não são tipos novos: receita, atestado, pedido de exame e indicação de vacina
 * já declaram exatamente esta forma dentro dos respectivos `*-snapshot.type.ts`
 * em `packages/shared`. Aqui elas ganham nome para que o cabeçalho e o rodapé
 * possam ser escritos uma vez. Como o TypeScript é estrutural, cada snapshot
 * satisfaz estas interfaces sem conversão — e sem que `common/` precise
 * conhecer nenhum documento em particular.
 */

export interface PdfClinicAddress {
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  zipCode: string | null
}

export interface PdfClinic {
  name: string
  address: PdfClinicAddress | null
}

export interface PdfSignatory {
  name: string
  councilType: CouncilType
  registrationNumber: string
  registryNumber: string | null
  specialtyName: string | null
}

/** O que o rodapé de assinatura precisa saber — a forma comum aos quatro snapshots. */
export interface PdfSignedDocument {
  issuedAt: string
  clinic: PdfClinic
  professional: PdfSignatory
}
