export const HOUR_MS = 60 * 60 * 1000;

export type HourCount = { hour: Date; votes: number };

/**
 * Preenche as horas sem votos entre a primeira e a última, para o eixo do tempo ser
 * contínuo. Mostra no máximo as últimas `maxHours` horas. `hourly` vem ordenado.
 */
export function fillHours(hourly: HourCount[], maxHours: number): HourCount[] {
  if (hourly.length === 0) return [];
  const byTime = new Map(hourly.map((h) => [h.hour.getTime(), h.votes]));
  const last = hourly[hourly.length - 1].hour.getTime();
  const first = Math.max(hourly[0].hour.getTime(), last - (maxHours - 1) * HOUR_MS);
  const filled: HourCount[] = [];
  for (let t = first; t <= last; t += HOUR_MS) filled.push({ hour: new Date(t), votes: byTime.get(t) ?? 0 });
  return filled;
}
