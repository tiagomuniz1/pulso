'use client'

import { useCallback, useState } from 'react'
import { AppointmentStatus, getPrimaryCouncilType } from '@app/shared'
import { Modal } from '@/components/ui/organisms/modal/modal'
import { Button } from '@/components/ui/atoms/button/button'
import { Alert } from '@/components/ui/molecules/alert/alert'
import { useMedicalRecordByAppointment } from '@/components/features/medical-records/hooks/use-medical-record-by-appointment.hook'
import { useTemplates } from '@/components/features/medical-record-templates/hooks/use-templates.hook'
import { useCreateMedicalRecord } from '@/components/features/medical-records/hooks/use-create-medical-record.hook'
import { useUpdateMedicalRecord } from '@/components/features/medical-records/hooks/use-update-medical-record.hook'
import { useProfessional } from '@/components/features/professionals/hooks/use-professional.hook'
import { MedicalRecordForm } from '@/components/features/medical-records/components/medical-record-form'
import { MedicalRecordView } from '@/components/features/medical-records/components/medical-record-view'
import { MedicalRecordFormSkeleton } from '@/components/features/medical-records/components/medical-record-form-skeleton'
import { MedicalRecordTemplatePicker } from '@/components/features/medical-records/components/medical-record-template-picker'
import { ChangeTemplateDialog } from '@/components/features/medical-records/components/change-template-dialog'
import { useTemplate } from '@/components/features/medical-record-templates/hooks/use-template.hook'
import type { IRecordFieldModel } from '@/components/features/medical-records/types/medical-record-model.types'
import type { ITemplateFieldModel } from '@/components/features/medical-record-templates/types/template-model.types'
import type { ITemplateListParams } from '@/components/features/medical-record-templates/services/medical-record-templates.service'
import type { IApiError } from '@/types/api.types'

type MedicalRecordMode = 'fill' | null

/**
 * Quantos modelos o seletor carrega. Alto de propósito: paginar a escolha
 * esconderia opções sem o profissional saber. O teto do backend é 100.
 */
export const TEMPLATE_PICKER_LIMIT = 50

export interface MedicalRecordSectionProps {
  appointmentId: string
  specialtyId: string | null
  professionalId: string
  appointmentStatus: AppointmentStatus
  canManage: boolean
}

function templateFieldToRecordField(f: ITemplateFieldModel, index: number): IRecordFieldModel {
  return {
    key: f.key ?? `field_${index}`,
    label: f.label,
    type: f.type,
    required: f.required,
    order: f.order,
    options: f.options,
    placeholder: f.placeholder,
    helpText: f.helpText,
    sectionKey: f.sectionKey,
  }
}

