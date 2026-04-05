# TCC-UX Backend

Backend para coleta e análise de dados de interação do usuário em páginas web.

## 📋 Visão Geral

Este projeto faz parte de um TCC na área de Interação Humano-Computador (IHC). Ele captura interações do usuário (cliques, scroll, etc.) em páginas web através de uma extensão de navegador e armazena os dados em um banco de dados PostgreSQL para posterior análise de usabilidade, acessibilidade e navegabilidade.

## 🏗️ Estrutura do Projeto

```
projeto/
│
├── src/
│   ├── config/
│   │   └── env.js              # Configuração de variáveis de ambiente
│   │
│   ├── controllers/
│   │   └── eventController.js  # Controller de eventos (lógica HTTP)
│   │
│   ├── routes/
│   │   └── events.js           # Rotas de eventos
│   │
│   ├── services/
│   │   └── eventService.js     # Service com lógica de negócio
│   │
│   ├── middleware/
│   │   ├── corsMiddleware.js   # Configuração de CORS
│   │   └── validationMiddleware.js  # Validação de dados
│   │
│   └── database/
│       └── connection.js       # Conexão com PostgreSQL
│
├── .env                        # Variáveis de ambiente (não commitar)
├── .env.example                # Exemplo de variáveis de ambiente
├── package.json                # Dependências e scripts
├── server.js                   # Arquivo principal do servidor
└── README.md                   # Este arquivo

```

## 🛠️ Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web
- **PostgreSQL** - Banco de dados
- **pg** - Driver PostgreSQL para Node.js
- **CORS** - Controle de requisições cross-origin
- **dotenv** - Gerenciamento de variáveis de ambiente

## 📦 Requisitos

- Node.js (v14 ou superior)
- npm (v6 ou superior)
- PostgreSQL (v12 ou superior)
- Banco de dados "tcc_ux" já criado
- Tabela "events" já criada (veja SQL abaixo)

## 🔧 Configuração

### 1. Criar o Banco de Dados e a Tabela

Execute este comando SQL no PostgreSQL:

```sql
-- Criar banco de dados
CREATE DATABASE tcc_ux;

-- Conectar ao banco de dados
\c tcc_ux

-- Criar tabela de eventos
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  tag TEXT,
  text TEXT,
  element_id TEXT,
  class TEXT,
  timestamp TIMESTAMP NOT NULL
);

-- Criar índice para melhor performance nas buscas
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_events_type ON events(type);
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure suas credenciais:

```bash
cp .env.example .env
```

Edite o arquivo `.env`:

```
DB_USER=seu_usuario_postgres
DB_PASSWORD=sua_senha
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tcc_ux
SERVER_PORT=3000
NODE_ENV=development
```

### 3. Instalar Dependências

```bash
npm install
```

## 🚀 Como Executar

### Em Desenvolvimento

```bash
npm start
```

Ou com nodemon (para recarregar automaticamente):

```bash
npm install -g nodemon
nodemon server.js
```

O servidor iniciará em `http://localhost:3000`

## 📡 Endpoints Disponíveis

### 1. Health Check (Verificar se servidor está rodando)

```http
GET /
```

**Resposta:**

```json
{
  "message": "Backend TCC-UX rodando com sucesso! 🚀",
  "version": "1.0.0",
  "status": "online",
  "timestamp": "2024-04-01T10:30:45.123Z"
}
```

### 2. Registrar um Novo Evento ⭐

```http
POST /events
Content-Type: application/json

{
  "type": "click",
  "tag": "button",
  "text": "Enviar",
  "element_id": "btn-submit",
  "class": "btn btn-primary btn-lg",
  "timestamp": "2024-04-01T10:30:45.123Z"
}
```

**Resposta (201 Created):**

```json
{
  "success": true,
  "message": "Evento registrado com sucesso",
  "data": {
    "id": 1,
    "type": "click",
    "tag": "button",
    "text": "Enviar",
    "element_id": "btn-submit",
    "class": "btn btn-primary btn-lg",
    "timestamp": "2024-04-01T10:30:45.123Z"
  }
}
```

### 3. Obter Todos os Eventos

```http
GET /events
GET /events?limit=50
```

**Resposta:**

```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 3,
      "type": "scroll",
      "tag": null,
      "text": null,
      "element_id": null,
      "class": null,
      "timestamp": "2024-04-01T10:32:15.000Z"
    },
    {
      "id": 2,
      "type": "click",
      "tag": "a",
      "text": "Ir para página",
      "element_id": "link-home",
      "class": "nav-link",
      "timestamp": "2024-04-01T10:31:00.000Z"
    },
    {
      "id": 1,
      "type": "click",
      "tag": "button",
      "text": "Enviar",
      "element_id": "btn-submit",
      "class": "btn btn-primary",
      "timestamp": "2024-04-01T10:30:45.123Z"
    }
  ]
}
```

