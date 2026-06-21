# TCC-UX — Sistema de Avaliação de Usabilidade e Navegabilidade

Sistema completo para coleta, varredura e análise de dados de interação do usuário em
páginas web, desenvolvido como Trabalho de Conclusão de Curso na área de
Interação Humano-Computador (IHC).

O projeto é composto por dois módulos principais que se comunicam via API REST:

- **Backend** (Node.js + Express + PostgreSQL) — armazena e processa todos os dados
- **Extensão de navegador** (Chrome, Manifest V3, Side Panel) — coleta os dados diretamente no navegador do participante e do pesquisador

---

## 📋 Visão Geral

O sistema permite que um **pesquisador** configure testes de usabilidade com tarefas
específicas para um site, e que **participantes anônimos** realizem essas tarefas
enquanto suas interações (cliques, tempo, navegação) são capturadas automaticamente.
Além disso, o sistema é capaz de **varrer a estrutura de páginas** (links, botões,
formulários, cores, posições) e até **rastrear um domínio inteiro** via crawler,
permitindo uma análise estrutural e comportamental combinada.

Ao final, métricas consolidadas de **eficácia**, **eficiência**, **navegabilidade**
e **estrutura do site** — fundamentadas na ISO 9241-11 e na literatura de IHC — são
calculadas automaticamente a partir dos dados coletados.

---

## 🏗️ Estrutura do Projeto

```
projeto/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── env.js                      # Variáveis de ambiente
│   │   │
│   │   ├── controllers/
│   │   │   ├── userController.js           # Participantes anônimos
│   │   │   ├── sessionController.js        # Sessões de uso
│   │   │   ├── eventController.js          # Eventos de interação
│   │   │   ├── researcherController.js     # Cadastro/login de pesquisadores
│   │   │   ├── testController.js           # Testes de usabilidade
│   │   │   ├── taskController.js           # Tarefas dos testes
│   │   │   ├── taskResultController.js     # Resultados de tarefas
│   │   │   ├── snapshotController.js       # Varredura de páginas
│   │   │   ├── crawlerController.js        # Crawler de domínio
│   │   │   └── metricsController.js        # Métricas de usabilidade
│   │   │
│   │   ├── routes/
│   │   │   └── (uma rota por controller acima)
│   │   │
│   │   ├── services/
│   │   │   └── (lógica de negócio espelhando os controllers)
│   │   │
│   │   ├── middleware/
│   │   │   ├── corsMiddleware.js           # Configuração de CORS
│   │   │   └── validationMiddleware.js     # Validação de payloads
│   │   │
│   │   └── database/
│   │       └── connection.js               # Pool de conexão PostgreSQL
│   │
│   ├── migrations/                          # Scripts SQL versionados
│   ├── .env / .env.example
│   ├── package.json
│   └── server.js                            # Entrypoint do servidor
│
└── browser-extension/
    ├── manifest.json                        # Manifest V3 + Side Panel
    └── src/
        ├── scripts/
        │   ├── background.js               # Service worker
        │   ├── content-script.js           # Captura de eventos na página
        │   └── scanner.js                  # Varredura de elementos do DOM
        │
        └── sidepanel/
            ├── sidepanel.html               # Interface única (todas as telas)
            ├── styles/                      # CSS dividido por tela
            │   ├── base.css
            │   ├── identify.css
            │   ├── participant.css
            │   ├── researcher.css
            │   ├── scanner.css
            │   └── crawler.css
            └── scripts/                     # JS dividido por tela
                ├── main.js
                ├── identify.js
                ├── participant.js
                ├── researcher.js
                ├── scanner.js
                └── crawler.js
```

---

## 🛠️ Tecnologias Utilizadas

**Backend**
- **Node.js** — runtime JavaScript
- **Express.js** — framework web
- **PostgreSQL** — banco de dados relacional
- **pg** — driver PostgreSQL para Node.js (queries SQL puras, sem ORM)
- **Puppeteer** — automação do Chrome para o crawler
- **crypto** (nativo) — hash de senhas (SHA-256 + salt)
- **CORS** / **dotenv**

**Extensão**
- **Manifest V3** — padrão atual de extensões Chrome
- **Side Panel API** — interface lateral persistente (substituiu o popup tradicional)
- **chrome.storage.session** — persistência de estado entre reaberturas do painel
- **chrome.scripting** — injeção de scripts de varredura na página ativa

---

## 📦 Requisitos

- Node.js (v18 ou superior)
- npm (v8 ou superior)
- PostgreSQL (v13 ou superior)
- Google Chrome (para a extensão e para o crawler via Puppeteer)

---

## 🔧 Configuração do Backend

### 1. Criar o Banco de Dados

```sql
CREATE DATABASE tcc_ux;
```

### 2. Executar as Migrations (em ordem)

