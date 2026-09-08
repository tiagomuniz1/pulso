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
