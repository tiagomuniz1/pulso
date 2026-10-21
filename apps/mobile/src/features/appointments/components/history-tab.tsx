import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import {
  formatFieldValue,
  listPatientMedicalHistoryUseCase,
  type IMedicalRecordModel,
} from '@app/core'
import { TextField } from '../../../components/ui/fields'
import { ErrorState, LoadingState } from '../../../components/ui/screen'
import { useTheme } from '../../../theme/theme-context'
import { formatShortDate, formatTime } from '../utils/agenda-date.util'

/**
 * Uma página larga de propósito, como na web: a busca é local, e paginar em
 * dez faria o profissional procurar dentro de um pedaço do histórico sem
 * saber disso.
 */
const TAMANHO_DA_PAGINA = 50

/**
 * O que a busca varre de cada atendimento — rótulo e valor de cada campo, as
 * observações, quem atendeu e a data. Quem procura "cesárea" tanto pode estar
 * atrás de um campo quanto de uma anotação solta.
 */
function textoBuscavel(registro: IMedicalRecordModel): string {
  const campos = registro.schema
    .map((campo) => `${campo.label} ${formatFieldValue(campo, registro.data[campo.key])}`)
    .join(' ')

  return [
    formatShortDate(registro.appointmentDate),
    registro.appointmentStartTime,
    registro.professionalName,
    registro.specialtyName ?? '',
    campos,
    registro.notes ?? '',
  ]
    .join(' ')
    .toLowerCase()
}

/**
 * O histórico do paciente, usado em dois lugares.
 *
 * Dentro da consulta vem recortado: só a especialidade daquele atendimento, e
 * sem o prontuário que está sendo escrito. Na ficha do paciente vem inteiro —
 * ali a pergunta é "o que já aconteceu com esta pessoa", e recortar por uma
 * especialidade que não existe naquele contexto não faria sentido. Por isso
 * os dois recortes são opcionais: ausentes, o servidor devolve tudo o que o
 * perfil alcança.
 */
