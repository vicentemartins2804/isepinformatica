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

ALTER TABLE votos      ENABLE ROW LEVEL SECURITY;
-- Sem políticas: ninguém além do dono lhes acede.
ALTER TABLE admin      ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON votos, admin, admin_logs FROM PUBLIC;
REVOKE ALL ON votos, admin, admin_logs FROM voto_anonimo;

GRANT USAGE ON SCHEMA public TO voto_anonimo;
-- Só estas colunas: id e criado_em são sempre gerados pela base de dados.
GRANT INSERT (visitor_id, cor, design) ON votos TO voto_anonimo;

-- INSERT permitido a anónimos (sujeito à restrição UNIQUE).
DROP POLICY IF EXISTS votos_insert_anonimo ON votos;
CREATE POLICY votos_insert_anonimo ON votos
  FOR INSERT TO voto_anonimo
  WITH CHECK (true);

-- Não existe nenhuma política de SELECT, UPDATE ou DELETE, e a role também não tem esses
-- privilégios: qualquer leitura ou alteração feita por `voto_anonimo` é recusada.
