"use client";

import { useId } from "react";

type VotingModalProps = {
  title: string;
  children?: React.ReactNode;
  /** Botão de ação; sem ele a popup não se fecha (votação inexistente ou terminada). */
  action?: { label: string; onClick: () => void };
};

/** Popup mostrada por cima da página de voto, antes de se poder votar. */
export default function VotingModal({ title, children, action }: VotingModalProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/25 px-6 backdrop-blur-sm animate-fade-in">
      <div
        role={action ? "dialog" : "alertdialog"}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={children ? descriptionId : undefined}
        className="w-full max-w-sm rounded-2xl border border-line bg-background p-8 text-center shadow-xl animate-rise"
      >
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Engenharia Informática · ISEP</p>
        <h2 id={titleId} className="mt-3 text-2xl font-bold tracking-tight text-heading">
          {title}
        </h2>
        {children && (
          <div id={descriptionId} className="mt-2 text-sm text-muted">
            {children}
          </div>
        )}
        {action && (
          <button
            type="button"
            autoFocus
            onClick={action.onClick}
            className="mt-6 h-11 w-full rounded-lg bg-accent px-5 text-sm font-medium text-white outline-none transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent-light focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  );
}