```bash
cd backend/migrations
psql -U postgres -d tcc_ux -f 001_initial_schema.sql
psql -U postgres -d tcc_ux -f 002_usability_schema.sql
psql -U postgres -d tcc_ux -f 003_researchers.sql
psql -U postgres -d tcc_ux -f 004_site_snapshots.sql
psql -U postgres -d tcc_ux -f 005_crawler.sql
psql -U postgres -d tcc_ux -f 006_metrics_support.sql
```

> Os números podem variar conforme a numeração final adotada no projeto — execute
> sempre em ordem crescente, pois há dependências de chave estrangeira entre tabelas
> (ex: `site_snapshots` depende de `researchers` já existir).

### 3. Configurar Variáveis de Ambiente

```bash
cd backend
cp .env.example .env
```

Edite o `.env`:

```env
DB_USER=seu_usuario_postgres
DB_PASSWORD=sua_senha
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tcc_ux
SERVER_PORT=3000
NODE_ENV=development
```

### 4. Instalar Dependências e Rodar

```bash
npm install
npm start
```

Servidor disponível em `http://localhost:3000`.

---

## 🔌 Instalação da Extensão

1. Acesse `chrome://extensions`
2. Ative o **Modo do desenvolvedor**
3. Clique em **Carregar sem compactação**
4. Selecione a pasta `browser-extension/`
5. Clique no ícone da extensão para abrir o **side panel**

A extensão se conecta por padrão a `http://localhost:3000` — pode ser alterado no
painel do pesquisador ou diretamente em `chrome.storage.sync`.

---

## 🗄️ Modelo de Dados (resumo)

| Tabela | Representa |
|---|---|
| `users` | Participantes anônimos (idade, gênero, escolaridade) |
| `researchers` | Pesquisadores cadastrados (e-mail + senha com hash) |
| `sites` | Domínios monitorados |
| `sessions` | Período de uso de um participante em um site |
| `events` | Cada interação capturada (clique, scroll, tecla) com coordenadas X/Y |
| `tests` | Testes de usabilidade configurados por um pesquisador para um site |
| `tasks` | Tarefas de um teste, com `min_clicks` e `optimal_path_length` opcionais |
| `task_results` | Resultado de cada tarefa por sessão (tempo, cliques, sucesso) |
| `site_snapshots` | Registro de uma varredura de página específica |
| `site_elements` | Cada elemento capturado na varredura (link, botão, imagem...) com posição e cor |
| `crawler_sessions` | Sessão de crawler completa de um domínio |
| `crawler_queue` | Fila de URLs descobertas pelo crawler, com detecção de padrões/templates |

---

## 📡 Principais Endpoints

### Participantes e Sessões
```http
POST   /users                          # Criar participante anônimo
POST   /sessions                       # Criar sessão (cria o site automaticamente)
PATCH  /sessions/:id/end                # Encerrar sessão
POST   /events                         # Registrar evento (session_id obrigatório)
GET    /events?session_id=&limit=
GET    /events/stats
```

### Pesquisadores
```http
POST   /researchers/register           # Cadastro (requer senha mestra)
POST   /researchers/login
GET    /researchers
```

### Testes de Usabilidade
```http
POST   /tests                          # Aceita site_id OU site_url
GET    /tests?site_url=                # Filtra por domínio
POST   /tasks                          # Aceita min_clicks, optimal_path_length
GET    /tasks?test_id=
POST   /task-results
GET    /task-results/stats?test_id=
```

### Varredura de Páginas
```http
POST   /snapshots                      # Salva varredura de uma página
GET    /snapshots?site_url=
GET    /snapshots/:id
GET    /snapshots/:id/summary
```

### Crawler de Domínio
```http
POST   /crawler/start                  # Inicia varredura recursiva de um domínio
GET    /crawler/:id/status             # Status em tempo real (polling)
POST   /crawler/:id/stop
GET    /crawler?site_url=
```

### Métricas de Usabilidade e Navegabilidade
```http
# Eficácia
GET /metrics/test/:testId/completion-rate
GET /metrics/test/:testId/error-rate
GET /metrics/test/:testId/abandonment-rate

# Eficiência
GET /metrics/test/:testId/time-on-task
GET /metrics/test/:testId/click-efficiency
GET /metrics/test/:testId/success-per-minute

# Navegabilidade
GET /metrics/test/:testId/lostness
GET /metrics/test/:testId/backtrack
GET /metrics/test/:testId/click-depth
GET /metrics/site/:siteId/non-interactive-clicks
GET /metrics/site/:siteId/click-density

# Estrutura do site (a partir de uma varredura)
GET /metrics/snapshot/:snapshotId/interactive-density
GET /metrics/snapshot/:snapshotId/link-composition
GET /metrics/snapshot/:snapshotId/color-contrast
GET /metrics/snapshot/:snapshotId/alt-coverage

# Relatórios consolidados
GET /metrics/test/:testId/full-report
GET /metrics/snapshot/:snapshotId/full-report
```

