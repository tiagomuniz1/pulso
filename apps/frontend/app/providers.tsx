'use client'

import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'
import { setApiClient } from '@app/core'
import { apiClient } from '@/lib/api-client'
import { createQueryClient } from '@/lib/react-query.config'
import { useApplyTheme } from '@/hooks/use-apply-theme.hook'
import { installZodErrorMap } from '@/lib/zod-error-map'

// At module scope, so it is in place before any form schema is parsed. Error
// maps are consulted at parse time, so schemas defined earlier still get it.
installZodErrorMap()

// Também no escopo do módulo, e pelo mesmo motivo: os services do `@app/core`
// pedem o cliente na primeira chamada, e uma query pode disparar já no
// primeiro render. O core não conhece cookie nem `x-clinic-slug` — quem sabe
// disso é o `apiClient` da web, e é ele que entra aqui.
setApiClient(apiClient)

function ThemeApplier() {
  useApplyTheme()
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeApplier />
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
