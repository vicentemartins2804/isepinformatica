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

/** Códigos Postgres: violação de unicidade e violação de RLS (votação encerrada). */
const UNIQUE_VIOLATION = "23505";
const INSUFFICIENT_PRIVILEGE = "42501";

type Vote = { visitorId: string; colorId: string; designId: string };
export type InsertVoteResult = "ok" | "duplicate" | "closed";

/**
 * Regista o voto com a role votante. A base de dados recusa-o com o erro 23505 se o
 * dispositivo já votou (UNIQUE em visitor_id) ou com 42501 se o prazo já passou (RLS).
 */
export async function insertVote(vote: Vote): Promise<InsertVoteResult> {
  // Sem RETURNING: a role votante não tem permissão de leitura sobre `votos`.
  try {
    await getVoterSql()`
      INSERT INTO votos (visitor_id, cor, design)
      VALUES (${vote.visitorId}, ${vote.colorId}, ${vote.designId})
    `;
    return "ok";
  } catch (err) {
    const code = (err as { code?: unknown } | null)?.code;
    if (code === UNIQUE_VIOLATION) return "duplicate";
    if (code === INSUFFICIENT_PRIVILEGE) return "closed";
    throw err;
  }
}

export type VotingStatus = {
  /** Início programado, ou `null` (abre logo que o fim está definido). */
  start: Date | null;
  /** Fim (prazo), ou `null` se não houver votação marcada. */
  deadline: Date | null;
  open: boolean;
  /** Há início programado e ainda não chegou. */
  upcoming: boolean;
};

/** Horário e estado da votação (US04), com a mesma regra e o mesmo relógio que a política de RLS. */
export async function getVotingStatus(): Promise<VotingStatus> {
  // Lido através das funções SECURITY DEFINER, com a role votante.
  const rows = await getVoterSql()`
    SELECT votacao_inicio() AS inicio,
           votacao_prazo() AS prazo,
           votacao_aberta() AS aberta,
           COALESCE(now() < votacao_inicio(), false) AS por_abrir
  `;
  const { inicio, prazo, aberta, por_abrir } = rows[0];
  return {
    start: inicio ? new Date(inicio) : null,
    deadline: prazo ? new Date(prazo) : null,
    open: aberta,
    upcoming: por_abrir,
  };
}

/**
 * Define o horário a partir de datas/horas locais de Lisboa ("2026-10-15T23:59").
 * `start` pode ser `null` (abre logo); passar ambos a `null` remove a votação.
 */
export async function setVotingSchedule(start: string | null, end: string | null) {
  await getSql()`
    UPDATE configuracao
    SET inicio_votacao = (${start}::timestamp AT TIME ZONE 'Europe/Lisbon'),
        prazo_votacao = (${end}::timestamp AT TIME ZONE 'Europe/Lisbon')
    WHERE id = 1
  `;
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

export type Tally = { id: string; votes: number; percentage: number };
export type ComboTally = { colorId: string; designId: string; votes: number; percentage: number };
export type Dashboard = { total: number; byColor: Tally[]; byDesign: Tally[]; byCombination: ComboTally[] };

/** KPIs da US08, lidos das vistas votos_por_cor, votos_por_design e votos_por_combinacao. */
export async function getDashboard(): Promise<Dashboard> {
  const sql = getSql();
  const [totalRows, byColor, byDesign, byCombination] = await Promise.all([
    sql`SELECT COUNT(*)::int AS total FROM votos`,
    sql`SELECT cor, votos, percentagem FROM votos_por_cor`,
    sql`SELECT design, votos, percentagem FROM votos_por_design`,
    sql`SELECT cor, design, votos, percentagem FROM votos_por_combinacao`,
  ]);
  return {
    total: totalRows[0].total,
    byColor: byColor.map((r) => ({ id: r.cor, votes: r.votos, percentage: Number(r.percentagem) })),
    byDesign: byDesign.map((r) => ({ id: r.design, votes: r.votos, percentage: Number(r.percentagem) })),
    byCombination: byCombination.map((r) => ({
      colorId: r.cor,
      designId: r.design,
      votes: r.votos,
      percentage: Number(r.percentagem),
    })),
  };
}

export type VoteRecord = { id: string; visitorId: string; colorId: string; designId: string; createdAt: Date };

/** Todos os votos, para exportação em CSV. */
export async function getAllVotes(): Promise<VoteRecord[]> {
  const rows = await getSql()`SELECT id, visitor_id, cor, design, criado_em FROM votos ORDER BY criado_em, id`;
  return rows.map((r) => ({
    id: String(r.id),
    visitorId: r.visitor_id,
    colorId: r.cor,
    designId: r.design,
    createdAt: new Date(r.criado_em),
  }));
}
