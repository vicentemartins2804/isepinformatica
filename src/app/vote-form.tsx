"use client";

import { useActionState, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { COLOR_OPTIONS, DESIGN_OPTIONS } from "@/lib/options";
import { getVisitorId, hasVotedLocally, markVotedLocally } from "@/lib/fingerprint";
import { DUPLICATE_VOTE_MESSAGE } from "@/lib/messages";
import { imagesForSide, resolveMockupView, type MockupImage, type MockupSide } from "@/lib/mockup-view";
import { submitVote, type VoteState } from "./actions";
import Countdown from "./countdown";
import MockupImages from "./mockup-images";
import MockupZoom from "./mockup-zoom";
import VotingModal from "./voting-modal";

async function vote(prev: VoteState, formData: FormData): Promise<VoteState> {
  const round = Number(formData.get("round"));
  if (hasVotedLocally(round)) {
    return { status: "error", message: DUPLICATE_VOTE_MESSAGE, alreadyVoted: true };
  }

  try {
    formData.set("visitorId", await getVisitorId());
  } catch {
    return { status: "error", message: "Não foi possível identificar o dispositivo. Recarrega a página." };
  }

  const result = await submitVote(prev, formData);
  if (result.status === "success" || result.alreadyVoted) markVotedLocally(round);
  return result;
}

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

// Maior atraso aceite por setTimeout (~24,8 dias); acima disso o timer dispararia logo.
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

/** Estado da votação no momento do pedido: sem horário, por abrir, aberta ou já terminada. */
export type VotingPhase = "none" | "upcoming" | "open" | "closed";

type VoteFormProps = {
  mockups: Record<string, MockupImage>;
  phase: VotingPhase;
  /** Ronda atual da votação; a marca "já votei" do browser só conta para esta ronda. */
  round: number;
  /** Início programado (ISO), ou null se a votação abre logo. */
  start: string | null;
  /** Prazo da votação (ISO), ou null se não houver data de fecho. */
  deadline: string | null;
  /** Prazo já formatado em hora de Lisboa, para mostrar ao estudante. */
  deadlineLabel: string | null;
  /** Abertura já formatada em hora de Lisboa, ou null se não houver abertura programada. */
  startLabel: string | null;
};

const noopSubscribe = () => () => {};

export default function VoteForm({
  mockups,
  phase,
  round,
  start,
  deadline,
  deadlineLabel,
  startLabel,
}: VoteFormProps) {
  // Lido do localStorage depois da hidratação (no servidor é sempre `false`).
  const votedOnThisDevice = useSyncExternalStore(
    noopSubscribe,
    () => hasVotedLocally(round),
    () => false,
  );
  const [colorId, setColorId] = useState<string | null>(null);
  const [designId, setDesignId] = useState<string | null>(null);
  const [introDismissed, setIntroDismissed] = useState(false);
  const [side, setSide] = useState<MockupSide>("both");
  const [finalist, setFinalist] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const closeZoom = useCallback(() => setZoomed(false), []);
  // Fase atual: avança sozinha de "por abrir" para "aberta" e de "aberta" para "terminada".
  const [livePhase, setLivePhase] = useState<VotingPhase>(phase);
  const [state, formAction, pending] = useActionState<VoteState, FormData>(vote, {
    status: "idle",
  });

  // Muda de fase quando chega a hora de abertura ou de fecho com a página aberta.
  useEffect(() => {
    const boundary = livePhase === "upcoming" ? start : livePhase === "open" ? deadline : null;
    if (!boundary) return;
    const next: VotingPhase = livePhase === "upcoming" ? "open" : "closed";
    const remaining = new Date(boundary).getTime() - Date.now();
    if (remaining > MAX_TIMEOUT_MS) return;
    const timer = setTimeout(() => setLivePhase(next), Math.max(remaining, 0));
    return () => clearTimeout(timer);
  }, [livePhase, start, deadline]);

  // Sem votação a decorrer: o formulário não aparece, só a popup.
  const closed = livePhase !== "open" || state.closed === true;

  // Popups antes da votação: votação por abrir, convite para avançar, ou sem votação ativa
  // (sem horário definido ou depois do fecho, que mostram a mesma mensagem).
  let modal: React.ReactNode = null;
  if (livePhase === "upcoming") {
    modal = (
      <VotingModal title="A votação ainda não abriu">
        {startLabel && <p>Abre a {startLabel}.</p>}
        {start && <Countdown target={start} prefix="Faltam" className="mt-1" />}
      </VotingModal>
    );
  } else if (closed) {
    modal = (
      <VotingModal title="Não há nenhuma votação aberta">
        De momento não está a decorrer nenhuma votação. Volta mais tarde.
      </VotingModal>
    );
  } else if (!introDismissed) {
    modal = (
      <VotingModal
        title="A votação está aberta"
        action={{ label: "Avançar para a votação", onClick: () => setIntroDismissed(true) }}
      >
        Escolhe a cor e o design da sweat do curso.
      </VotingModal>
    );
  }

  const missing: string[] = [];
  if (!colorId) missing.push("uma cor");
  if (!designId) missing.push("um design");
  const canSubmit = missing.length === 0;

  const color = COLOR_OPTIONS.find((c) => c.id === colorId);
  const design = DESIGN_OPTIONS.find((d) => d.id === designId);

  // O mockup mostra a combinação default até o estudante escolher; o voto exige escolha explícita.
  const previewColor = color ?? COLOR_OPTIONS[0];
  const previewDesign = design ?? DESIGN_OPTIONS[0];
  // Versão finalista: só muda as costas. Sem o ficheiro finalista, mostra as costas normais.
  const view = resolveMockupView(mockups, previewDesign.id, previewColor.id, finalist);
  const hasMockup = !!(view.front || view.back);
  const describe = (image: MockupImage) =>
    `Sweat ${previewDesign.name} em ${previewColor.name}, ${
      image === view.front ? "frente" : view.finalistShown ? "costas, versão finalista" : "costas"
    }`;
  const shownImages = imagesForSide(view, side).map((image) => ({ ...image, alt: describe(image) }));
  const viewKey = `${previewDesign.id}-${previewColor.id}-${side}-${view.finalistShown}`;

  if (state.status === "success") {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
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

  // Este dispositivo já votou nesta ronda: mostra-o logo, em vez do formulário.
  if (livePhase === "open" && (votedOnThisDevice || state.alreadyVoted)) {
    return (
      <main className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 sm:py-16">
        <section role="status" className="flex max-w-sm animate-rise flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Já votaste, obrigado<span className="text-accent">!</span>
          </h1>
          <p className="text-sm text-muted">O voto deste dispositivo já está registado.</p>
        </section>
      </main>
    );
  }

  // Sem votação aberta (sem horário, por abrir ou terminada): só a popup, sem o formulário por trás.
  if (closed) {
    return <main className="flex-1">{modal}</main>;
  }

  return (
    <>
    {modal}
    <main inert={modal !== null} className="flex flex-1 items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <form
        action={formAction}
        // Gera o visitor_id logo na primeira interação, para a submissão não ter de esperar.
        onPointerDown={() => void getVisitorId().catch(() => {})}
        onFocus={() => void getVisitorId().catch(() => {})}
        className="flex w-full max-w-4xl animate-rise flex-col gap-8"
      >
        <input type="hidden" name="colorId" value={colorId ?? ""} />
        <input type="hidden" name="designId" value={designId ?? ""} />
        <input type="hidden" name="round" value={round} />

        <header className="flex flex-col items-center text-center">
          <h1 className="bg-gradient-to-r from-heading via-accent to-accent-light bg-clip-text pb-1 text-3xl font-extrabold tracking-tight text-transparent min-[400px]:text-4xl sm:text-5xl">
            Engenharia Informática
          </h1>
          <p className="mt-2 flex items-center gap-3 text-sm font-semibold tracking-[0.4em] text-heading">
            <span aria-hidden className="h-px w-10 bg-gradient-to-r from-transparent to-accent-light" />
            <span className="-mr-[0.4em]">ISEP</span>
            <span aria-hidden className="h-px w-10 bg-gradient-to-l from-transparent to-accent-light" />
          </p>
          <p className="mt-5 text-sm text-muted">Escolhe a cor e o design da sweat de curso.</p>
          {deadlineLabel && (
            <p className="mt-1 text-xs text-muted">
              Votação aberta até <span className="font-medium text-foreground">{deadlineLabel}</span>.
            </p>
          )}
          {deadline && <Countdown target={deadline} prefix="Fecha em" className="mt-1 text-sm text-muted" />}
        </header>

        <div className="grid items-center gap-8 lg:grid-cols-2">
          {/* Mockup — por cima em telemóvel e tablet, à direita em ecrã largo */}
          <figure className="flex flex-col items-center gap-3 lg:order-last">
            <div
              key={viewKey}
              className="relative aspect-[4/3] w-full max-w-md animate-fade-in overflow-hidden rounded-2xl bg-surface"
              style={view.front?.background ? { backgroundColor: view.front.background } : undefined}
            >
              {shownImages.length > 0 ? (
                // Frente e costas lado a lado ("Ambos"), ou só uma delas, centradas na caixa.
                // inset de 6% em cada eixo: a área interior mantém a proporção 4:3 da caixa.
                <div className="absolute inset-[6%]">
                  <MockupImages
                    images={shownImages}
                    containerAspect={4 / 3}
                    preload
                    sizes={`(min-width: 1024px) ${shownImages.length > 1 ? 224 : 448}px, ${
                      shownImages.length > 1 ? 50 : 100
                    }vw`}
                  />
                </div>
              ) : (
                <div className="p-10">
                  <SweatSilhouette hex={previewColor.hex} />
                </div>
              )}
              {shownImages.length > 0 && (
                <button
                  type="button"
                  onClick={() => setZoomed(true)}
                  aria-label="Ampliar imagem"
                  className="absolute inset-0 cursor-zoom-in rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-light"
                />
              )}
            </div>
            {zoomed && shownImages.length > 0 && (
              <MockupZoom images={shownImages} background={view.front?.background} onClose={closeZoom} />
            )}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {hasMockup && (
                <div role="group" aria-label="Parte da sweat a mostrar" className="flex rounded-lg border border-line bg-background p-0.5 text-xs font-medium">
                  {(
                    [
                      ["both", "Ambos"],
                      ["front", "Frente"],
                      ["back", "Costas"],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={side === value}
                      onClick={() => setSide(value)}
                      className={`h-7 rounded-md px-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent-light ${
                        side === value ? "bg-accent text-white" : "text-muted hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {/* Só muda a imagem mostrada: o voto continua a ser apenas a cor e o design. */}
              <button
                type="button"
                aria-pressed={finalist}
                onClick={() => {
                  // A versão finalista só muda as costas: se estiver na frente, passa para as costas.
                  if (!finalist && side === "front") setSide("back");
                  setFinalist(!finalist);
                }}
                className={`h-8 rounded-lg border px-3 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-accent-light ${
                  finalist
                    ? "border-accent bg-accent text-white"
                    : "border-line bg-background text-muted hover:text-foreground"
                }`}
              >
                Versão finalista
              </button>
            </div>
            {/* Só aparece para avisar de ficheiros em falta em public/mockups. */}
            {view.missing.length > 0 && (
              <figcaption className="text-center text-xs text-muted opacity-70">
                {view.missing.map((key) => (
                  <span key={key} className="block">
                    mockup em falta: {key}.png
                  </span>
                ))}
              </figcaption>
            )}
          </figure>

          {/* Escolhas — centradas em telemóvel e tablet, à esquerda em ecrã largo */}
          <div className="mx-auto flex w-full max-w-sm flex-col gap-6 text-center lg:mx-0 lg:max-w-none lg:text-left">
            <fieldset>
              <legend className="mb-2 w-full text-xs font-medium uppercase tracking-wide text-muted">Cor</legend>
              <div className="flex flex-wrap items-center justify-center gap-3 lg:justify-start">
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
                <span className="basis-full text-sm lg:ml-1 lg:basis-auto">{color?.name}</span>
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-2 w-full text-xs font-medium uppercase tracking-wide text-muted">Design</legend>
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
                {!canSubmit && `Seleciona ${missing.join(" e ")} para poderes submeter.`}
              </p>
            </div>
          </div>
        </div>
      </form>
    </main>
    </>
  );
}
