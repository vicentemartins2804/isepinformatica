// Regras da base de dados (db/schema.sql) testadas num Postgres em memória (PGlite):
// unicidade do voto, horário da votação (RLS), privilégios da role votante, rondas e KPIs.
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";

const schema = readFileSync(new URL("../../db/schema.sql", import.meta.url), "utf8");

let db: PGlite;

/** Corre como o dono (como o neondb_owner do Neon: não é superuser, mas cria roles). */
async function asOwner() {
  await db.exec("RESET ROLE; SET ROLE dono;");
}
async function asVoter() {
  await db.exec("RESET ROLE; SET ROLE voto_anonimo;");
}
async function errorCode(query: string, params: unknown[] = []): Promise<string | null> {
  try {
    await db.query(query, params);
    return null;
  } catch (err) {
    return (err as { code?: string }).code ?? "erro";
  }
}
function vote(visitorId: string, cor = "bordo", design = "design-1") {
  return errorCode("INSERT INTO votos (visitor_id, cor, design) VALUES ($1, $2, $3)", [visitorId, cor, design]);
}
async function setSchedule(start: string, end: string) {
  await asOwner();
  await db.exec(`UPDATE configuracao SET inicio_votacao = ${start}, prazo_votacao = ${end}`);
}

beforeEach(async () => {
  db = new PGlite();
  await db.exec("CREATE ROLE dono CREATEROLE; GRANT ALL ON SCHEMA public TO dono; SET ROLE dono;");
  await db.exec(schema);
});

describe("esquema", () => {
  it("pode ser aplicado mais do que uma vez", async () => {
    await expect(db.exec(schema)).resolves.toBeDefined();
  });

  it("migra tabelas criadas por versões antigas do esquema", async () => {
    const old = new PGlite();
    await old.exec("CREATE ROLE dono CREATEROLE; GRANT ALL ON SCHEMA public TO dono; SET ROLE dono;");
    await old.exec(`
      CREATE TABLE admin_logs (id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, evento TEXT NOT NULL,
        ip TEXT, user_agent TEXT, criado_em TIMESTAMPTZ NOT NULL DEFAULT now());
      CREATE TABLE configuracao (id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1), prazo_votacao TIMESTAMPTZ);
      INSERT INTO configuracao (id) VALUES (1);
    `);
    await old.exec(schema);
    const { rows } = await old.query<{ ronda: number; inicio_votacao: string | null }>(
      "SELECT ronda, inicio_votacao FROM configuracao",
    );
    expect(rows[0]).toEqual({ ronda: 1, inicio_votacao: null });
  });
});

describe("horário da votação (US04, RLS)", () => {
  it("sem horário não há votação aberta e o voto é recusado", async () => {
    await asVoter();
    const { rows } = await db.query<{ aberta: boolean }>("SELECT votacao_aberta() AS aberta");
    expect(rows[0].aberta).toBe(false);
    expect(await vote("a")).toBe("42501");
  });

  it("aceita votos entre a abertura e o fecho", async () => {
    await setSchedule("now() - interval '1 hour'", "now() + interval '1 hour'");
    await asVoter();
    expect(await vote("a")).toBeNull();
  });

  it("sem abertura definida, abre logo que há fecho", async () => {
    await setSchedule("NULL", "now() + interval '1 hour'");
    await asVoter();
    expect(await vote("a")).toBeNull();
  });

  it("recusa votos antes da abertura", async () => {
    await setSchedule("now() + interval '1 hour'", "now() + interval '2 hours'");
    await asVoter();
    expect(await vote("a")).toBe("42501");
  });

  it("recusa votos depois do fecho", async () => {
    await setSchedule("now() - interval '2 hours'", "now() - interval '1 hour'");
    await asVoter();
    expect(await vote("a")).toBe("42501");
  });

  it("não deixa guardar uma abertura depois do fecho", async () => {
    await asOwner();
    const code = await errorCode(
      "UPDATE configuracao SET inicio_votacao = now() + interval '2 hours', prazo_votacao = now() + interval '1 hour'",
    );
    expect(code).toBe("23514");
  });
});

