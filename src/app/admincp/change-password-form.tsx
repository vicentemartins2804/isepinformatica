"use client";

import { useActionState } from "react";
import { changePassword, type FormState } from "./actions";

const input =
  "h-10 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent-light";
const label = "text-xs font-medium uppercase tracking-wide text-muted";

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(changePassword, {});

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className={label}>Password atual</span>
        <input name="current" type="password" autoComplete="current-password" required className={input} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={label}>Nova password</span>
        <input name="next" type="password" autoComplete="new-password" minLength={12} required className={input} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={label}>Confirmar nova password</span>
        <input name="confirm" type="password" autoComplete="new-password" minLength={12} required className={input} />
      </label>

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

      <button
        type="submit"
        disabled={pending}
        className="mt-1 h-10 rounded-lg bg-accent px-5 text-sm font-medium text-white outline-none transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent-light focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "A alterar…" : "Alterar password"}
      </button>
    </form>
  );
}
