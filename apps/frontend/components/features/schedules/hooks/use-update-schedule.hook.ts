import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useBasePath } from '@/lib/slug-context'
import { updateScheduleUseCase } from '@app/core'
import type { IUpdateScheduleInput } from '@app/core'
import type { IScheduleModel } from '@app/core'
import type { IApiError } from '@/types/api.types'

export function useUpdateSchedule() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const basePath = useBasePath()

  return useMutation<IScheduleModel, IApiError, { id: string; data: IUpdateScheduleInput }>({
    mutationFn: ({ id, data }) => updateScheduleUseCase(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] })
      queryClient.invalidateQueries({ queryKey: ['schedules', id] })
      router.push(`${basePath}/schedules/${id}`)
    },
  })
}
