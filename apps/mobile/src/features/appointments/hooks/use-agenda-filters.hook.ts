import { useQuery } from '@tanstack/react-query'
import { listAppointmentLabelsUseCase, listProfessionalsUseCase } from '@app/core'

/**
 * Quem a barra da agenda oferece para filtrar.
 *
 * O PROFESSIONAL recebe apenas a própria ficha de `/professionals` — recorte
 * do servidor —, então a lista dele vem com um item e o seletor deixa de ter
 * para onde ir. É a mesma coisa que acontece na web.
 */
export function useAgendaProfessionals() {
  return useQuery({
    queryKey: ['professionals', 'agenda'],
    queryFn: () => listProfessionalsUseCase({ limit: 100 }),
    staleTime: 1000 * 60 * 5,
  })
}

/** Só os ativos: um rótulo aposentado continua colorindo, mas não filtra. */
export function useActiveAppointmentLabels() {
  return useQuery({
    queryKey: ['appointment-labels', 'active'],
    queryFn: () => listAppointmentLabelsUseCase({ isActive: true, limit: 100 }),
    staleTime: 1000 * 60 * 5,
  })
}
