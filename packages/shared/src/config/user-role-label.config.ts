import { UserRole } from '../enums/user-role.enum'

/**
 * Como cada perfil se chama na tela, em dois registros.
 *
 * São dois de propósito: o selo da listagem tem a largura de uma coluna e
 * diz "Admin"; o seletor de perfil tem a linha inteira e diz
 * "Administrador". Vieram para cá porque a web e o app escrevem os mesmos
 * nomes — e porque a divergência seria silenciosa: "Usuário" num lado e
 * "Recepcionista" no outro passa em todo teste e confunde quem usa os dois.
 *
 * Antes havia duas constantes chamadas `USER_ROLE_LABELS` na web, com
 * valores diferentes, em arquivos diferentes.
 *
 * A **cor** de cada selo fica em cada interface, como a paleta de rótulos de
 * consulta: lá são classes do Tailwind, aqui são tokens do tema.
 */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Administrador',
  [UserRole.PROFESSIONAL]: 'Profissional',
  [UserRole.USER]: 'Recepcionista',
  [UserRole.PATIENT]: 'Paciente',
  [UserRole.PLATFORM_ADMIN]: 'Platform Admin',
}

/** A forma curta, para o selo da listagem. */
export const USER_ROLE_SHORT_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Admin',
  [UserRole.PROFESSIONAL]: 'Profissional',
  [UserRole.USER]: 'Usuário',
  [UserRole.PATIENT]: 'Paciente',
  [UserRole.PLATFORM_ADMIN]: 'Platform Admin',
}

/** O que cada perfil de fato faz — espelhado de `ai/context/permissions.md`. */
export const USER_ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  [UserRole.ADMIN]:
    'Acesso total: gerencia usuários, profissionais, pacientes, agendas e todas as consultas.',
  [UserRole.PROFESSIONAL]:
    'Gerencia a própria agenda e consultas. Não vê dados de outros profissionais.',
  [UserRole.USER]:
    'Consulta pacientes, profissionais e consultas (leitura). Não cria nem cancela consultas.',
  [UserRole.PATIENT]: 'Não acessa o sistema — apenas vinculado a consultas.',
  [UserRole.PLATFORM_ADMIN]: 'Gerencia o backoffice da plataforma (catálogos, medicamentos).',
}
