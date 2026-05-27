// ============================================================
// crawlerService.js — Motor do crawler
//
// Usa puppeteer-core para controlar o Chrome já instalado
// na máquina do pesquisador, aproveitando cookies e sessão.
//
// Fluxo:
//  1. Cria a sessão no banco (crawler_sessions)
//  2. Enfileira a URL base (crawler_queue)
//  3. Loop: pega próxima URL pending, abre no Chrome,
//     coleta elementos (mesmo scanner do DOM), descobre novos
//     links, salva snapshot, marca como done, repete
//  4. Ao terminar (fila vazia ou limite atingido), fecha
// ============================================================

const puppeteer   = require('puppeteer-core');
const db          = require('../database/connection');
const SnapshotService = require('./snapshotService');

// ── Caminhos padrão do Chrome por OS ─────────────────────────
const CHROME_PATHS = {
  win32:  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  linux:  '/usr/bin/google-chrome',
};

class CrawlerService {

  // ── Normalizar URL para deduplicação ─────────────────────────
  static normalizeUrl(rawUrl, base) {
    try {
      const u = new URL(rawUrl, base);
      u.hash = '';                        // remover fragmento (#section)
      let href = u.href;
      if (href.endsWith('/') && href !== u.origin + '/') {
        href = href.slice(0, -1);         // remover trailing slash redundante
      }
      return href.toLowerCase();
    } catch(_) { return null; }
  }

  // ── Verificar se URL pertence ao domínio base ─────────────────
  static isSameDomain(url, baseUrl) {
    try {
      const u    = new URL(url);
      const base = new URL(baseUrl);
      // permite o domínio exato e todos os subdomínios
      return u.hostname === base.hostname ||
             u.hostname.endsWith('.' + base.hostname);
    } catch(_) { return false; }
  }

  // ── Criar sessão e enfileirar URL base ────────────────────────
  static async createSession({ baseUrl, researcherId }) {
    // Encontrar ou criar site
    const origin = new URL(baseUrl).origin;
    let siteRes = await db.query('SELECT id FROM sites WHERE url = $1', [origin]);
    let siteId;
    if (siteRes.rows.length > 0) {
      siteId = siteRes.rows[0].id;
    } else {
      const ins = await db.query('INSERT INTO sites (url) VALUES ($1) RETURNING id', [origin]);
      siteId = ins.rows[0].id;
    }

    // Criar sessão
    const session = await db.query(
      `INSERT INTO crawler_sessions (site_id, base_url, started_by, status)
       VALUES ($1, $2, $3, 'pending') RETURNING *`,
      [siteId, origin, researcherId || null]
    );
    const sessionId = session.rows[0].id;

    // Enfileirar URL inicial
    const normalized = CrawlerService.normalizeUrl(baseUrl, baseUrl);
    await db.query(
      `INSERT INTO crawler_queue (crawler_session_id, url, url_normalized, depth)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (crawler_session_id, url_normalized) DO NOTHING`,
      [sessionId, baseUrl, normalized]
    );

    console.log(`🕷️  Sessão de crawler criada: #${sessionId} — ${origin}`);
    return session.rows[0];
  }

