# Exemplos de Requisições para Testar o Backend

Este arquivo contém exemplos prontos para testar todos os endpoints do backend TCC-UX.

## 🔧 Ferramentas Necessárias

- **cURL** (linha de comando)
- **Postman** (GUI)
- **VS Code REST Client**
- **JavaScript Fetch API**

---

## 1️⃣ Health Check

Verificar se o servidor está online.

### cURL

```bash
curl http://localhost:3000/
```

### Resposta Esperada (200 OK)

```json
{
  "message": "Backend TCC-UX rodando com sucesso! 🚀",
  "version": "1.0.0",
  "status": "online",
  "timestamp": "2024-04-01T10:30:45.123Z"
}
```

---

## 2️⃣ Registrar Evento de Clique

Este é o endpoint principal do projeto. Registra quando o usuário clica em algo.

### cURL

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "click",
    "tag": "button",
    "text": "Clique aqui",
    "element_id": "btn-submit",
    "class": "btn btn-primary",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'""
  }'
```

### Postman

- **Método**: POST
- **URL**: `http://localhost:3000/events`
- **Headers**: `Content-Type: application/json`
- **Body** (raw JSON):

```json
{
  "type": "click",
  "tag": "button",
  "text": "Clique aqui",
  "element_id": "btn-submit",
  "class": "btn btn-primary",
  "timestamp": "2024-04-01T10:30:45.123Z"
}
```

### JavaScript Fetch

```javascript
const eventData = {
  type: "click",
  tag: "button",
  text: "Clique aqui",
  element_id: "btn-submit",
  class: "btn btn-primary",
  timestamp: new Date().toISOString(),
};

fetch("http://localhost:3000/events", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify(eventData),
})
  .then((response) => response.json())
  .then((data) => console.log("Sucesso:", data))
  .catch((error) => console.error("Erro:", error));
```

### Resposta Esperada (201 Created)

```json
{
  "success": true,
  "message": "Evento registrado com sucesso",
  "data": {
    "id": 1,
    "type": "click",
    "tag": "button",
    "text": "Clique aqui",
    "element_id": "btn-submit",
    "class": "btn btn-primary",
    "timestamp": "2024-04-01T10:30:45.123Z"
  }
}
```

---

## 3️⃣ Registrar Evento de Scroll

Registra quando o usuário faz scroll na página.

### cURL

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "scroll",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'""
  }'
```

### JavaScript

```javascript
fetch("http://localhost:3000/events", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "scroll",
    timestamp: new Date().toISOString(),
  }),
})
  .then((r) => r.json())
  .then((d) => console.log(d));
```

---

## 4️⃣ Registrar Evento de Hover

Registra quando o usuário passa o mouse sobre um elemento.

### cURL

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "hover",
    "tag": "img",
    "element_id": "logo-image",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'""
  }'
```

### Postman Body

```json
{
  "type": "hover",
  "tag": "img",
  "element_id": "logo-image",
  "timestamp": "2024-04-01T10:31:00.000Z"
}
```

---

## 5️⃣ Registrar Evento de Digitação

Registra quando o usuário digita em um input.

### cURL

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "input",
    "tag": "input",
    "element_id": "search-box",
    "class": "form-control",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'""
  }'
```

---

## 6️⃣ Registrar Evento com Todos os Campos

Exemplo completo com todos os campos preenchidos.

### cURL

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "dblclick",
    "tag": "a",
    "text": "Ir para página",
    "element_id": "link-navigation",
    "class": "nav-link active",
    "timestamp": "2024-04-01T10:32:00.500Z"
  }'
```

### Postman Body

```json
{
  "type": "dblclick",
  "tag": "a",
  "text": "Ir para página",
  "element_id": "link-navigation",
  "class": "nav-link active",
  "timestamp": "2024-04-01T10:32:00.500Z"
}
```

### Resposta

```json
{
  "success": true,
  "message": "Evento registrado com sucesso",
  "data": {
    "id": 6,
    "type": "dblclick",
    "tag": "a",
    "text": "Ir para página",
    "element_id": "link-navigation",
    "class": "nav-link active",
    "timestamp": "2024-04-01T10:32:00.500Z"
  }
}
```

---

## 7️⃣ Obter Todos os Eventos (com limite)

