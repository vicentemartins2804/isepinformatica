-- Esquema da votação. Correr no SQL Editor do Neon com a role dona da base de dados
-- (a do DATABASE_URL). É idempotente: pode ser corrido mais do que uma vez.

-- ─── US06: votos ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS votos (
  id         BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  visitor_id TEXT        NOT NULL,  -- hash do dispositivo (FingerprintJS)
  cor        TEXT        NOT NULL,
  design     TEXT        NOT NULL,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Um voto por dispositivo: um duplicado falha com o erro 23505 (unique_violation).
  CONSTRAINT votos_visitor_id_key UNIQUE (visitor_id)
);

-- ─── US05: conta única de administração (/admincp) ─────────────────────────
-- Definir com `npm run admin:set -- <username>`.
CREATE TABLE IF NOT EXISTS admin (
  id                   SMALLINT    PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- só existe uma conta
  username             TEXT        NOT NULL,
  password_hash        TEXT        NOT NULL,
  -- Incluída em cada JWT; incrementar invalida todas as sessões abertas.
  sessao_versao        INTEGER     NOT NULL DEFAULT 1,
  password_alterada_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Registo de autenticação mostrado no painel.
CREATE TABLE IF NOT EXISTS admin_logs (
  id         BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  evento     TEXT        NOT NULL,  -- login_sucesso, login_falhado, logout, logout_global, password_alterada
  ip         TEXT,
  user_agent TEXT,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_logs_criado_em_idx ON admin_logs (criado_em DESC);

-- ─── US04: início e fim da votação ──────────────────────────────────────────
-- Uma única linha. prazo_votacao (fim) NULL = não há votação aberta.
-- inicio_votacao NULL = abre logo que o fim está definido.
CREATE TABLE IF NOT EXISTS configuracao (
  id             SMALLINT    PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  inicio_votacao TIMESTAMPTZ,
  prazo_votacao  TIMESTAMPTZ
);
ALTER TABLE configuracao ADD COLUMN IF NOT EXISTS inicio_votacao TIMESTAMPTZ;
INSERT INTO configuracao (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_constraint WHERE conname = 'configuracao_inicio_antes_do_fim') THEN
    ALTER TABLE configuracao ADD CONSTRAINT configuracao_inicio_antes_do_fim
      CHECK (inicio_votacao IS NULL OR prazo_votacao IS NULL OR inicio_votacao < prazo_votacao);
  END IF;
END
$$;

-- SECURITY DEFINER: correm com os privilégios do dono, por isso a role votante consegue
-- saber o horário sem ter acesso de leitura à tabela `configuracao`.
CREATE OR REPLACE FUNCTION votacao_inicio() RETURNS TIMESTAMPTZ
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$ SELECT inicio_votacao FROM configuracao WHERE id = 1 $$;

CREATE OR REPLACE FUNCTION votacao_prazo() RETURNS TIMESTAMPTZ
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$ SELECT prazo_votacao FROM configuracao WHERE id = 1 $$;

-- Aberta só enquanto início <= agora < fim (no instante do fim já está fechada).
-- Sem fim definido não há votação aberta.
CREATE OR REPLACE FUNCTION votacao_aberta() RETURNS BOOLEAN
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
  AS $$
    SELECT COALESCE(now() < votacao_prazo(), false)
       AND COALESCE(now() >= votacao_inicio(), true)
  $$;

-- ─── US08: KPIs (para o dashboard ou consultas diretas no SQL Editor) ───────
CREATE OR REPLACE VIEW votos_por_cor AS
  SELECT cor, COUNT(*)::int AS votos,
         ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS percentagem
  FROM votos GROUP BY cor ORDER BY votos DESC;

CREATE OR REPLACE VIEW votos_por_design AS
  SELECT design, COUNT(*)::int AS votos,
         ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS percentagem
  FROM votos GROUP BY design ORDER BY votos DESC;

CREATE OR REPLACE VIEW votos_por_combinacao AS
  SELECT cor, design, COUNT(*)::int AS votos,
         ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) AS percentagem
  FROM votos GROUP BY cor, design ORDER BY votos DESC;

-- ─── US07: Row Level Security ────────────────────────────────────────────────
-- A app grava os votos com a role `voto_anonimo` (DATABASE_URL_VOTANTE), que só pode inserir.
-- As leituras (painel de admin) usam a role dona das tabelas, que não está sujeita a RLS.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'voto_anonimo') THEN
    CREATE ROLE voto_anonimo NOLOGIN;  -- a password é definida à parte (ver README.md, passo 2)
  END IF;
END
$$;

ALTER TABLE votos        ENABLE ROW LEVEL SECURITY;
-- Sem políticas: ninguém além do dono lhes acede.
ALTER TABLE admin        ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracao ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON votos, admin, admin_logs, configuracao FROM PUBLIC;
REVOKE ALL ON votos, admin, admin_logs, configuracao FROM voto_anonimo;
REVOKE ALL ON votos_por_cor, votos_por_design, votos_por_combinacao FROM PUBLIC;
REVOKE ALL ON votos_por_cor, votos_por_design, votos_por_combinacao FROM voto_anonimo;

REVOKE ALL ON FUNCTION votacao_inicio(), votacao_prazo(), votacao_aberta() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION votacao_inicio(), votacao_prazo(), votacao_aberta() TO voto_anonimo;

GRANT USAGE ON SCHEMA public TO voto_anonimo;
-- Só estas colunas: id e criado_em são sempre gerados pela base de dados.
GRANT INSERT (visitor_id, cor, design) ON votos TO voto_anonimo;

-- INSERT permitido a anónimos enquanto a votação estiver aberta (US04), sujeito à
-- restrição UNIQUE. Fora do horário, a inserção falha com o erro 42501 (violação de RLS).
DROP POLICY IF EXISTS votos_insert_anonimo ON votos;
CREATE POLICY votos_insert_anonimo ON votos
  FOR INSERT TO voto_anonimo
  WITH CHECK (votacao_aberta());

-- Não existe nenhuma política de SELECT, UPDATE ou DELETE, e a role também não tem esses
-- privilégios: qualquer leitura ou alteração feita por `voto_anonimo` é recusada.
