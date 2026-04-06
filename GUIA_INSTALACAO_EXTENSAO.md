# 📦 Guia de Instalação da Extensão - Avaliador UX

## 🚀 Como Instalar e Testar a Extensão

Este guia explica como instalar a extensão no navegador Chrome/Edge e testar a integração com o backend.

---

## **Pré-requisitos**

✅ Backend rodando em `http://localhost:3000`  
✅ Banco de dados PostgreSQL configurado  
✅ Navegador Chrome ou Edge instalado

---

## **Instalação da Extensão**

### **Passo 1: Abrir o gerenciador de extensões**

**Chrome:**

1. Abra o Chrome
2. Digite na barra de endereço: `chrome://extensions/`
3. Ative o **Modo do desenvolvedor** no canto superior direito

**Edge:**

1. Abra o Edge
2. Digite na barra de endereço: `edge://extensions/`
3. Ative o **Modo do desenvolvedor** no canto superior esquerdo

### **Passo 2: Carregar a extensão**

1. Clique em **"Carregar extensão sem empacotamento"** ou **"Load unpacked"**
2. Navegue até: `C:\Users\accn2\Documents\TCC\Project\Extensao_Avaliadora_Usabilidade_Navegabilidade\browser-extension`
3. Selecione a pasta `browser-extension` e confirme

### **Passo 3: Verificar instalação**

✅ A extensão deve aparecer na lista com ícone da extensão  
✅ Você verá um ícone no topo direito do navegador

---

## **Teste Inicial**

### **1️⃣ Clicar no ícone da extensão**

1. Clique no ícone do Avaliador UX na barra de ferramentas
2. Abrirá um popup com o painel de controle

### **2️⃣ Verificar status da extensão**

- ✅ Rastreamento deve estar **Ativo**
- ✅ Campo "URL do Backend" deve estar com `http://localhost:3000`

### **3️⃣ Testar captura de eventos**

1. Navegue até qualquer página web (ex: https://google.com)
2. **Clique em elementos** da página:
   - Botões
   - Links
   - Campos de inputs
   - etc.

3. Abra o **Console da extensão**:
   - Clique com botão direito no ícone da extensão
   - Selecione **"Inspecionar popup"**
   - Vá na aba **Console**
   - Você verá logs como:
     ```
     📌 Clique capturado: {type: "click", tag: "BUTTON", x: 123, y: 456...}
     📤 Enviando 1 eventos para o backend...
     ✅ Eventos enviados com sucesso!
     ```

### **4️⃣ Verificar dados no banco**

1. Abra o terminal e conecte ao PostgreSQL:

   ```bash
   psql -U seu_usuario -d tcc_ux
   ```

2. Query para verificar eventos:

   ```sql
   SELECT * FROM events ORDER BY timestamp DESC LIMIT 10;
   ```

3. Você verá os eventos capturados com:
   - `type`: tipo do evento (click, scroll, focus, etc.)
   - `tag`: tag HTML do elemento
   - `text`: texto do elemento
   - `x`, `y`: coordenadas do clique
   - `url`: URL da página
   - `timestamp`: quando ocorreu

---

## **Troubleshooting**

### ❌ "Falha ao conectar ao backend"

**Solução:**

- Verifique se o backend está rodando: `npm start` na pasta raiz do projeto
- Confirme que está em `http://localhost:3000`
- Verifique a URL no popup da extensão

### ❌ "Nenhum evento sendo capturado"

**Solução:**

- Verifique se o **Rastreamento está Ativo** no popup
- Abra o Console da extensão (Inspecionar Popup → Console)
- Procure por mensagens de erro
- Tente fazer clique em elementos diferentes

### ❌ "Evento não aparece no banco de dados"

**Solução:**

- Verifique se o banco de dados está rodando
- Confirme que a migration foi executada:
  ```bash
  psql -U seu_usuario -d tcc_ux -f migrations/001_add_positioning_and_url.sql
  ```
- Verifique se a URL do backend está correta

---

## **Funcionalidades Implementadas**

| Funcionalidade             | Status          | Descrição                                    |
| -------------------------- | --------------- | -------------------------------------------- |
| 📌 Captura de cliques      | ✅ Implementado | Registra cliques com posição e contexto      |
| 📜 Captura de scroll       | ✅ Implementado | Registra profundidade e velocidade de scroll |
| 🎯 Focus em formulários    | ✅ Implementado | Registra quando campos ganham foco           |
| ✏️ Mudanças em formulários | ✅ Implementado | Registra alterações em inputs                |
| 🔗 Navegação               | ✅ Implementado | Registra cliques em links                    |
| 🌐 Envio para backend      | ✅ Implementado | Envia eventos em lotes                       |
| 💾 Persistência local      | ⚠️ Em progresso | IndexedDB para offline                       |
| 📊 Dashboard               | ⚠️ Em progresso | Visualização de dados                        |
| 🤖 IA/Análise automática   | ⚠️ Futuro       | Geração de insights                          |

---

## **Próximos Passos**

Após verificar que tudo está funcionando:

1. **Testar com páginas reais**
   - Navegue em diferentes sites
   - Verifique se os eventos são capturados corretamente

2. **Refinar schema de dados**
   - Adicionar mais campos conforme necessário
   - Melhorar precisão das coordenadas

3. **Implementar análises**
   - Métricas de usabilidade
   - Heatmaps de cliques
   - Fluxos de navegação

---

## **Estrutura de Arquivos**

```
browser-extension/
├── manifest.json              # Configuração da extensão
├── src/
│   ├── scripts/
│   │   ├── content-script.js  # Captura eventos na página
│   │   ├── background.js      # Service worker
│   │   └── injected.js        # (opcional) Script injetado
│   └── popup/
│       ├── popup.html         # Interface do popup
│       ├── popup.css          # Estilos
│       ├── popup.js           # Lógica do popup
│       ├── dashboard.html     # (futuro) Dashboard
│       └── settings.html      # (futuro) Configurações avançadas
└── assets/
    └── icons/                 # Ícones da extensão
```

---

## **Verificação Final**

Una vez que tudo esteja funcionando:

✅ Extensão instalada e ativa  
✅ Popup abrindo corretamente  
✅ Eventos sendo capturados na página  
✅ Eventos sendo enviados para o backend  
✅ Dados aparecendo no banco de dados

🎉 **Parabéns! A integração extensão ↔ backend está funcionando!** 🎉

---

## **Suporte**

Para dúvidas ou problemas, verifique:

- Console da extensão (Developer Tools)
- Logs do backend no terminal
- Arquivo de logs do PostgreSQL
