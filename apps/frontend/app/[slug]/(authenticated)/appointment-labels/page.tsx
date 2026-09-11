'use client'

import { UserRole } from '@app/shared'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useAuthStore } from '@/stores/auth.store'
import { AppointmentLabelList } from '@/components/features/appointment-labels/components/appointment-label-list'

export default function AppointmentLabelsPage() {
  const role = useAuthStore((s) => s.user?.role)

  if (role !== UserRole.ADMIN) {
    return (
      <main className="max-w-3xl p-6" data-testid="appointment-labels-page">
        <Alert variant="error" data-testid="appointment-labels-page-forbidden">
          Você não tem permissão para acessar esta página.
        </Alert>
      </main>
    )
  }

  return (
    <main className="p-6 sm:p-8" data-testid="appointment-labels-page">
      <AppointmentLabelList />
    </main>
  )
}
