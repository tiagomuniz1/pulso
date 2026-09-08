import { getEnvConfig } from '../../config/env.config'

/**
 * Códigos estáveis para os logs de e-mail.
 *
 * São o gancho do alarme no CloudWatch: o filtro de métrica casa a string, e
 * ela não pode mudar sem alguém trocar o alarme junto. Por isso vão no começo
 * da mensagem — o nível de log em produção é `warn`, então tudo aqui sai.
 */
export const EMAIL_LOG_CODES = {
  /** SMTP_HOST ausente: o envio é pulado, e nada chega ao destinatário. */
  NOT_CONFIGURED: 'EMAIL_NOT_CONFIGURED',
  /** O envio foi tentado e falhou (host errado, credencial inválida, timeout). */
  SEND_FAILED: 'EMAIL_SEND_FAILED',
  /** Falhas repetidas abriram o circuito: as próximas tentativas nem saem. */
  CIRCUIT_OPEN: 'EMAIL_CIRCUIT_OPEN',
} as const

/**
 * Como o e-mail sai.
 *
 * `ses` usa a API do SES autenticando pela role da instância — sem usuário nem
 * senha em lugar nenhum, que é o motivo de a infraestrutura ter sido preparada
 * assim (`ses:SendEmail` na role da EC2, em `modules/ec2-app/main.tf`).
 * `smtp` é o caminho do desenvolvimento local, onde não há role e o destino é
 * o mailpit.
 */
export type EmailProvider = 'ses' | 'smtp'

export interface EmailConfigStatus {
  provider: EmailProvider
  /** O mínimo que o provedor escolhido exige para tentar enviar. */
  configured: boolean
  /** Variáveis obrigatórias ausentes. */
  missing: string[]
  /**
   * Usuário sem senha ou senha sem usuário. Não impede a tentativa — há relay
   * que aceita conexão sem autenticação —, mas quase sempre é engano de
   * configuração, e vale aparecer no diagnóstico.
   */
  partialAuth: boolean
  host: string | null
  port: number
  from: string
}

/**
 * Fonte única sobre o estado da configuração de e-mail.
 *
 * Os adapters e o health check leem daqui de propósito: um health check que
 * verifica coisa diferente do que o código exige mente — diria "ok" com o envio
 * pulado, ou "erro" com o envio funcionando.
 */
export function resolveEmailConfigStatus(): EmailConfigStatus {
  const env = getEnvConfig()

  const host = env.SMTP_HOST ?? null

  // A escolha é por presença de host, não por variável nova: local tem
  // SMTP_HOST apontando para o mailpit, produção não tem nenhum — e lá a
  // autenticação é a role da instância. `EMAIL_PROVIDER` existe para forçar um
  // dos dois quando essa inferência não servir.
  const provider: EmailProvider =
    env.EMAIL_PROVIDER === 'ses' || env.EMAIL_PROVIDER === 'smtp'
      ? env.EMAIL_PROVIDER
      : host
        ? 'smtp'
        : 'ses'

  const missing: string[] = []
  if (provider === 'smtp' && !host) missing.push('SMTP_HOST')
  // No SES não há credencial a conferir: o remetente é o que precisa existir, e
  // o domínio dele tem de estar verificado na conta.
  if (provider === 'ses' && !env.SMTP_FROM) missing.push('SMTP_FROM')

  const hasUser = !!env.SMTP_USER
  const hasPass = !!env.SMTP_PASS

  return {
    provider,
    configured: missing.length === 0,
    missing,
    // Só faz sentido no SMTP: no SES não há usuário nem senha.
    partialAuth: provider === 'smtp' && hasUser !== hasPass,
    host,
    port: env.SMTP_PORT,
    from: env.SMTP_FROM,
  }
}
