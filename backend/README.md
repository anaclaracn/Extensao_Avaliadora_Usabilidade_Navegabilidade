# Backend TCC-UX v2.0 — API de Análise de Usabilidade

Backend Node.js + Express + PostgreSQL para coleta e análise de dados de usabilidade em testes controlados de IHC.

---

## Instalação

```bash
npm install
cp .env.example .env   # editar com suas credenciais
```

## Banco de dados

```bash
psql -U postgres -d tcc_ux -f migrations/002_usability_schema.sql
```

## Iniciar

```bash
npm start
```

---

## Estrutura do projeto

```
src/
├── config/
│   └── env.js                  # Variáveis de ambiente
├── database/
│   └── connection.js           # Pool de conexão com o PostgreSQL
├── middleware/
│   ├── corsMiddleware.js       # Configuração de CORS
│   └── validationMiddleware.js # Validação de campos obrigatórios
├── routes/
│   ├── users.js
│   ├── sessions.js
│   ├── events.js
│   ├── tests.js
│   ├── tasks.js
│   └── taskResults.js
├── controllers/
│   ├── userController.js
│   ├── sessionController.js
│   ├── eventController.js
│   ├── testController.js
│   ├── taskController.js
│   └── taskResultController.js
└── services/
    ├── userService.js
    ├── sessionService.js
    ├── eventService.js
    ├── testService.js
    ├── taskService.js
    └── taskResultService.js
migrations/
└── 002_usability_schema.sql    # DDL de todas as tabelas
server.js                       # Ponto de entrada
```

---

## Endpoints

### Usuários

| Método | Rota         | Descrição               |
|--------|--------------|-------------------------|
| POST   | /users       | Criar usuário anônimo   |
| GET    | /users/:id   | Buscar usuário por ID   |

**POST /users**
```json
{ "age": 23, "gender": "feminino", "education_level": "superior" }
```
Resposta: `{ success, message, data: { id, age, gender, education_level, created_at } }`

---

### Sessões

| Método | Rota                  | Descrição                          |
|--------|-----------------------|------------------------------------|
| POST   | /sessions             | Criar sessão (cria site se novo)   |
| GET    | /sessions/:id         | Buscar sessão por ID               |
| PATCH  | /sessions/:id/end     | Encerrar sessão (preenche ended_at)|

**POST /sessions**
```json
{ "user_id": 1, "site_url": "https://meusite.com" }
```
Resposta: `{ success, session_id, data: { id, user_id, site_id, started_at, site: {...} } }`

---

### Eventos

| Método | Rota           | Descrição                              |
|--------|----------------|----------------------------------------|
| POST   | /events        | Registrar evento (session_id obrigatório) |
| GET    | /events        | Listar eventos (?limit= &session_id=)  |
| GET    | /events/stats  | Estatísticas agregadas                 |

**POST /events**
```json
{
  "session_id": 1,
  "type": "click",
  "tag": "button",
  "text": "Enviar",
  "element_id": "btn-submit",
  "class": "btn btn-primary",
  "url": "https://meusite.com/formulario",
  "x": 340,
  "y": 210,
  "timestamp": "2025-04-12T10:30:45.123Z"
}
```

---

### Testes

| Método | Rota       | Descrição                        |
|--------|------------|----------------------------------|
| POST   | /tests     | Criar teste de usabilidade       |
| GET    | /tests     | Listar testes (?site_id= filtro) |
| GET    | /tests/:id | Buscar teste por ID              |

**POST /tests**
```json
{ "name": "Teste de navegação", "site_id": 1 }
```

---

### Tarefas

| Método | Rota    | Descrição                             |
|--------|---------|---------------------------------------|
| POST   | /tasks  | Criar tarefa para um teste            |
| GET    | /tasks  | Listar tarefas (?test_id= obrigatório)|

**POST /tasks**
```json
{ "test_id": 1, "description": "Encontre o botão de compra", "order_index": 1 }
```
> `order_index` é opcional — atribuído automaticamente se omitido.

---

### Resultados de Tarefas

| Método | Rota                     | Descrição                                      |
|--------|--------------------------|------------------------------------------------|
| POST   | /task-results            | Salvar resultado de tarefa                     |
| GET    | /task-results            | Listar (?session_id= ou ?task_id=)             |
| GET    | /task-results/stats      | Métricas por teste (?test_id= obrigatório)     |

**POST /task-results**
```json
{
  "task_id":     1,
  "session_id":  1,
  "started_at":  "2025-04-12T10:00:00Z",
  "finished_at": "2025-04-12T10:02:30Z",
  "success":     true,
  "clicks":      7
}
```

**GET /task-results/stats?test_id=1** — retorna por tarefa:
- `total_participantes`
- `total_sucesso`
- `taxa_sucesso_pct`
- `media_clicks`
- `media_duracao_segundos`

---

## Fluxo típico de um teste

```
1. POST /users           → obtém user_id
2. POST /sessions        → obtém session_id  (site criado automaticamente)
3. POST /tests           → obtém test_id
4. POST /tasks (N vezes) → cria as tarefas
5. Extensão envia POST /events com session_id durante a navegação
6. POST /task-results por tarefa concluída
7. GET  /task-results/stats?test_id= para análise final
```
