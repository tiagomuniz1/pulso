/**
 * Ambiente dos testes de integração.
 *
 * `EMAIL_PROVIDER=smtp` sem `SMTP_HOST` é deliberado: mantém os testes fora da
 * rede. Sem isto, a ausência de `SMTP_HOST` faria o provedor cair em SES — que
 * é o certo em produção — e cada teste que cria usuário ou profissional tentaria
 * uma chamada real à AWS. Assim, o caminho exercitado é o de "não configurado",
 * determinístico e local.
 */
process.env.EMAIL_PROVIDER = 'smtp'
delete process.env.SMTP_HOST

/**
 * Throttling desligado por padrão na suíte.
 *
 * O `ThrottlerGuard` é global, e `POST /auth/login` tem limite de 10 por minuto.
 * Todo spec de integração loga pelo menos uma vez, muitos logam por role — com o
 * contador ligado, a suíte inteira cai em 429 a partir do primeiro minuto.
 *
 * O spec de throttling apaga esta variável para si e verifica o 429 de verdade.
 */
process.env.THROTTLE_DISABLED = 'true'
