/**
 * SCANNER.JS — Content script de varredura
 *
 * Executado na página quando o pesquisador clica em "Varrer site".
 * Coleta todos os elementos relevantes do DOM e retorna o payload
 * para o background, que envia ao backend.
 *
 * Injetado dinamicamente via chrome.scripting.executeScript,
 * portanto não precisa estar declarado em content_scripts no manifest.
 */

function runScan() {
  const elements = [];

  // ── Meta informações ────────────────────────────────────────
  const meta = {
    title:       document.title || null,
    description: document.querySelector('meta[name="description"]')?.content || null,
    lang:        document.documentElement.lang || null,
    url:         window.location.href,
  };

  // ── Helper: texto limpo de um elemento ─────────────────────
  function cleanText(el) {
    return (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 500);
  }

  // ── Helper: posição do elemento na página ──────────────────
  // Usa getBoundingClientRect + scroll para posição absoluta no documento
  function getPosition(el) {
    try {
      const rect = el.getBoundingClientRect();
      return {
        x: Math.round(rect.left + window.scrollX),
        y: Math.round(rect.top  + window.scrollY),
        width:  Math.round(rect.width),
        height: Math.round(rect.height),
      };
    } catch(_) {
      return { x: null, y: null, width: null, height: null };
    }
  }

  // ── Helper: cores computadas do elemento ───────────────────
  // Captura background-color e color via getComputedStyle.
  // Converte rgb() transparente (rgba 0) para null.
  function getColors(el) {
    try {
      const style = window.getComputedStyle(el);
      const bg    = style.getPropertyValue('background-color') || null;
      const color = style.getPropertyValue('color')            || null;

      // rgba(0,0,0,0) = totalmente transparente → salvar como null
      const isTransparent = (v) => !v || v === 'transparent' || v === 'rgba(0, 0, 0, 0)';

      return {
        bg_color:   isTransparent(bg)    ? null : bg,
        text_color: isTransparent(color) ? null : color,
      };
    } catch(_) {
      return { bg_color: null, text_color: null };
    }
  }

  // ── Helper: verificar se link é externo ────────────────────
  function isExternal(href) {
    if (!href || href.startsWith('#') || href.startsWith('javascript')) return false;
    try {
      return new URL(href, window.location.href).hostname !== window.location.hostname;
    } catch(_) { return false; }
  }

  // ── 1. Links ────────────────────────────────────────────────
  document.querySelectorAll('a[href]').forEach(el => {
    const href = el.getAttribute('href');
    const text = cleanText(el);
    if (!href) return;
    const _posLink = getPosition(el);
    const _colLink = getColors(el);
    elements.push({
      type:       'link',
      tag:        'a',
      text:       text || href,
      href:       href,
      is_external: isExternal(href),
      element_id: el.id || null,
      class:      el.className || null,
      extra: {
        absolute_url: (() => { try { return new URL(href, window.location.href).href; } catch(_) { return href; } })(),
        target:       el.target || null,
        rel:          el.rel    || null,
      },
      x: _posLink.x, y: _posLink.y,
      bg_color: _colLink.bg_color, text_color: _colLink.text_color,
    });
  });

  // ── 2. Botões ────────────────────────────────────────────────
  document.querySelectorAll('button, input[type="submit"], input[type="button"], input[type="reset"], [role="button"]').forEach(el => {
    const text = cleanText(el) || el.value || el.getAttribute('aria-label') || '';
    const _posBtn = getPosition(el);
    const _colBtn = getColors(el);
    elements.push({
      type:       'button',
      tag:        el.tagName.toLowerCase(),
      text,
      element_id: el.id    || null,
      class:      el.className || null,
      extra: {
        type:     el.type     || null,
        name:     el.name     || null,
        disabled: el.disabled || false,
        aria_label: el.getAttribute('aria-label') || null,
      },
      x: _posBtn.x, y: _posBtn.y,
      bg_color: _colBtn.bg_color, text_color: _colBtn.text_color,
    });
  });

  // ── 3. Títulos ───────────────────────────────────────────────
  document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(el => {
    const _posH = getPosition(el);
    const _colH = getColors(el);
    elements.push({
      type:       'heading',
      tag:        el.tagName.toLowerCase(),
      text:       cleanText(el),
      element_id: el.id || null,
      class:      el.className || null,
      extra: {
        level: parseInt(el.tagName[1]),
      },
      x: _posH.x, y: _posH.y,
      bg_color: _colH.bg_color, text_color: _colH.text_color,
    });
  });

  // ── 4. Formulários ───────────────────────────────────────────
  document.querySelectorAll('form').forEach(el => {
    const fields = el.querySelectorAll('input:not([type="hidden"]), select, textarea');
    const fieldList = Array.from(fields).map(f => ({
      tag:         f.tagName.toLowerCase(),
      type:        f.type         || null,
      name:        f.name         || null,
      placeholder: f.placeholder  || null,
      required:    f.required     || false,
      label: (() => {
        if (f.id) {
          const lbl = document.querySelector(`label[for="${f.id}"]`);
          if (lbl) return cleanText(lbl);
        }
        return f.getAttribute('aria-label') || null;
      })(),
    }));

    const _posForm = getPosition(el);
    const _colForm = getColors(el);
    elements.push({
      type:       'form',
      tag:        'form',
      text:       el.getAttribute('aria-label') || el.id || null,
      element_id: el.id     || null,
      class:      el.className || null,
      extra: {
        action:      el.action  || null,
        method:      el.method  || 'get',
        field_count: fields.length,
        fields:      fieldList,
      },
      x: _posForm.x, y: _posForm.y,
      bg_color: _colForm.bg_color, text_color: _colForm.text_color,
    });
  });

  // ── 5. Imagens ───────────────────────────────────────────────
  document.querySelectorAll('img').forEach(el => {
    const _posImg = getPosition(el);
    const _colImg = getColors(el);
    elements.push({
      type:       'image',
      tag:        'img',
      text:       el.alt  || null,
      element_id: el.id   || null,
      class:      el.className || null,
      extra: {
        src:    el.src    || el.getAttribute('data-src') || null,
        alt:    el.alt    || null,
        width:  el.naturalWidth  || null,
        height: el.naturalHeight || null,
        loading: el.loading || null,
      },
      x: _posImg.x, y: _posImg.y,
      bg_color: _colImg.bg_color, text_color: _colImg.text_color,
    });
  });

  // ── 6. Inputs (fora de forms visíveis) ──────────────────────
  document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select, textarea').forEach(el => {
    // Pular se já está dentro de um form (já capturado acima)
    if (el.closest('form')) return;
    const _posInp = getPosition(el);
    const _colInp = getColors(el);
    elements.push({
      type:       'input',
      tag:        el.tagName.toLowerCase(),
      text:       el.placeholder || el.getAttribute('aria-label') || null,
      element_id: el.id   || null,
      class:      el.className || null,
      extra: {
        type:     el.type     || null,
        name:     el.name     || null,
        required: el.required || false,
      },
      x: _posInp.x, y: _posInp.y,
      bg_color: _colInp.bg_color, text_color: _colInp.text_color,
    });
  });

  // ── 7. Navegação ─────────────────────────────────────────────
  document.querySelectorAll('nav, [role="navigation"]').forEach(el => {
    const _posNav = getPosition(el);
    const _colNav = getColors(el);
    const navLinks = Array.from(el.querySelectorAll('a')).map(a => ({
      text: cleanText(a),
      href: a.getAttribute('href') || null,
    }));
    elements.push({
      type:       'nav',
      tag:        el.tagName.toLowerCase(),
      text:       el.getAttribute('aria-label') || el.id || null,
      element_id: el.id || null,
      class:      el.className || null,
      extra: {
        link_count: navLinks.length,
        links:      navLinks.slice(0, 30),
      },
      x: _posNav.x, y: _posNav.y,
      bg_color: _colNav.bg_color, text_color: _colNav.text_color,
    });
  });

  // ── 8. Textos de destaque (strong, labels soltos) ───────────
  const importantTexts = new Set();
  document.querySelectorAll('strong, b, label:not([for])').forEach(el => {
    const t = cleanText(el);
    if (t.length > 2 && t.length < 200 && !importantTexts.has(t)) {
      importantTexts.add(t);
      elements.push({
        type:  'highlight',
        tag:   el.tagName.toLowerCase(),
        text:  t,
        extra: {}
      });
    }
  });

  return { meta, elements };
}

// Executar e retornar resultado
runScan();
