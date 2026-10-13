import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createMedicalRecordUseCase,
  getMedicalRecordByAppointmentUseCase,
  listTemplatesUseCase,
  updateMedicalRecordUseCase,
  type IApiError,
  type IMedicalRecordModel,
} from '@app/core'

/**
 * O prontuário da consulta — `null` quando ainda não existe.
 *
 * O use-case já traduz o `404` do backend em `null`: consulta sem prontuário é
 * o caso comum, não falha, e deixá-lo chegar como erro faria toda consulta
 * ainda não atendida parecer quebrada.
 */
export function useMedicalRecordByAppointment(appointmentId: string) {
  return useQuery({
    queryKey: ['medical-record', 'by-appointment', appointmentId],
    queryFn: () => getMedicalRecordByAppointmentUseCase(appointmentId),
    enabled: Boolean(appointmentId),
  })
}

/**
 * Os modelos que este profissional pode usar nesta consulta.
 *
 * Só os ativos: desativar é como a clínica aposenta um modelo, e o backend
 * recusa criar prontuário com um inativo — oferecê-lo no seletor seria
 * oferecer um caminho que termina em 422.
 *
 * O recorte por escopo é do servidor: o PROFESSIONAL recebe apenas as
 * especialidades que exerce e o generalista da própria profissão.
 */
export function useActiveTemplates(specialtyId: string | null) {
  return useQuery({
    queryKey: ['medical-record-templates', 'active', specialtyId],
    queryFn: async () => {
      const page = await listTemplatesUseCase({
        isActive: true,
        limit: 100,
        ...(specialtyId ? { specialtyId } : { generalist: true }),
      })
      return page.data
    },
  })
}

export interface ISaveMedicalRecordInput {
  /** Ausente na criação; presente quando se está corrigindo o que já existe. */
  recordId: string | null
  appointmentId: string
  templateId: string
  data: Record<string, unknown>
  notes: string | null
}

/**
 * Criar e atualizar atrás de uma porta só.
 *
 * A tela é a mesma nos dois casos e a diferença — existir ou não um `recordId`
 * — é detalhe de transporte. Dois hooks obrigariam cada tela a decidir qual
 * chamar, e essa decisão não é dela.
 */
export function useSaveMedicalRecord(appointmentId: string) {
  const queryClient = useQueryClient()

  return useMutation<IMedicalRecordModel, IApiError, ISaveMedicalRecordInput>({
    mutationFn: (input) =>
      input.recordId
        ? updateMedicalRecordUseCase(input.recordId, {
            data: input.data,
            ...(input.notes === null ? {} : { notes: input.notes }),
          })
        : createMedicalRecordUseCase({
            appointmentId: input.appointmentId,
            templateId: input.templateId,
            data: input.data,
            ...(input.notes === null ? {} : { notes: input.notes }),
          }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['medical-record', 'by-appointment', appointmentId],
      })
    },
  })
}
