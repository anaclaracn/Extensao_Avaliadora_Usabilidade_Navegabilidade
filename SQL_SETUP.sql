-- ============================================
-- SCRIPTS SQL PARA O BANCO DE DADOS TCC-UX
-- ============================================

-- ============================================
-- 1. CRIAR BANCO DE DADOS (Executar uma vez!)
-- ============================================

CREATE DATABASE tcc_ux;


-- ============================================
-- 2. CONECTAR AO BANCO (no psql)
-- ============================================

\c tcc_ux


-- ============================================
-- 3. CRIAR TABELA DE EVENTOS
-- ============================================

CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  tag TEXT,
  text TEXT,
  element_id TEXT,
  class TEXT,
  timestamp TIMESTAMP NOT NULL
);


-- ============================================
-- 4. CRIAR ÍNDICES PARA MELHOR PERFORMANCE
-- ============================================

-- Índice no timestamp para buscas por data
CREATE INDEX idx_events_timestamp ON events(timestamp);

-- Índice no tipo de evento para análises por tipo
CREATE INDEX idx_events_type ON events(type);

-- Índice composto para buscas por tipo e data
CREATE INDEX idx_events_type_timestamp ON events(type, timestamp);


-- ============================================
-- 5. VERIFICAR TABELA (opcional)
-- ============================================

-- Ver estrutura da tabela
\d events

-- Ver todos os índices
\di

-- Ver registros (se houver)
SELECT * FROM events;


-- ============================================
-- 6. QUERIES ÚTEIS PARA ANÁLISE
-- ============================================

-- Contar total de eventos
SELECT COUNT(*) as total_eventos FROM events;

-- Contar por tipo de evento
SELECT type, COUNT(*) as quantidade 
FROM events 
GROUP BY type 
ORDER BY quantidade DESC;

-- Eventos do último dia
SELECT * FROM events 
WHERE timestamp >= CURRENT_DATE 
ORDER BY timestamp DESC;

-- Eventos por hora do dia
SELECT 
  EXTRACT(HOUR FROM timestamp) as hora,
  COUNT(*) as quantidade
FROM events
GROUP BY EXTRACT(HOUR FROM timestamp)
ORDER BY hora;

-- Elementos mais clicados
SELECT element_id, COUNT(*) as clicks
FROM events
WHERE type = 'click' AND element_id IS NOT NULL
GROUP BY element_id
ORDER BY clicks DESC
LIMIT 10;

-- Distribuição de eventos por dia
SELECT 
  CAST(timestamp AS DATE) as dia,
  COUNT(*) as total,
  COUNT(CASE WHEN type = 'click' THEN 1 END) as clicks,
  COUNT(CASE WHEN type = 'scroll' THEN 1 END) as scrolls,
  COUNT(CASE WHEN type = 'hover' THEN 1 END) as hovers
FROM events
GROUP BY CAST(timestamp AS DATE)
ORDER BY dia DESC;

-- Tags HTML mais interagidas
SELECT tag, COUNT(*) as interacoes
FROM events
WHERE tag IS NOT NULL
GROUP BY tag
ORDER BY interacoes DESC;

-- Média de eventos por dia
SELECT 
  AVG(eventos_por_dia) as media_eventos_dia
FROM (
  SELECT COUNT(*) as eventos_por_dia
  FROM events
  GROUP BY CAST(timestamp AS DATE)
) AS subquery;


-- ============================================
-- 7. LIMPAR/RESETAR DADOS (cuidado!)
-- ============================================

-- Deletar TODOS os eventos (irreversível!)
-- DELETE FROM events;

-- Deletar eventos de um dia específico
-- DELETE FROM events WHERE CAST(timestamp AS DATE) = '2024-04-01';

-- Truncar tabela (resets o ID)
-- TRUNCATE TABLE events RESTART IDENTITY;


-- ============================================
-- 8. ATUALIZAR DADOS
-- ============================================

-- Atualizar tipo de evento (exemplo)
-- UPDATE events SET type = 'dblclick' WHERE id = 1;

-- Atualizar elemento_id
-- UPDATE events SET element_id = 'novo-id' WHERE element_id = 'id-antigo';


-- ============================================
-- 9. BACKUP E RESTAURAÇÃO
-- ============================================

-- Fazer backup (no terminal, não no psql):
-- pg_dump -U postgres tcc_ux > backup_tcc_ux.sql

-- Restaurar (no terminal):
-- psql -U postgres tcc_ux < backup_tcc_ux.sql

-- Exportar eventos em CSV (no psql):
-- \COPY events TO 'eventos.csv' WITH CSV HEADER;

-- Importar de CSV:
-- \COPY events(type, tag, text, element_id, class, timestamp) FROM 'eventos.csv' WITH CSV HEADER;


-- ============================================
-- 10. CRIAR USUÁRIO ESPECÍFICO (segurança)
-- ============================================

-- Criar usuário com senha
CREATE USER tcc_user WITH PASSWORD 'senha_segura_aqui';

-- Dar permissões ao novo usuário
GRANT ALL PRIVILEGES ON DATABASE tcc_ux TO tcc_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tcc_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tcc_user;

-- Depois, use no .env:
-- DB_USER=tcc_user
-- DB_PASSWORD=senha_segura_aqui
