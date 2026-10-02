const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Abaixo disto a contagem fica em destaque ("últimas horas"). */
export const URGENT_MS = 3 * HOUR;

/**
 * Tempo que falta, em português e só com as duas unidades maiores:
 * "2 dias e 4 h", "4 h e 12 min", "12 min e 05 s", "45 s".
 */
export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.floor(ms / SECOND)) * SECOND;
  const days = Math.floor(total / DAY);
  const hours = Math.floor((total % DAY) / HOUR);
  const minutes = Math.floor((total % HOUR) / MINUTE);
  const seconds = Math.floor((total % MINUTE) / SECOND);

  if (days > 0) {
    const d = `${days} ${days === 1 ? "dia" : "dias"}`;
    return hours > 0 ? `${d} e ${hours} h` : d;
  }
  if (hours > 0) return minutes > 0 ? `${hours} h e ${minutes} min` : `${hours} h`;
  if (minutes > 0) return `${minutes} min e ${String(seconds).padStart(2, "0")} s`;
  return `${seconds} s`;
}
