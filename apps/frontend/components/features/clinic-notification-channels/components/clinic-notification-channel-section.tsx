'use client'

import { useState } from 'react'
import { NOTIFICATION_CHANNEL_ORDER, NOTIFICATION_CHANNELS, NotificationChannel } from '@app/shared'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useClinicNotificationChannels } from '../hooks/use-clinic-notification-channels.hook'
import { useDisableClinicNotificationChannel } from '../hooks/use-disable-clinic-notification-channel.hook'
import { useEnableClinicNotificationChannel } from '../hooks/use-enable-clinic-notification-channel.hook'

interface ClinicNotificationChannelSectionProps {
  clinicId: string
}

/**
 * Per-clinic opt-in for patient notifications, in the backoffice.
 *
 * The list is driven by NOTIFICATION_CHANNEL_ORDER rather than by what the API
 * returned: the clinic's rows say what is *on*, and the enum says what *exists*.
 * A channel added to the enum therefore shows up here with no change to this file.
 */
export function ClinicNotificationChannelSection({ clinicId }: ClinicNotificationChannelSectionProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pendingChannel, setPendingChannel] = useState<NotificationChannel | null>(null)

  const { data: enabled, isPending, isError } = useClinicNotificationChannels(clinicId)
  const { mutate: enableChannel } = useEnableClinicNotificationChannel(clinicId)
  const { mutate: disableChannel } = useDisableClinicNotificationChannel(clinicId)

  const enabledChannels = new Set((enabled ?? []).map((row) => row.channel))

  function flash(setter: (value: string | null) => void, message: string, ms: number) {
    setter(message)
    setTimeout(() => setter(null), ms)
  }

  function handleToggle(channel: NotificationChannel, shouldEnable: boolean) {
    const { label } = NOTIFICATION_CHANNELS[channel]
    setPendingChannel(channel)

    const onSettled = () => setPendingChannel(null)

    if (shouldEnable) {
      enableChannel(channel, {
        onSuccess: () => {
          onSettled()
          flash(setSuccessMessage, `${label} habilitado para esta clínica.`, 5000)
        },
        onError: () => {
          onSettled()
          flash(setErrorMessage, `Não foi possível habilitar ${label}. Tente novamente.`, 6000)
        },
      })
      return
    }

    disableChannel(channel, {
      onSuccess: () => {
        onSettled()
        flash(setSuccessMessage, `${label} desabilitado para esta clínica.`, 5000)
      },
      onError: () => {
        onSettled()
        flash(setErrorMessage, `Não foi possível desabilitar ${label}. Tente novamente.`, 6000)
      },
    })
  }

  return (
    <div
      className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm"
      data-testid="clinic-notification-channel-section"
    >
      <div className="border-b border-line px-6 py-3">
        <span className="text-xs font-medium uppercase tracking-wider text-text-mute">
          Notificações
        </span>
      </div>

      <div className="flex flex-col gap-4 px-6 py-4">
        {successMessage && (
          <Alert variant="success" data-testid="clinic-notification-channel-success">
            {successMessage}
          </Alert>
        )}

        {errorMessage && (
          <Alert variant="error" data-testid="clinic-notification-channel-error">
            {errorMessage}
          </Alert>
        )}

        {isPending && (
          <p className="text-sm text-text-dim" data-testid="clinic-notification-channel-loading">
            Carregando canais...
          </p>
        )}

        {isError && (
          <Alert variant="error" data-testid="clinic-notification-channel-list-error">
            Não foi possível carregar os canais de notificação.
          </Alert>
        )}

        {!isPending && !isError && (
          <>
            {/* Says what the switch actually does. Without it, "Notificações off"
                reads as a clinic preference rather than a platform decision. */}
            <p className="text-sm text-text-dim">
              Com nenhum canal habilitado, a clínica não envia notificação alguma às pacientes.
            </p>

            <ul className="flex flex-col gap-3" data-testid="clinic-notification-channel-list">
              {NOTIFICATION_CHANNEL_ORDER.map((channel) => {
                const { label, description } = NOTIFICATION_CHANNELS[channel]
                const isEnabled = enabledChannels.has(channel)

                return (
                  <li
                    key={channel}
                    className="flex items-start justify-between gap-4"
                    data-testid={`clinic-notification-channel-item-${channel}`}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-text">{label}</span>
                      <span className="text-xs text-text-dim">{description}</span>
                    </div>

                    <label className="flex shrink-0 cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        disabled={pendingChannel === channel}
                        onChange={(event) => handleToggle(channel, event.target.checked)}
                        data-testid={`clinic-notification-channel-toggle-${channel}`}
                      />
                      <span className="text-sm text-text">{isEnabled ? 'Ativo' : 'Inativo'}</span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  )
}
