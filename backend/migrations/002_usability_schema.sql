-- ============================================================
-- MIGRATION v2 — Estrutura completa para análise de usabilidade
-- Execute no banco: psql -U postgres -d tcc_ux -f migrations/002_usability_schema.sql
-- ============================================================

-- ── 1. Usuários anônimos ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id              SERIAL PRIMARY KEY,
  age             INTEGER     NOT NULL,
  gender          TEXT        NOT NULL,
  education_level TEXT        NOT NULL,
  created_at      TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ── 2. Sites monitorados ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS sites (
  id         SERIAL PRIMARY KEY,
  url        TEXT        NOT NULL UNIQUE,
  created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ── 3. Sessões de uso ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER     NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
  site_id    INTEGER     NOT NULL REFERENCES sites(id)    ON DELETE CASCADE,
  started_at TIMESTAMP   NOT NULL DEFAULT NOW(),
  ended_at   TIMESTAMP
);

-- ── 4. Eventos (atualizado — session_id obrigatório) ─────────
-- Se a tabela já existir com a estrutura antiga, rode o ALTER abaixo.
-- Caso contrário, o CREATE IF NOT EXISTS cria já com session_id.

CREATE TABLE IF NOT EXISTS events (
  id         SERIAL PRIMARY KEY,
  session_id INTEGER     NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  type       TEXT        NOT NULL,
  tag        TEXT,
  text       TEXT,
  element_id TEXT,
  class      TEXT,
  url        TEXT,
  x          NUMERIC,
  y          NUMERIC,
  timestamp  TIMESTAMP   NOT NULL
);

-- Se a tabela events já existia SEM session_id, adicione a coluna:
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS session_id INTEGER REFERENCES sessions(id);
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS url TEXT;
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS x NUMERIC;
-- ALTER TABLE events ADD COLUMN IF NOT EXISTS y NUMERIC;

-- ── 5. Testes de usabilidade ─────────────────────────────────
CREATE TABLE IF NOT EXISTS tests (
  id         SERIAL PRIMARY KEY,
  name       TEXT        NOT NULL,
  site_id    INTEGER     NOT NULL REFERENCES sites(id)    ON DELETE CASCADE,
  created_at TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ── 6. Tarefas ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  test_id     INTEGER     NOT NULL REFERENCES tests(id)   ON DELETE CASCADE,
  description TEXT        NOT NULL,
  order_index INTEGER     NOT NULL DEFAULT 1
);

-- ── 7. Resultados de tarefas ─────────────────────────────────
CREATE TABLE IF NOT EXISTS task_results (
  id          SERIAL PRIMARY KEY,
  task_id     INTEGER     NOT NULL REFERENCES tasks(id)    ON DELETE CASCADE,
  session_id  INTEGER     NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  started_at  TIMESTAMP   NOT NULL,
  finished_at TIMESTAMP   NOT NULL,
  success     BOOLEAN     NOT NULL,
  clicks      INTEGER     NOT NULL DEFAULT 0
);

-- ── Índices de performance ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_events_session_id  ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_events_timestamp   ON events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_type        ON events(type);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id   ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_site_id   ON sessions(site_id);
CREATE INDEX IF NOT EXISTS idx_tasks_test_id      ON tasks(test_id);
CREATE INDEX IF NOT EXISTS idx_task_results_task  ON task_results(task_id);
CREATE INDEX IF NOT EXISTS idx_task_results_sess  ON task_results(session_id);

-- ── Queries úteis de análise ─────────────────────────────────

-- Taxa de sucesso por tarefa de um teste:
-- SELECT t.description, COUNT(*) AS total,
--        ROUND(100.0 * SUM(CASE WHEN tr.success THEN 1 END) / COUNT(*), 2) AS sucesso_pct
-- FROM tasks t JOIN task_results tr ON tr.task_id = t.id
-- WHERE t.test_id = 1
-- GROUP BY t.id, t.description ORDER BY t.order_index;

-- Tempo médio por tarefa (segundos):
-- SELECT t.description,
--        ROUND(AVG(EXTRACT(EPOCH FROM (tr.finished_at - tr.started_at))), 2) AS media_seg
-- FROM tasks t JOIN task_results tr ON tr.task_id = t.id
-- WHERE t.test_id = 1 GROUP BY t.id, t.description;

-- Eventos por sessão:
-- SELECT session_id, type, COUNT(*) FROM events GROUP BY session_id, type ORDER BY session_id;
