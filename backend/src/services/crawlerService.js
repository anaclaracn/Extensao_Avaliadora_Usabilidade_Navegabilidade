// crawlerService.js — Motor do crawler com detecção de templates de URL
//
// Lógica de template:
//   /produto/123  → padrão /produto/{id}
//   /produto/456  → mesmo padrão → enfileira como skipped
//   Apenas a primeira URL de cada padrão é varrida em profundidade

const puppeteer       = require('puppeteer-core');
const db              = require('../database/connection');
const SnapshotService = require('./snapshotService');

const CHROME_PATHS = {
  win32:  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  darwin: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  linux:  '/usr/bin/google-chrome',
};

class CrawlerService {

  // ── Extrair padrão substituindo segmentos numéricos por {id} ──
  static extractPattern(url) {
    try {
      const u = new URL(url);
      const patternPath = u.pathname
        .split('/')
        .map(seg => /^\d+$/.test(seg) ? '{id}' : seg)
        .join('/');
      const patternSearch = u.search.replace(/=\d+/g, '={id}');
      return (u.origin + patternPath + patternSearch).toLowerCase();
    } catch(_) { return url.toLowerCase(); }
  }

  // ── Normalizar URL (sem hash, sem trailing slash) ─────────────
  static normalizeUrl(rawUrl, base) {
    try {
      const u = new URL(rawUrl, base);
      u.hash = '';
      let href = u.href;
      if (href.endsWith('/') && href !== u.origin + '/') href = href.slice(0, -1);
      return href.toLowerCase();
    } catch(_) { return null; }
  }

  // ── Verificar se pertence ao mesmo domínio/subdomínio ─────────
  static isSameDomain(url, baseUrl) {
    try {
      const u = new URL(url), base = new URL(baseUrl);
      return u.hostname === base.hostname ||
             u.hostname.endsWith('.' + base.hostname);
    } catch(_) { return false; }
  }

  // ── Verificar se padrão já foi varrido como representante ─────
  static async patternAlreadyCrawled(sessionId, pattern) {
    const res = await db.query(
      `SELECT id FROM crawler_queue
       WHERE crawler_session_id = $1
         AND url_pattern = $2
         AND is_template_representative = true
       LIMIT 1`,
      [sessionId, pattern]
    );
    return res.rows.length > 0;
  }

  // ── Criar sessão de crawler ───────────────────────────────────
  static async createSession({ baseUrl, researcherId }) {
    const origin = new URL(baseUrl).origin;

    let siteRes = await db.query('SELECT id FROM sites WHERE url = $1', [origin]);
    let siteId;
    if (siteRes.rows.length > 0) {
      siteId = siteRes.rows[0].id;
    } else {
      const ins = await db.query('INSERT INTO sites (url) VALUES ($1) RETURNING id', [origin]);
      siteId = ins.rows[0].id;
    }

    const session = await db.query(
      `INSERT INTO crawler_sessions (site_id, base_url, started_by, status)
       VALUES ($1, $2, $3, 'pending') RETURNING *`,
      [siteId, origin, researcherId || null]
    );
    const sessionId = session.rows[0].id;

    const normalized = CrawlerService.normalizeUrl(baseUrl, baseUrl);
    const pattern    = CrawlerService.extractPattern(normalized);
    await db.query(
      `INSERT INTO crawler_queue
         (crawler_session_id, url, url_normalized, url_pattern, depth, is_template_representative)
       VALUES ($1, $2, $3, $4, 0, true)
       ON CONFLICT (crawler_session_id, url_normalized) DO NOTHING`,
      [sessionId, baseUrl, normalized, pattern]
    );

    console.log(`🕷️  Sessão #${sessionId} criada — ${origin}`);
    return session.rows[0];
  }

  // ── Iniciar crawler em background ────────────────────────────
  static async startCrawler(sessionId, chromePath) {
    await db.query(
      `UPDATE crawler_sessions SET status = 'running', started_at = NOW() WHERE id = $1`,
      [sessionId]
    );

    const sessRes = await db.query('SELECT * FROM crawler_sessions WHERE id = $1', [sessionId]);
    const session = sessRes.rows[0];
    const baseUrl = session.base_url;
    const execPath = chromePath || CHROME_PATHS[process.platform] || CHROME_PATHS.linux;

    console.log(`🌐 Chrome: ${execPath}`);

    let browser;
    try {
      browser = await puppeteer.launch({
        executablePath: execPath,
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
      });

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });
      page.setDefaultNavigationTimeout(30000);

      let crawled = 0, skipped = 0;
      const MAX_PAGES = session.max_pages || 5000;
      const MAX_DEPTH = session.max_depth || 20;

