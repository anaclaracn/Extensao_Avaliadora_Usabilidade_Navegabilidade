# 🚀 Guia Rápido de Início

Bem-vindo ao backend TCC-UX! Este guia te ajudará a pôr o projeto rodando em poucos minutos.

## ✅ Configuração Pré-requisita

Certifique-se de ter:

- ✅ Node.js instalado (v14+)
- ✅ PostgreSQL instalado e rodando
- ✅ O banco de dados `tcc_ux` criado
- ✅ A tabela `events` criada

## 📝 Passo a Passo

### 1️⃣ Preparar o Banco de Dados

Se ainda não criou o banco de dados, execute os comandos SQL em `SQL_SETUP.sql`:

```bash
# Abra o PostgreSQL (no Windows)
psql -U postgres

# Ou use pgAdmin para executar os scripts
```

**Scripts necessários:**

```sql
CREATE DATABASE tcc_ux;
\c tcc_ux
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  tag TEXT,
  text TEXT,
  element_id TEXT,
  class TEXT,
  timestamp TIMESTAMP NOT NULL
);
```

### 2️⃣ Configurar Variáveis de Ambiente

O arquivo `.env` já foi criado com configurações padrão:

```env
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tcc_ux
SERVER_PORT=3000
NODE_ENV=development
```

**⚠️ Se suas credenciais são diferentes**, edite o arquivo `.env`:

Se você usa um usuário diferente:

```env
DB_USER=seu_usuario
DB_PASSWORD=sua_senha
```

### 3️⃣ Instalar Dependências

✅ **Já foi feito!** (durante setup)

Caso precise reinstalar:

```bash
npm install
```

### 4️⃣ Iniciar o Servidor

```bash
npm start
```

Você deverá ver:

```
========================================
🎯 Backend TCC-UX iniciado!
========================================
🌐 Servidor rodando em: http://localhost:3000
📍 Ambiente: development
📊 Banco de dados: tcc_ux
🔗 Host do BD: localhost:5432
========================================
```

### 5️⃣ Testar os Endpoints

Abra um novo terminal e teste:

```bash
# Health check
curl http://localhost:3000/

# Registrar um evento
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "click",
    "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'""
  }'

# Obter eventos
curl http://localhost:3000/events
```

---

## 🎯 Endpoints Principais

| Método   | URL                | Descrição                 |
| -------- | ------------------ | ------------------------- |
| GET      | `/`                | Health check              |
| **POST** | **/events**        | ⭐ Registrar novo evento  |
| GET      | `/events`          | Listar todos os eventos   |
| GET      | `/events?limit=50` | Listar eventos com limite |
| GET      | `/events/stats`    | Estatísticas dos eventos  |

### Exemplo de POST /events

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

**Resposta (201):**

```json
{
  "success": true,
  "message": "Evento registrado com sucesso",
  "data": {
    "id": 1,
    "type": "click",
    "tag": "button",
    ...
  }
}
```

---

## 🧪 Testando com Diferentes Ferramentas

### Via cURL (Terminal)

```bash
curl -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{"type":"click","timestamp":"2024-04-01T10:30:45.123Z"}'
```

### Via Postman

1. Abra Postman
2. Novo request → POST
3. URL: `http://localhost:3000/events`
4. Tab "Body" → raw → JSON
5. Cole o JSON acima

### Via VS Code REST Client

Extensão: `REST Client`

Crie arquivo `teste.rest`:

```
POST http://localhost:3000/events
Content-Type: application/json

{
  "type": "click",
  "timestamp": "2024-04-01T10:30:45.123Z"
}
```

Clique em "Send Request"

### Via JavaScript/Fetch

```javascript
fetch("http://localhost:3000/events", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type: "click",
    timestamp: new Date().toISOString(),
  }),
})
  .then((r) => r.json())
  .then((d) => console.log(d));
```

---

## 🐛 Soluções de Problemas

