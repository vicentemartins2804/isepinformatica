import "server-only";
import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { ContactMessage } from "./contact";

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
  /** Ronda atual; muda quando a votação é reposta a zeros. */
  round: number;
};

/** Horário e estado da votação (US04), com a mesma regra e o mesmo relógio que a política de RLS. */
export async function getVotingStatus(): Promise<VotingStatus> {
  // Lido através das funções SECURITY DEFINER, com a role votante.
  const rows = await getVoterSql()`
    SELECT votacao_inicio() AS inicio,
           votacao_prazo() AS prazo,
           votacao_aberta() AS aberta,
           COALESCE(now() < votacao_inicio(), false) AS por_abrir,
           votacao_ronda() AS ronda
  `;
  const { inicio, prazo, aberta, por_abrir, ronda } = rows[0];
  return {
    start: inicio ? new Date(inicio) : null,
    deadline: prazo ? new Date(prazo) : null,
    open: aberta,
    upcoming: por_abrir,
    round: ronda,
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

/** Invalida todas as sessões abertas (todos os dispositivos). */
export async function bumpSessionVersion() {
  await getSql()`UPDATE admin SET sessao_versao = sessao_versao + 1 WHERE id = 1`;
}

export type AuthEvent =
  | "login_sucesso"
  | "login_falhado"
  | "login_bloqueado"
  | "logout"
  | "logout_global"
  | "password_alterada" // eventos antigos, de quando dava para mudar a password no painel
  | "votos_anulados"
  | "votacao_reposta"
  | "dados_anonimizados"
  | "mensagens_apagadas";

/** Quanto tempo se guardam os registos do painel (RGPD). */
const LOG_RETENTION_DAYS = 90;

export async function insertAuthLog(
  event: AuthEvent,
  ip: string | null,
  userAgent: string | null,
  detail: string | null = null,
) {
  const sql = getSql();
  await sql.transaction([
    sql`INSERT INTO admin_logs (evento, ip, user_agent, detalhe) VALUES (${event}, ${ip}, ${userAgent}, ${detail})`,
    sql`DELETE FROM admin_logs WHERE criado_em < now() - make_interval(days => ${LOG_RETENTION_DAYS})`,
  ]);
}

/** Tentativas de login falhadas deste IP nos últimos `minutes` minutos. */
export async function countRecentFailedLogins(ip: string, minutes: number): Promise<number> {
  const rows = await getSql()`
    SELECT COUNT(*)::int AS n
    FROM admin_logs
    WHERE ip = ${ip} AND evento = 'login_falhado'
      AND criado_em > now() - make_interval(mins => ${minutes})
  `;
  return rows[0].n;
}

export type AuthLogRow = {
  id: string;
  event: AuthEvent;
  ip: string | null;
  userAgent: string | null;
  detail: string | null;
  createdAt: Date;
};

export async function getAuthLogs(limit = 50): Promise<AuthLogRow[]> {
  const rows = await getSql()`
    SELECT id, evento, ip, user_agent, detalhe, criado_em
    FROM admin_logs
    ORDER BY criado_em DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: String(r.id),
    event: r.evento,
    ip: r.ip,
    userAgent: r.user_agent,
    detail: r.detalhe,
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

export type HourlyVotes = { hour: Date; votes: number };
export type PeakMinute = { minute: Date; votes: number } | null;

/** Votos por hora (para o gráfico de participação) e o minuto com mais votos. */
export async function getVoteTimeline(): Promise<{ hourly: HourlyVotes[]; peak: PeakMinute }> {
  const sql = getSql();
  const [hourly, peak] = await Promise.all([
    sql`
      SELECT date_trunc('hour', criado_em) AS hora, COUNT(*)::int AS votos
      FROM votos GROUP BY 1 ORDER BY 1
    `,
    sql`
      SELECT date_trunc('minute', criado_em) AS minuto, COUNT(*)::int AS votos
      FROM votos GROUP BY 1 ORDER BY votos DESC, minuto LIMIT 1
    `,
  ]);
  return {
    hourly: hourly.map((r) => ({ hour: new Date(r.hora), votes: r.votos })),
    peak: peak[0] ? { minute: new Date(peak[0].minuto), votes: peak[0].votos } : null,
  };
}

/** Votos mais recentes, para o organizador rever e anular os suspeitos. */
export async function getRecentVotes(limit = 200): Promise<VoteRecord[]> {
  const rows = await getSql()`
    SELECT id, visitor_id, cor, design, criado_em FROM votos ORDER BY criado_em DESC, id DESC LIMIT ${limit}
  `;
  return rows.map((r) => ({
    id: String(r.id),
    visitorId: r.visitor_id,
    colorId: r.cor,
    designId: r.design,
    createdAt: new Date(r.criado_em),
  }));
}

/** Apaga os votos indicados. Devolve quantos foram apagados. */
export async function deleteVotes(ids: string[]): Promise<number> {
  const rows = await getSql()`DELETE FROM votos WHERE id = ANY(${ids}::bigint[]) RETURNING id`;
  return rows.length;
}

/** Apaga todos os votos e começa uma nova ronda. Devolve quantos votos foram apagados. */
export async function resetVotes(): Promise<number> {
  const sql = getSql();
  const [deleted] = await sql.transaction([
    sql`DELETE FROM votos RETURNING id`,
    sql`UPDATE configuracao SET ronda = ronda + 1 WHERE id = 1`,
  ]);
  return deleted.length;
}

/**
 * RGPD: depois da votação, o fingerprint deixa de ser preciso. Substitui-o por um valor
 * sem ligação ao dispositivo (mantendo a restrição UNIQUE). Devolve quantos votos mudaram.
 */
export async function anonymizeVotes(): Promise<number> {
  const rows = await getSql()`
    UPDATE votos SET visitor_id = 'anonimizado-' || id
    WHERE visitor_id NOT LIKE 'anonimizado-%'
    RETURNING id
  `;
  return rows.length;
}

/** Quantos votos ainda têm o fingerprint do dispositivo. */
export async function countIdentifiableVotes(): Promise<number> {
  const rows = await getSql()`SELECT COUNT(*)::int AS n FROM votos WHERE visitor_id NOT LIKE 'anonimizado-%'`;
  return rows[0].n;
}

export type InsertMessageResult = "ok" | "rate_limited";

/** Grava uma mensagem do formulário de contacto, com a role votante (só pode inserir). */
export async function insertContactMessage(msg: ContactMessage): Promise<InsertMessageResult> {
  try {
    await getVoterSql()`
      INSERT INTO mensagens (nome, email, assunto, mensagem)
      VALUES (${msg.name}, ${msg.email}, ${msg.topic}, ${msg.message})
    `;
    return "ok";
  } catch (err) {
    // A política de RLS recusa a inserção acima do limite anti-spam.
    if ((err as { code?: unknown } | null)?.code === INSUFFICIENT_PRIVILEGE) return "rate_limited";
    throw err;
  }
}

/** Quanto tempo se guardam as mensagens de contacto (RGPD). */
const MESSAGE_RETENTION_DAYS = 90;

export type ContactMessageRow = ContactMessage & { id: string; createdAt: Date };

/** Mensagens de contacto, das mais recentes para as mais antigas. Apaga antes as que passaram o prazo. */
export async function getContactMessages(): Promise<ContactMessageRow[]> {
  const sql = getSql();
  const [, rows] = await sql.transaction([
    sql`DELETE FROM mensagens WHERE criado_em < now() - make_interval(days => ${MESSAGE_RETENTION_DAYS})`,
    sql`SELECT id, nome, email, assunto, mensagem, criado_em FROM mensagens ORDER BY criado_em DESC, id DESC`,
  ]);
  return rows.map((r) => ({
    id: String(r.id),
    name: r.nome,
    email: r.email,
    topic: r.assunto,
    message: r.mensagem,
    createdAt: new Date(r.criado_em),
  }));
}

/** Apaga as mensagens indicadas. Devolve quantas foram apagadas. */
export async function deleteContactMessages(ids: string[]): Promise<number> {
  const rows = await getSql()`DELETE FROM mensagens WHERE id = ANY(${ids}::bigint[]) RETURNING id`;
  return rows.length;
}
