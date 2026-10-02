import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

type Sql = NeonQueryFunction<false, false>;

function lazyClient(envVar: string) {
  let client: Sql | undefined;
  return () => {
    if (!client) {
      const url = process.env[envVar];
      if (!url) throw new Error(`${envVar} não está definida.`);
      client = neon(url);
    }
    return client;
  };
}

/** Role dona das tabelas: só para o servidor do painel de admin (leituras, login). */
export const getSql = lazyClient("DATABASE_URL");

/** Role `voto_anonimo`: só pode inserir votos (RLS, US07). */
const getVoterSql = lazyClient("DATABASE_URL_VOTANTE");

/** Código Postgres de violação de unicidade. */
const UNIQUE_VIOLATION = "23505";

type Vote = { visitorId: string; colorId: string; designId: string };

/**
 * Regista o voto. Devolve `false` se este `visitorId` já tinha votado, ou seja, se a
 * base de dados recusou a gravação com o erro 23505 (restrição UNIQUE em visitor_id).
 */
export async function insertVote(vote: Vote): Promise<boolean> {
  // Sem RETURNING: a role votante não tem permissão de leitura sobre `votos`.
  try {
    await getVoterSql()`
      INSERT INTO votos (visitor_id, cor, design)
      VALUES (${vote.visitorId}, ${vote.colorId}, ${vote.designId})
    `;
    return true;
  } catch (err) {
    if ((err as { code?: unknown } | null)?.code === UNIQUE_VIOLATION) return false;
    throw err;
  }
}

export type AdminRecord = { username: string; passwordHash: string; sessionVersion: number };

export async function getAdmin(): Promise<AdminRecord | null> {
  const rows = await getSql()`SELECT username, password_hash, sessao_versao FROM admin WHERE id = 1`;
  const row = rows[0];
  if (!row) return null;
  return { username: row.username, passwordHash: row.password_hash, sessionVersion: row.sessao_versao };
}

/** Muda a password e invalida todas as sessões. Devolve a nova versão da sessão. */
export async function updateAdminPassword(passwordHash: string): Promise<number> {
  const rows = await getSql()`
    UPDATE admin
    SET password_hash = ${passwordHash},
        password_alterada_em = now(),
        sessao_versao = sessao_versao + 1
    WHERE id = 1
    RETURNING sessao_versao
  `;
  return rows[0].sessao_versao;
}

/** Invalida todas as sessões abertas (todos os dispositivos). */
export async function bumpSessionVersion() {
  await getSql()`UPDATE admin SET sessao_versao = sessao_versao + 1 WHERE id = 1`;
}

export type AuthEvent = "login_sucesso" | "login_falhado" | "logout" | "logout_global" | "password_alterada";

export async function insertAuthLog(event: AuthEvent, ip: string | null, userAgent: string | null) {
  await getSql()`INSERT INTO admin_logs (evento, ip, user_agent) VALUES (${event}, ${ip}, ${userAgent})`;
}

export type AuthLogRow = { id: string; event: AuthEvent; ip: string | null; userAgent: string | null; createdAt: Date };

export async function getAuthLogs(limit = 50): Promise<AuthLogRow[]> {
  const rows = await getSql()`
    SELECT id, evento, ip, user_agent, criado_em
    FROM admin_logs
    ORDER BY criado_em DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: String(r.id),
    event: r.evento,
    ip: r.ip,
    userAgent: r.user_agent,
    createdAt: new Date(r.criado_em),
  }));
}

export type ResultRow = { designId: string; colorId: string; votes: number };

/** Votos acumulados por combinação de design e cor. */
export async function getResults(): Promise<ResultRow[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT design, cor, COUNT(*)::int AS votos
    FROM votos
    GROUP BY design, cor
    ORDER BY votos DESC
  `;
  return rows.map((r) => ({ designId: r.design, colorId: r.cor, votes: r.votos }));
}
