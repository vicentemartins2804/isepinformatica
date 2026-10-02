"use client";

import { useActionState } from "react";
import { CONTACT_TOPICS, EMAIL_MAX, MESSAGE_MAX, NAME_MAX } from "@/lib/contact";
import { submitContact, type ContactState } from "./actions";

const label = "text-xs font-medium uppercase tracking-wide text-muted";
const input =
  "rounded-lg border border-line bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus-visible:border-accent-light focus-visible:ring-2 focus-visible:ring-accent-light";

export default function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, { status: "idle" });
  // Depois de um erro, o React limpa o formulário: os valores voltam como defaultValue.
  const fields = state.fields;

  if (state.status === "success") {
    return (
      <section role="status" className="flex flex-col items-center gap-2 py-6 text-center">
        <h2 className="text-xl font-semibold tracking-tight text-heading">
          Mensagem enviada<span className="text-accent">!</span>
        </h2>
        <p>Respondemos para o email que indicaste.</p>
      </section>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={label}>Nome (opcional)</span>
          <input
            name="name"
            type="text"
            maxLength={NAME_MAX}
            autoComplete="name"
            defaultValue={fields?.name}
            className={input}
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>Email</span>
          <input
            name="email"
            type="email"
            required
            maxLength={EMAIL_MAX}
            autoComplete="email"
            defaultValue={fields?.email}
            className={input}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={label}>Assunto</span>
        <select name="topic" required defaultValue={fields?.topic ?? ""} className={input}>
          <option value="" disabled>
            Escolhe o assunto
          </option>
          {CONTACT_TOPICS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1.5">
        <span className={label}>Mensagem</span>
        <textarea
          name="message"
          required
          maxLength={MESSAGE_MAX}
          rows={6}
          defaultValue={fields?.message}
          className={`${input} resize-y`}
        />
      </label>

      <div className="flex flex-col gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-10 rounded-lg bg-accent px-5 text-sm font-medium text-white outline-none transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent-light focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "A enviar…" : "Enviar mensagem"}
        </button>
        {state.status === "error" && (
          <p role="alert" className="text-xs text-danger">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
