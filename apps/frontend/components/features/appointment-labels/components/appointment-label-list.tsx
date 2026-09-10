'use client'

import { useState } from 'react'
import { AppointmentLabelColor, APPOINTMENT_LABEL_COLOR_LABELS, UserRole } from '@app/shared'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { MobileListCard } from '@/components/ui/molecules/mobile-list-card/mobile-list-card'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { useAuthStore } from '@/stores/auth.store'
import type { IApiError } from '@/types/api.types'
import { useAppointmentLabels } from '../hooks/use-appointment-labels.hook'
import { useCreateAppointmentLabel } from '../hooks/use-create-appointment-label.hook'
import { useUpdateAppointmentLabel } from '../hooks/use-update-appointment-label.hook'
import { useDeleteAppointmentLabel } from '../hooks/use-delete-appointment-label.hook'
import { AppointmentLabelForm } from './appointment-label-form'
import { AppointmentLabelPill } from './appointment-label-pill'
import { AppointmentLabelDeleteDialog } from './appointment-label-delete-dialog'
import type { IAppointmentLabelModel } from '../types/appointment-label-model.types'

const PAGE_SIZE = 50

export function AppointmentLabelList() {
  const role = useAuthStore((s) => s.user?.role)
  const isAdmin = role === UserRole.ADMIN

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [emEdicao, setEmEdicao] = useState<IAppointmentLabelModel | null>(null)
  const [paraExcluir, setParaExcluir] = useState<IAppointmentLabelModel | null>(null)
  const [erroGlobal, setErroGlobal] = useState<string | null>(null)

  const { data: paginated, isPending, isError } = useAppointmentLabels({ limit: PAGE_SIZE })
  const { mutate: criar, isPending: criando } = useCreateAppointmentLabel()
  const { mutate: atualizar, isPending: atualizando } = useUpdateAppointmentLabel()
  const { mutate: excluir, isPending: excluindo } = useDeleteAppointmentLabel()

  const labels = paginated?.data ?? []

  function mapearErro(error: unknown): string {
    const apiError = error as IApiError
    if (apiError?.status === 409) return 'Já existe um rótulo com esse nome. Escolha outro nome.'
    return 'Não foi possível salvar o rótulo. Tente novamente.'
  }

  function handleCreate(values: { name: string; color: AppointmentLabelColor }) {
    setErroGlobal(null)
    criar(values, {
      onSuccess: () => setIsCreateOpen(false),
      onError: (error) => setErroGlobal(mapearErro(error)),
    })
  }

  function handleUpdate(values: { name: string; color: AppointmentLabelColor }) {
    if (!emEdicao) return
    setErroGlobal(null)
    atualizar(
      { id: emEdicao.id, data: values },
      {
        onSuccess: () => setEmEdicao(null),
        onError: (error) => setErroGlobal(mapearErro(error)),
      },
    )
  }

  function alternarAtivo(label: IAppointmentLabelModel) {
    atualizar({ id: label.id, data: { isActive: !label.isActive } })
  }

  return (
    <div className="flex flex-col gap-6" data-testid="appointment-label-list">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Rótulos de consulta</h1>
          <p className="mt-0.5 text-sm text-text-dim">
            Cores para distinguir as consultas na agenda de relance. Cada consulta recebe um rótulo.
          </p>
        </div>
        {isAdmin && (
          <Button
            variant="primary"
            className="w-full sm:w-auto"
            onClick={() => {
              setErroGlobal(null)
              setIsCreateOpen(true)
            }}
            data-testid="appointment-label-list-new-button"
          >
            + Novo rótulo
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {isPending && (
          <div className="flex flex-col gap-3 p-6" data-testid="appointment-label-list-skeleton">
            {[0, 1, 2].map((linha) => (
              <Skeleton key={linha} height={44} className="w-full" />
            ))}
          </div>
        )}

        {isError && (
          <div className="p-6">
            <Alert variant="error" data-testid="appointment-label-list-error">
              Não foi possível carregar os rótulos. Tente novamente.
            </Alert>
          </div>
        )}

        {!isPending && !isError && labels.length === 0 && (
          <div className="py-16 text-center" data-testid="appointment-label-list-empty">
            <p className="text-sm text-text-dim">Nenhum rótulo cadastrado ainda.</p>
          </div>
        )}

        {!isPending && !isError && labels.length > 0 && (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left" data-testid="appointment-label-list-table">
                <thead>
                  <tr className="border-b border-line">
                    {['Rótulo', 'Cor', 'Status', 'Ações'].map((coluna) => (
                      <th
                        key={coluna}
                        className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute"
                      >
                        {coluna}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {labels.map((label) => (
                    <tr
                      key={label.id}
                      data-testid={`appointment-label-row-${label.id}`}
                      className="border-b border-line transition-colors duration-100 last:border-0 hover:bg-surface-2"
                    >
                      <td className="px-6 py-4">
                        <AppointmentLabelPill
                          name={label.name}
                          color={label.color}
                          data-testid={`appointment-label-pill-${label.id}`}
                        />
                      </td>
                      <td
                        className="px-6 py-4 text-sm text-text-dim"
                        data-testid={`appointment-label-color-name-${label.id}`}
                      >
                        {APPOINTMENT_LABEL_COLOR_LABELS[label.color]}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          data-testid={`appointment-label-status-${label.id}`}
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            label.isActive ? 'bg-good-soft text-good' : 'bg-line text-text-mute'
                          }`}
                        >
                          {label.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isAdmin && (
                          <div className="flex items-center gap-3 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setErroGlobal(null)
                                setEmEdicao(label)
                              }}
                              className="text-text-mute transition-colors hover:text-text"
                              data-testid={`appointment-label-edit-${label.id}`}
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => alternarAtivo(label)}
                              className="text-text-mute transition-colors hover:text-text"
                              data-testid={`appointment-label-toggle-${label.id}`}
                            >
                              {label.isActive ? 'Desativar' : 'Reativar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setParaExcluir(label)}
                              className="text-text-mute transition-colors hover:text-danger"
                              data-testid={`appointment-label-delete-${label.id}`}
                            >
                              Excluir
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul
              className="flex flex-col gap-3 p-4 md:hidden"
              data-testid="appointment-label-list-cards"
            >
              {labels.map((label) => (
                <MobileListCard
                  key={label.id}
                  data-testid={`appointment-label-card-${label.id}`}
                  title={label.name}
                  rows={[
                    { label: 'Cor', value: APPOINTMENT_LABEL_COLOR_LABELS[label.color] },
                    { label: 'Status', value: label.isActive ? 'Ativo' : 'Inativo' },
                  ]}
                  actions={
                    isAdmin ? (
                      <button
                        type="button"
                        onClick={() => setEmEdicao(label)}
                        className="text-xs text-text-mute transition-colors hover:text-text"
                        data-testid={`appointment-label-card-edit-${label.id}`}
                      >
                        Editar
                      </button>
                    ) : null
                  }
                />
              ))}
            </ul>
          </>
        )}
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Novo rótulo"
        data-testid="appointment-label-create-modal"
      >
        <AppointmentLabelForm
          isPending={criando}
          globalError={erroGlobal}
          onSubmit={handleCreate}
        />
      </Modal>

      <Modal
        isOpen={emEdicao !== null}
        onClose={() => setEmEdicao(null)}
        title="Editar rótulo"
        data-testid="appointment-label-edit-modal"
      >
        {emEdicao && (
          <AppointmentLabelForm
            key={emEdicao.id}
            label={emEdicao}
            isPending={atualizando}
            globalError={erroGlobal}
            onSubmit={handleUpdate}
          />
        )}
      </Modal>

      <AppointmentLabelDeleteDialog
        label={paraExcluir}
        isOpen={paraExcluir !== null}
        isPending={excluindo}
        onClose={() => setParaExcluir(null)}
        onConfirm={() => {
          if (!paraExcluir) return
          excluir(paraExcluir.id, { onSuccess: () => setParaExcluir(null) })
        }}
      />
    </div>
  )
}
