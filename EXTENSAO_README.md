# 🔌 Extensão Avaliador UX - Browser Extension

Extensão de navegador para captura e análise de eventos de usabilidade e navegabilidade.

## 📋 Tabela de Conteúdos

- [Sobre](#sobre)
- [Instalação](#-instalação)
- [Como Funciona](#como-funciona)
- [Arquivos](#-estrutura-de-arquivos)
- [Desenvolvimento](#-desenvolvimento)
- [Troubleshooting](#-troubleshooting)

---

## Sobre

A **Extensão Avaliador UX** é uma ferramenta desenvolvida para o TCC na área de Interação Humano-Computador (IHC).

Ela permite:

- ✅ Capturar em tempo real cliques, scrolls, mudanças de formulário
- ✅ Registrar contexto completo (elemento, posição, URL, timestamp)
- ✅ Enviar dados para um backend Node.js/Express
- ✅ Armazenar em PostgreSQL para análise posterior
- ✅ Fornecer interface de controle e monitoramento

---

## 🚀 Instalação

### Pré-requisitos

- Chrome 88+ ou Edge 88+
- Backend rodando em `http://localhost:3000`
- PostgreSQL com banco `tcc_ux` criado

### Passos

1. **Clonar/Baixar o projeto**

   ```bash
   git clone https://github.com/seu-usuario/tcc-ux.git
   cd browser-extension
   ```

2. **Abrir o gerenciador de extensões**
   - **Chrome**: `chrome://extensions/`
   - **Edge**: `edge://extensions/`

3. **Ativar Modo do Desenvolvedor**
   - Clique no toggle no canto superior direito

4. **Carregar a extensão**
   - Clique em "Carregar extensão sem empacotamento"
   - Selecione a pasta `browser-extension`

5. **Verificar instalação**
   - Você verá o ícone 📊 na barra de ferramentas
   - Clique nele para abrir o painel

---

## Como Funciona

### Ciclo de um Evento

```
1. Usuário interage com página (clique, scroll, etc)
   ↓
2. content-script.js captura o evento
   ↓
3. Extrai informações (tag, posição, contexto)
   ↓
4. Armazena em fila até atingir limite ou timeout
   ↓
5. Envia em lote para backend via POST /events
   ↓
6. Backend armazena no PostgreSQL
   ↓
7. Dados disponíveis para análise
```

### Tipos de Eventos

| Evento         | Descrição          | Dados                      |
| -------------- | ------------------ | -------------------------- |
| **click**      | Clique em elemento | tag, text, id, class, x, y |
| **scroll**     | Scroll na página   | y (altura), velocidade     |
| **focus**      | Campo recebe foco  | tag, type, id              |
| **change**     | Mudança em input   | tag, type, value           |
| **navigation** | Clique em link     | href, text, x, y           |

---

## 📁 Estrutura de Arquivos

```
browser-extension/
├── manifest.json              # Configuração (Chrome/Edge)
├── test-page.html             # Página para testes local
│
└── src/
    ├── scripts/
    │   ├── content-script.js   # Captura eventos na página
    │   └── background.js       # Service worker de gerenciamento
    │
    └── popup/
        ├── popup.html          # Interface do popup
        ├── popup.css           # Estilos
        └── popup.js            # Lógica interativa

```

### Arquivos Principais

#### `manifest.json`

Configuração principal da extensão segundo MV3 (Manifest v3):

- Declaração de permissões
- Content scripts
- Service worker
- Ícones
- Metadados

#### `content-script.js`

- Injeta na página web
- Listeners de eventos (click, scroll, focus, change)
- Captura contexto do elemento
- Gerencia fila de eventos
- Envia para backend

#### `background.js`

- Service Worker (roda em background)
- Comunicação com content-scripts
- Armazena configurações no `chrome.storage.sync`
- Atualiza badge com contagem

#### `popup.html/css/js`

- Interface visual
- Toggle para ativar/desativar
- Configuração de URL do backend
- Estatísticas em tempo real
- Log de eventos

#### `test-page.html`

- Página HTML local para testar captura
- Sem depender de sites externos
- Elementos interativos diversos

---

## 🛠️ Desenvolvimento

### Setup Local

```bash
# 1. Instalar dependências do backend (se necessário)
cd ..
npm install

# 2. Iniciar backend
npm start

# 3. Abrir página de testes
file:///path/to/browser-extension/test-page.html

# 4. Ou instalar a extensão (conforme instalação acima)
```

### Debugging

**Inspecionar Content-Script:**

1. Clique direito em qualquer página
2. Selecione "Inspecionar"
3. Abra "Console"
4. Procure por logs com 📌, 📤, ✅

**Inspecionar Background:**

1. Vá para `chrome://extensions/`
2. Encontre "Avaliador UX"
3. Clique em "Service worker" (ou "background page")
4. DevTools abre automático

**Inspecionar Popup:**

1. Clique direito no ícone da extensão
2. Selecione "Inspecionar"
3. Abra Console/Sources/Network

### Editar Código

Após fazer mudanças:

1. Salve o arquivo
2. Vá para `chrome://extensions/`
3. Clique no ícone de recarga da extensão
4. Teste novamente

---

## 🧪 Testes

### Teste Manual Local

1. Abra `test-page.html` no navegador
2. Clique nos botões
3. Abra popup da extensão
4. Verifique estatísticas

### Teste em Site Real

1. Navegue para qualquer site
2. Clique em elementos
3. Abra popup
4. Verifique contagem

### Verificar Dados no Banco

```bash
psql -U seu_usuario -d tcc_ux

SELECT * FROM events ORDER BY timestamp DESC LIMIT 10;
```

---

## 🐛 Troubleshooting

### ❌ "Extensão não aparece"

**Verificar:**

- Pasta `browser-extension` contém `manifest.json`?
- Está em `chrome://extensions/`?
- Modo dev está ativado?

**Solução:**

```bash
# Recarregar página de extensões
# Ctrl + Shift + J (no chrome://extensions/)
```

### ❌ "Eventos não sendo capturados"

**Verificar:**

- Toggle no popup está ATIVADO?
- Página está carregada completamente?
- Console mostra erros?

**Solução:**

- Abra DevTools (F12)
- Verifique se há erros no Console
- Teste em `test-page.html`

### ❌ "Backend não responde (CORS)"

**Verificar:**

- Backend está rodando? (`npm start`)
- URL no popup está correta?
- Em `http://localhost:3000`?

**Solução:**

```javascript
// No popup.js, verificar backendUrl
console.log("Backend URL:", extensionState.backendUrl);
```

### ❌ "Dados não aparecem no banco"

**Verificar:**

- Migration foi executada?
- Banco de dados existe?
- PostgreSQL está rodando?

**Solução:**

```bash
# Verificar tabela
psql -U seu_usuario -d tcc_ux
\d events

# Verificar dados
SELECT COUNT(*) FROM events;
```

---

## 📊 Performance

### Otimizações Implementadas

✅ **Batching de eventos** - Agrupa 5 eventos antes de enviar  
✅ **Timeout de envio** - Máximo 5 segundos sem enviar  
✅ **Fila local** - Não perde eventos se backend cair  
✅ **Debouncing de scroll** - Não captura cada 1px de scroll  
✅ **Limite de tamanho** - Máximo 100 caracteres de texto

### Melhorias Futuras

- [ ] Compressão de dados antes de enviar
- [ ] IndexedDB para persistência offline
- [ ] Sincronização em background
- [ ] Service Worker mais eficiente

---

## 🔐 Segurança

### Implementado

✅ Content Security Policy  
✅ Validação de URL no popup  
✅ Sanitização básica de dados  
✅ CORS no backend

### Recomendações

⚠️ Adicionar autenticação entre extensão e backend  
⚠️ Encriptar dados em trânsito (HTTPS)  
⚠️ Rate limiting no POST /events  
⚠️ Validação de origem das requisições

---

## 📞 Suporte

### Problema Comum?

1. **Console da Extensão**

   ```bash
   # Chrome
   chrome://extensions/ → Inspecionar
   ```

2. **Logs do Content-Script**

   ```javascript
   // F12 em qualquer página → Console
   // Procure por logs com 📌
   ```

3. **Backend Logs**
   ```bash
   # Terminal onde rodou npm start
   # Procure por 📝, 📤, ✅
   ```

### Documentação

- [Chrome Extensions Docs](https://developer.chrome.com/docs/extensions/)
- [Manifest v3](https://developer.chrome.com/docs/extensions/mv3/manifest/)
- [Content Scripts](https://developer.chrome.com/docs/extensions/mv3/content_scripts/)

---

## 📝 Contribuindo

Se quer adicionar funcionalidades:

1. Crie uma branch: `git checkout -b feat/nova-funcionalidade`
2. Faça commits: `git commit -am 'Add nova funcionalidade'`
3. Push: `git push origin feat/nova-funcionalidade`
4. Abra um Pull Request

---

## 📄 Licença

Este projeto é parte de um TCC em IHC. Use livremente para fins educacionais.

---

## 🙏 Créditos

Desenvolvido para **TCC - Extensão Avaliadora de Usabilidade & Navegabilidade**

**Autores:**

- [Seu Nome]

**Orientador:**

- [Nome do Orientador]

---

## 📅 Changelog

### v1.0.0 (2026-04-05)

- ✅ Release inicial
- ✅ Captura de eventos completa
- ✅ Popup funcional
- ✅ Backend integration

---

## 🎯 Roadmap

- [ ] v1.1 - Dashboard de análise
- [ ] v1.2 - Persistência offline (IndexedDB)
- [ ] v1.3 - Testes de tarefas
- [ ] v2.0 - Análise com IA

---

**Última atualização:** 05 de abril de 2026
