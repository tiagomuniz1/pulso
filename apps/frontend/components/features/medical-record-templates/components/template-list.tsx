'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useBasePath } from '@/lib/slug-context'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { Button } from '@/components/ui/atoms/button/button'
import { MobileListCard } from '@/components/ui/molecules/mobile-list-card/mobile-list-card'
import { useAuthStore } from '@/stores/auth.store'
import { CouncilType, COUNCIL_TYPE_PROFESSION_LABELS, UserRole } from '@app/shared'
import { useClinicSpecialties } from '@/components/features/clinic-specialties/hooks/use-clinic-specialties.hook'
import { useTemplates } from '../hooks/use-templates.hook'
import { TemplateListSkeleton } from './template-list-skeleton'
import { professionLabel, specialtyLabel } from '../utils/template-labels'

const PAGE_SIZE = 20

// O backend trata `councilType` e `specialtyId` como mutuamente exclusivos — o
// ramo generalista vem primeiro e ignora a especialidade. O seletor é um só para
// a UI não oferecer uma combinação que o servidor descarta em silêncio.
const GENERALIST_PREFIX = 'generalist:'

function formatarData(data: Date): string {
  return data.toLocaleDateString('pt-BR')
}

export function TemplateList() {
  const basePath = useBasePath()
  const role = useAuthStore((s) => s.user?.role)
  // Modelo de prontuário é da clínica, não do profissional: criar e editar são
  // gestão do ADMIN. Ao médico cabe consultar — e a listagem que ele recebe já
  // vem recortada pelo backend às especialidades que ele exerce.
  const isAdmin = role === UserRole.ADMIN

  const [page, setPage] = useState(1)
  const [escopo, setEscopo] = useState('')

  const clinicId = useAuthStore((s) => s.user?.clinicId)
  const { data: clinicSpecialties } = useClinicSpecialties(clinicId ?? '', { limit: 100 })

  const councilType = escopo.startsWith(GENERALIST_PREFIX)
    ? (escopo.slice(GENERALIST_PREFIX.length) as CouncilType)
    : undefined
  const specialtyId = escopo && !councilType ? escopo : undefined

  const { data: paginated, isPending, isError } = useTemplates({
    page,
    limit: PAGE_SIZE,
    ...(specialtyId ? { specialtyId } : {}),
    ...(councilType ? { councilType } : {}),
  })

  // Trocar o filtro sem voltar à primeira página deixaria a tela vazia num
  // resultado que tem itens — a página 3 do filtro anterior raramente existe no
  // novo.
  useEffect(() => {
    setPage(1)
  }, [escopo])

  const totalPages = Math.max(1, Math.ceil((paginated?.total ?? 0) / PAGE_SIZE))

  return (
    <div className="flex flex-col gap-6" data-testid="template-list">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text">Modelos de prontuário</h1>
          {!isPending && !isError && paginated && (
            <p className="mt-0.5 text-sm text-text-dim">
              {paginated.total === 1 ? '1 modelo cadastrado' : `${paginated.total} modelos cadastrados`}
            </p>
          )}
        </div>
        {isAdmin && (
          <Link href={`${basePath}/medical-record-templates/new`} className="block sm:inline-block">
            <Button variant="primary" data-testid="template-list-new-button" className="w-full sm:w-auto">
              + Novo modelo
            </Button>
          </Link>
        )}
      </div>

      <div className="flex flex-col gap-1.5 sm:max-w-xs">
        <label htmlFor="template-list-filter-scope" className="text-sm text-text-dim">
          Filtrar por escopo
        </label>
        <select
          id="template-list-filter-scope"
          value={escopo}
          onChange={(evento) => setEscopo(evento.target.value)}
          data-testid="template-list-filter-scope"
          className="rounded-lg border border-line bg-surface px-3 py-2 text-sm text-text"
        >
          <option value="">Todos os escopos</option>
          <optgroup label="Especialidades">
            {(clinicSpecialties?.data ?? []).map((cs) => (
              <option key={cs.specialtyId} value={cs.specialtyId}>
                {cs.name}
              </option>
            ))}
          </optgroup>
          <optgroup label="Generalista por profissão">
            {Object.values(CouncilType).map((council) => (
              <option key={council} value={`${GENERALIST_PREFIX}${council}`}>
                {COUNCIL_TYPE_PROFESSION_LABELS[council]}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
        {isPending && <TemplateListSkeleton />}

        {isError && (
          <div className="p-6">
            <Alert variant="error" data-testid="template-list-error">
              Não foi possível carregar a lista de modelos. Tente novamente.
            </Alert>
          </div>
        )}

        {!isPending && !isError && (!paginated || paginated.data.length === 0) && (
          <div className="py-16 text-center" data-testid="template-list-empty">
            <p className="text-sm text-text-dim">Nenhum modelo de prontuário encontrado.</p>
          </div>
        )}

        {!isPending && !isError && paginated && paginated.data.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-left" data-testid="template-list-table">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Nome
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Profissão
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Especialidade
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Campos
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Atualizado em
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-medium uppercase tracking-wider text-text-mute">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginated.data.map((template) => (
                  <tr
                    key={template.id}
                    data-testid={`template-row-${template.id}`}
                    className="border-b border-line last:border-0 hover:bg-surface-2 transition-colors duration-100"
                  >
                    <td
                      className="px-6 py-4 text-sm font-medium text-text"
                      data-testid={`template-name-${template.id}`}
                    >
                      {template.name}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-text-dim"
                      data-testid={`template-profession-${template.id}`}
                    >
                      {professionLabel(template)}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-text-dim"
                      data-testid={`template-specialty-${template.id}`}
                    >
                      {specialtyLabel(template)}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-text-dim"
                      data-testid={`template-fields-count-${template.id}`}
                    >
                      {template.fields.length}
                    </td>
                    <td
                      className="px-6 py-4 text-sm text-text-dim"
                      data-testid={`template-updated-at-${template.id}`}
                    >
                      {formatarData(template.updatedAt)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        data-testid={`template-status-${template.id}`}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          template.isActive
                            ? 'bg-success/10 text-success'
                            : 'bg-line text-text-mute'
                        }`}
                      >
                        {template.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`${basePath}/medical-record-templates/${template.id}`}
                        data-testid={`template-view-link-${template.id}`}
                        className="text-xs text-text-mute hover:text-text transition-colors"
                      >
                        Ver detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isPending && !isError && paginated && paginated.data.length > 0 && (
          <ul className="flex flex-col gap-3 p-4 md:hidden" data-testid="template-list-cards">
            {paginated.data.map((template) => (
              <MobileListCard
                key={template.id}
                data-testid={`template-card-${template.id}`}
                title={template.name}
                rows={[
                  { label: 'Profissão', value: professionLabel(template) },
                  { label: 'Especialidade', value: specialtyLabel(template) },
                  { label: 'Campos', value: template.fields.length },
                  { label: 'Atualizado em', value: formatarData(template.updatedAt) },
                  {
                    label: 'Status',
                    value: (
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          template.isActive ? 'bg-success/10 text-success' : 'bg-line text-text-mute'
                        }`}
                      >
                        {template.isActive ? 'Ativo' : 'Inativo'}
                      </span>
                    ),
                  },
                ]}
                actions={
                  <Link
                    href={`${basePath}/medical-record-templates/${template.id}`}
                    data-testid={`template-card-view-link-${template.id}`}
                    className="flex items-center gap-1 text-xs text-text-mute transition-colors hover:text-text"
                  >
                    Ver detalhes
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                }
              />
            ))}
          </ul>
        )}
      </div>

      {!isPending && !isError && paginated && paginated.data.length > 0 && (
        <div className="flex items-center justify-between" data-testid="template-list-pagination">
          <span className="text-sm text-text-dim" data-testid="template-list-page-info">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((atual) => Math.max(1, atual - 1))}
              data-testid="template-list-prev-page"
            >
              Anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((atual) => Math.min(totalPages, atual + 1))}
              data-testid="template-list-next-page"
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
