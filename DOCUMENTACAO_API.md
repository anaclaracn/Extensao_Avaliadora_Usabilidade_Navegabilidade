# 🔌 Documentação de Endpoints da API

Baseado em: `src/routes/events.js`  
URL Base: `http://localhost:3000`

---

## **POST /events** - Criar um novo evento

Registra um novo evento de interação do usuário.

### Request

```http
POST /events HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "type": "click",
  "tag": "BUTTON",
  "text": "Enviar",
  "element_id": "btn-submit",
  "class": "btn btn-primary",
  "timestamp": "2026-04-05T10:30:45.123Z",
  "url": "https://example.com/page",
  "x": 120,
  "y": 340
}
```

### Response

**Status**: `201 Created`

```json
{
  "success": true,
  "message": "Evento registrado com sucesso",
  "data": {
    "id": 1,
    "type": "click",
    "tag": "BUTTON",
    "text": "Enviar",
    "element_id": "btn-submit",
    "class": "btn btn-primary",
    "timestamp": "2026-04-05T10:30:45.123Z",
    "url": "https://example.com/page",
    "x": 120,
    "y": 340
  }
}
```

### Campos

| Campo        | Tipo    | Obrigatório | Descrição                                                          |
| ------------ | ------- | ----------- | ------------------------------------------------------------------ |
| `type`       | string  | ✅          | Tipo de evento: `click`, `scroll`, `focus`, `change`, `navigation` |
| `tag`        | string  | ❌          | Tag HTML do elemento (ex: `BUTTON`, `INPUT`, `A`)                  |
| `text`       | string  | ❌          | Texto visível do elemento (máx 100 caracteres)                     |
| `element_id` | string  | ❌          | ID do elemento HTML                                                |
| `class`      | string  | ❌          | Classes CSS do elemento                                            |
| `timestamp`  | string  | ✅          | Data/hora ISO 8601 (ex: `2026-04-05T10:30:45.123Z`)                |
| `url`        | string  | ❌          | URL da página                                                      |
| `x`          | integer | ❌          | Coordenada X do clique (pixels)                                    |
| `y`          | integer | ❌          | Coordenada Y do clique (pixels)                                    |

### Exemplos com cURL

**Clique em botão:**

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "click",
    "tag": "BUTTON",
    "text": "Enviar",
    "element_id": "btn-submit",
    "class": "btn",
    "timestamp": "'$(date -u +'%Y-%m-%dT%H:%M:%S.000Z')'",
    "url": "https://example.com",
    "x": 100,
    "y": 50
  }'
```

**Scroll:**

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "scroll",
    "tag": "window",
    "text": "Scroll to Y: 500px",
    "timestamp": "'$(date -u +'%Y-%m-%dT%H:%M:%S.000Z')'",
    "url": "https://example.com",
    "y": 500
  }'
```

**Foco em input:**

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "focus",
    "tag": "INPUT",
    "text": "email",
    "element_id": "email-input",
    "timestamp": "'$(date -u +'%Y-%m-%dT%H:%M:%S.000Z')'",
    "url": "https://example.com"
  }'
```

---

## **GET /events** - Listar todos os eventos

Retorna uma lista de eventos registrados.

### Request

```http
GET /events?limit=50 HTTP/1.1
Host: localhost:3000
```

### Query Parameters

| Parâmetro | Tipo    | Padrão | Descrição                           |
| --------- | ------- | ------ | ----------------------------------- |
| `limit`   | integer | 100    | Número máximo de eventos a retornar |

### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": 3,
      "type": "click",
      "tag": "BUTTON",
      "text": "Login",
      "element_id": "btn-login",
      "class": "btn-primary",
      "timestamp": "2026-04-05T10:30:50.000Z",
      "url": "https://example.com/login",
      "x": 150,
      "y": 200
    },
    {
      "id": 2,
      "type": "focus",
      "tag": "INPUT",
      "text": "password",
      "element_id": "pwd-field",
      "class": "form-control",
      "timestamp": "2026-04-05T10:30:45.000Z",
      "url": "https://example.com/login",
      "x": 0,
      "y": 0
    },
    {
      "id": 1,
      "type": "click",
      "tag": "BUTTON",
      "text": "Enviar",
      "element_id": "btn-submit",
      "class": "btn btn-primary",
      "timestamp": "2026-04-05T10:30:40.000Z",
      "url": "https://example.com",
      "x": 120,
      "y": 340
    }
  ]
}
```

### Exemplo com cURL