---

## 📝 Exemplos de Requisições

### Health Check
```bash
curl http://localhost:3000/
```

### Criar participante e sessão
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"age": 23, "gender": "feminino", "education_level": "superior"}'

curl -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "site_url": "https://juridicajunior.ufla.br"}'
```

### Registrar um evento
```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": 1,
    "type": "click",
    "tag": "button",
    "text": "Enviar",
    "element_id": "btn-submit",
    "class": "btn btn-primary",
    "url": "https://juridicajunior.ufla.br/contato",
    "x": 340,
    "y": 210,
    "timestamp": "2025-04-12T10:30:45.123Z"
  }'
```

### Relatório completo de métricas de um teste
```bash
curl http://localhost:3000/metrics/test/3/full-report
```

---

## ✅ Validação de Dados

Cada endpoint de criação valida campos obrigatórios antes de tocar no banco,
retornando `400` com a lista de campos ausentes. Exemplos:

```json
{ "success": false, "error": "Campos obrigatórios ausentes", "missing": ["session_id"] }
```

```json
{ "success": false, "error": "site_id inválido — sessão não encontrada" }
```

---

## 🔒 Segurança

- ✅ Proteção contra SQL injection (queries parametrizadas via `pg`)
- ✅ Senhas de pesquisadores com hash SHA-256 + salt individual por usuário
- ✅ Validação de entrada em todos os endpoints de escrita
- ✅ CORS configurado
- ✅ Variáveis sensíveis em `.env` (não commitado)
- ⚠️ Em produção: trocar SHA-256 por bcrypt, adicionar JWT, HTTPS e rate limiting

---

## 🐛 Troubleshooting

**Erro de conexão com banco de dados**
1. Verifique se o PostgreSQL está rodando
2. Confira as credenciais no `.env`
3. Confirme que todas as migrations foram executadas, na ordem correta

**Varredura ou crawler não salva nada no banco**
1. Confira se a coluna `class` está sendo referenciada com aspas duplas (`"class"`)
   nas queries — é palavra reservada no PostgreSQL
2. Verifique se `web_accessible_resources` está declarado no `manifest.json`
3. Abra o console do Service Worker (`chrome://extensions` → "Service Worker") para
   ver logs detalhados de cada etapa

**CORS error**
- Ajuste `corsOptions` em `src/middleware/corsMiddleware.js`

**Port 3000 already in use**
- Altere `SERVER_PORT` no `.env`, ou finalize o processo:
  - Windows: `netstat -ano | findstr :3000`
  - Mac/Linux: `lsof -i :3000`

---

## 📚 Princípios de Código

- **Separação de responsabilidades**: routes → controllers → services → database
- **Async/await** em toda operação assíncrona, com tratamento via `try/catch`
- **Sem ORM**: queries SQL diretas via `pg`, para maior controle e transparência
- **Logs descritivos** em cada operação relevante do backend e da extensão

---

## 🧭 Funcionalidades Implementadas

- [x] Coleta de eventos de interação (clique, scroll, teclado) vinculados a sessões
- [x] Cadastro e login de pesquisadores com senha mestra de autorização
- [x] Criação de testes e tarefas vinculados a um domínio específico
- [x] Fluxo completo do participante: escolha de teste → execução de tarefas com
      timer e contagem de cliques → tela de resultados com métricas da sessão
- [x] Varredura pontual de página (links, botões, títulos, formulários, imagens,
      posição X/Y e cores de cada elemento)
- [x] Crawler recursivo de domínio via Puppeteer, com detecção de páginas de login
      e de padrões de URL repetidos (ex.: `/produto/{id}`) para evitar explosão de
      varreduras em sites com muitas páginas similares
- [x] Cálculo de 15 métricas de usabilidade e navegabilidade, fundamentadas na
      ISO 9241-11 e na literatura de IHC (eficácia, eficiência, navegabilidade e
      estrutura do site)

## 🚀 Próximos Passos

1. Dashboard visual para os relatórios de métricas (atualmente via API)
2. Aplicação do sistema em um teste real com participantes para validação empírica
3. Escala de satisfação subjetiva (SUS/UMUX) ao final da sessão
4. Suporte a outros navegadores (Firefox/WebExtensions)
5. Autenticação via JWT e hashing de senha com bcrypt
6. Testes automatizados (unitários e de integração)

---

## 📖 Documentação Adicional

- [Express.js Docs](https://expressjs.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Node.js pg Library](https://node-postgres.com/)
- [Puppeteer Docs](https://pptr.dev/)
- [Chrome Extensions — Manifest V3](https://developer.chrome.com/docs/extensions/mv3)
- [ISO 9241-11:2018 — Usability: Definitions and concepts](https://www.iso.org/standard/63500.html)

---

## 👨‍💻 Autoria

TCC — Interação Humano-Computador (IHC)

## 📄 Licença

MIT
