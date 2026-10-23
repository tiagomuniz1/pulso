/**
 * A idade é o que se lê de relance; a data de nascimento exige conta.
 *
 * Em horário local e não em UTC, pelo mesmo motivo do resto da agenda: às 21h
 * no Brasil o UTC já virou, e um aniversário hoje contaria como ontem.
 */
export function ageFrom(birthDate: Date, today: Date = new Date()): number {
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1
  return age
}