### ❌ "connect ECONNREFUSED"

PostgreSQL não está rodando.

```
Solução: Inicie o PostgreSQL
- Windows: Services → PostgreSQL
- Mac: brew services start postgresql
- Linux: sudo systemctl start postgresql
```

### ❌ "Database does not exist"

Banco `tcc_ux` não foi criado.

```
Solução: Execute os scripts em SQL_SETUP.sql
```

### ❌ "Port 3000 already in use"

Outra aplicação está usando a porta 3000.

```
Solução:
1. Mude a porta no .env (SERVER_PORT=3001)
2. Ou mate o processo na porta 3000
```

### ❌ "relation 'events' does not exist"

Tabela não foi criada.

```
Solução: Execute o script CREATE TABLE em SQL_SETUP.sql
```

### ❌ CORS Error (quando integrar com extensão)

Extensão está em origem diferente.

```
Solução: Ajuste corsOptions em src/middleware/corsMiddleware.js
```

---

## 📂 Estrutura Criada

```
projeto/
├── src/
│   ├── config/env.js              # Configuração de ambiente
│   ├── controllers/eventController.js  # Lógica HTTP
│   ├── routes/events.js           # Definição de rotas
│   ├── services/eventService.js   # Lógica de negócio
│   ├── middleware/
│   │   ├── corsMiddleware.js      # CORS
│   │   └── validationMiddleware.js # Validação
│   └── database/connection.js     # Conexão PostgreSQL
│
├── server.js                      # Arquivo principal
├── .env                           # Variáveis de ambiente
├── .env.example                   # Template de .env
├── package.json                   # Dependências
├── README.md                      # Documentação completa
├── EXEMPLO_REQUISICOES.md         # Exemplos prontos
├── SQL_SETUP.sql                  # Scripts SQL
└── GUIA_RAPIDO.md                # Este arquivo
```

---

## 🔒 Segurança (Importante!)

- ✅ **Proteção contra SQL Injection**: Usando parâmetros preparados
- ✅ **Validação de entrada**: Fields obrigatórios validados
- ✅ **CORS configurado**: Apenas localhost aceito por padrão
- ✅ **Variáveis sensíveis**: Em `.env` (não commitado)

**Para produção:**

- Adicionar autenticação JWT
- Implementar rate limiting
- Usar HTTPS
- Adicionar logging mais robusto
- Testes automatizados

---

## 📚 Arquivos Importantes

| Arquivo                                          | Descrição                          |
| ------------------------------------------------ | ---------------------------------- |
| [README.md](README.md)                           | Documentação completa              |
| [EXEMPLO_REQUISICOES.md](EXEMPLO_REQUISICOES.md) | Exemplos prontos para testar       |
| [SQL_SETUP.sql](SQL_SETUP.sql)                   | Scripts SQL necessários            |
| [server.js](server.js)                           | Entry point da aplicação           |
| [.env](.env)                                     | Variáveis de ambiente (seus dados) |

---

## 🎓 Próximos Passos

1. ✅ Backend rodando ← **Você está aqui**
2. → Integrar com extensão de navegador
3. → Testar coleta de eventos
4. → Implementar análises e dashboards
5. → Deploy em produção

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs no terminal do servidor
2. Consulte a documentação completa em [README.md](README.md)
3. Veja exemplos de requisições em [EXEMPLO_REQUISICOES.md](EXEMPLO_REQUISICOES.md)
4. Verifique os scripts SQL em [SQL_SETUP.sql](SQL_SETUP.sql)

---

## 🎉 Pronto!

O backend está pronto para:

- ✅ Receber dados da extensão do navegador
- ✅ Validar os dados de entrada
- ✅ Armazenar no PostgreSQL
- ✅ Recuperar para análise

**Próximo passo:** Integrar com sua extensão de navegador!

---

Criado para: **TCC - Interação Humano-Computador (IHC)**  
Data: 4 de abril de 2026
