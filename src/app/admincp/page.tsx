import type { Metadata } from "next";
import { getAuthLogs, type AuthEvent, type AuthLogRow } from "@/lib/db";
import { requireSession } from "@/lib/session";
import { logout, logoutEverywhere } from "./actions";
import ChangePasswordForm from "./change-password-form";

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
  logout: { label: "Logout", className: "bg-line text-muted" },
  logout_global: { label: "Logout em todos", className: "bg-line text-foreground" },
  password_alterada: { label: "Password alterada", className: "bg-accent-soft text-foreground" },
};

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

async function loadLogs(): Promise<AuthLogRow[] | null> {
  try {
    return await getAuthLogs(50);
  } catch (err) {
    console.error("Erro ao ler registo de autenticação:", err);
    return null;
  }
}

export default async function AdminPage() {
  const session = await requireSession();
  const logs = await loadLogs();

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
          <form action={logout}>
            <button type="submit" className={secondaryButton}>
              Terminar sessão
            </button>
          </form>
        </header>

        <div className="grid gap-6 md:grid-cols-2">
          <section className={card}>
            <h2 className="mb-4 font-semibold text-heading">Alterar password</h2>
            <ChangePasswordForm />
          </section>

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
          <h2 className="font-semibold text-heading">Registo de autenticação</h2>
          <p className="mt-1 text-sm text-muted">Últimos 50 eventos.</p>

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
