"use client";

import { useSyncExternalStore } from "react";
import { formatRemaining, URGENT_MS } from "@/lib/countdown";

function subscribe(onTick: () => void) {
  const timer = setInterval(onTick, 1000);
  return () => clearInterval(timer);
}

// Arredondado ao segundo, para o valor ser estável entre leituras do mesmo tique.
const getNow = () => Math.floor(Date.now() / 1000) * 1000;

type CountdownProps = {
  /** Instante alvo (ISO): o fecho ou a abertura da votação. */
  target: string;
  /** Texto antes do tempo, por exemplo "Fecha em". */
  prefix: string;
  className?: string;
};

/**
 * Contagem decrescente que se atualiza a cada segundo. No servidor não mostra nada, para
 * não haver diferenças de relógio na hidratação. A mudança de fase quando o tempo acaba
 * fica a cargo de quem a usa (VoteForm).
 */
export default function Countdown({ target, prefix, className = "" }: CountdownProps) {
  const now = useSyncExternalStore(subscribe, getNow, () => null);
  if (now === null) return null;

  const remaining = new Date(target).getTime() - now;
  if (remaining <= 0) return null;
  const urgent = remaining < URGENT_MS;

  return (
    <p className={`tabular-nums ${urgent ? "font-semibold text-danger" : ""} ${className}`}>
      {prefix} <span className={urgent ? "" : "font-semibold text-heading"}>{formatRemaining(remaining)}</span>
    </p>
  );
}
