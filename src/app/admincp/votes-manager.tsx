"use client";

import { useActionState, useState } from "react";
import { RESET_CONFIRMATION } from "@/lib/messages";
import { deleteSelectedVotes, resetVoting, type FormState } from "./actions";

const card = "rounded-2xl border border-line bg-surface/90 p-6 shadow-sm backdrop-blur";
const dangerButton =
  "h-9 rounded-lg border border-danger/40 bg-background px-4 text-sm font-medium text-danger outline-none transition-colors hover:bg-danger/10 focus-visible:ring-2 focus-visible:ring-danger/40 disabled:cursor-not-allowed disabled:opacity-50";

export type VoteRow = {
  id: string;
  /** Data e hora já formatadas em hora de Lisboa. */
  time: string;
  color: string;
  colorHex?: string;
  design: string;
  visitorId: string;
};

function Feedback({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <p role="alert" className="text-xs text-danger">
        {state.error}
      </p>
    );
  }
  if (state.success) {
    return (
      <p role="status" className="text-xs text-accent-hover">
        {state.success}
      </p>
    );
  }
  return null;
}

/** Tabela dos votos recentes, com seleção para anular, e reposição da votação a zeros. */
export default function VotesManager({ votes, total }: { votes: VoteRow[]; total: number }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [deleteState, deleteAction, deleting] = useActionState<FormState, FormData>(
    async (prev, formData) => {
      const result = await deleteSelectedVotes(prev, formData);
      if (result.success) setSelected(new Set());
      setConfirming(false);
      return result;
    },
    {},
  );
  const [resetState, resetAction, resetting] = useActionState<FormState, FormData>(resetVoting, {});

  const allSelected = votes.length > 0 && selected.size === votes.length;
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className={card}>
      <h2 className="font-semibold text-heading">Gerir votos</h2>
      <p className="mt-1 text-sm text-muted">
        Seleciona votos suspeitos para os anular. Cada anulação fica registada no registo do painel.
      </p>

      <form action={deleteAction} className="mt-4 flex flex-col gap-3">
        {[...selected].map((id) => (
          <input key={id} type="hidden" name="ids" value={id} />
        ))}

        {votes.length === 0 ? (
          <p className="text-sm text-muted">Ainda não há votos.</p>
        ) : (
          <div className="max-h-96 overflow-auto rounded-lg border border-line">
            <table className="w-full min-w-[32rem] text-left text-sm">
              <thead className="sticky top-0 bg-surface text-xs uppercase tracking-wide text-muted">
                <tr className="border-b border-line">
                  <th className="w-10 py-2 pl-3">
                    <input
                      type="checkbox"
                      aria-label="Selecionar todos"
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(votes.map((v) => v.id)))}
                      className="accent-[var(--accent)]"
                    />
                  </th>
                  <th className="py-2 pr-4 font-medium">#</th>
                  <th className="py-2 pr-4 font-medium">Data</th>
                  <th className="py-2 pr-4 font-medium">Design</th>
                  <th className="py-2 pr-4 font-medium">Cor</th>
                  <th className="py-2 pr-3 font-medium">Dispositivo</th>
                </tr>
              </thead>
              <tbody>
                {votes.map((v) => (
                  <tr
                    key={v.id}
                    className={`border-b border-line/60 last:border-0 ${selected.has(v.id) ? "bg-danger/5" : ""}`}
                  >
                    <td className="py-2 pl-3">
                      <input
                        type="checkbox"
                        aria-label={`Selecionar voto #${v.id}`}
                        checked={selected.has(v.id)}
                        onChange={() => toggle(v.id)}
                        className="accent-[var(--accent)]"
                      />
                    </td>
                    <td className="py-2 pr-4 tabular-nums text-muted">{v.id}</td>
                    <td className="whitespace-nowrap py-2 pr-4 tabular-nums">{v.time}</td>
                    <td className="py-2 pr-4">{v.design}</td>
                    <td className="py-2 pr-4">
                      <span className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full ring-1 ring-black/15" style={{ backgroundColor: v.colorHex }} />
                        {v.color}
                      </span>
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs text-muted" title={v.visitorId}>
                      {v.visitorId.slice(0, 10)}
                      {v.visitorId.length > 10 ? "…" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {total > votes.length && (
          <p className="text-xs text-muted">
            A mostrar os {votes.length} votos mais recentes de {total}.
          </p>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {confirming ? (
            <>
              <button type="submit" disabled={deleting} className={dangerButton}>
                {deleting ? "A anular…" : `Confirmar: anular ${selected.size} voto(s)`}
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="h-9 rounded-lg border border-line bg-background px-4 text-sm font-medium hover:border-accent-light"
              >
                Cancelar
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={selected.size === 0}
              onClick={() => setConfirming(true)}
              className={dangerButton}
            >
              Anular selecionados ({selected.size})
            </button>
          )}
          <Feedback state={deleteState} />
        </div>
      </form>

      <form action={resetAction} className="mt-6 flex flex-col gap-2 border-t border-line pt-5">
        <h3 className="text-sm font-semibold text-heading">Repor a votação a zeros</h3>
        <p className="text-xs text-muted">
          Apaga todos os votos e começa uma nova ronda (por exemplo, depois de um teste ou para uma segunda volta). Quem
          já votou pode voltar a votar. Esta ação não pode ser desfeita: exporta os dados antes, se precisares deles.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <input
            name="confirmation"
            autoComplete="off"
            placeholder={`Escreve ${RESET_CONFIRMATION}`}
            aria-label={`Escreve ${RESET_CONFIRMATION} para confirmar`}
            className="h-9 w-44 rounded-lg border border-line bg-background px-3 text-sm outline-none focus:border-danger"
          />
          <button type="submit" disabled={resetting} className={dangerButton}>
            {resetting ? "A repor…" : "Repor votação"}
          </button>
        </div>
        <Feedback state={resetState} />
      </form>
    </section>
  );
}
