export class SendSetPasswordEmailResponseDto {
  /**
   * Só vem `true`. Quando o e-mail não sai, o endpoint responde 503 com o
   * motivo em `detail` — o desfecho nunca chega disfarçado de sucesso.
   */
  sent!: true
}
