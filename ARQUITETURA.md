```
╔══════════════════════════════════════════════════════════════════════════════╗
║                    ARQUITETURA - EXTENSÃO AVALIADOR UX                      ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│                          NAVEGADOR DO USUÁRIO                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │  PÁGINA WEB (site.com/exemplo)                                     │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │  Elementos Interativos (Botões, Links, Inputs, etc)         │  │    │
│  │  │  ┌────┐   ┌────────┐   ┌──────────┐                         │  │    │
│  │  │  │Btn │   │  Link  │   │  Input   │  ...                   │  │    │
│  │  │  └────┘   └────────┘   └──────────┘                         │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                 ↓ ↓ ↓ (cliques, scrolls, focus, changes)                    │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │             CONTENT-SCRIPT (Injected na página)                    │    │
│  │  Responsável por:                                                  │    │
│  │  • Capturar eventos do DOM                                        │    │
│  │  • Extrair contexto (tag, text, id, class, x, y)                 │    │
│  │  • Agrupar eventos em lotes                                       │    │
│  │                                                                    │    │
│  │  Event Queue: [evento1, evento2, evento3, ...]                   │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                 ↓ (a cada 5 eventos ou 5 segundos)                         │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │              BACKGROUND-SCRIPT (Service Worker)                    │    │
│  │  Responsável por:                                                  │    │
│  │  • Gerenciar comunicação com content-script                       │    │
│  │  • Armazenar configurações (localStorage)                         │    │
│  │  • Atualizar badge da extensão                                    │    │
│  │  • Sincronizar com popup                                          │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                 ↓ ↑ (Websocket/Messages)                                   │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │               POPUP (Interface da Extensão)                        │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │ ✓ Status: Ativo/Inativo                                      │  │    │
│  │  │ 📊 Eventos coletados: 42                                     │  │    │
│  │  │ ⏱️ Tempo de sessão: 5m 23s                                   │  │    │
│  │  │ 🔗 Backend URL: http://localhost:3000                        │  │    │
│  │  │ ┌─────────────────────────────────────────────────────────┐ │  │    │
│  │  │ │ [Salvar] [Enviar Pendentes] [Resetar] [Dashboard]      │ │  │    │
│  │  │ └─────────────────────────────────────────────────────────┘ │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                 ↓ (POST requests JSON)                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                 ↓
        ╔════════════════════════════════════════════════════╗
        ║            INTERNET / REDE CORPORATIVA             ║
        ╚════════════════════════════════════════════════════╝
                                 ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (localhost:3000)                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │              EXPRESS.JS APPLICATION                               │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │ CORS Middleware                                              │  │    │
│  │  │ JSON Parser Middleware                                       │  │    │
│  │  │ Logging Middleware                                           │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  │                           ↓                                         │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │              ROUTER (src/routes/events.js)                   │  │    │
│  │  │  POST   /events        → EventController.createEvent        │  │    │
│  │  │  GET    /events        → EventController.getAllEvents       │  │    │
│  │  │  GET    /events/stats  → EventController.getEventStats      │  │    │
│  │  │  GET    /events/by-url → EventController.getEventsByUrl     │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  │                           ↓                                         │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │          CONTROLLER (src/controllers/eventController.js)     │  │    │
│  │  │  • Validação de dados                                        │  │    │
│  │  │ • Orquestração de serviços                                   │  │    │
│  │  │  • Formatação de respostas                                   │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  │                           ↓                                         │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │          SERVICE (src/services/eventService.js)              │  │    │
│  │  │  • Lógica de negócio                                         │  │    │
│  │  │  • Queries do banco de dados                                 │  │    │
│  │  │  • Validações complexas                                      │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  │                           ↓                                         │    │
│  │  ┌──────────────────────────────────────────────────────────────┐  │    │
│  │  │         CONNECTION (src/database/connection.js)              │  │    │
│  │  │  • Pool de conexões PostgreSQL                               │  │    │
│  │  │  • Execução de queries                                       │  │    │
│  │  └──────────────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                           ↓                                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                 ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DATABASE (PostgreSQL)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                    TABLE: events                                   │    │
│  │  ┌─────────────────────────────────────────────────────────────┐  │    │
│  │  │ id          INT            PRIMARY KEY                       │  │    │
│  │  │ type        TEXT           NOT NULL (click, scroll, ...)     │  │    │
│  │  │ tag         TEXT           Elemento HTML                     │  │    │
│  │  │ text        TEXT           Texto do elemento                 │  │    │
│  │  │ element_id  TEXT           ID HTML                           │  │    │
│  │  │ class       TEXT           Classes CSS                       │  │    │
│  │  │ timestamp   TIMESTAMP      Data/hora ISO 8601                │  │    │
│  │  │ url         TEXT           URL da página                     │  │    │
│  │  │ x           INTEGER        Coordenada X                      │  │    │
│  │  │ y           INTEGER        Coordenada Y                      │  │    │
│  │  └─────────────────────────────────────────────────────────────┘  │    │
│  │                                                                    │    │
│  │  ÍNDICES:                                                         │    │
│  │  • idx_events_timestamp       (para ordenação)                   │    │
│  │  • idx_events_type            (para análises)                    │    │
│  │  • idx_events_type_timestamp  (para queries múltiplas)          │    │
│  │  • idx_events_url             (para filtros por URL)            │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘


╔══════════════════════════════════════════════════════════════════════════════╗
║                          FLUXO DE UM CLIQUE                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝

    1. USUÁRIO CLICA EM BOTÃO
           ↓
    2. content-script JavaScript Event Listener dispara
           ↓
    3. Capturar dados:
       • event.target (elemento clicado)
       • event.clientX, event.clientY (posição)
       • window.location.href (URL)
       ↓
    4. Montar JSON do evento:
       {
         type: "click",
         tag: "BUTTON",
         text: "Enviar",
         element_id: "btn-submit",
         class: "btn btn-primary",
         timestamp: "2026-04-05T10:30:45.123Z",
         url: "https://example.com",
         x: 120,
         y: 340
       }
       ↓
    5. Adicionar à fila (EXT_CONFIG.eventQueue)
       Queue: [evento1, evento2, evento3, ...]
       ↓
    6. CONDIÇÕES PARA ENVIO:
       • Queue atingiu 5 eventos? → ENVIAR
       • Passou 5 segundos? → ENVIAR
       • Página descarregando? → ENVIAR
       ↓
    7. Fazer fetch() para POST /events
       ↓
    8. Backend recebe e processa:
       • Valida dados
       • Chama EventService.createEvent()
       • Executa INSERT no PostgreSQL
       ↓
    9. Banco retorna evento com ID gerado
       ↓
   10. Backend responde ao content-script:
       {
         success: true,
         message: "Evento registrado com sucesso",
         data: { id: 42, ...dados... }
       }
       ↓
   11. content-script log no console:
       ✓ Evento enviado com sucesso!
       ↓
   12. Dados disponíveis NO BANCO para análise! 🎉


╔══════════════════════════════════════════════════════════════════════════════╗
║                         ESTRUTURA DE PASTAS                                 ║
╚══════════════════════════════════════════════════════════════════════════════╝

Extensao_Avaliadora_Usabilidade_Navegabilidade/
│
├── 📁 backend/
│   ├── 📁 src/
│   │   ├── 📁 config/
│   │   │   └── env.js
│   │   ├── 📁 controllers/
│   │   │   └── eventController.js        ✏️ MODIFICADO
│   │   ├── 📁 database/
│   │   │   └── connection.js
│   │   ├── 📁 middleware/
│   │   │   ├── corsMiddleware.js
│   │   │   └── validationMiddleware.js
│   │   ├── 📁 routes/
│   │   │   └── events.js
│   │   └── 📁 services/
│   │       └── eventService.js          ✏️ MODIFICADO
│   ├── 📁 migrations/
│   │   └── 001_add_positioning_and_url.sql  ✨ NOVO
│   ├── server.js
│   ├── package.json
│   └── .env
│
├── 📁 browser-extension/                 ✨ NOVO (TODA A PASTA)
│   ├── manifest.json                     ✨ NOVO
│   ├── test-page.html                    ✨ NOVO
│   └── 📁 src/
│       ├── 📁 scripts/
│       │   ├── content-script.js         ✨ NOVO
│       │   └── background.js             ✨ NOVO
│       └── 📁 popup/
│           ├── popup.html                ✨ NOVO
│           ├── popup.css                 ✨ NOVO
│           └── popup.js                  ✨ NOVO
│
├── 📄 RESUMO_IMPLEMENTACAO.md            ✨ NOVO
├── 📄 GUIA_INSTALACAO_EXTENSAO.md        ✨ NOVO
├── 📄 DOCUMENTACAO_API.md                ✨ NOVO
├── 📄 CHECKLIST_PROXIMOS_PASSOS.md       ✨ NOVO
├── 📄 README.md
├── 📄 package.json
└── 📄 SQL_SETUP.sql


╔══════════════════════════════════════════════════════════════════════════════╗
║                        TIPOS DE EVENTOS CAPTURADOS                          ║
╚══════════════════════════════════════════════════════════════════════════════╝

┌─────────────┬──────────────────────────┬───────────────────────────────────┐
│    Tipo     │      Quando ocorre       │           Dados Capturados        │
├─────────────┼──────────────────────────┼───────────────────────────────────┤
│   click     │ Clique em qualquer       │ tag, text, element_id, class,     │
│             │ elemento                 │ x, y, url                         │
├─────────────┼──────────────────────────┼───────────────────────────────────┤
│   scroll    │ Usuário rola a página    │ y (altura), tipo (scroll),        │
│             │                          │ url                               │
├─────────────┼──────────────────────────┼───────────────────────────────────┤
│   focus     │ Campo recebe foco        │ tag (INPUT/TEXTAREA/SELECT),      │
│             │                          │ type, element_id, url             │
├─────────────┼──────────────────────────┼───────────────────────────────────┤
│   change    │ Usuário altera input     │ tag, text, element_id, url        │
│             │                          │                                   │
├─────────────┼──────────────────────────┼───────────────────────────────────┤
│ navigation  │ Clique em link           │ tag (A), text (link text),        │
│             │                          │ url (href do link)                │
└─────────────┴──────────────────────────┴───────────────────────────────────┘
```

---

## 🔗 Componentes Chave

### Content-Script

- Executa no contexto da página web
- Acessa o DOM
- Captura eventos
- Não tem acesso ao localStorage/extensão storage

### Background (Service Worker)

- Executa sempre (mesmo com abas fechadas)
- Tem acesso ao storage
- Gerencia comunicação entre abas
- Atualiza badge

### Popup

- Interface visual
- Configurações
- Estatísticas em tempo real
- Comunicação bidirecional com background

### Backend

- Processa requisições HTTP
- Valida dados
- Armazena no banco
- Retorna respostas JSON

---

## 💾 Fluxo de Dados

```
Página Web → Content-Script → Background → Popup (UI)
                  ↓
             Fila de Eventos
                  ↓
              HTTP POST
                  ↓
            Express Backend
                  ↓
           PostgreSQL Database
                  ↓
          Disponível para Análise
```
