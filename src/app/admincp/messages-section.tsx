"use client";

import { useActionState, useState } from "react";
import { deleteSelectedMessages, type FormState } from "./actions";

const card = "rounded-2xl border border-line bg-surface/90 p-6 shadow-sm backdrop-blur";

export type MessageRow = {
  id: string;
  /** Data e hora já formatadas em hora de Lisboa. */
  time: string;
  name: string | null;
  email: string;
  topic: string;
  message: string;
};

/** Mensagens do formulário /contacto: ler, responder por email e apagar. */
export default function MessagesSection({ messages }: { messages: MessageRow[] | null }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, formData) => {
    const result = await deleteSelectedMessages(prev, formData);
    if (result.success) setSelected(new Set());
    return result;
  }, {});

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-heading">Mensagens de contacto</h2>
        {messages && messages.length > 0 && (
          <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent-hover">
            {messages.length}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">
        Enviadas pela página de contacto. Responde por email e apaga-as quando o assunto estiver resolvido. São apagadas
        automaticamente ao fim de 90 dias.
      </p>

      {messages === null ? (
        <p className="mt-4 text-sm text-danger">Não foi possível carregar as mensagens.</p>
      ) : messages.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Ainda não há mensagens.</p>
      ) : (
        <form action={action} className="mt-4 flex flex-col gap-3">
          {[...selected].map((id) => (
            <input key={id} type="hidden" name="ids" value={id} />
          ))}

          <ul className="flex max-h-[32rem] flex-col gap-3 overflow-auto">
            {messages.map((m) => (
              <li key={m.id} className="rounded-lg border border-line bg-background p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selected.has(m.id)}
                      onChange={() => toggle(m.id)}
                      aria-label={`Selecionar a mensagem de ${m.email}`}
                      className="mt-1 accent-[var(--accent)]"
                    />
                    <span>
                      <span className="font-medium text-heading">{m.name ?? "Sem nome"}</span>{" "}
                      <span className="text-muted">· {m.email}</span>
                      <span className="block text-xs text-muted">
                        {m.topic} · <span className="tabular-nums">{m.time}</span>
                      </span>
                    </span>
                  </label>
                  <a
                    href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.topic}`)}`}
                    className="text-xs font-medium text-accent hover:underline"
                  >
                    Responder
                  </a>
                </div>
                <p className="mt-3 whitespace-pre-wrap break-words text-foreground">{m.message}</p>
              </li>
            ))}
          </ul>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={pending || selected.size === 0}
              className="h-9 rounded-lg border border-danger/40 bg-background px-4 text-sm font-medium text-danger outline-none transition-colors hover:bg-danger/10 focus-visible:ring-2 focus-visible:ring-danger/40 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending ? "A apagar…" : `Apagar selecionadas${selected.size ? ` (${selected.size})` : ""}`}
            </button>
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
          </div>
        </form>
      )}
    </section>
  );
}