export function HistoryTab({
  patientId,
  specialtyId,
  appointmentId,
}: {
  patientId: string
  /**
   * Especialidade da consulta atual. `null` é o atendimento generalista —
   * que é diferente de `undefined`, "sem recorte nenhum".
   */
  specialtyId?: string | null
  /** A consulta atual não entra no próprio histórico. */
  appointmentId?: string
}) {
  const theme = useTheme()
  const [busca, setBusca] = useState('')
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['medical-records', 'history', patientId, specialtyId, appointmentId],
    queryFn: () =>
      listPatientMedicalHistoryUseCase(patientId, {
        // `undefined` some da query string; `'null'` pede exatamente os
        // prontuários de consulta sem especialidade.
        ...(specialtyId !== undefined ? { specialtyId: specialtyId ?? 'null' } : {}),
        ...(appointmentId !== undefined ? { excludeAppointmentId: appointmentId } : {}),
        limit: TAMANHO_DA_PAGINA,
      }),
  })

  // Derivado aqui, e não no corpo: durante o carregamento `data` é mesmo
  // `undefined`, e é o único lugar onde isso precisa ser dito.
  const registros = useMemo(() => data?.data ?? [], [data])
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
    <View style={styles.wrapper} testID="appointment-history-section">
      <Text style={[styles.title, { color: theme.text }]}>Histórico desta paciente</Text>
      <Text style={[styles.subtitle, { color: theme.textDim }]}>
        Atendimentos anteriores na mesma especialidade. Toque para ver o que foi registrado.
      </Text>

      {isLoading ? <LoadingState testID="appointment-history-loading" /> : null}

      {isError ? (
        <ErrorState
          testID="appointment-history-error"
          message="Erro ao carregar o histórico."
          onRetry={() => void refetch()}
        />
      ) : null}

      {!isLoading && !isError && registros.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textMute }]} testID="appointment-history-empty">
          Nenhum atendimento anterior desta paciente nesta especialidade.
        </Text>
      ) : null}

      {registros.length > 0 ? (
        <>
          <TextField
            label="Buscar no histórico"
            value={busca}
            onChange={setBusca}
            placeholder="Queixa, conduta, medicamento, profissional…"
            testID="appointment-history-search"
          />
          {/* Sem este aviso, a busca pareceria varrer tudo quando varre só o
              que foi carregado. */}
          {truncado ? (
            <Text
              style={[styles.truncated, { color: theme.textMute }]}
              testID="appointment-history-truncated"
            >
              Mostrando os {registros.length} atendimentos mais recentes de {total}. A busca
              alcança apenas estes.
            </Text>
          ) : null}
        </>
      ) : null}

      {registros.length > 0 && filtrados.length === 0 ? (
        <Text
          style={[styles.empty, { color: theme.textMute }]}
          testID="appointment-history-no-results"
        >
          Nenhum atendimento encontrado para “{busca}”.
        </Text>
      ) : null}

      {filtrados.map((registro) => {
        const aberto = expandidos.has(registro.id)
        return (
          <View
            key={registro.id}
            style={[styles.item, { borderRadius: theme.radius.md, borderColor: theme.line }]}
            testID={`appointment-history-item-${registro.id}`}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: aberto }}
              onPress={() => alternar(registro.id)}
              testID={`appointment-history-toggle-${registro.id}`}
              style={styles.itemHeader}
            >
              <View style={styles.itemText}>
                <Text style={[styles.itemDate, { color: theme.text }]}>
                  {formatShortDate(registro.appointmentDate)} às{' '}
                  {formatTime(registro.appointmentStartTime)}
                </Text>
                {/* Quem atendeu é o que situa o registro: com dois
                    profissionais na mesma especialidade, a conduta de um
                    explica o que o outro está lendo. */}
                <Text
                  style={[styles.itemProfessional, { color: theme.textMute }]}
                  numberOfLines={1}
                  testID={`appointment-history-professional-${registro.id}`}
                >
                  {registro.professionalName}
                  {registro.specialtyName ? ` • ${registro.specialtyName}` : ''}
                </Text>
              </View>
              <Text style={[styles.toggleLabel, { color: theme.textMute }]}>
                {aberto ? 'Recolher' : 'Ver detalhes'}
              </Text>
            </Pressable>

            {aberto ? (
              <View
                style={[styles.detail, { borderColor: theme.line }]}
                testID={`appointment-history-detail-${registro.id}`}
              >
                {registro.schema.map((campo) => (
                  <View key={campo.key} style={styles.field}>
                    <Text style={[styles.fieldLabel, { color: theme.textMute }]}>
                      {campo.label.toUpperCase()}
                    </Text>
                    <Text style={[styles.fieldValue, { color: theme.text }]}>
                      {formatFieldValue(campo, registro.data[campo.key])}
                    </Text>
                  </View>
                ))}

                {registro.notes ? (
                  <View style={styles.field}>
                    <Text style={[styles.fieldLabel, { color: theme.textMute }]}>OBSERVAÇÕES</Text>
                    <Text style={[styles.fieldValue, { color: theme.text }]}>{registro.notes}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  title: { fontSize: 17, fontWeight: '600' },
  subtitle: { fontSize: 13 },
  empty: { fontSize: 13, paddingVertical: 8 },
  truncated: { fontSize: 12 },
  item: { borderWidth: 1, overflow: 'hidden' },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
  },
  itemText: { flex: 1 },
  itemDate: { fontSize: 14, fontWeight: '500' },
  itemProfessional: { fontSize: 12 },
  toggleLabel: { fontSize: 12 },
  detail: { borderTopWidth: 1, paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  field: { gap: 2 },
  fieldLabel: { fontSize: 10, letterSpacing: 0.5 },
  fieldValue: { fontSize: 14 },
})