export function MedicalRecordSection({
  appointmentId,
  specialtyId,
  professionalId,
  appointmentStatus,
  canManage,
}: MedicalRecordSectionProps) {
  const [mode, setMode] = useState<MedicalRecordMode>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [isPicking, setIsPicking] = useState(false)
  // Troca aguardando confirmação. Enquanto não for nula, o modal externo não
  // fecha — ver o `onClose` abaixo.
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null)
  const [isFormDirty, setIsFormDirty] = useState(false)

  const { data: record, isLoading: isRecordLoading, isError: isRecordError } = useMedicalRecordByAppointment(appointmentId)

  const needsProfessionalLookup = !specialtyId
  const { data: professional, isLoading: isProfessionalLoading } = useProfessional(professionalId, {
    enabled: needsProfessionalLookup,
  })
  const councilType = professional ? getPrimaryCouncilType(professional.registrations) : undefined

  // Com prontuário salvo a lista não serve para nada: os campos vêm do snapshot
  // e o modelo não muda mais.
  const templateParams: ITemplateListParams | null = record
    ? null
    : specialtyId
      ? { specialtyId, limit: TEMPLATE_PICKER_LIMIT, isActive: true }
      : councilType
        ? { councilType, limit: TEMPLATE_PICKER_LIMIT, isActive: true }
        : null

  const {
    data: templateData,
    isLoading: isTemplateLoading,
    isError: isTemplateError,
    refetch: refetchTemplates,
  } = useTemplates(templateParams)

  // As seções não entram no snapshot do prontuário — só os campos. Buscar o
  // modelo exato pelo id que ficou gravado é o que impede um prontuário antigo
  // de ser agrupado pelas seções de outro modelo da mesma especialidade.
  const { data: recordTemplate } = useTemplate(record?.templateId ?? '')

  const isResolvingTemplate = record
    ? false
    : needsProfessionalLookup
      ? isProfessionalLoading || isTemplateLoading
      : isTemplateLoading

  const { mutate: createRecord, isPending: isCreating, error: createError } = useCreateMedicalRecord()
  const { mutate: updateRecord, isPending: isUpdating, error: updateError } = useUpdateMedicalRecord()

  // Estável para o efeito do formulário não disparar a cada render.
  const handleDirtyChange = useCallback((dirty: boolean) => setIsFormDirty(dirty), [])

  if (isRecordLoading) return null

  const templates = templateData?.data ?? []
  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  const schema: IRecordFieldModel[] = record
    ? record.schema
    : selectedTemplate
      ? selectedTemplate.fields
          .slice()
          .sort((a, b) => a.order - b.order)
          .map(templateFieldToRecordField)
      : []
  const sectionsSource = record ? recordTemplate : selectedTemplate
  const sections = sectionsSource?.sections.slice().sort((a, b) => a.order - b.order) ?? []

  // Sem nenhum modelo não há prontuário a preencher, e descobrir isso depois de
  // clicar era o comportamento antigo. O botão some e a mensagem diz a quem
  // pedir.
  const hasNoTemplate = !record && !isResolvingTemplate && !isTemplateError && templates.length === 0

  // Prontuário salvo vai direto ao formulário: o modelo dele está congelado.
  const isPickingTemplate = !record && (isPicking || !selectedTemplate)

  const isCompleted = appointmentStatus === AppointmentStatus.COMPLETED
  const canEdit = canManage && !isCompleted && !!record

  function closeFill() {
    setMode(null)
    setSelectedTemplateId(null)
    setIsPicking(false)
    setPendingTemplateId(null)
    setIsFormDirty(false)
  }

  function handlePick(templateId: string) {
    // Reescolher o mesmo modelo é desistir da troca.
    if (templateId === selectedTemplateId) {
      setIsPicking(false)
      return
    }
    // Só custa uma confirmação quando existe texto a perder.
    if (selectedTemplateId && isFormDirty) {
      setPendingTemplateId(templateId)
      return
    }
    setSelectedTemplateId(templateId)
    setIsPicking(false)
    setIsFormDirty(false)
  }

  function confirmTemplateChange() {
    setSelectedTemplateId(pendingTemplateId)
    setPendingTemplateId(null)
    setIsPicking(false)
    setIsFormDirty(false)
  }

  function handleCreateSubmit(data: Record<string, unknown>, notes?: string) {
    /* c8 ignore next */
    if (!selectedTemplateId) return
    createRecord(
      { appointmentId, templateId: selectedTemplateId, data, notes },
      {
        onSuccess: closeFill,
      },
    )
  }

  function handleUpdateSubmit(data: Record<string, unknown>, notes?: string) {
    /* c8 ignore next */
    if (!record) return
    updateRecord(
      { id: record.id, data: { data, notes } },
      {
        onSuccess: closeFill,
      },
    )
  }

  const createApiError = createError as IApiError | null
  const updateApiError = updateError as IApiError | null
  const formGlobalError =
    createApiError?.status === 409
      ? 'Esta consulta já possui prontuário.'
      : createApiError?.status === 422 || updateApiError?.status === 422
        ? 'Prontuário não pode ser editado após a conclusão da consulta.'
        : createApiError || updateApiError
          ? 'Ocorreu um erro ao salvar o prontuário.'
          : null

  // A failed read is not an empty prontuário. Rendering the empty state here told
  // the professional the record did not exist and invited them to write it again.
  if (isRecordError) {
    return (
      <Alert variant="error" data-testid="medical-record-error">
        Não foi possível carregar o prontuário desta consulta. Recarregue a página e tente novamente.
      </Alert>
    )
  }

  return (
    <>
      {!record && (
        <div className="rounded-xl border border-border bg-surface p-12 flex flex-col items-center gap-4 text-center">
          <div className="text-4xl" aria-hidden="true">📋</div>
          <h3 className="text-lg font-semibold text-text">Prontuário ainda não preenchido</h3>
          <p className="text-sm text-text-mute max-w-sm">
            Registre evolução, hipótese diagnóstica e conduta da consulta.
          </p>
          {canManage && !hasNoTemplate && (
            <Button
              type="button"
              onClick={() => {
                setIsPicking(true)
                setMode('fill')
              }}
              data-testid="fill-medical-record-button"
            >
              Preencher prontuário
            </Button>
          )}
          {canManage && hasNoTemplate && (
            <p className="max-w-sm text-sm text-text-mute" data-testid="no-template-empty-state">
              {specialtyId
                ? 'Nenhum modelo de prontuário cadastrado para esta especialidade.'
                : 'Nenhum modelo de prontuário cadastrado para a sua profissão.'}{' '}
              Peça ao administrador da clínica para cadastrar um.
            </p>
          )}
        </div>
      )}

      {record && (
        <>
          {canEdit && (
            <div className="flex justify-end mb-4">
              <Button
                type="button"
                onClick={() => setMode('fill')}
                data-testid="edit-medical-record-button"
              >
                Editar prontuário
              </Button>
            </div>
          )}
          <MedicalRecordView record={record} sections={sections} />
        </>
      )}

      <Modal
        isOpen={mode === 'fill'}
        // Enquanto o diálogo de troca está aberto o Escape chegaria aqui também
        // — o listener do Modal é no document — e fecharia os dois, jogando fora
        // justamente o texto que o diálogo existe para proteger.
        onClose={() => {
          if (pendingTemplateId === null) closeFill()
        }}
        title={record ? 'Editar prontuário' : isPickingTemplate ? 'Escolher modelo' : 'Preencher prontuário'}
        className="max-w-2xl"
        data-testid="medical-record-form-modal"
      >
        {isResolvingTemplate && <MedicalRecordFormSkeleton />}

        {!isResolvingTemplate && isPickingTemplate && (
          <MedicalRecordTemplatePicker
            templates={templates}
            isError={isTemplateError}
            onSelect={handlePick}
            onRetry={() => void refetchTemplates()}
            isGeneralist={!specialtyId}
          />
        )}

        {!isResolvingTemplate && schema.length > 0 && (
          // Escondido, não desmontado: desmontar levaria junto o estado do
          // react-hook-form, e cancelar a troca devolveria um formulário vazio —
          // exatamente o que a confirmação existe para evitar.
          <div className={isPickingTemplate ? 'hidden' : undefined}>
            {!record && selectedTemplate && (
              <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised px-3 py-2">
                <span className="text-sm text-text-dim">
                  Modelo:{' '}
                  <strong className="text-text" data-testid="selected-template-name">
                    {selectedTemplate.name}
                  </strong>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsPicking(true)}
                  data-testid="change-template-button"
                >
                  Trocar modelo
                </Button>
              </div>
            )}
            <MedicalRecordForm
              // Remonta ao trocar de modelo: `useForm` fixa os defaultValues no
              // mount e a aba ativa é estado local, então trocar só as props
              // deixaria valores e aba do modelo antigo pendurados.
              key={selectedTemplateId ?? record?.templateId}
              schema={schema}
              sections={sections}
              defaultData={record?.data}
              defaultNotes={record?.notes ?? undefined}
              isPending={isCreating || isUpdating}
              globalError={formGlobalError}
              onDirtyChange={record ? undefined : handleDirtyChange}
              onSubmit={record ? handleUpdateSubmit : handleCreateSubmit}
            />
          </div>
        )}
      </Modal>

      <ChangeTemplateDialog
        isOpen={pendingTemplateId !== null}
        onClose={() => setPendingTemplateId(null)}
        onConfirm={confirmTemplateChange}
      />

    </>
  )
}
