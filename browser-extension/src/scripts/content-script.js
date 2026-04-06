/**
 * ============================================
 * CONTENT-SCRIPT.JS
 * ============================================
 *
 * Executa no contexto das páginas web
 * Responsável por capturar eventos do usuário
 * e comunicar com o background script
 */

// ============================================
// CONFIGURAÇÃO INICIAL
// ============================================

const EXT_CONFIG = {
  backendUrl: "http://localhost:3000",
  apiEndpoint: "/events",
  enabled: true,
  eventQueue: [],
  batchSize: 5, // Enviar em grupos de X eventos
  batchTimeout: 5000, // Enviar a cada 5 segundos
  lastBatchTime: Date.now(),
};

// ============================================
// CAPTURA DE CLIQUES
// ============================================

/**
 * Captura um evento de clique no documento
 * Extrai informações relevantes do elemento clicado
 *
 * @param {Event} event - Evento de clique do navegador
 */
function handleClickEvent(event) {
  // Verificar se a extensão está habilitada
  if (!EXT_CONFIG.enabled) return;

  const element = event.target;
  const clickData = {
    type: "click",
    tag: element.tagName,
    text: element.textContent?.substring(0, 100) || "", // Primeiros 100 chars
    element_id: element.id || "",
    class: element.className || "",
    timestamp: new Date().toISOString(),
    url: window.location.href,
    x: event.clientX,
    y: event.clientY,
  };

  console.log("📌 Clique capturado:", clickData);
  queueEvent(clickData);
}

// ============================================
// CAPTURA DE SCROLL
// ============================================

let scrollTimeout;
let lastScrollY = 0;
let maxScrollY = 0;

/**
 * Captura evento de scroll
 * Usa debounce para não sobrecarregar com eventos
 */
function handleScrollEvent(event) {
  if (!EXT_CONFIG.enabled) return;

  lastScrollY = window.scrollY;
  maxScrollY = Math.max(maxScrollY, window.scrollY);

  clearTimeout(scrollTimeout);
  scrollTimeout = setTimeout(() => {
    const scrollData = {
      type: "scroll",
      tag: "window",
      text: `Scroll to Y: ${lastScrollY}px (max: ${maxScrollY}px)`,
      element_id: "",
      class: "",
      timestamp: new Date().toISOString(),
      url: window.location.href,
      x: 0,
      y: lastScrollY,
    };

    console.log("📜 Scroll capturado:", scrollData);
    queueEvent(scrollData);
  }, 500); // Aguarda 500ms após o último scroll
}

// ============================================
// CAPTURA DE FOCUS (em campos de formulário)
// ============================================

/**
 * Captura quando um campo de entrada recebe foco
 */
