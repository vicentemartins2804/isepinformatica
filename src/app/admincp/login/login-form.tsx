"use client";

import { useActionState } from "react";
import { login, type FormState } from "../actions";

const input =
  "h-10 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent-light";

export default function LoginForm({ from }: { from?: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(login, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {from && <input type="hidden" name="from" value={from} />}

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Utilizador</span>
        <input name="username" autoComplete="username" required autoFocus className={input} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className={input} />
      </label>

      {state.error && (
        <p role="alert" className="text-xs text-danger">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 h-10 rounded-lg bg-accent px-5 text-sm font-medium text-white outline-none transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent-light focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "A entrar…" : "Entrar"}
      </button>
    </form>
  );
}