  // ── Iniciar crawler (roda em background, não bloqueia a rota) ─
  static async startCrawler(sessionId, chromePath) {
    // Atualizar status para running
    await db.query(
      `UPDATE crawler_sessions SET status = 'running', started_at = NOW() WHERE id = $1`,
      [sessionId]
    );

    // Pegar base_url da sessão
    const sessRes = await db.query('SELECT * FROM crawler_sessions WHERE id = $1', [sessionId]);
    const session = sessRes.rows[0];
    const baseUrl = session.base_url;

    const execPath = chromePath || CHROME_PATHS[process.platform] || CHROME_PATHS.linux;
    console.log(`🌐 Iniciando Chrome: ${execPath}`);

    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: execPath,
        headless:       'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      // Timeout generoso para páginas lentas
      page.setDefaultNavigationTimeout(30000);

      let crawled = 0;
      const MAX_PAGES = session.max_pages || 5000;
      const MAX_DEPTH = session.max_depth || 20;

      // ── Loop principal ────────────────────────────────────────
      while (crawled < MAX_PAGES) {

        // Verificar se sessão foi parada externamente
        const statusCheck = await db.query(
          'SELECT status FROM crawler_sessions WHERE id = $1', [sessionId]
        );
        if (statusCheck.rows[0]?.status === 'stopped') {
          console.log(`⏹️  Sessão #${sessionId} parada pelo usuário`);
          break;
        }

        // Pegar próxima URL pendente
        const nextRes = await db.query(
          `SELECT * FROM crawler_queue
           WHERE crawler_session_id = $1
             AND status = 'pending'
             AND depth <= $2
           ORDER BY depth ASC, id ASC
           LIMIT 1`,
          [sessionId, MAX_DEPTH]
        );

        if (!nextRes.rows.length) break; // fila vazia — acabou!

        const item = nextRes.rows[0];

        // Marcar como crawling
        await db.query(
          `UPDATE crawler_queue SET status = 'crawling', processed_at = NOW() WHERE id = $1`,
          [item.id]
        );

        console.log(`📄 [${crawled + 1}] depth=${item.depth} — ${item.url}`);

        try {
          // Navegar para a página
          await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

          // Executar o scanner no contexto da página
          const scanData = await page.evaluate(() => {
            // ── SCANNER INLINE (copiado do scanner.js do DOM) ──
            const elements = [];

            const meta = {
              title:       document.title || null,
              description: document.querySelector('meta[name="description"]')?.content || null,
              lang:        document.documentElement.lang || null,
              url:         window.location.href,
            };

            function cleanText(el) {
              return (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 500);
            }

            function getPosition(el) {
              try {
                const r = el.getBoundingClientRect();
                return { x: Math.round(r.left + window.scrollX), y: Math.round(r.top + window.scrollY) };
              } catch(_) { return { x: null, y: null }; }
            }

            function getColors(el) {
              try {
                const s  = window.getComputedStyle(el);
                const bg = s.getPropertyValue('background-color');
                const c  = s.getPropertyValue('color');
                const t  = v => !v || v === 'transparent' || v === 'rgba(0, 0, 0, 0)';
                return { bg_color: t(bg) ? null : bg, text_color: t(c) ? null : c };
              } catch(_) { return { bg_color: null, text_color: null }; }
            }

            function isExternal(href) {
              if (!href || href.startsWith('#') || href.startsWith('javascript')) return false;
              try { return new URL(href, location.href).hostname !== location.hostname; }
              catch(_) { return false; }
            }

            // Links — capturar para descoberta de novas URLs
            const discoveredLinks = [];
            document.querySelectorAll('a[href]').forEach(el => {
              const href = el.getAttribute('href');
              const text = cleanText(el);
              if (!href || href.startsWith('javascript') || href.startsWith('mailto') || href.startsWith('tel')) return;
              const pos = getPosition(el);
              const col = getColors(el);
              const ext = isExternal(href);
              if (!ext) discoveredLinks.push(href); // só links internos para crawling
              elements.push({ type:'link', tag:'a', text: text||href, href, is_external: ext, element_id: el.id||null, class: el.className||null, extra:{ absolute_url: (() => { try { return new URL(href, location.href).href; } catch(_){ return href; } })(), target: el.target||null }, x: pos.x, y: pos.y, bg_color: col.bg_color, text_color: col.text_color });
            });

            // Botões
            document.querySelectorAll('button,input[type="submit"],input[type="button"],input[type="reset"],[role="button"]').forEach(el => {
              const pos = getPosition(el); const col = getColors(el);
              elements.push({ type:'button', tag: el.tagName.toLowerCase(), text: cleanText(el)||el.value||el.getAttribute('aria-label')||'', element_id: el.id||null, class: el.className||null, extra:{ type: el.type||null, disabled: el.disabled||false }, x: pos.x, y: pos.y, bg_color: col.bg_color, text_color: col.text_color });
            });

            // Títulos
            document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(el => {
              const pos = getPosition(el); const col = getColors(el);
              elements.push({ type:'heading', tag: el.tagName.toLowerCase(), text: cleanText(el), element_id: el.id||null, class: el.className||null, extra:{ level: parseInt(el.tagName[1]) }, x: pos.x, y: pos.y, bg_color: col.bg_color, text_color: col.text_color });
            });

            // Formulários
            document.querySelectorAll('form').forEach(el => {
              const fields = Array.from(el.querySelectorAll('input:not([type="hidden"]),select,textarea'));
              const pos = getPosition(el); const col = getColors(el);
              elements.push({ type:'form', tag:'form', text: el.id||null, element_id: el.id||null, class: el.className||null, extra:{ action: el.action||null, method: el.method||'get', field_count: fields.length }, x: pos.x, y: pos.y, bg_color: col.bg_color, text_color: col.text_color });
            });

            // Imagens
            document.querySelectorAll('img').forEach(el => {
              const pos = getPosition(el); const col = getColors(el);
              elements.push({ type:'image', tag:'img', text: el.alt||null, element_id: el.id||null, class: el.className||null, extra:{ src: el.src||null, alt: el.alt||null }, x: pos.x, y: pos.y, bg_color: col.bg_color, text_color: col.text_color });
            });

            return { meta, elements, discoveredLinks };
          });

          // Salvar snapshot no banco
          const snapResult = await SnapshotService.createSnapshot({
            url:          item.url,
            meta:         scanData.meta,
            elements:     scanData.elements,
            researcherId: session.started_by,
          });

          // Marcar URL como done
          await db.query(
            `UPDATE crawler_queue
             SET status = 'done', snapshot_id = $1, processed_at = NOW()
             WHERE id = $2`,
            [snapResult.snapshot.id, item.id]
          );

          // Descobrir e enfileirar novos links
          let newLinks = 0;
          for (const href of scanData.discoveredLinks) {
            const normalized = CrawlerService.normalizeUrl(href, item.url);
            if (!normalized) continue;
            if (!CrawlerService.isSameDomain(normalized, baseUrl)) continue;

            try {
              await db.query(
                `INSERT INTO crawler_queue
                   (crawler_session_id, url, url_normalized, depth)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (crawler_session_id, url_normalized) DO NOTHING`,
                [sessionId, normalized, normalized, item.depth + 1]
              );
              newLinks++;
            } catch(_) {} // conflito de unique constraint — URL já na fila
          }

          crawled++;

          // Atualizar contadores na sessão
          const queueCount = await db.query(
            'SELECT COUNT(*) FROM crawler_queue WHERE crawler_session_id = $1',
            [sessionId]
          );
          await db.query(
            `UPDATE crawler_sessions
             SET pages_crawled = $1, pages_found = $2
             WHERE id = $3`,
            [crawled, parseInt(queueCount.rows[0].count), sessionId]
          );

          console.log(`✅ Concluída: ${item.url} | ${scanData.elements.length} elementos | ${newLinks} links novos`);

        } catch (pageErr) {
          console.error(`❌ Erro em ${item.url}:`, pageErr.message);
          await db.query(
            `UPDATE crawler_queue
             SET status = 'error', error_msg = $1, processed_at = NOW()
             WHERE id = $2`,
            [pageErr.message.slice(0, 500), item.id]
          );
          await db.query(
            'UPDATE crawler_sessions SET pages_error = pages_error + 1 WHERE id = $1',
            [sessionId]
          );
        }

        // Pausa breve para não sobrecarregar o servidor alvo
        await new Promise(r => setTimeout(r, 500));
      }

      // ── Finalizar sessão ────────────────────────────────────
      await db.query(
        `UPDATE crawler_sessions
         SET status = 'done', finished_at = NOW()
         WHERE id = $1`,
        [sessionId]
      );
      console.log(`🏁 Crawler #${sessionId} finalizado — ${crawled} páginas varridas`);

    } catch (err) {
      console.error(`💥 Erro fatal no crawler #${sessionId}:`, err);
      await db.query(
        `UPDATE crawler_sessions
         SET status = 'error', finished_at = NOW(), error_msg = $1
         WHERE id = $2`,
        [err.message.slice(0, 500), sessionId]
      );
    } finally {
      if (browser) await browser.close();
    }
  }

  // ── Parar sessão em andamento ─────────────────────────────────
  static async stopSession(sessionId) {
    await db.query(
      `UPDATE crawler_sessions
       SET status = 'stopped', finished_at = NOW()
       WHERE id = $1 AND status = 'running'`,
      [sessionId]
    );
    console.log(`⏹️  Sessão #${sessionId} marcada para parar`);
  }

  // ── Buscar status de uma sessão ───────────────────────────────
  static async getStatus(sessionId) {
    const session = await db.query(
      'SELECT * FROM crawler_sessions WHERE id = $1',
      [sessionId]
    );
    if (!session.rows[0]) return null;

    const queue = await db.query(
      `SELECT status, COUNT(*) AS total
       FROM crawler_queue
       WHERE crawler_session_id = $1
       GROUP BY status`,
      [sessionId]
    );

    const queueStats = {};
    queue.rows.forEach(r => { queueStats[r.status] = parseInt(r.total); });

    return { ...session.rows[0], queue: queueStats };
  }

  // ── Listar sessões de um site ─────────────────────────────────
  static async listBySite(siteId) {
    const result = await db.query(
      `SELECT cs.*, r.name AS started_by_name
       FROM crawler_sessions cs
       LEFT JOIN researchers r ON r.id = cs.started_by
       WHERE cs.site_id = $1
       ORDER BY cs.started_at DESC`,
      [siteId]
    );
    return result.rows;
  }
}

module.exports = CrawlerService;
