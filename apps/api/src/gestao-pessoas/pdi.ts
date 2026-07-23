/**
 * Regras puras do PDI (RN-GP-020), testáveis sem banco.
 */

/**
 * Progresso do plano = média do progresso das ações **ainda vivas**.
 *
 * Ação cancelada sai da conta: um plano com uma ação de 80% e outra cancelada
 * está 80% feito, não 40%. E ação concluída vale 100 mesmo que o número não
 * tenha sido fechado à mão — concluir é a fonte de verdade, o percentual é só o
 * caminho até lá.
 */
export function progressoDoPlano(acoes: { status: string; progresso: number }[]): number {
  const vivas = acoes.filter((a) => a.status !== 'CANCELADA');
  if (vivas.length === 0) return 0;
  const soma = vivas.reduce((s, a) => s + (a.status === 'CONCLUIDA' ? 100 : a.progresso), 0);
  return Math.round(soma / vivas.length);
}
