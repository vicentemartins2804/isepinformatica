"use client";

import { useActionState } from "react";
import { setSchedule, type FormState } from "./actions";

const input =
  "h-10 w-full rounded-lg border border-line bg-background px-3 text-sm outline-none transition-colors focus:border-accent focus-visible:ring-2 focus-visible:ring-accent-light";
const label = "text-xs font-medium uppercase tracking-wide text-muted";

type ScheduleFormProps = {
  /** Valores atuais em hora de Lisboa, no formato do input ("2026-10-15T23:59"). */
  start: string | null;
  end: string | null;
};

export default function ScheduleForm({ start, end }: ScheduleFormProps) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(setSchedule, {});
  // Volta a montar os inputs quando os valores guardados mudam.
  const key = `${start ?? ""}|${end ?? ""}`;

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={label}>Abertura (opcional)</span>
          <input key={`start-${key}`} name="start" type="datetime-local" defaultValue={start ?? ""} className={input} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>Fecho</span>
          <input key={`end-${key}`} name="end" type="datetime-local" defaultValue={end ?? ""} className={input} />
        </label>
      </div>
      <p className="text-xs text-muted">Hora de Lisboa. Sem abertura, a votação abre logo que guardares.</p>

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

      <div className="flex gap-2">
        <button
          type="submit"
          name="intent"
          value="save"
          disabled={pending}
          className="h-10 flex-1 rounded-lg bg-accent px-5 text-sm font-medium text-white outline-none transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent-light focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
        >
          Guardar horário
        </button>
        {end && (
          <button
            type="submit"
            name="intent"
            value="remove"
            formNoValidate
            disabled={pending}
            className="h-10 rounded-lg border border-line bg-background px-4 text-sm font-medium outline-none transition-colors hover:border-accent-light focus-visible:ring-2 focus-visible:ring-accent-light disabled:opacity-60"
          >
            Remover
          </button>
        )}
      </div>
    </form>
  );
}
