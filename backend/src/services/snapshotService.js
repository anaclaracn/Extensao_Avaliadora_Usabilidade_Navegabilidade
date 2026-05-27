// Service de varredura de sites
// Recebe o payload coletado pelo content-script e persiste no banco

const db = require('../database/connection');

class SnapshotService {

  /**
   * Verifica se uma URL já foi varrida recentemente (nas últimas 24h)
   * para evitar varreduras duplicadas desnecessárias.
   */
  static async findRecent(url) {
    const result = await db.query(
      `SELECT s.*, ss.scanned_at
       FROM site_snapshots ss
       JOIN sites s ON s.id = ss.site_id
       WHERE ss.url = $1
         AND ss.scanned_at > NOW() - INTERVAL '24 hours'
       ORDER BY ss.scanned_at DESC
       LIMIT 1`,
      [url]
    );
    return result.rows[0] || null;
  }

  /**
   * Cria um snapshot completo de uma URL.
   * Encontra ou cria o site pelo hostname, insere o snapshot
   * e todos os elementos coletados numa única transação.
   */
  static async createSnapshot({ url, meta, elements, researcherId }) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Encontrar ou criar o site pelo hostname
      let hostname;
      try { hostname = new URL(url).origin; } catch(_) { hostname = url; }

      let siteResult = await client.query('SELECT id FROM sites WHERE url = $1', [hostname]);
      let siteId;

      if (siteResult.rows.length > 0) {
        siteId = siteResult.rows[0].id;
      } else {
        const inserted = await client.query(
          'INSERT INTO sites (url) VALUES ($1) RETURNING id', [hostname]
        );
        siteId = inserted.rows[0].id;
      }

      // 2. Contar elementos por tipo
      const count = (type) => elements.filter(e => e.type === type).length;

      // 3. Inserir snapshot
      const snapResult = await client.query(
        `INSERT INTO site_snapshots
           (site_id, url, title, description, lang,
            total_links, total_buttons, total_headings,
            total_forms, total_images, scanned_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         RETURNING *`,
        [
          siteId, url,
          meta.title       || null,
          meta.description || null,
          meta.lang        || null,
          count('link'),
          count('button'),
          count('heading'),
          count('form'),
          count('image'),
          researcherId || null,
        ]
      );
      const snapshot = snapResult.rows[0];

      // 4. Inserir elementos em lote (chunked para evitar limite de parâmetros)
      if (elements.length > 0) {
        const chunkSize = 50;
        for (let i = 0; i < elements.length; i += chunkSize) {
          const chunk = elements.slice(i, i + chunkSize);
          const values = [];
          const params = [];
          let idx = 1;

          chunk.forEach(el => {
            values.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7},$${idx+8},$${idx+9},$${idx+10},$${idx+11},$${idx+12})`);
            params.push(
              snapshot.id,
              el.type        || null,
              el.tag         || null,
              (el.text || '').slice(0, 500) || null,
              el.href        || null,
              el.is_external || false,
              el.element_id  || null,
              el.class       || null,
              el.extra ? JSON.stringify(el.extra) : null,
              el.x != null ? Math.round(el.x) : null,
              el.y != null ? Math.round(el.y) : null,
              el.bg_color   || null,
              el.text_color || null
            );
            idx += 13;
          });

          await client.query(
            `INSERT INTO site_elements
               (snapshot_id, type, tag, text, href, is_external, element_id, "class", extra, x, y, bg_color, text_color)
             VALUES ${values.join(',')}`,
            params
          );
        }
      }

      await client.query('COMMIT');
      console.log(`✅ Snapshot criado: ${url} (${elements.length} elementos)`);
      return { snapshot, elementCount: elements.length };

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Lista todos os snapshots de um site, ordenados do mais recente
   */
  static async listBySite(siteId) {
    const result = await db.query(
      `SELECT ss.*, r.name AS scanned_by_name
       FROM site_snapshots ss
       LEFT JOIN researchers r ON r.id = ss.scanned_by
       WHERE ss.site_id = $1
       ORDER BY ss.scanned_at DESC`,
      [siteId]
    );
    return result.rows;
  }

  /**
   * Busca um snapshot pelo ID com todos os seus elementos
   */
  static async findById(snapshotId) {
    const snap = await db.query(
      `SELECT ss.*, r.name AS scanned_by_name
       FROM site_snapshots ss
       LEFT JOIN researchers r ON r.id = ss.scanned_by
       WHERE ss.id = $1`,
      [snapshotId]
    );
    if (!snap.rows[0]) return null;

    const elements = await db.query(
      `SELECT * FROM site_elements WHERE snapshot_id = $1 ORDER BY type, id`,
      [snapshotId]
    );

    return { ...snap.rows[0], elements: elements.rows };
  }

  /**
   * Resumo agregado por tipo de elemento de um snapshot
   */
  static async summarizeById(snapshotId) {
    const snap = await db.query('SELECT * FROM site_snapshots WHERE id = $1', [snapshotId]);
    if (!snap.rows[0]) return null;

    const breakdown = await db.query(
      `SELECT type, COUNT(*) AS total
       FROM site_elements
       WHERE snapshot_id = $1
       GROUP BY type ORDER BY total DESC`,
      [snapshotId]
    );

    const externalLinks = await db.query(
      `SELECT text, href FROM site_elements
       WHERE snapshot_id = $1 AND type = 'link' AND is_external = true
       ORDER BY text`,
      [snapshotId]
    );

    const headings = await db.query(
      `SELECT text, extra->>'level' AS level FROM site_elements
       WHERE snapshot_id = $1 AND type = 'heading'
       ORDER BY (extra->>'level')::int, id`,
      [snapshotId]
    );

    return {
      snapshot:      snap.rows[0],
      breakdown:     breakdown.rows,
      externalLinks: externalLinks.rows,
      headings:      headings.rows,
    };
  }
}

module.exports = SnapshotService;