      while (crawled < MAX_PAGES) {
        // Verificar se foi parado
        const check = await db.query('SELECT status FROM crawler_sessions WHERE id = $1', [sessionId]);
        if (check.rows[0]?.status === 'stopped') { console.log(`⏹️  #${sessionId} parado`); break; }

        // Próxima URL pendente (representantes têm prioridade)
        const nextRes = await db.query(
          `SELECT * FROM crawler_queue
           WHERE crawler_session_id = $1 AND status = 'pending' AND depth <= $2
           ORDER BY is_template_representative DESC, depth ASC, id ASC LIMIT 1`,
          [sessionId, MAX_DEPTH]
        );
        if (!nextRes.rows.length) break;

        const item = nextRes.rows[0];
        await db.query(
          `UPDATE crawler_queue SET status = 'crawling', processed_at = NOW() WHERE id = $1`,
          [item.id]
        );

        // ── Verificar se deve pular (mesmo template já varrido) ──
        if (!item.is_template_representative) {
          const already = await CrawlerService.patternAlreadyCrawled(sessionId, item.url_pattern);
          if (already) {
            await db.query(
              `UPDATE crawler_queue SET status = 'skipped', processed_at = NOW() WHERE id = $1`,
              [item.id]
            );
            skipped++;
            await db.query('UPDATE crawler_sessions SET pages_skipped = $1 WHERE id = $2', [skipped, sessionId]);
            console.log(`⏭️  Skipped: ${item.url_pattern}`);
            continue;
          }
        }

        console.log(`📄 [${crawled+1}] depth=${item.depth} — ${item.url}`);

        try {
          await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 30000 });

          // Scanner inline no contexto da página
          const scanData = await page.evaluate(() => {
            const elements = [];
            const meta = {
              title:       document.title || null,
              description: document.querySelector('meta[name="description"]')?.content || null,
              lang:        document.documentElement.lang || null,
              url:         window.location.href,
            };

            const cleanText = el => (el.innerText||el.textContent||'').trim().replace(/\s+/g,' ').slice(0,500);
            const getPos = el => { try { const r=el.getBoundingClientRect(); return {x:Math.round(r.left+scrollX),y:Math.round(r.top+scrollY)}; } catch(_){return{x:null,y:null};} };
            const getCol = el => { try { const s=getComputedStyle(el),bg=s.backgroundColor,c=s.color,t=v=>!v||v==='transparent'||v==='rgba(0, 0, 0, 0)'; return{bg_color:t(bg)?null:bg,text_color:t(c)?null:c}; } catch(_){return{bg_color:null,text_color:null};} };
            const isExt  = h => { if(!h||h.startsWith('#')||h.startsWith('javascript')) return false; try{return new URL(h,location.href).hostname!==location.hostname;}catch(_){return false;} };

            const discoveredLinks = [];
            document.querySelectorAll('a[href]').forEach(el => {
              const href=el.getAttribute('href');
              if(!href||href.startsWith('javascript')||href.startsWith('mailto')||href.startsWith('tel')) return;
              const pos=getPos(el),col=getCol(el),ext=isExt(href);
              if(!ext) discoveredLinks.push(href);
              elements.push({type:'link',tag:'a',text:cleanText(el)||href,href,is_external:ext,element_id:el.id||null,class:el.className||null,extra:{absolute_url:(()=>{try{return new URL(href,location.href).href;}catch(_){return href;}})(),target:el.target||null},x:pos.x,y:pos.y,...col});
            });
            document.querySelectorAll('button,input[type="submit"],input[type="button"],input[type="reset"],[role="button"]').forEach(el => {
              const pos=getPos(el),col=getCol(el);
              elements.push({type:'button',tag:el.tagName.toLowerCase(),text:cleanText(el)||el.value||'',element_id:el.id||null,class:el.className||null,extra:{type:el.type||null,disabled:el.disabled||false},x:pos.x,y:pos.y,...col});
            });
            document.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach(el => {
              const pos=getPos(el),col=getCol(el);
              elements.push({type:'heading',tag:el.tagName.toLowerCase(),text:cleanText(el),element_id:el.id||null,class:el.className||null,extra:{level:parseInt(el.tagName[1])},x:pos.x,y:pos.y,...col});
            });
            document.querySelectorAll('form').forEach(el => {
              const fields=el.querySelectorAll('input:not([type="hidden"]),select,textarea'),pos=getPos(el),col=getCol(el);
              elements.push({type:'form',tag:'form',text:el.id||null,element_id:el.id||null,class:el.className||null,extra:{action:el.action||null,method:el.method||'get',field_count:fields.length},x:pos.x,y:pos.y,...col});
            });
            document.querySelectorAll('img').forEach(el => {
              const pos=getPos(el),col=getCol(el);
              elements.push({type:'image',tag:'img',text:el.alt||null,element_id:el.id||null,class:el.className||null,extra:{src:el.src||null,alt:el.alt||null},x:pos.x,y:pos.y,...col});
            });

            return { meta, elements, discoveredLinks };
          });

