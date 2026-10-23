/**
 * Cor com transparência, para os preenchimentos que a web faz com `/10`.
 *
 * O Tailwind escreve `bg-accent/10` e o navegador resolve; o React Native não
 * tem essa sintaxe e aceita hexadecimal de oito dígitos. A conversão mora aqui
 * para que o percentual escrito no app seja o mesmo que está na classe da web.
 */
export function withAlpha(hex: string, percent: number): string {
  const alpha = Math.round((Math.min(Math.max(percent, 0), 100) / 100) * 255)
  return `${hex}${alpha.toString(16).padStart(2, '0').toUpperCase()}`
}
