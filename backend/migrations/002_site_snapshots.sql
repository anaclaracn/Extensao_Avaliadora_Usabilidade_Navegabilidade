-- ============================================================
-- MIGRATION v4 — Varredura de sites
-- Execute: psql -U postgres -d tcc_ux -f migrations/004_site_snapshots.sql
-- ============================================================

-- Snapshot geral de uma URL varrida
CREATE TABLE IF NOT EXISTS site_snapshots (
  id            SERIAL PRIMARY KEY,
  site_id       INTEGER   NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  url           TEXT      NOT NULL,       -- URL exata varrida (pode ser subpágina)
  title         TEXT,                     -- <title> da página
  description   TEXT,                     -- meta description
  lang          TEXT,                     -- atributo lang do <html>
  total_links   INTEGER   DEFAULT 0,
  total_buttons INTEGER   DEFAULT 0,
  total_headings INTEGER  DEFAULT 0,
  total_forms   INTEGER   DEFAULT 0,
  total_images  INTEGER   DEFAULT 0,
  scanned_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  scanned_by    INTEGER   REFERENCES researchers(id)  -- quem disparou
);

-- Cada elemento encontrado na varredura
CREATE TABLE IF NOT EXISTS site_elements (
  id           SERIAL PRIMARY KEY,
  snapshot_id  INTEGER   NOT NULL REFERENCES site_snapshots(id) ON DELETE CASCADE,
  type         TEXT      NOT NULL, -- 'link' | 'button' | 'heading' | 'form' | 'image' | 'input' | 'nav'
  tag          TEXT,               -- tag HTML original (a, button, h1, img, ...)
  text         TEXT,               -- conteúdo de texto visível
  href         TEXT,               -- para links
  is_external  BOOLEAN   DEFAULT false,
  element_id   TEXT,               -- atributo id do elemento
  class        TEXT,               -- atributo class
  x            INTEGER,
  y            INTEGER,
  bg_color     TEXT,
  text_color   TEXT,
  extra        JSONB               -- atributos extras por tipo (alt, action, method, level, etc)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_snapshots_site_id   ON site_snapshots(site_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_url        ON site_snapshots(url);
CREATE INDEX IF NOT EXISTS idx_elements_snapshot    ON site_elements(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_elements_type        ON site_elements(type);
