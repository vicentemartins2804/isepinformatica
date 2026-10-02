import type { HourlyVotes, PeakMinute } from "@/lib/db";
import { fillHours } from "@/lib/timeline";

const card = "rounded-2xl border border-line bg-surface/90 p-6 shadow-sm backdrop-blur";
/** Mostra no máximo as últimas 2 semanas, para as barras não ficarem finas demais. */
const MAX_HOURS = 14 * 24;
/** A partir de quantos votos num só minuto o pico é assinalado como invulgar. */
const SUSPICIOUS_PER_MINUTE = 20;

const numberFormat = new Intl.NumberFormat("pt-PT");
const timeLabel = new Intl.DateTimeFormat("pt-PT", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Lisbon",
});

// Geometria do gráfico (unidades do viewBox).
const W = 800;
const H = 220;
const PAD = { top: 12, right: 8, bottom: 28, left: 36 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

export default function VoteTimeline({ hourly, peak }: { hourly: HourlyVotes[]; peak: PeakMinute }) {
  const hours = fillHours(hourly, MAX_HOURS);
  const max = Math.max(1, ...hours.map((h) => h.votes));
  const slot = hours.length > 0 ? PLOT_W / hours.length : PLOT_W;
  const gap = slot > 6 ? 2 : 0;
  const barW = Math.max(1, slot - gap);
  // Até ~6 etiquetas no eixo do tempo.
  const tickEvery = Math.max(1, Math.ceil(hours.length / 6));
  const suspicious = peak !== null && peak.votes >= SUSPICIOUS_PER_MINUTE;

  return (
    <section className={card}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-heading">Votos ao longo do tempo</h2>
          <p className="mt-1 text-sm text-muted">Votos por hora (hora de Lisboa). Passa o rato por uma barra para ver o valor.</p>
        </div>
        <div className="text-right text-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">Pico num minuto</p>
          {peak ? (
            <p className="flex items-center justify-end gap-2">
              <span className="text-xl font-bold tabular-nums text-heading">{numberFormat.format(peak.votes)}</span>
              <span className="text-muted">às {timeLabel.format(peak.minute)}</span>
              {suspicious && (
                <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">! Invulgar</span>
              )}
            </p>
          ) : (
            <p className="text-muted">—</p>
          )}
        </div>
      </div>

      {hours.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Ainda não há votos.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="h-auto w-full min-w-[32rem]"
            role="img"
            aria-label={`Votos por hora: máximo de ${max} votos numa hora.`}
          >
            {/* Grelha discreta: linha de base e linha do máximo */}
            <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + PLOT_H} y2={PAD.top + PLOT_H} stroke="var(--line)" />
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={PAD.top}
              y2={PAD.top}
              stroke="var(--line)"
              strokeDasharray="3 4"
            />
            <text x={PAD.left - 6} y={PAD.top + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
              {max}
            </text>
            <text x={PAD.left - 6} y={PAD.top + PLOT_H} textAnchor="end" fontSize="11" fill="var(--muted)">
              0
            </text>

            {hours.map((h, i) => {
              const x = PAD.left + i * slot + gap / 2;
              const barH = (h.votes / max) * PLOT_H;
              const label = `${timeLabel.format(h.hour)}: ${numberFormat.format(h.votes)} voto(s)`;
              return (
                <g key={h.hour.getTime()}>
                  <title>{label}</title>
                  {/* Área de hover maior do que a barra */}
                  <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={PLOT_H} fill="transparent" />
                  {h.votes > 0 && (
                    <rect
                      x={x}
                      y={PAD.top + PLOT_H - barH}
                      width={barW}
                      height={barH}
                      rx={Math.min(4, barW / 2)}
                      fill="var(--accent)"
                    />
                  )}
                  {i % tickEvery === 0 && (
                    <text
                      x={x + barW / 2}
                      y={H - 8}
                      textAnchor={i === 0 ? "start" : "middle"}
                      fontSize="11"
                      fill="var(--muted)"
                    >
                      {timeLabel.format(h.hour)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </section>
  );
}
