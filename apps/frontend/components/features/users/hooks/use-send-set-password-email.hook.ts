'use client'

import { useMutation } from '@tanstack/react-query'
import { sendSetPasswordEmailUseCase } from '@app/core'

export function useSendSetPasswordEmail() {
  return useMutation({
    mutationFn: (id: string) => sendSetPasswordEmailUseCase(id),
  })
}
