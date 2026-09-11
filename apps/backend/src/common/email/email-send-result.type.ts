/**
 * Desfecho de uma tentativa de envio.
 *
 * O adapter devolvia `void` e engolia tudo: quem chamava não tinha como saber
 * se o e-mail saiu. Isso é aceitável na criação de usuário, que não deve falhar
 * porque o SMTP caiu — mas é inaceitável num botão "enviar link", que
 * responderia sucesso com o envio pulado.
 */
export type EmailSendResult =
  | { sent: true }
  | { sent: false; reason: 'not_configured' | 'send_failed' | 'circuit_open' }
