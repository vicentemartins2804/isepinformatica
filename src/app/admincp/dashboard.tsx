import type { ComboTally, Dashboard as DashboardData, Tally } from "@/lib/db";
import { COLOR_OPTIONS, DESIGN_OPTIONS } from "@/lib/options";

const card = "rounded-2xl border border-line bg-surface/90 p-6 shadow-sm backdrop-blur";
const numberFormat = new Intl.NumberFormat("pt-PT");
const percentFormat = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 });

const colorById = new Map(COLOR_OPTIONS.map((c) => [c.id, c]));
const designById = new Map(DESIGN_OPTIONS.map((d) => [d.id, d]));

type Row = { id: string; name: string; votes: number; percentage: number; swatch?: string };

/** Junta os totais às opções configuradas, para mostrar também as opções com 0 votos. */
function withAllOptions(tallies: Tally[], options: { id: string; name: string; hex?: string }[]): Row[] {
  const byId = new Map(tallies.map((t) => [t.id, t]));
  const rows: Row[] = options.map((o) => ({
    id: o.id,
    name: o.name,
    swatch: o.hex,
    votes: byId.get(o.id)?.votes ?? 0,
    percentage: byId.get(o.id)?.percentage ?? 0,
  }));
  // Valores na base de dados que já não existem nas opções (não devia acontecer).
  for (const t of tallies) {
    if (!options.some((o) => o.id === t.id)) rows.push({ id: t.id, name: t.id, votes: t.votes, percentage: t.percentage });
  }
  return rows.sort((a, b) => b.votes - a.votes);
}

function comboName(c: ComboTally) {
  return `${designById.get(c.designId)?.name ?? c.designId} + ${colorById.get(c.colorId)?.name ?? c.colorId}`;
}

function StatTile({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={`${card} flex flex-col gap-1`}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted">{label}</span>
      {children}
    </div>
  );
}

function BarList({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <section className={card}>
      <h2 className="mb-4 font-semibold text-heading">{title}</h2>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.id} title={`${r.name}: ${numberFormat.format(r.votes)} votos (${percentFormat.format(r.percentage)}%)`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium">
                {r.swatch && (
                  <span className="h-3 w-3 rounded-full ring-1 ring-black/15" style={{ backgroundColor: r.swatch }} />
                )}
                {r.name}
              </span>
              <span className="tabular-nums text-muted">
                <span className="font-semibold text-foreground">{numberFormat.format(r.votes)}</span> ·{" "}
                {percentFormat.format(r.percentage)}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-line/60">
              <div
                className="h-full rounded-full ring-1 ring-inset ring-black/10 transition-[width] duration-500"
                style={{ width: `${r.percentage}%`, backgroundColor: r.swatch ?? "var(--accent)" }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Dashboard({ data }: { data: DashboardData }) {
  const byColor = withAllOptions(data.byColor, COLOR_OPTIONS);
  const byDesign = withAllOptions(data.byDesign, DESIGN_OPTIONS);
  const topVotes = data.byCombination[0]?.votes ?? 0;
  const leaders = data.byCombination.filter((c) => c.votes === topVotes && topVotes > 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <StatTile label="Total de votos">
          <span className="text-4xl font-bold tabular-nums tracking-tight text-heading">
            {numberFormat.format(data.total)}
          </span>
        </StatTile>
        <StatTile label={leaders.length > 1 ? "Combinações mais votadas (empate)" : "Combinação mais votada"}>
          {leaders.length === 0 ? (
            <span className="text-sm text-muted">Ainda não há votos.</span>
          ) : (
            leaders.map((c) => (
              <span key={`${c.designId}-${c.colorId}`} className="flex flex-wrap items-baseline gap-x-2">
                <span className="flex items-center gap-2 text-xl font-bold tracking-tight text-heading">
                  <span
                    className="h-3.5 w-3.5 rounded-full ring-1 ring-black/15"
                    style={{ backgroundColor: colorById.get(c.colorId)?.hex }}
                  />
                  {comboName(c)}
                </span>
                <span className="text-sm tabular-nums text-muted">
                  {numberFormat.format(c.votes)} votos · {percentFormat.format(c.percentage)}%
                </span>
              </span>
            ))
          )}
        </StatTile>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <BarList title="Votos por cor" rows={byColor} />
        <BarList title="Votos por design" rows={byDesign} />
      </div>

      <section className={card}>
        <h2 className="font-semibold text-heading">Todas as combinações</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[24rem] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted">
              <tr className="border-b border-line">
                <th className="py-2 pr-4 font-medium">Design</th>
                <th className="py-2 pr-4 font-medium">Cor</th>
                <th className="py-2 pr-4 text-right font-medium">Votos</th>
                <th className="py-2 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody>
              {DESIGN_OPTIONS.flatMap((d) =>
                COLOR_OPTIONS.map((c) => {
                  const combo = data.byCombination.find((x) => x.designId === d.id && x.colorId === c.id);
                  return (
                    <tr key={`${d.id}-${c.id}`} className="border-b border-line/60 last:border-0">
                      <td className="py-2 pr-4">{d.name}</td>
                      <td className="py-2 pr-4">
                        <span className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full ring-1 ring-black/15" style={{ backgroundColor: c.hex }} />
                          {c.name}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right tabular-nums">{numberFormat.format(combo?.votes ?? 0)}</td>
                      <td className="py-2 text-right tabular-nums text-muted">
                        {percentFormat.format(combo?.percentage ?? 0)}%
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
