-- Idempotente: pode ser corrido várias vezes, também sobre uma tabela já existente.
CREATE TABLE IF NOT EXISTS votes (
  id         BIGSERIAL PRIMARY KEY,
  visitor_id TEXT,
  color_id   TEXT        NOT NULL,
  design_id  TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- US03: um voto por dispositivo (hash do FingerprintJS).
ALTER TABLE votes ADD COLUMN IF NOT EXISTS visitor_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS votes_visitor_id_key ON votes (visitor_id);
