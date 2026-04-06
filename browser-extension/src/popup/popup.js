/**
 * ============================================
 * POPUP.JS
 * ============================================
 *
 * Lógica de interação do popup da extensão
 * Manipula UI, comunicação com background, etc.
 */

// ============================================
// ELEMENTOS DO DOM
// ============================================

const toggleTracking = document.getElementById("toggle-tracking");
const statusIndicator = document.getElementById("status-indicator");
const eventsCount = document.getElementById("events-count");
const sessionTime = document.getElementById("session-time");
const backendUrlInput = document.getElementById("backend-url");
const saveBackendBtn = document.getElementById("save-backend-btn");
const backendStatus = document.getElementById("backend-status");
const batchSizeInput = document.getElementById("batch-size");
const batchTimeoutInput = document.getElementById("batch-timeout");
const flushBtn = document.getElementById("flush-btn");
const resetStatsBtn = document.getElementById("reset-stats-btn");
const openDashboardBtn = document.getElementById("open-dashboard-btn");
const settingsBtn = document.getElementById("settings-btn");
const clearLogBtn = document.getElementById("clear-log-btn");
const eventsLog = document.getElementById("events-log");

// ============================================
// ESTADO LOCAL
// ============================================

let extensionState = {
  isEnabled: true,
  backendUrl: "http://localhost:3000",
  eventsCollected: 0,
  sessionStartTime: Date.now(),
};

// ============================================
// INICIALIZAÇÃO
// ============================================

/**
 * Inicializar componentes ao carregar o popup
 */
document.addEventListener("DOMContentLoaded", () => {
  console.log("📱 Popup carregado");

  // Carregar estado do background
  loadExtensionStatus();

  // Registrar listeners
  registerEventListeners();

  // Atualizar UI periodicamente
  updateStatsInterval = setInterval(updateStats, 1000);

  // Limpar intervalo ao fechar popup
  window.addEventListener("unload", () => {
    clearInterval(updateStatsInterval);
  });
});

// ============================================
// CARREGAMENTO DE STATUS
// ============================================

let updateStatsInterval;

/**
 * Carregar status atual da extensão do background
 */
function loadExtensionStatus() {
  chrome.runtime.sendMessage({ action: "getExtensionStatus" }, (response) => {
    if (response && response.status) {
      extensionState = { ...extensionState, ...response.status };
      updateUI();
    }
  });
}

/**
 * Atualizar UI com informações do estado
 */
function updateUI() {
  // Atualizar checkbox
  toggleTracking.checked = extensionState.isEnabled;

  // Atualizar indicador de status
  updateStatusIndicator();

  // Atualizar URL do backend
  backendUrlInput.value = extensionState.backendUrl || "http://localhost:3000";

  updateStats();
}

/**
 * Atualizar indicador de status visual
 */
function updateStatusIndicator() {
  if (extensionState.isEnabled) {
    statusIndicator.textContent = "● Ativo";
    statusIndicator.classList.remove("inactive");
    statusIndicator.classList.add("active");
  } else {
    statusIndicator.textContent = "● Inativo";
    statusIndicator.classList.remove("active");
    statusIndicator.classList.add("inactive");
  }
}

/**
 * Atualizar estatísticas exibidas
 */
function updateStats() {
  // Número de eventos
  eventsCount.textContent = extensionState.eventsCollected.toString();

  // Tempo de sessão
  const elapsedSeconds = Math.floor(
    (Date.now() - extensionState.sessionStartTime) / 1000,
  );
  sessionTime.textContent = formatTime(elapsedSeconds);
}

/**
 * Formatar tempo em segundos para formato legível
 */
function formatTime(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (minutes < 60) {
    return `${minutes}m ${secs}s`;
  }

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  return `${hours}h ${mins}m`;
}

// ============================================
// LISTENERS DE EVENTOS
// ============================================

/**
 * Registrar todos os listeners
 */
function registerEventListeners() {
  // Toggle de rastreamento
  toggleTracking.addEventListener("change", (e) => {
    handleToggleTracking(e.target.checked);
  });

  // Salvar URL do backend
  saveBackendBtn.addEventListener("click", saveBackendUrl);

  // Atualizar configurações via Enter
  backendUrlInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      saveBackendUrl();
    }
  });

  // Botão de enviar eventos pendentes
  flushBtn.addEventListener("click", flushEvents);

  // Botão de resetar estatísticas
  resetStatsBtn.addEventListener("click", resetStats);

  // Botão de abrir dashboard
  openDashboardBtn.addEventListener("click", openDashboard);

  // Botão de configurações
  settingsBtn.addEventListener("click", openSettings);

  // Limpar log
  clearLogBtn.addEventListener("click", clearLog);

  // Listener para atualizar o estado periodicamente
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "sync") {
      loadExtensionStatus();
    }
  });
}

