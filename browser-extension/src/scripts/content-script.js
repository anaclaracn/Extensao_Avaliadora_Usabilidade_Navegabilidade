/**
 * CONTENT-SCRIPT.JS
 * Captura eventos do usuário na página e envia ao background.
 */

let isEnabled = true;

// Receber comandos do background
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

document.addEventListener('click',    e => sendEvent('click', e),    true);
document.addEventListener('keydown',  e => sendEvent('keydown', e),  true);
document.addEventListener('scroll',   e => sendEvent('scroll', e),   true);
document.addEventListener('change',   e => sendEvent('change', e),   true);
