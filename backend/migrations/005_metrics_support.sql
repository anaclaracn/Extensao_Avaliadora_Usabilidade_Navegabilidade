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

-- Tornar finished_at opcional: agora um registro é criado no
-- momento em que o participante clica "Começar", antes de saber
-- se vai concluir ou desistir.
ALTER TABLE task_results ALTER COLUMN finished_at DROP NOT NULL;
ALTER TABLE task_results ALTER COLUMN success DROP NOT NULL;

-- Nova coluna de status explícito do ciclo de vida da tentativa
ALTER TABLE task_results ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';
-- valores possíveis: 'started' | 'completed' | 'abandoned'
--   'started'   → criado ao clicar Começar, ainda em andamento
--   'completed' → finalizado normalmente (Concluí ou Não consegui)
--   'abandoned' → marcado retroativamente como abandonado (ver nota abaixo)

CREATE INDEX IF NOT EXISTS idx_task_results_status ON task_results(status);

-- NOTA: registros antigos (criados antes desta migration) já têm
-- finished_at preenchido e success definido, então o DEFAULT
-- 'completed' está correto para eles automaticamente.