// ============================================
// MANIPULADORES DE EVENTOS
// ============================================

/**
 * Alternar rastreamento
 */
function handleToggleTracking(enabled) {
  chrome.runtime.sendMessage(
    { action: "toggleExtension", enabled: enabled },
    (response) => {
      if (response && response.success) {
        extensionState.isEnabled = enabled;
        updateStatusIndicator();
        addLogEntry(
          `Rastreamento ${enabled ? "ativado" : "desativado"}`,
          "system",
        );
      }
    },
  );
}

/**
 * Salvar URL do backend
 */
function saveBackendUrl() {
  const url = backendUrlInput.value.trim();

  if (!url) {
    showBackendStatus("Por favor, insira uma URL", "error");
    return;
  }

  // Validar URL
  try {
    new URL(url);
  } catch (error) {
    showBackendStatus("URL inválida", "error");
    return;
  }

  chrome.runtime.sendMessage(
    { action: "updateBackendUrl", url: url },
    (response) => {
      if (response && response.success) {
        extensionState.backendUrl = url;
        showBackendStatus("✓ Conectado", "success");
        addLogEntry(`Backend atualizado: ${url}`, "system");
      }
    },
  );
}

/**
 * Mostrar status do backend
 */
function showBackendStatus(message, status = "success") {
  backendStatus.textContent = message;
  backendStatus.classList.remove("success", "error");
  backendStatus.classList.add(status);
}

/**
 * Enviar eventos pendentes
 */
function flushEvents() {
  // Notificar todos os content-scripts para enviar eventos pendentes
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach((tab) => {
      chrome.tabs.sendMessage(tab.id, { action: "flushEvents" }, (response) => {
        if (response && response.success) {
          console.log(`Eventos enviados da aba: ${tab.title}`);
        }
      });
    });
  });

  addLogEntry("Enviando eventos pendentes...", "system");
}

/**
 * Resetar estatísticas
 */
function resetStats() {
  const confirmed = confirm("Tem certeza que deseja resetar as estatísticas?");

  if (confirmed) {
    chrome.runtime.sendMessage({ action: "resetStats" }, (response) => {
      if (response && response.success) {
        extensionState.eventsCollected = 0;
        extensionState.sessionStartTime = Date.now();
        updateStats();
        addLogEntry("Estatísticas resetadas", "system");
      }
    });
  }
}

/**
 * Abrir dashboard
 */
function openDashboard() {
  // Abrir nova aba com página de dashboard
  chrome.tabs.create({
    url: "src/popup/dashboard.html",
  });
}

/**
 * Abrir configurações
 */
function openSettings() {
  // Abrir página de configurações avançadas
  chrome.tabs.create({
    url: "src/popup/settings.html",
  });
}

/**
 * Limpar log de eventos
 */
function clearLog() {
  eventsLog.innerHTML = '<p class="log-empty">Log limpo</p>';
}

// ============================================
// LOG DE EVENTOS EM TEMPO REAL
// ============================================

/**
 * Adicionar entrada no log
 */
function addLogEntry(message, type = "event") {
  if (eventsLog.innerHTML.includes("log-empty")) {
    eventsLog.innerHTML = "";
  }

  const timestamp = new Date().toLocaleTimeString();
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.innerHTML = `<strong>[${timestamp}]</strong> ${message}`;

  eventsLog.appendChild(entry);

  // Limitar a 10 entradas
  const entries = eventsLog.querySelectorAll(".log-entry");
  if (entries.length > 10) {
    entries[0].remove();
  }

  // Auto-scroll
  eventsLog.scrollTop = eventsLog.scrollHeight;
}

// ============================================
// LISTENER DE MENSAGENS DO CONTENT-SCRIPT
// ============================================

/**
 * Ouvir mensagens do content-script para atualizar UI
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateEventCount") {
    extensionState.eventsCollected = request.count;
    updateStats();
  }
});

// ============================================
// ATUALIZAR PERIODICAMENTE
// ============================================

/**
 * Atualizar estado a cada 2 segundos
 */
setInterval(() => {
  loadExtensionStatus();
}, 2000);
