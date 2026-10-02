"use client";

import { useActionState } from "react";
import { anonymizeData, type FormState } from "./actions";

const card = "rounded-2xl border border-line bg-surface/90 p-6 shadow-sm backdrop-blur";

type PrivacySectionProps = {
  /** Votos que ainda têm a identificação do dispositivo. */
  identifiable: number | null;
  votingOpen: boolean;
  /** A votação já terminou (há fecho e já passou). */
  votingEnded: boolean;
};

/** RGPD: anonimizar os votos depois de a votação terminar. */
export default function PrivacySection({ identifiable, votingOpen, votingEnded }: PrivacySectionProps) {
  const [state, action, pending] = useActionState<FormState>(anonymizeData, {});

  return (
    <section className={card}>
      <h2 className="font-semibold text-heading">Dados pessoais (RGPD)</h2>
      <p className="mt-2 text-sm text-muted">
        A identificação do dispositivo só é precisa enquanto a votação está aberta. Segundo a página de privacidade, é
        apagada até 30 dias depois do fecho. Os registos do painel (IP e browser) apagam-se sozinhos ao fim de 90 dias.
      </p>
      <p className="mt-2 text-sm">
        {identifiable === null ? (
          <span className="text-danger">Não foi possível contar os votos identificáveis.</span>
        ) : (
          <>
            <span className="font-semibold tabular-nums text-heading">{identifiable}</span>{" "}
            <span className="text-muted">voto(s) ainda com identificação do dispositivo.</span>
          </>
        )}
      </p>
      {votingEnded && (identifiable ?? 0) > 0 && (
        <p className="mt-2 rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">
          ! A votação terminou: anonimiza os dados nos próximos 30 dias.
        </p>
      )}

      <form action={action} className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending || votingOpen || identifiable === 0}
          className="h-9 rounded-lg bg-accent px-4 text-sm font-medium text-white outline-none transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent-light disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "A anonimizar…" : "Anonimizar agora"}
        </button>
        {votingOpen && <span className="text-xs text-muted">Disponível depois de a votação fechar.</span>}
        {state.error && (
          <p role="alert" className="text-xs text-danger">
            {state.error}
          </p>
        )}
        {state.success && (
          <p role="status" className="text-xs text-accent-hover">
            {state.success}
          </p>
        )}
      </form>
    </section>
  );
}
