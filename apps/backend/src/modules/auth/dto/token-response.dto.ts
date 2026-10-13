import { LoginResponseDto } from './login-response.dto'

/**
 * Credenciais para cliente nativo, que não tem cookie de navegador.
 *
 * `/auth/login` continua devolvendo os tokens só em `Set-Cookie` — é o que
 * protege a web de XSS, e há teste afirmando que o corpo não os contém. Este
 * contrato existe ao lado dele, não no lugar dele.
 *
 * Tempos em **segundos**, como em `RefreshResponseDto`. O `LoginUseCase`
 * devolve milissegundos porque é o que `response.cookie({ maxAge })` espera;
 * a conversão acontece no controller.
 */
export class TokenResponseDto {
  user: LoginResponseDto
  accessToken: string
  refreshToken: string
  expiresIn: number
  refreshTokenExpiresIn: number
}
