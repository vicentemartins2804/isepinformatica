CREATE TABLE IF NOT EXISTS votes (
  id         BIGSERIAL PRIMARY KEY,
  color_id   TEXT        NOT NULL,
  design_id  TEXT        NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