function handleFocusEvent(event) {
  if (!EXT_CONFIG.enabled) return;

  const element = event.target;

  // Apenas capturar foco em elementos interativos
  if (!["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)) return;

  const focusData = {
    type: "focus",
    tag: element.tagName,
    text: element.type || element.name || element.placeholder || "",
    element_id: element.id || "",
    class: element.className || "",
    timestamp: new Date().toISOString(),
    url: window.location.href,
    x: 0,
    y: 0,
  };

  console.log("🎯 Focus capturado:", focusData);
  queueEvent(focusData);
}

// ============================================
// CAPTURA DE MUDANÇAS EM FORMULÁRIOS
// ============================================

/**
 * Captura quando um campo de formulário é alterado
 */
function handleChangeEvent(event) {
  if (!EXT_CONFIG.enabled) return;

  const element = event.target;

  // Apenas capturar mudanças em elementos interativos
  if (!["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)) return;

  const changeData = {
    type: "change",
    tag: element.tagName,
    text: `${element.type || element.name} changed`,
    element_id: element.id || "",
    class: element.className || "",
    timestamp: new Date().toISOString(),
    url: window.location.href,
    x: 0,
    y: 0,
  };

  console.log("✏️  Mudança capturada:", changeData);
  queueEvent(changeData);
}

// ============================================
// CAPTURA DE NAVEGAÇÃO
// ============================================

/**
 * Captura quando o usuário navega para um novo link
 */
function handleLinkClick(event) {
  if (!EXT_CONFIG.enabled) return;

  const link = event.target.closest("a");
  if (!link) return;

  const navigationData = {
    type: "navigation",
    tag: "A",
    text: link.textContent?.substring(0, 100) || "",
    element_id: link.id || "",
    class: link.className || "",
    timestamp: new Date().toISOString(),
    url: link.href || "",
    x: event.clientX,
    y: event.clientY,
  };

  console.log("🔗 Navegação capturada:", navigationData);
  queueEvent(navigationData);
}

// ============================================
// FILA E ENVIO DE EVENTOS
// ============================================

/**
 * Adiciona um evento à fila para envio em lote
 */
function queueEvent(eventData) {
  EXT_CONFIG.eventQueue.push(eventData);

  // Enviar se atingiu o tamanho de lote
  if (EXT_CONFIG.eventQueue.length >= EXT_CONFIG.batchSize) {
    sendEventsBatch();
  }
  // Ou se passou o timeout
  else if (Date.now() - EXT_CONFIG.lastBatchTime > EXT_CONFIG.batchTimeout) {
    sendEventsBatch();
  }
}

/**
 * Envia um lote de eventos para o backend
 */
async function sendEventsBatch() {
  if (EXT_CONFIG.eventQueue.length === 0) return;

  const eventsToSend = EXT_CONFIG.eventQueue.splice(0, EXT_CONFIG.batchSize);
  EXT_CONFIG.lastBatchTime = Date.now();

  console.log(`📤 Enviando ${eventsToSend.length} eventos para o backend...`);

  try {
    // Enviar cada evento individualmente para o backend
    for (const event of eventsToSend) {
      await sendEventToBackend(event);
    }

    console.log("✅ Eventos enviados com sucesso!");
  } catch (error) {
    console.error("❌ Erro ao enviar eventos:", error);
    // Recolocar eventos na fila para nova tentativa
    EXT_CONFIG.eventQueue.unshift(...eventsToSend);
  }
}

/**
 * Envia um único evento para o backend via background script
 * (Manifest v3 requer que background script faça o fetch)
 */
async function sendEventToBackend(event) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        action: "sendEventToBackend",
        event: event,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          console.error("❌ Erro na comunicação:", chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
          return;
        }

        if (response && response.success) {
          console.log("📨 Resposta do backend:", response.data);
          resolve(response.data);
        } else {
          console.error("❌ Erro ao enviar evento:", response?.error);
          reject(new Error(response?.error || "Erro desconhecido"));
        }
      },
    );
  });
}

// ============================================
// COMUNICAÇÃO COM O POPUP
// ============================================

/**
 * Listener para mensagens do popup ou background
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📬 Mensagem recebida no content-script:", request);

  switch (request.action) {
    case "toggleTracking":
      EXT_CONFIG.enabled = request.enabled;
      console.log(
        `🔄 Rastreamento ${EXT_CONFIG.enabled ? "ativado" : "desativado"}`,
      );
      sendResponse({
        success: true,
        enabled: EXT_CONFIG.enabled,
      });
      break;

    case "flushEvents":
      sendEventsBatch();
      sendResponse({
        success: true,
        eventsQueued: EXT_CONFIG.eventQueue.length,
      });
      break;

    case "getStatus":
      sendResponse({
        enabled: EXT_CONFIG.enabled,
        queuedEvents: EXT_CONFIG.eventQueue.length,
        backendUrl: EXT_CONFIG.backendUrl,
      });
      break;

    case "updateConfig":
      Object.assign(EXT_CONFIG, request.config);
      console.log("⚙️  Configuração atualizada:", EXT_CONFIG);
      sendResponse({
        success: true,
        config: EXT_CONFIG,
      });
      break;

    default:
      sendResponse({ error: "Ação desconhecida" });
  }
});

// ============================================
// REGISTRAR LISTENERS DE EVENTOS
// ============================================

console.log("✨ Content-script carregado e pronto para capturar eventos!");

// Capturar cliques
document.addEventListener("click", handleClickEvent, true);

// Capturar scroll
window.addEventListener("scroll", handleScrollEvent);

// Capturar focus em formulários
document.addEventListener("focus", handleFocusEvent, true);

// Capturar mudanças em formulários
document.addEventListener("change", handleChangeEvent, true);

// Capturar navegação
document.addEventListener("click", handleLinkClick, true);

// ============================================
// ENVIO PERIÓDICO DE EVENTOS
// ============================================

// Enviar eventos a cada 10 segundos mesmo que não tenha atingido o batch size
setInterval(() => {
  if (EXT_CONFIG.eventQueue.length > 0) {
    console.log(
      `⏱️  Enviando eventos por timeout (${EXT_CONFIG.eventQueue.length} na fila)`,
    );
    sendEventsBatch();
  }
}, EXT_CONFIG.batchTimeout * 2);

// Enviar eventos pendentes ao descarregar a página
window.addEventListener("beforeunload", () => {
  if (EXT_CONFIG.eventQueue.length > 0) {
    console.log("👋 Página descarregando, enviando eventos pendentes...");
    sendEventsBatch();
  }
});
