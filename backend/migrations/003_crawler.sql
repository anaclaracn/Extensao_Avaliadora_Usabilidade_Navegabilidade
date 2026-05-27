-- ============================================================
-- MIGRATION v3 — Crawler de sites
-- Execute no PostgreSQL após as migrations anteriores
-- ============================================================

-- Sessão de crawler: uma varredura completa de um domínio
CREATE TABLE IF NOT EXISTS crawler_sessions (
  id             SERIAL PRIMARY KEY,
  site_id        INTEGER     NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  base_url       TEXT        NOT NULL,   -- URL raiz da varredura (ex: https://campusvirtual.ufla.br)
  status         TEXT        NOT NULL DEFAULT 'pending',
                                         -- 'pending' | 'running' | 'done' | 'error' | 'stopped'
  pages_found    INTEGER     NOT NULL DEFAULT 0,
  pages_crawled  INTEGER     NOT NULL DEFAULT 0,
  pages_error    INTEGER     NOT NULL DEFAULT 0,
  max_pages      INTEGER     NOT NULL DEFAULT 5000,
  max_depth      INTEGER     NOT NULL DEFAULT 20,
  started_by     INTEGER     REFERENCES researchers(id),
  started_at     TIMESTAMP   NOT NULL DEFAULT NOW(),
  finished_at    TIMESTAMP,
  error_msg      TEXT
);

-- Fila de URLs a varrer
CREATE TABLE IF NOT EXISTS crawler_queue (
  id                 SERIAL PRIMARY KEY,
  crawler_session_id INTEGER     NOT NULL REFERENCES crawler_sessions(id) ON DELETE CASCADE,
  url                TEXT        NOT NULL,
  url_normalized     TEXT        NOT NULL,  -- URL sem fragment (#) e com trailing slash normalizado
  depth              INTEGER     NOT NULL DEFAULT 0,
  status             TEXT        NOT NULL DEFAULT 'pending',
                                            -- 'pending' | 'crawling' | 'done' | 'error'
  snapshot_id        INTEGER     REFERENCES site_snapshots(id),
  error_msg          TEXT,
  created_at         TIMESTAMP   NOT NULL DEFAULT NOW(),
  processed_at       TIMESTAMP
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_crawler_sessions_site    ON crawler_sessions(site_id);
CREATE INDEX IF NOT EXISTS idx_crawler_sessions_status  ON crawler_sessions(status);
CREATE INDEX IF NOT EXISTS idx_crawler_queue_session    ON crawler_queue(crawler_session_id);
CREATE INDEX IF NOT EXISTS idx_crawler_queue_status     ON crawler_queue(status);
CREATE INDEX IF NOT EXISTS idx_crawler_queue_url        ON crawler_queue(crawler_session_id, url_normalized);

-- Constraint: impede a mesma URL normalizada de entrar duas vezes na mesma sessão
ALTER TABLE crawler_queue
  ADD CONSTRAINT uq_crawler_url_per_session
  UNIQUE (crawler_session_id, url_normalized);
