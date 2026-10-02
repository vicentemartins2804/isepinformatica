import type { Metadata } from "next";
import {
  countIdentifiableVotes,
  getAuthLogs,
  getContactMessages,
  getDashboard,
  getRecentVotes,
  getVoteTimeline,
  getVotingStatus,
  type AuthEvent,
  type AuthLogRow,
  type ContactMessageRow,
  type Dashboard as DashboardData,
  type VoteRecord,
  type VotingStatus,
} from "@/lib/db";
import { CONTACT_TOPICS } from "@/lib/contact";
import { COLOR_OPTIONS, DESIGN_OPTIONS } from "@/lib/options";
import { qrSvg } from "@/lib/qr";
import { requireSession } from "@/lib/session";
import { getVotingUrl } from "@/lib/site-url";
import { logout, logoutEverywhere } from "./actions";
import Dashboard from "./dashboard";
import MessagesSection, { type MessageRow } from "./messages-section";
import PrivacySection from "./privacy-section";
import QrSection from "./qr-section";
import ScheduleForm from "./schedule-form";
import VoteTimeline from "./vote-timeline";
import VotesManager, { type VoteRow } from "./votes-manager";

export const metadata: Metadata = {
  title: "Painel · Admin",
  robots: { index: false },
};

const card = "rounded-2xl border border-line bg-surface/90 p-6 shadow-sm backdrop-blur";
const secondaryButton =
  "h-9 rounded-lg border border-line bg-background px-4 text-sm font-medium outline-none transition-colors hover:border-accent-light focus-visible:ring-2 focus-visible:ring-accent-light";

const EVENT_LABELS: Record<AuthEvent, { label: string; className: string }> = {
  login_sucesso: { label: "Login", className: "bg-accent-soft text-accent-hover" },
  login_falhado: { label: "Login falhado", className: "bg-danger/10 text-danger" },
  login_bloqueado: { label: "Login bloqueado", className: "bg-danger/10 text-danger" },
  logout: { label: "Logout", className: "bg-line text-muted" },
  logout_global: { label: "Logout em todos", className: "bg-line text-foreground" },
  password_alterada: { label: "Password alterada", className: "bg-accent-soft text-foreground" },
  votos_anulados: { label: "Votos anulados", className: "bg-danger/10 text-danger" },
  votacao_reposta: { label: "Votação reposta", className: "bg-danger/10 text-danger" },
  dados_anonimizados: { label: "Dados anonimizados", className: "bg-accent-soft text-foreground" },
  mensagens_apagadas: { label: "Mensagens apagadas", className: "bg-line text-foreground" },
};

const topicLabel = new Map<string, string>(CONTACT_TOPICS.map((t) => [t.id, t.label]));

const RECENT_VOTES_LIMIT = 200;
const colorById = new Map(COLOR_OPTIONS.map((c) => [c.id, c]));
const designById = new Map(DESIGN_OPTIONS.map((d) => [d.id, d]));

const dateFormat = new Intl.DateTimeFormat("pt-PT", {
  dateStyle: "short",
  timeStyle: "medium",
  timeZone: "Europe/Lisbon",
});

/** Resumo curto do user-agent ("Chrome · Windows"), com o valor completo no tooltip. */
function describeBrowser(ua: string | null): string {
  if (!ua) return "—";
  const browser =
    /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Outro";
  const os =
    /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad/.test(ua) ? "iOS"
    : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return os ? `${browser} · ${os}` : browser;
}

/** Corre uma leitura e devolve `null` em caso de erro, para uma falha não derrubar o painel. */
async function safely<T>(label: string, load: () => Promise<T>): Promise<T | null> {
  try {
    return await load();
  } catch (err) {
    console.error(`Erro ao ler ${label}:`, err);
    return null;
  }
}

// "sv-SE" dá "2026-10-15 23:59", que só precisa do "T" para o input datetime-local.
const inputDateTime = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Lisbon",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const toInput = (date: Date | null) => (date ? inputDateTime.format(date).replace(" ", "T") : null);

function describeSchedule(status: VotingStatus): string {
  const { start, deadline } = status;
  if (!deadline) return "Sem horário definido: não há votação aberta. Define a data de fecho para abrir a votação.";
  const closes = `fecha a ${dateFormat.format(deadline)}`;
  if (status.upcoming && start) return `Abre a ${dateFormat.format(start)} e ${closes} (hora de Lisboa).`;
  if (status.open) return `Aberta${start ? ` desde ${dateFormat.format(start)}` : ""}; ${closes} (hora de Lisboa).`;
  return `Terminou a ${dateFormat.format(deadline)} (hora de Lisboa).`;
}

