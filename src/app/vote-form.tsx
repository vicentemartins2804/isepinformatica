"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { COLOR_OPTIONS, DESIGN_OPTIONS, mockupKey } from "@/lib/options";
import type { Mockup } from "@/lib/mockups";
import { submitVote, type VoteState } from "./actions";

/** Silhueta usada enquanto não existe mockup para a combinação. */
function SweatSilhouette({ hex }: { hex: string }) {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" aria-hidden>
      <path
        d="M70 30 Q100 46 130 30 L164 44 Q178 51 182 68 L196 138 Q197 147 188 149 L173 151 Q165 152 163 144 L155 96 L156 180 Q156 187 149 187 L51 187 Q44 187 44 180 L45 96 L37 144 Q35 152 27 151 L12 149 Q3 147 4 138 L18 68 Q22 51 36 44 Z"
        fill={hex}
        stroke="rgb(0 0 0 / 0.08)"
        strokeWidth="1.5"
        className="transition-[fill] duration-500"
      />
      <path d="M72 32 Q100 54 128 32" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="2" />
    </svg>
  );
}

export default function VoteForm({ mockups }: { mockups: Record<string, Mockup> }) {
  const [colorId, setColorId] = useState<string | null>(null);
  const [designId, setDesignId] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<VoteState, FormData>(submitVote, {
    status: "idle",
  });

  const missing: string[] = [];
  if (!colorId) missing.push("uma cor");
  if (!designId) missing.push("um design");
  const canSubmit = missing.length === 0;

  const color = COLOR_OPTIONS.find((c) => c.id === colorId);
  const design = DESIGN_OPTIONS.find((d) => d.id === designId);

  // O mockup mostra a combinação default até o estudante escolher; o voto exige escolha explícita.
  const previewColor = color ?? COLOR_OPTIONS[0];
  const previewDesign = design ?? DESIGN_OPTIONS[0];
  const previewKey = mockupKey(previewDesign.id, previewColor.id);
  const mockup = mockups[previewKey];

  if (state.status === "success") {
    return (
      <main className="flex flex-1 items-center justify-center px-6 py-16">
        <section role="status" className="flex max-w-sm animate-rise flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Obrigado<span className="text-accent">!</span>
          </h1>
          <p className="text-sm text-muted">
            O teu voto em <span className="text-foreground">{design?.name}</span>, cor{" "}
            <span className="text-foreground">{color?.name}</span>, foi registado.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <form action={formAction} className="flex w-full max-w-4xl animate-rise flex-col gap-8">
        <input type="hidden" name="colorId" value={colorId ?? ""} />
        <input type="hidden" name="designId" value={designId ?? ""} />

        <header className="flex flex-col items-center text-center">
          <h1 className="bg-gradient-to-r from-heading via-accent to-accent-light bg-clip-text pb-1 text-4xl font-extrabold tracking-tight text-transparent sm:text-5xl">
            Engenharia Informática
          </h1>
          <p className="mt-2 flex items-center gap-3 text-sm font-semibold tracking-[0.4em] text-heading">
            <span aria-hidden className="h-px w-10 bg-gradient-to-r from-transparent to-accent-light" />
            <span className="-mr-[0.4em]">ISEP</span>
            <span aria-hidden className="h-px w-10 bg-gradient-to-l from-transparent to-accent-light" />
          </p>
          <p className="mt-5 text-sm text-muted">Escolhe a cor e o design da sweat do curso. Sem conta, sem login.</p>
        </header>

        <div className="grid items-center gap-8 md:grid-cols-2">
          {/* Mockup — à direita em ecrã largo */}
          <figure className="flex flex-col items-center gap-3 md:order-last">
            <div
              key={previewKey}
              className="relative aspect-square w-full max-w-sm animate-fade-in overflow-hidden rounded-2xl bg-surface"
              style={mockup?.background ? { backgroundColor: mockup.background } : undefined}
            >
              {mockup ? (
                <Image
                  src={mockup.src}
                  alt={`Sweat ${previewDesign.name} em ${previewColor.name}`}
                  fill
                  preload
                  sizes="(min-width: 768px) 384px, 100vw"
                  className="object-contain"
                />
              ) : (
                <div className="p-10">
                  <SweatSilhouette hex={previewColor.hex} />
                </div>
              )}
            </div>
            <figcaption className="text-center text-xs text-muted">
              {previewDesign.name} · {previewColor.name}
              {!mockup && <span className="block opacity-70">mockup em falta: {previewKey}.png</span>}
            </figcaption>
          </figure>

          {/* Escolhas — à esquerda em ecrã largo */}
          <div className="flex flex-col gap-6">
            <fieldset>
              <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Cor</legend>
              <div className="flex items-center gap-3">
                {COLOR_OPTIONS.map((c) => {
                  const selected = c.id === colorId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={selected}
                      aria-label={c.name}
                      title={c.name}
                      onClick={() => setColorId(c.id)}
                      className={`h-8 w-8 rounded-full outline-none ring-offset-2 ring-offset-background transition-all focus-visible:ring-2 focus-visible:ring-accent-light ${
                        selected ? "ring-2 ring-accent" : "ring-1 ring-line hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.hex }}
                    />
                  );
                })}
                <span className="ml-1 text-sm">{color?.name}</span>
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">Design</legend>
              <div className="grid grid-cols-3 gap-2">
                {DESIGN_OPTIONS.map((d) => {
                  const selected = d.id === designId;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setDesignId(d.id)}
                      className={`h-10 rounded-lg border text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent-light ${
                        selected
                          ? "border-accent bg-accent-soft text-accent-hover"
                          : "border-line bg-background hover:border-accent-light"
                      }`}
                    >
                      {d.name}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="flex flex-col gap-2">
              <button
                type="submit"
                disabled={!canSubmit || pending}
                aria-describedby="vote-hint"
                className="h-10 rounded-lg bg-accent px-5 text-sm font-medium text-white outline-none transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent-light focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:bg-line disabled:text-muted"
              >
                {pending ? "A submeter…" : "Submeter voto"}
              </button>
              {state.status === "error" && (
                <p role="alert" className="text-xs text-danger">
                  {state.message}
                </p>
              )}
              <p id="vote-hint" role="status" className="text-xs text-muted">
                {canSubmit
                  ? `O teu voto: ${design?.name} em ${color?.name}.`
                  : `Seleciona ${missing.join(" e ")} para poderes submeter.`}
              </p>
            </div>
          </div>
        </div>
      </form>
    </main>
  );
}
