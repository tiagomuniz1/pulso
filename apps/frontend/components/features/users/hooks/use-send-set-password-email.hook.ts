'use client'

import { useMutation } from '@tanstack/react-query'
import { sendSetPasswordEmailUseCase } from '../use-cases/send-set-password-email.use-case'

export function useSendSetPasswordEmail() {
  return useMutation({
    mutationFn: (id: string) => sendSetPasswordEmailUseCase(id),
  })
}
