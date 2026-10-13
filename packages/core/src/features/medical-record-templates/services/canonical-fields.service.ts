import { apiClient } from '../../../api/api-client.registry'
import type { CanonicalFieldResponseDto } from '@app/shared'

export const canonicalFieldsService = {
  getAll: () => apiClient.get<CanonicalFieldResponseDto[]>('/medical-record-canonical-fields'),
}