Recupera os últimos eventos registrados.

### cURL

```bash
# Últimos 100 eventos (padrão)
curl http://localhost:3000/events

# Últimos 50 eventos
curl http://localhost:3000/events?limit=50

# Últimos 10 eventos
curl http://localhost:3000/events?limit=10
```

### Postman

- **Método**: GET
- **URL**: `http://localhost:3000/events?limit=50`

### Resposta Esperada (200 OK)

```json
{
  "success": true,
  "count": 6,
  "data": [
    {
      "id": 6,
      "type": "dblclick",
      "tag": "a",
      "text": "Ir para página",
      "element_id": "link-navigation",
      "class": "nav-link active",
      "timestamp": "2024-04-01T10:32:00.500Z"
    },
    {
      "id": 5,
      "type": "input",
      "tag": "input",
      "text": null,
      "element_id": "search-box",
      "class": "form-control",
      "timestamp": "2024-04-01T10:31:30.000Z"
    },
    ...
  ]
}
```

---

## 8️⃣ Obter Estatísticas dos Eventos

Recupera informações estatísticas sobre os eventos.

### cURL

```bash
curl http://localhost:3000/events/stats
```

### Postman

- **Método**: GET
- **URL**: `http://localhost:3000/events/stats`

### Resposta Esperada (200 OK)

```json
{
  "success": true,
  "data": {
    "total_events": "6",
    "unique_types": "4",
    "distinct_days": "1"
  }
}
```

---

## ❌ Erros Comuns

### Erro 1: Faltam Campos Obrigatórios

**Requisição**:

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "click"
  }'
```

**Resposta (400 Bad Request)**:

```json
{
  "error": "Campos obrigatórios faltando",
  "requiredFields": ["type", "timestamp"],
  "message": "Por favor, forneça os campos: type e timestamp"
}
```

### Erro 2: Timestamp Inválido

**Requisição**:

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "click",
    "timestamp": "data-invalida"
  }'
```

**Resposta (400 Bad Request)**:

```json
{
  "error": "Campo \"timestamp\" inválido",
  "message": "O campo \"timestamp\" deve ser uma data válida (ISO 8601)",
  "example": "2024-04-01T10:30:45.123Z"
}
```

### Erro 3: Rota Não Encontrada

**Requisição**:

```bash
curl http://localhost:3000/eventos
```

**Resposta (404 Not Found)**:

```json
{
  "error": "Rota não encontrada",
  "path": "/eventos",
  "method": "GET",
  "message": "O endpoint GET /eventos não existe"
}
```

### Erro 4: Erro de Conexão com Banco

Se o PostgreSQL não estiver rodando:

**Resposta (500 Internal Server Error)**:

```json
{
  "success": false,
  "error": "Erro ao registrar evento",
  "message": "connect ECONNREFUSED 127.0.0.1:5432"
}
```

---

## 🧪 Sequência de Teste Completa

Recomendamos testar nesta ordem:

1. **Health Check** → Verifica se servidor está rodando
2. **POST simples** → Registra um evento básico
3. **POST completo** → Registra evento com todos os campos
4. **GET eventos** → Recupera eventos registrados
5. **GET stats** → Verifica estatísticas
6. **POST com erro** → Testa validação de erros

---

## 📋 Template para Colar no Postman

```
POST http://localhost:3000/events
Content-Type: application/json

{
  "type": "click",
  "tag": "button",
  "text": "Clique aqui",
  "element_id": "btn-action",
  "class": "btn btn-primary",
  "timestamp": "2024-04-01T10:30:45.123Z"
}

###

GET http://localhost:3000/events?limit=50

###

GET http://localhost:3000/events/stats

###

GET http://localhost:3000/
```

---

## 💡 Dicas

- Use `new Date().toISOString()` no JavaScript para gerar timestamps no formato correto
- O campo `timestamp` deve estar sempre em formato ISO 8601: `YYYY-MM-DDTHH:MM:SS.SSSZ`
- Campos opcionais (tag, text, element_id, class) podem ser omitidos
- Use `?limit=X` para limitar resultados (padrão é 100)
- Verifique os logs do servidor para debug

---

## 🚀 Próxima Etapa

Após confirmar que todos os endpoints funcionam, integre esta API com sua extensão de navegador!