### 4. Obter Estatísticas dos Eventos

```http
GET /events/stats
```

**Resposta:**

```json
{
  "success": true,
  "data": {
    "total_events": "150",
    "unique_types": "5",
    "distinct_days": "3"
  }
}
```

## 📝 Exemplos de Requisições

### Usando cURL

```bash
# Health check
curl http://localhost:3000/

# Registrar um evento
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "click",
    "tag": "button",
    "text": "Clique aqui",
    "element_id": "btn-1",
    "class": "btn-primary",
    "timestamp": "2024-04-01T10:30:45.123Z"
  }'

# Obter todos os eventos
curl http://localhost:3000/events

# Obter eventos com limite
curl http://localhost:3000/events?limit=10

# Obter estatísticas
curl http://localhost:3000/events/stats
```

### Usando Postman

Importe as requisições do arquivo `postman_collection.json` (após ser criado) ou crie manualmente:

**POST /events**

```json
{
  "type": "click",
  "tag": "button",
  "text": "Enviar formulário",
  "element_id": "form-submit",
  "class": "btn btn-success",
  "timestamp": "2024-04-01T10:30:45.123Z"
}
```

### Usando JavaScript/Fetch API

```javascript
// Registrar um evento
const eventData = {
  type: 'click',
  tag: 'button',
  text: 'Clique aqui',
  element_id': 'btn-action',
  class: 'btn-primary',
  timestamp: new Date().toISOString()
};

fetch('http://localhost:3000/events', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(eventData)
})
.then(response => response.json())
.then(data => console.log('Sucesso:', data))
.catch(error => console.error('Erro:', error));
```

## ✅ Validação de Dados

O endpoint `/events` valida os seguintes campos:

- **type** (obrigatório): string não vazia - tipo do evento
- **timestamp** (obrigatório): data válida em formato ISO 8601
- **tag**: string (opcional) - tag HTML do elemento
- **text**: string (opcional) - texto do elemento
- **element_id**: string (opcional) - ID do elemento
- **class**: string (opcional) - classe CSS do elemento

### Exemplos de Erros

**Faltam campos obrigatórios:**

```json
{
  "error": "Campos obrigatórios faltando",
  "requiredFields": ["type", "timestamp"],
  "message": "Por favor, forneça os campos: type e timestamp"
}
```

**Timestamp inválido:**

```json
{
  "error": "Campo \"timestamp\" inválido",
  "message": "O campo \"timestamp\" deve ser uma data válida (ISO 8601)",
  "example": "2024-04-01T10:30:45.123Z"
}
```

## 🔒 Segurança

- ✅ Proteção contra SQL injection (uso de parâmetros preparados)
- ✅ Validação de entrada
- ✅ CORS configurado
- ✅ Variáveis sensíveis em arquivo `.env`
- ⚠️ Em produção: configure autenticação JWT, HTTPS, rate limiting

## 🐛 Troubleshooting

### "Erro de conexão com banco de dados"

```
Solução:
1. Verifique se PostgreSQL está rodando
2. Confira as credenciais no arquivo .env
3. Certifique-se de que o banco tcc_ux foi criado
4. Verifique a tabela events existe
```

### "CORS error"

```
Solução:
1. Se for desenvolvimento, a configuração atual permite localhost
2. Para produção, ajuste o corsOptions em src/middleware/corsMiddleware.js
```

### "Port 3000 already in use"

```
Solução:
1. Mude a porta no arquivo .env (SERVER_PORT)
2. Ou mate o processo na porta 3000:
   - Windows: netstat -ano | findstr :3000
   - Mac/Linux: lsof -i :3000
```

## 📚 Estrutura de Código

### Separação de Responsabilidades

- **Controllers**: Lidam com requisições HTTP
- **Services**: Contêm lógica de negócio
- **Rotas**: Definem endpoints disponíveis
- **Middleware**: Processam requisições antes de chegar ao controller
- **Database**: Gerenciam conexão com BD

### Padrão Async/Await

Todo o código usa `async/await` para operações assíncronas com tratamento de erros via `try/catch`.

## 🚀 Próximos Passos

1. Integrar com extensão de navegador
2. Adicionar autenticação (JWT)
3. Implementar rate limiting
4. Adicionar testes unitários
5. Implementar paginação de eventos
6. Adicionar filtros avançados de busca
7. Criar dashboards de análise

## 📖 Documentação Adicional

- [Express.js Docs](https://expressjs.com/)
- [PostgreSQL Docs](https://www.postgresql.org/docs/)
- [Node.js pg Library](https://node-postgres.com/)

## 👨‍💻 Autor

TCC - Interação Humano-Computador (IHC)

## 📄 Licença

MIT