```bash
curl http://localhost:3000/events?limit=10
```

---

## **GET /events/stats** - Obter estatísticas

Retorna estatísticas básicas dos eventos.

### Request

```http
GET /events/stats HTTP/1.1
Host: localhost:3000
```

### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "stats": {
    "total_events": 42,
    "unique_types": 5,
    "distinct_days": 3,
    "events_by_type": {
      "click": 25,
      "scroll": 10,
      "focus": 5,
      "change": 2
    }
  }
}
```

### Exemplo com cURL

```bash
curl http://localhost:3000/events/stats
```

---

## **GET /events/by-url** - Eventos por URL

Retorna eventos filtrados por URL.

### Request

```http
GET /events/by-url?url=https://example.com HTTP/1.1
Host: localhost:3000
```

### Query Parameters

| Parâmetro | Tipo    | Obrigatório | Descrição                       |
| --------- | ------- | ----------- | ------------------------------- |
| `url`     | string  | ✅          | URL para filtrar eventos        |
| `limit`   | integer | ❌          | Máximo de eventos (padrão: 100) |

### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "url": "https://example.com",
  "count": 15,
  "data": [
    { ... eventos ... }
  ]
}
```

---

## **DELETE /events/:id** - Deletar evento

Remove um evento específico.

### Request

```http
DELETE /events/5 HTTP/1.1
Host: localhost:3000
```

### Response

**Status**: `200 OK`

```json
{
  "success": true,
  "message": "Evento deletado com sucesso",
  "deletedId": 5
}
```

---

## **GET /** - Health Check

Verifica se o servidor está online.

### Request

```http
GET / HTTP/1.1
Host: localhost:3000
```

### Response

**Status**: `200 OK`

```json
{
  "message": "Backend TCC-UX rodando com sucesso! 🚀",
  "version": "1.0.0",
  "status": "online",
  "timestamp": "2026-04-05T10:30:45.123Z"
}
```

---

## 🔄 Status HTTP Comuns

| Status | Significado                              |
| ------ | ---------------------------------------- |
| `200`  | OK - Requisição bem-sucedida             |
| `201`  | Created - Evento criado com sucesso      |
| `400`  | Bad Request - Dados inválidos            |
| `404`  | Not Found - Recurso não encontrado       |
| `500`  | Internal Server Error - Erro do servidor |

---

## ⚠️ Tratamento de Erros

Respostas de erro seguem este padrão:

```json
{
  "success": false,
  "error": "Descrição do erro",
  "message": "Detalhes da exceção"
}
```

### Exemplos

**Campo obrigatório faltando:**

```json
{
  "success": false,
  "error": "Validação falhou",
  "message": "Campo 'timestamp' é obrigatório"
}
```

**URL do backend indisponível:**

```json
{
  "success": false,
  "error": "Conexão recusada",
  "message": "ECONNREFUSED localhost:3000"
}
```

---

## 📊 Tipos de Eventos Suportados

| Tipo         | Descrição                | Exemplo                             |
| ------------ | ------------------------ | ----------------------------------- |
| `click`      | Clique em elemento       | Botão, link, div clicável           |
| `scroll`     | Scroll na página         | Usuário rolou a página              |
| `focus`      | Campo recebeu foco       | Input, textarea, select             |
| `change`     | Campo foi alterado       | Mudança em input, mudança de select |
| `navigation` | Navegação para novo link | Clique em link                      |
| `hover`      | Mouse sobre elemento     | (Futuro)                            |
| `error`      | Erro na página           | (Futuro)                            |

---

## 🔐 Segurança

- ✅ Proteção contra SQL Injection (prepared statements)
- ✅ CORS habilitado para todas as origens
- ✅ Validação de input no middleware
- ⚠️ Sem autenticação (adicionar no futuro)
- ⚠️ Sem rate limiting (adicionar no futuro)

---

## 📝 Exemplo de Fluxo Completo

```javascript
// 1. Usuário clica em botão na página
element.addEventListener("click", (event) => {
  const eventData = {
    type: "click",
    tag: event.target.tagName,
    text: event.target.textContent,
    element_id: event.target.id,
    class: event.target.className,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    x: event.clientX,
    y: event.clientY,
  };

  // 2. Extensão captura e agrupa eventos
  queueEvent(eventData);

  // 3. A cada 5 eventos, envia para backend
  if (queue.length >= 5) {
    fetch("http://localhost:3000/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventData),
    });
  }
});

// 4. Backend processa e armazena no banco
// 5. Dados ficam disponíveis para análise
```
