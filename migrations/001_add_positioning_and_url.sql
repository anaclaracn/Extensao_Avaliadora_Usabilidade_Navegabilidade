-- ============================================
-- MIGRATION: Adicionar dados de posicionamento e URL
-- ============================================
-- Adiciona campos para capturar:
-- - url: página onde o evento ocorreu
-- - x, y: coordenadas do clique/interação

-- Executar com: psql -U seu_usuario -d tcc_ux -f 001_add_positioning_and_url.sql

ALTER TABLE events
ADD COLUMN url TEXT,
ADD COLUMN x INTEGER,
ADD COLUMN y INTEGER;

-- Criar índices para melhor performance em buscas por URL
CREATE INDEX idx_events_url ON events(url);

-- Ver a estrutura atualizada
\d events
