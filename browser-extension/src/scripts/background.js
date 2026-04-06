/**
 * ============================================
 * BACKGROUND.JS
 * ============================================
 *
 * Service Worker da extensão
 * Gerencia configurações, comunicação com conteúdo
 * e persistência de dados
 */

// ============================================
// ESTADO GLOBAL DA EXTENSÃO
// ============================================

const extensionState = {
  isEnabled: true,
  backendUrl: "http://localhost:3000",
  apiEndpoint: "/events",
  eventsCollected: 0,
  sessionStartTime: Date.now(),
};

// ============================================
// INICIALIZAÇÃO
// ============================================

/**
 * Ao instalar a extensão pela primeira vez
 */
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    console.log("🎉 Extensão Avaliador UX instalada!");

    // Carregar configurações padrão
    chrome.storage.sync.set(extensionState, () => {
      console.log("✅ Configurações padrão salvas");
    });

    // Nota: Página de boas-vindas removida (não é necessária)
    // Use o popup da extensão clicando no ícone
  }
});

// ============================================
// LISTENERS DE MENSAGEM
// ============================================

/**
 * Ouvir mensagens do popup e content-scripts
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log("📨 Mensagem recebida no background:", request, "de:", sender);

  switch (request.action) {
    case "getExtensionStatus":
      handleGetStatus(sendResponse);
      break;

    case "toggleExtension":
      handleToggleExtension(request.enabled, sendResponse);
      break;

    case "updateBackendUrl":
      handleUpdateBackendUrl(request.url, sendResponse);
      break;

    case "getEventStats":
      handleGetEventStats(sendResponse);
      break;

    case "resetStats":
      handleResetStats(sendResponse);
      break;

    case "sendEventToBackend":
      handleSendEventToBackend(request.event, sendResponse);
      return true; // Indica que é chamada assíncrona
      break;

    case "eventSent":
      // Contar evento enviado
      extensionState.eventsCollected++;
      console.log(`📊 Total de eventos: ${extensionState.eventsCollected}`);
      break;

    default:
      sendResponse({ error: "Ação desconhecida no background" });
  }

  // Retornar true para indicar que a resposta é assíncrona
  return true;
});

// ============================================
// MANIPULADORES DE REQUISIÇÕES
// ============================================

/**
 * Obter status da extensão
 */
function handleGetStatus(sendResponse) {
  chrome.storage.sync.get(null, (data) => {
    const status = {
      ...extensionState,
      ...data,
    };
    sendResponse({
      success: true,
      status: status,
    });
  });
}

/**
 * Alternar habilitação da extensão
 */
function handleToggleExtension(enabled, sendResponse) {
  extensionState.isEnabled = enabled;

  chrome.storage.sync.set({ isEnabled: enabled }, () => {
    // Notificar todos os content-scripts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "toggleTracking",
            enabled: enabled,
          },
          (response) => {
            // Ignorar erros de abas que não têm content-script
            if (chrome.runtime.lastError) {
              // Silencioso
            }
          },
        );
      });
    });

    console.log(`🔄 Extensão ${enabled ? "ativada" : "desativada"}`);
    sendResponse({
      success: true,
      enabled: enabled,
    });
  });
}

/**
 * Atualizar URL do backend
 */
function handleUpdateBackendUrl(url, sendResponse) {
  extensionState.backendUrl = url;

  chrome.storage.sync.set({ backendUrl: url }, () => {
    // Notificar todos os content-scripts
    chrome.tabs.query({}, (tabs) => {
      tabs.forEach((tab) => {
        chrome.tabs.sendMessage(
          tab.id,
          {
            action: "updateConfig",
            config: { backendUrl: url },
          },
          (response) => {
            if (chrome.runtime.lastError) {
              // Silencioso
            }
          },
        );
      });
    });

    console.log(`🔗 URL do backend atualizada: ${url}`);
    sendResponse({
      success: true,
      backendUrl: url,
    });
  });
}

/**
 * Obter estatísticas de eventos
 */
function handleGetEventStats(sendResponse) {
  const stats = {
    eventsCollected: extensionState.eventsCollected,
    sessionDuration: Math.floor(
      (Date.now() - extensionState.sessionStartTime) / 1000,
    ),
    uptime: `${Math.floor(extensionState.sessionStartTime / 1000)}s`,
  };

  sendResponse({
    success: true,
    stats: stats,
  });
}

/**
 * Resetar estatísticas
 */
function handleResetStats(sendResponse) {
  extensionState.eventsCollected = 0;
  extensionState.sessionStartTime = Date.now();

  sendResponse({
    success: true,
    message: "Estatísticas resetadas",
  });
}

/**
 * Enviar evento para o backend
 * (Chamado pelo content-script via chrome.runtime.sendMessage)
 */
async function handleSendEventToBackend(event, sendResponse) {
  try {
    const url = extensionState.backendUrl || "http://localhost:3000";
    const endpoint = extensionState.apiEndpoint || "/events";
    const fullUrl = `${url}${endpoint}`;

    console.log(`🔗 Enviando para: ${fullUrl}`, event);

    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    extensionState.eventsCollected++;

    sendResponse({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error("❌ Erro ao enviar para backend:", error);
    sendResponse({
      success: false,
      error: error.message,
    });
  }
}

// ============================================
// BADGE DA EXTENSÃO (ícone com números)
// ============================================

/**
 * Atualizar badge com número de eventos
 */
setInterval(() => {
  if (extensionState.eventsCollected > 0) {
    chrome.action.setBadgeText({
      text: extensionState.eventsCollected.toString(),
    });

    chrome.action.setBadgeBackgroundColor({
      color: "#4CAF50",
    });
  }
}, 1000);

// ============================================
// INICIALIZAÇÃO
// ============================================

console.log("🔧 Background script carregado - Extensão pronta!");

// Carregar configurações salvas
chrome.storage.sync.get(null, (data) => {
  Object.assign(extensionState, data);
  console.log("⚙️  Configurações carregadas:", extensionState);
});
