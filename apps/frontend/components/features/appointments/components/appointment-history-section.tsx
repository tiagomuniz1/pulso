'use client'

import { useMemo, useState } from 'react'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Skeleton } from '@/components/ui/atoms/skeleton/skeleton'
import { usePatientMedicalHistory } from '@/components/features/medical-records/hooks/use-patient-medical-history.hook'
import { formatFieldValue } from '@/components/features/medical-records/utils/format-field-value.util'
import type {
  IMedicalRecordModel,
  IRecordFieldModel,
} from '@/components/features/medical-records/types/medical-record-model.types'

// Carrega uma página larga de propósito: a busca é local, e paginar em 10
// faria o médico procurar dentro de um pedaço do histórico sem saber disso.
// Acima disto a tela avisa que a busca não alcança o resto.
const TAMANHO_DA_PAGINA = 50

function formatarData(iso: string): string {
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

/** Valor legível de um campo, para exibir e para a busca encontrar. */
/**
 * O que a busca varre de cada atendimento. Inclui rótulo e valor de cada campo,
 * as observações, o nome do médico e a data — quem procura "cesárea" tanto pode
 * estar procurando um campo quanto uma anotação solta.
 */
function textoBuscavel(registro: IMedicalRecordModel): string {
  const campos = registro.schema
    .map((campo) => `${campo.label} ${formatFieldValue(campo, registro.data[campo.key])}`)
    .join(' ')

  return [
    formatarData(registro.appointmentDate),
    registro.appointmentStartTime,
    registro.professionalName,
    registro.specialtyName ?? '',
    campos,
    registro.notes ?? '',
  ]
    .join(' ')
    .toLowerCase()
}

interface AppointmentHistorySectionProps {
  patientId: string
  /** Especialidade da consulta atual. `null` é o atendimento generalista. */
  specialtyId: string | null
  /** A consulta atual não entra no próprio histórico. */
  appointmentId: string
}

export function AppointmentHistorySection({
  patientId,
  specialtyId,
  appointmentId,
}: AppointmentHistorySectionProps) {
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [busca, setBusca] = useState('')

  const { data, isPending, isError } = usePatientMedicalHistory(patientId, {
    // `'null'` pede exatamente os prontuários sem especialidade. Omitir traria
    // todas, o que é outra coisa.
    specialtyId: specialtyId ?? 'null',
    excludeAppointmentId: appointmentId,
    limit: TAMANHO_DA_PAGINA,
  })

  const registros = data?.data ?? []
  const total = data?.total ?? 0
  const truncado = total > registros.length

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return registros
    return registros.filter((registro) => textoBuscavel(registro).includes(termo))
  }, [registros, busca])

  function alternar(id: string) {
    setExpandidos((atual) => {
      const proximo = new Set(atual)
      if (proximo.has(id)) proximo.delete(id)
      else proximo.add(id)
      return proximo
    })
  }

  return (
    <div data-testid="appointment-history-section">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text">Histórico desta paciente</h2>
        <p className="text-sm text-text-mute">
          Atendimentos anteriores na mesma especialidade. Clique para ver o que foi registrado.
        </p>
      </div>

      {isPending && (
        <div className="flex flex-col gap-3" data-testid="appointment-history-skeleton">
          {[0, 1, 2].map((linha) => (
            <Skeleton key={linha} height={56} className="w-full" />
          ))}
        </div>
      )}

      {isError && !isPending && (
        <Alert variant="error" data-testid="appointment-history-error">
          Não foi possível carregar o histórico. Tente novamente.
        </Alert>
      )}

      {!isPending && !isError && registros.length === 0 && (
        <p className="text-sm text-text-mute" data-testid="appointment-history-empty">
          Nenhum atendimento anterior desta paciente nesta especialidade.
        </p>
      )}

      {!isPending && !isError && registros.length > 0 && (
        <>
          <div className="mb-3 flex flex-col gap-1.5">
            <label htmlFor="appointment-history-search" className="text-sm text-text-dim">
              Buscar no histórico
            </label>
            <input
              id="appointment-history-search"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
              placeholder="Queixa, conduta, medicamento, profissional…"
              data-testid="appointment-history-search"
              className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text sm:max-w-md"
            />
            {/* Sem este aviso, a busca pareceria varrer tudo quando varre só o
                que foi carregado. */}
            {truncado && (
              <span className="text-xs text-text-mute" data-testid="appointment-history-truncated">
                Mostrando os {registros.length} atendimentos mais recentes de {total}. A busca
                alcança apenas estes.
              </span>
            )}
          </div>

          {filtrados.length === 0 ? (
            <p className="text-sm text-text-mute" data-testid="appointment-history-no-results">
              Nenhum atendimento encontrado para “{busca}”.
            </p>
          ) : (
            <ul className="flex flex-col gap-2" data-testid="appointment-history-list">
              {filtrados.map((registro) => {
                const aberto = expandidos.has(registro.id)
                return (
                  <li
                    key={registro.id}
                    className="overflow-hidden rounded-xl border border-line bg-surface"
                    data-testid={`appointment-history-item-${registro.id}`}
                  >
                    <button
                      type="button"
                      onClick={() => alternar(registro.id)}
                      aria-expanded={aberto}
                      data-testid={`appointment-history-toggle-${registro.id}`}
                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-surface-raised"
                    >
                      <span className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-text">
                          {formatarData(registro.appointmentDate)}
                          <span className="font-normal text-text-mute">
                            {' '}
                            às {registro.appointmentStartTime}
                          </span>
                        </span>
                        {/* Quem atendeu é o que situa o registro: com dois
                            profissionais na mesma especialidade, a conduta de
                            um explica o que o outro está lendo. */}
                        <span
                          className="text-xs text-text-dim"
                          data-testid={`appointment-history-professional-${registro.id}`}
                        >
                          {registro.professionalName}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-text-mute">
                        {aberto ? 'Recolher' : 'Ver detalhes'}
                      </span>
                    </button>

                    {aberto && (
                      <div
                        className="border-t border-line px-4 py-4"
                        data-testid={`appointment-history-detail-${registro.id}`}
                      >
                        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {registro.schema.map((campo) => (
                            <div key={campo.key} className="flex flex-col gap-0.5">
                              <dt className="text-xs font-medium uppercase tracking-wider text-text-mute">
                                {campo.label}
                              </dt>
                              <dd className="text-sm text-text">
                                {formatFieldValue(campo, registro.data[campo.key])}
                              </dd>
                            </div>
                          ))}
                        </dl>

                        {registro.notes && (
                          <div className="mt-4 flex flex-col gap-0.5">
                            <span className="text-xs font-medium uppercase tracking-wider text-text-mute">
                              Observações
                            </span>
                            <p className="whitespace-pre-wrap text-sm text-text">
                              {registro.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
