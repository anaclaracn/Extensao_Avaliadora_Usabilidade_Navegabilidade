-- ============================================================
-- MIGRATION v6 — Suporte a métricas de usabilidade e navegabilidade
-- ============================================================

-- Campo necessário para calcular Eficiência de Cliques e Lostness:
-- o pesquisador define quantos cliques/passos o caminho ótimo exige
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS min_clicks INTEGER DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS optimal_path_length INTEGER DEFAULT NULL;
-- optimal_path_length = número mínimo de páginas/telas distintas (R no Lostness)

-- Índices para acelerar as queries de métricas que cruzam events x task_results
CREATE INDEX IF NOT EXISTS idx_events_session_timestamp ON events(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_task_results_task_session ON task_results(task_id, session_id);
