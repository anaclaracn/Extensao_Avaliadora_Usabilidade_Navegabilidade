# ⚡ INÍCIO RÁPIDO (5 MINUTOS)

## 🎯 Você quer começar AGORA? Siga isso:

### ✅ PASSO 1: Preparar o Banco (1 min)

```bash
# Abra PowerShell no diretório do projeto
cd C:\Users\accn2\Documents\TCC\Project\Extensao_Avaliadora_Usabilidade_Navegabilidade

# Conecte ao PostgreSQL e execute o SQL de atualização
psql -U seu_usuario_postgres -d tcc_ux -f migrations\001_add_positioning_and_url.sql

# Ou manual no psql:
# \c tcc_ux
# ALTER TABLE events ADD COLUMN url TEXT;
# ALTER TABLE events ADD COLUMN x INTEGER;
# ALTER TABLE events ADD COLUMN y INTEGER;
```

### ✅ PASSO 2: Iniciar Backend (1 min)

```bash
# No PowerShell (pasta raiz do projeto)
npm start

# Deve aparecer:
# 🌐 Servidor rodando em: http://localhost:3000
```

**DEIXE RODANDO!** Abra outro PowerShell para o próximo passo.

### ✅ PASSO 3: Instalar Extensão (1 min)

**Chrome:**

1. Clique aqui: `chrome://extensions/`
2. Ative "Modo do desenvolvedor" (canto superior direito)
3. Clique "Carregar extensão sem empacotamento"
4. Selecione: `C:\Users\accn2\Documents\TCC\Project\Extensao_Avaliadora_Usabilidade_Navegabilidade\browser-extension`
5. Pronto! Clique no ícone 📊 que apareceu na barra de ferramentas

**Edge:**

- Mesma coisa mas abra `edge://extensions/` em vez de `chrome://extensions/`

### ✅ PASSO 4: Testar (1 min)

**Opção A - Teste Local (recomendado):**

1. No navegador, abra: `C:\Users\accn2\Documents\TCC\Project\Extensao_Avaliadora_Usabilidade_Navegabilidade\browser-extension\test-page.html`
2. Clique nos botões, faça scroll, preencha o formulário
3. Abra a extensão (clique no ícone 📊)
4. Veja os eventos sendo capturados em tempo real! ✨

**Opção B - Teste em Site Real:**

1. Vá para qualquer site (Google, GitHub, etc)
2. Clique em elementos
3. Abra o popup da extensão
4. Veja eventos sendo contabilizados

### ✅ PASSO 5: Verificar Dados (1 min)

```bash
# Abra PowerShell
psql -U seu_usuario_postgres -d tcc_ux

# No prompt psql, digite:
SELECT COUNT(*) FROM events;

# Deve retornar: 1, 2, 3... (número de eventos)

# Para ver os dados completos:
SELECT * FROM events ORDER BY timestamp DESC LIMIT 5;

# Para sair: \q
```

---

## 🎉 PRONTO!

Se chegou aqui e tudo funcionou, **parabéns!**

A integração extensão ↔ backend está **100% funcional**! 🚀

---

## 📋 PRÓXIMAS AÇÕES

Depois que validar, você pode:

1. **Testar em websites reais** com usuários
2. **Analisar os dados** coletados
3. **Gerar relatórios** de usabilidade
4. **Preparar apresentação** do TCC

---

## 🆘 PROBLEMA?

### ❌ "Extensão não aparece"

- Verifique se está em `chrome://extensions/` (Chrome) ou `edge://extensions/` (Edge)
- Modo dev está ligado?
- Reload a página

### ❌ "Eventos não sendo capturados"

- Toggle da extensão está **ATIVADO**?
- Abra F12 (DevTools) e procure por erros
- Teste em `test-page.html` primeiro

### ❌ "Backend não responde"

- Verifique se `npm start` está rodando
- Tenta acessar `http://localhost:3000` no navegador?
- Deve retornar {"message": "Backend TCC-UX rodando com sucesso! 🚀"}

### ❌ "Dados não aparecem no banco"

- Migration foi executada?
- Banco `tcc_ux` existe?
- PostgreSQL está rodando?

---

## 📚 MAIS INFORMAÇÕES

Quer entender melhor? Leia:

- **Como funciona?** → `ARQUITETURA.md`
- **Instalação detalhada** → `GUIA_INSTALACAO_EXTENSAO.md`
- **API endpoints** → `DOCUMENTACAO_API.md`
- **Próximos passos** → `CHECKLIST_PROXIMOS_PASSOS.md`

---

## 🎬 RESUMO VISUAL

```
[Você clica em um botão]
           ↓
[Extensão captura clique]
           ↓
[Agrupa com outros eventos]
           ↓
[Envia para backend: http://localhost:3000/events]
           ↓
[Backend armazena no banco]
           ↓
[SQL: SELECT * FROM events;]
           ↓
[Você vê os dados! 🎉]
```

---

**Boa sorte com o TCC!** 🚀