          // Salvar snapshot
          const snap = await SnapshotService.createSnapshot({
            url: item.url, meta: scanData.meta,
            elements: scanData.elements, researcherId: session.started_by,
          });

          await db.query(
            `UPDATE crawler_queue SET status='done', snapshot_id=$1, processed_at=NOW(), is_template_representative=true WHERE id=$2`,
            [snap.snapshot.id, item.id]
          );

          // Enfileirar novos links descobertos
          let newLinks = 0;
          for (const href of scanData.discoveredLinks) {
            const norm = CrawlerService.normalizeUrl(href, item.url);
            if (!norm || !CrawlerService.isSameDomain(norm, baseUrl)) continue;
            const pat  = CrawlerService.extractPattern(norm);
            const isRep = !(await CrawlerService.patternAlreadyCrawled(sessionId, pat));
            try {
              await db.query(
                `INSERT INTO crawler_queue (crawler_session_id,url,url_normalized,url_pattern,depth,is_template_representative)
                 VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT (crawler_session_id,url_normalized) DO NOTHING`,
                [sessionId, norm, norm, pat, item.depth+1, isRep]
              );
              newLinks++;
            } catch(_) {}
          }

          crawled++;
          const qc = await db.query('SELECT COUNT(*) FROM crawler_queue WHERE crawler_session_id=$1', [sessionId]);
          await db.query(
            'UPDATE crawler_sessions SET pages_crawled=$1, pages_found=$2 WHERE id=$3',
            [crawled, parseInt(qc.rows[0].count), sessionId]
          );
          console.log(`✅ ${item.url} | ${scanData.elements.length} elem | ${newLinks} novos links`);

        } catch (pageErr) {
          console.error(`❌ ${item.url}:`, pageErr.message);
          await db.query(
            `UPDATE crawler_queue SET status='error', error_msg=$1, processed_at=NOW() WHERE id=$2`,
            [pageErr.message.slice(0,500), item.id]
          );
          await db.query('UPDATE crawler_sessions SET pages_error=pages_error+1 WHERE id=$1', [sessionId]);
        }

        await new Promise(r => setTimeout(r, 500));
      }

      await db.query(`UPDATE crawler_sessions SET status='done', finished_at=NOW() WHERE id=$1`, [sessionId]);
      console.log(`🏁 Crawler #${sessionId} — ${crawled} varridas, ${skipped} puladas`);

    } catch (err) {
      console.error(`💥 Fatal #${sessionId}:`, err);
      await db.query(
        `UPDATE crawler_sessions SET status='error', finished_at=NOW(), error_msg=$1 WHERE id=$2`,
        [err.message.slice(0,500), sessionId]
      );
    } finally {
      if (browser) await browser.close();
    }
  }

  // ── Parar sessão ──────────────────────────────────────────────
  static async stopSession(sessionId) {
    await db.query(
      `UPDATE crawler_sessions SET status='stopped', finished_at=NOW()
       WHERE id=$1 AND status='running'`,
      [sessionId]
    );
  }

  // ── Status com padrões detectados ────────────────────────────
  static async getStatus(sessionId) {
    const session = await db.query('SELECT * FROM crawler_sessions WHERE id=$1', [sessionId]);
    if (!session.rows[0]) return null;

    const queue = await db.query(
      `SELECT status, COUNT(*) AS total FROM crawler_queue WHERE crawler_session_id=$1 GROUP BY status`,
      [sessionId]
    );
    const patterns = await db.query(
      `SELECT url_pattern,
              COUNT(*) AS total_urls,
              SUM(CASE WHEN status='skipped' THEN 1 ELSE 0 END) AS skipped
       FROM crawler_queue
       WHERE crawler_session_id=$1
       GROUP BY url_pattern HAVING COUNT(*)>1
       ORDER BY total_urls DESC LIMIT 10`,
      [sessionId]
    );

    const queueStats = {};
    queue.rows.forEach(r => { queueStats[r.status] = parseInt(r.total); });

    return { ...session.rows[0], queue: queueStats, patterns: patterns.rows };
  }

  // ── Listar sessões de um site ─────────────────────────────────
  static async listBySite(siteId) {
    const result = await db.query(
      `SELECT cs.*, r.name AS started_by_name
       FROM crawler_sessions cs
       LEFT JOIN researchers r ON r.id=cs.started_by
       WHERE cs.site_id=$1 ORDER BY cs.started_at DESC`,
      [siteId]
    );
    return result.rows;
  }
}

module.exports = CrawlerService;