function VotingStatusSection({ status }: { status: VotingStatus | null }) {
  const badge = !status
    ? null
    : status.open
      ? { label: "Aberta", className: "bg-accent-soft text-accent-hover" }
      : status.upcoming
        ? { label: "Por abrir", className: "bg-line text-foreground" }
        : status.deadline
          ? { label: "Encerrada", className: "bg-danger/10 text-danger" }
          : { label: "Sem votação", className: "bg-line text-muted" };

  return (
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold text-heading">Horário da votação</h2>
        {badge && (
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.className}`}>{badge.label}</span>
        )}
      </div>
      <p className="mt-2 text-sm text-muted">
        {status === null ? "Não foi possível ler o horário." : describeSchedule(status)}
      </p>
      <div className="mt-4">
        <ScheduleForm start={toInput(status?.start ?? null)} end={toInput(status?.deadline ?? null)} />
      </div>
    </section>
  );
}

export default async function AdminPage() {
  const session = await requireSession();
  const [dashboard, status, logs, timeline, recentVotes, identifiable, messages] = await Promise.all([
    safely<DashboardData>("KPIs", getDashboard),
    safely<VotingStatus>("horário da votação", getVotingStatus),
    safely<AuthLogRow[]>("registo do painel", () => getAuthLogs(50)),
    safely("votos ao longo do tempo", getVoteTimeline),
    safely<VoteRecord[]>("votos recentes", () => getRecentVotes(RECENT_VOTES_LIMIT)),
    safely<number>("votos identificáveis", countIdentifiableVotes),
    safely<ContactMessageRow[]>("mensagens de contacto", getContactMessages),
  ]);
  const messageRows: MessageRow[] | null =
    messages?.map((m) => ({
      id: m.id,
      time: dateFormat.format(m.createdAt),
      name: m.name,
      email: m.email,
      topic: topicLabel.get(m.topic) ?? m.topic,
      message: m.message,
    })) ?? null;
  const voteRows: VoteRow[] = (recentVotes ?? []).map((v) => ({
    id: v.id,
    time: dateFormat.format(v.createdAt),
    color: colorById.get(v.colorId)?.name ?? v.colorId,
    colorHex: colorById.get(v.colorId)?.hex,
    design: designById.get(v.designId)?.name ?? v.designId,
    visitorId: v.visitorId,
  }));
  const votingUrl = await getVotingUrl();
  const qr = await safely("QR code", () => qrSvg(votingUrl));
  const votingEnded = !!status && !status.open && !status.upcoming && status.deadline !== null;

  return (
    <main className="flex flex-1 justify-center px-6 py-12">
      <div className="flex w-full max-w-4xl animate-rise flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-heading">Painel de administração</h1>
            <p className="text-sm text-muted">
              Sessão iniciada como <span className="font-medium text-foreground">{session.username}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {/* Download direto do CSV: um link normal, não navegação do lado do cliente. */}
            <a
              href="/api/admin/export"
              download
              className="inline-flex h-9 items-center rounded-lg bg-accent px-4 text-sm font-medium text-white outline-none transition-colors hover:bg-accent-hover focus-visible:ring-2 focus-visible:ring-accent-light focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Exportar Dados
            </a>
            <form action={logout}>
              <button type="submit" className={secondaryButton}>
                Terminar sessão
              </button>
            </form>
          </div>
        </header>

        {dashboard ? (
          <Dashboard data={dashboard} />
        ) : (
          <section className={card}>
            <p className="text-sm text-danger">Não foi possível carregar os resultados.</p>
          </section>
        )}

        {timeline ? (
          <VoteTimeline hourly={timeline.hourly} peak={timeline.peak} />
        ) : (
          <section className={card}>
            <p className="text-sm text-danger">Não foi possível carregar os votos ao longo do tempo.</p>
          </section>
        )}

        <VotingStatusSection status={status} />

        <QrSection url={votingUrl} svg={qr} />

        {recentVotes ? (
          <VotesManager votes={voteRows} total={dashboard?.total ?? voteRows.length} />
        ) : (
          <section className={card}>
            <p className="text-sm text-danger">Não foi possível carregar os votos.</p>
          </section>
        )}

        <PrivacySection identifiable={identifiable} votingOpen={status?.open ?? false} votingEnded={votingEnded} />

        <MessagesSection messages={messageRows} />

        <h2 className="mt-4 text-sm font-semibold uppercase tracking-wide text-muted">Conta</h2>
        <div className="grid gap-6">
          <section className={`${card} flex flex-col`}>
            <h2 className="font-semibold text-heading">Sessões</h2>
            <p className="mt-2 text-sm text-muted">
              Termina a sessão em todos os dispositivos onde tenhas entrado, incluindo este. Vais ter de voltar a fazer
              login.
            </p>
            <form action={logoutEverywhere} className="mt-4">
              <button
                type="submit"
                className="h-10 w-full rounded-lg border border-danger/40 bg-background px-4 text-sm font-medium text-danger outline-none transition-colors hover:bg-danger/10 focus-visible:ring-2 focus-visible:ring-danger/40"
              >
                Terminar sessão em todos os dispositivos
              </button>
            </form>
          </section>
        </div>

        <section className={card}>
          <h2 className="font-semibold text-heading">Registo do painel</h2>
          <p className="mt-1 text-sm text-muted">Últimos 50 eventos: logins e ações sobre os votos. Guardados durante 90 dias.</p>

          {logs === null ? (
            <p className="mt-4 text-sm text-danger">Não foi possível carregar o registo.</p>
          ) : logs.length === 0 ? (
            <p className="mt-4 text-sm text-muted">Ainda não há eventos.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-muted">
                  <tr className="border-b border-line">
                    <th className="py-2 pr-4 font-medium">Data</th>
                    <th className="py-2 pr-4 font-medium">Evento</th>
                    <th className="py-2 pr-4 font-medium">Detalhe</th>
                    <th className="py-2 pr-4 font-medium">IP</th>
                    <th className="py-2 font-medium">Browser</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => {
                    const event = EVENT_LABELS[log.event] ?? { label: log.event, className: "bg-line text-muted" };
                    return (
                      <tr key={log.id} className="border-b border-line/60 last:border-0">
                        <td className="whitespace-nowrap py-2 pr-4 tabular-nums">{dateFormat.format(log.createdAt)}</td>
                        <td className="py-2 pr-4">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${event.className}`}>
                            {event.label}
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-xs text-muted">{log.detail ?? "—"}</td>
                        <td className="py-2 pr-4 font-mono text-xs">{log.ip ?? "—"}</td>
                        <td className="py-2 text-muted" title={log.userAgent ?? undefined}>
                          {describeBrowser(log.userAgent)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
