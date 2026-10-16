import { useQueries } from '@tanstack/react-query'
import {
  listAppointmentPhotosUseCase,
  listVaccinationsUseCase,
  listVaccineIndicationsUseCase,
} from '@app/core'
import { DOCUMENT_KINDS } from '../../documents/hooks/use-documents.hook'
import type { AppointmentTab } from '../components/appointment-tabs'

/**
 * Quais abas esta pessoa vê, e o que cada uma conta.
 *
 * As chaves de cache são **as mesmas** que cada seção usa: a contagem e a
 * aba aberta compartilham a resposta em vez de pedirem duas vezes, e emitir
 * um documento atualiza as duas de uma só invalidação.
 *
 * As consultas ficam desabilitadas quando a aba não é oferecida — a recepção
 * não dispara seis requisições que o backend recusaria.
 */
export function useAppointmentTabs({
  appointmentId,
  canSeeMedicalRecord,
  canManage,
}: {
  appointmentId: string
  canSeeMedicalRecord: boolean
  canManage: boolean
}): AppointmentTab[] {
  const results = useQueries({
    queries: [
      {
        queryKey: ['documents', 'receita', appointmentId],
        queryFn: () => DOCUMENT_KINDS.receita.list(appointmentId),
        enabled: canManage,
      },
      {
        queryKey: ['documents', 'atestado', appointmentId],
        queryFn: () => DOCUMENT_KINDS.atestado.list(appointmentId),
        enabled: canManage,
      },
      {
        queryKey: ['documents', 'exame', appointmentId],
        queryFn: () => DOCUMENT_KINDS.exame.list(appointmentId),
        enabled: canManage,
      },
      {
        queryKey: ['consultation-photos', appointmentId],
        queryFn: () => listAppointmentPhotosUseCase(appointmentId),
        enabled: canManage,
      },
      {
        queryKey: ['vaccine-indications', appointmentId],
        queryFn: () => listVaccineIndicationsUseCase(appointmentId),
        enabled: canSeeMedicalRecord,
      },
      {
        // A caderneta é do paciente, mas a contagem da aba é **desta**
        // consulta: o que este atendimento lançou, não o histórico inteiro.
        queryKey: ['vaccinations', 'appointment', appointmentId],
        queryFn: () => listVaccinationsUseCase({ appointmentId, limit: 1 }),
        enabled: canSeeMedicalRecord,
      },
    ],
  })

  const [prescriptions, atestados, exames, photos, indications, vaccinations] = results

  function count(data: unknown): number {
    return (data as unknown[] | undefined)?.length ?? 0
  }

  return [
    { id: 'resumo', label: 'Resumo' },
    ...(canSeeMedicalRecord
      ? ([
          { id: 'prontuario', label: 'Prontuário' },
          // Ao lado do Prontuário de propósito: é o contexto que embasa o
          // que se escreve ali. Sem contagem — o número de atendimentos
          // anteriores não é pendência a zerar.
          { id: 'historico', label: 'Histórico' },
        ] as AppointmentTab[])
      : []),
    ...(canManage
      ? ([
          { id: 'receitas', label: 'Receitas', count: count(prescriptions.data) },
          { id: 'atestados', label: 'Atestados', count: count(atestados.data) },
          { id: 'exames', label: 'Exames', count: count(exames.data) },
          { id: 'fotos', label: 'Fotos', count: count(photos.data) },
        ] as AppointmentTab[])
      : []),
    ...(canSeeMedicalRecord
      ? ([
          {
            id: 'vacinas',
            label: 'Vacinas',
            count:
              (vaccinations.data?.total ?? 0) + count(indications.data),
          },
        ] as AppointmentTab[])
      : []),
  ]
}
