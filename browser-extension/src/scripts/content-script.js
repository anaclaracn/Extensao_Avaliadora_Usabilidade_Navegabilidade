let isEnabled = true;

chrome.runtime.onMessage.addListener((req) => {
  if (req.action === 'toggleTracking') isEnabled = req.enabled;
});

function sendEvent(type, e) {
  if (!isEnabled) return;
  const target = e.target;
  chrome.runtime.sendMessage({
    action: 'sendEventToBackend',
    event: {
      type,
      tag:        target.tagName?.toLowerCase() || null,
      text:       (target.innerText || target.value || '').slice(0, 200) || null,
      element_id: target.id || null,
      class:      target.className || null,
      url:        window.location.href,
      x:          e.clientX || null,
      y:          e.clientY || null,
      timestamp:  new Date().toISOString(),
    },
  });
}

document.addEventListener('click',   e => sendEvent('click', e),    true);
document.addEventListener('keydown', e => sendEvent('keydown', e),  true);
document.addEventListener('change',  e => sendEvent('change', e),   true);

// ── Scroll com profundidade percentual ──────────────────────
let scrollDebounce = null;
document.addEventListener('scroll', () => {
  if (!isEnabled) return;

  // Cancelar o registro anterior — só registra quando parar de rolar
  clearTimeout(scrollDebounce);

  scrollDebounce = setTimeout(() => {
    const scrollY    = window.scrollY;
    const viewportH  = window.innerHeight;
    const pageHeight = document.documentElement.scrollHeight;
    const depthPct   = pageHeight > 0
      ? Math.min(100, Math.round(((scrollY + viewportH) / pageHeight) * 1000) / 10)
      : null;

    chrome.runtime.sendMessage({
      action: 'sendEventToBackend',
      event: {
        type: 'scroll',
        tag: null, text: null, element_id: null, class: null,
        url: window.location.href,
        x: null, y: scrollY,
        timestamp: new Date().toISOString(),
        scroll_depth_pct: depthPct,
        page_height: pageHeight,
      },
    });
  }, 800); // só envia 800ms depois que o usuário parou de rolar
}, true);

// ── Hover Time ───────────────────────────────────────────────
// Usa mouseover/mouseout (que borbulham) em vez de mouseenter/mouseleave
// para garantir captura confiável em qualquer elemento da página.
// O WeakMap evita contar o mesmo elemento duas vezes quando o mouse
// passa por elementos filhos (verifica se já existe entrada antes de sobrescrever).

const HOVER_SELECTOR =
  'a, button, input, select, textarea, img, [role="button"], ' +
  'h1, h2, h3, h4, h5, h6, p, li, label';

const HOVER_MIN_MS = 300; // mínimo 300ms para evitar ruído de movimento

const hoverMap = new WeakMap(); // elemento → timestamp de entrada

document.addEventListener('mouseover', (e) => {
  if (!isEnabled) return;
  const el = e.target.closest(HOVER_SELECTOR);
  if (!el) return;
  // Só marca o início se ainda não tiver uma entrada para este elemento
  // (evita resetar o timer quando o mouse move entre filhos do mesmo elemento)
  if (!hoverMap.has(el)) {
    hoverMap.set(el, Date.now());
  }
}, true);

document.addEventListener('mouseout', (e) => {
  if (!isEnabled) return;
  const el = e.target.closest(HOVER_SELECTOR);
  if (!el || !hoverMap.has(el)) return;

  // Só registra o hover se o mouse saiu do elemento (não apenas se moveu
  // para um filho). relatedTarget é para onde o mouse foi.
  const relatedTarget = e.relatedTarget;
  if (relatedTarget && el.contains(relatedTarget)) return;

  const duration = Date.now() - hoverMap.get(el);
  hoverMap.delete(el);

  if (duration < HOVER_MIN_MS) return;

  chrome.runtime.sendMessage({
    action: 'sendEventToBackend',
    event: {
      type:       'hover',
      tag:        el.tagName?.toLowerCase() || null,
      text:       String(duration),   // duração em ms, campo reutilizado
      element_id: el.id || null,
      class:      typeof el.className === 'string' ? el.className : null,
      url:        window.location.href,
      x:          null,
      y:          null,
      timestamp:  new Date().toISOString(),
    },
  });
}, true);