describe("votos (US06)", () => {
  beforeEach(async () => {
    await setSchedule("NULL", "now() + interval '1 hour'");
    await asVoter();
  });

  it("um segundo voto do mesmo dispositivo falha com 23505", async () => {
    expect(await vote("dispositivo-1")).toBeNull();
    expect(await vote("dispositivo-1", "verde", "design-2")).toBe("23505");
  });

  it("a role votante não escolhe a data do voto nem lê o que inseriu", async () => {
    const withDate = await errorCode(
      "INSERT INTO votos (visitor_id, cor, design, criado_em) VALUES ('a', 'bordo', 'design-1', now() - interval '1 day')",
    );
    expect(withDate).toBe("42501");
    const withReturning = await errorCode(
      "INSERT INTO votos (visitor_id, cor, design) VALUES ('b', 'bordo', 'design-1') RETURNING id",
    );
    expect(withReturning).toBe("42501");
  });
});

describe("privilégios da role votante (US07)", () => {
  beforeEach(asVoter);

  it.each([
    ["ler os votos", "SELECT * FROM votos"],
    ["alterar votos", "UPDATE votos SET cor = 'verde'"],
    ["apagar votos", "DELETE FROM votos"],
    ["ler a conta de admin", "SELECT * FROM admin"],
    ["ler os registos do painel", "SELECT * FROM admin_logs"],
    ["ler a configuração", "SELECT * FROM configuracao"],
    ["mudar o horário", "UPDATE configuracao SET prazo_votacao = NULL"],
    ["ler os KPIs", "SELECT * FROM votos_por_cor"],
  ])("não pode %s", async (_label, query) => {
    expect(await errorCode(query)).toBe("42501");
  });

  it("pode consultar o horário e a ronda pelas funções públicas", async () => {
    const { rows } = await db.query("SELECT votacao_inicio(), votacao_prazo(), votacao_aberta(), votacao_ronda()");
    expect(rows).toHaveLength(1);
  });
});

describe("KPIs e gestão de votos (US08)", () => {
  beforeEach(async () => {
    await setSchedule("NULL", "now() + interval '1 hour'");
    await asVoter();
    await vote("a", "bordo", "design-1");
    await vote("b", "bordo", "design-1");
    await vote("c", "verde", "design-2");
    await vote("d", "branco", "design-1");
    await asOwner();
  });

  it("calcula totais e percentagens por cor e por combinação", async () => {
    const porCor = await db.query("SELECT cor, votos, percentagem::float AS percentagem FROM votos_por_cor");
    expect(porCor.rows[0]).toEqual({ cor: "bordo", votos: 2, percentagem: 50 });
    const topo = await db.query("SELECT cor, design, votos FROM votos_por_combinacao LIMIT 1");
    expect(topo.rows[0]).toEqual({ cor: "bordo", design: "design-1", votos: 2 });
  });

  it("anonimizar retira o fingerprint e mantém os votos", async () => {
    await db.exec("UPDATE votos SET visitor_id = 'anonimizado-' || id WHERE visitor_id NOT LIKE 'anonimizado-%'");
    const { rows } = await db.query<{ total: number; identificaveis: number }>(
      `SELECT COUNT(*)::int AS total,
              (COUNT(*) FILTER (WHERE visitor_id NOT LIKE 'anonimizado-%'))::int AS identificaveis
       FROM votos`,
    );
    expect(rows[0]).toEqual({ total: 4, identificaveis: 0 });
  });

  it("repor a zeros apaga os votos e avança a ronda", async () => {
    await db.exec("DELETE FROM votos; UPDATE configuracao SET ronda = ronda + 1 WHERE id = 1;");
    await asVoter();
    const { rows } = await db.query<{ ronda: number }>("SELECT votacao_ronda() AS ronda");
    expect(rows[0].ronda).toBe(2);
    // O mesmo dispositivo pode votar na nova ronda.
    expect(await vote("a")).toBeNull();
  });
});
