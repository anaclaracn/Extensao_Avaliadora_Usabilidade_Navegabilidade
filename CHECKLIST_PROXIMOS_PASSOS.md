# ✅ Checklist - Próximos Passos do Projeto

## 🎬 Imediatamente (Hoje)

### Validar Instalação

- [ ] Executar migration SQL no banco de dados
  ```bash
  psql -U seu_usuario -d tcc_ux -f migrations/001_add_positioning_and_url.sql
  ```
- [ ] Iniciar backend
  ```bash
  npm start
  ```
- [ ] Instalar extensão no Chrome/Edge
  - Chrome: `chrome://extensions/`
  - Modo dev ON → "Carregar extensão sem empacotamento" → selecionar `browser-extension/`

### Testes Básicos

- [ ] Abrir popup da extensão
- [ ] Verificar se URL do backend está correta
- [ ] Abrir `browser-extension/test-page.html`
- [ ] Clicar em botões e verificar capturas
- [ ] Scroll na página de teste
- [ ] Abrir DevTools (F12) → Console para ver logs

### Verificar Dados

- [ ] Conectar ao PostgreSQL
  ```bash
  psql -U seu_usuario -d tcc_ux
  ```
- [ ] Verificar tabela atualizada
  ```sql
  SELECT * FROM events ORDER BY timestamp DESC LIMIT 5;
  ```
- [ ] Confirmar que os novos campos (url, x, y) têm valores

---

## 📋 Curto Prazo (Próxima Semana)

### Melhorias no Popup

- [ ] Adicionar indicador visual de conexão com backend
- [ ] Mostrar número de eventos em tempo real atualizado
- [ ] Implementar botão "Limpar Dados"
- [ ] Adicionar histórico de últimos eventos

### Testes Mais Completos

- [ ] Testar em websites reais (Google, GitHub, etc)
- [ ] Verificar compatibilidade com diferentes tipos de páginas
- [ ] Testar com JavaScript pesado/SPAs

### Documentação

- [ ] Gerar vídeo tutorial de instalação
- [ ] Criar guia do usuário final
- [ ] Documentar todas as exceções possíveis

---

## 🚀 Médio Prazo (2-3 semanas)

### Dashboard de Análise

- [ ] Criar página `src/popup/dashboard.html`
- [ ] Visualizar eventos em tabela interativa
- [ ] Gráficos de eventos por tipo
- [ ] Timeline de cliques (heatmap)
- [ ] Filtros por:
  - [ ] Tipo de evento
  - [ ] URL
  - [ ] Data/hora
  - [ ] Elemento

### Persistência Offline

- [ ] Implementar IndexedDB no content-script
- [ ] Armazenar eventos localmente se backend cair
- [ ] Sincronizar quando voltar online
- [ ] Indicador visual de "Sincronizando..."

### Melhorias de Performance

- [ ] Comprimir dados antes de enviar
- [ ] Limite máximo de eventos armazenados localmente
- [ ] Otimizar queries do banco de dados
- [ ] Adicionar índices no PostgreSQL

---

## 🎯 Longo Prazo (1-2 meses)

### Análise Automática

- [ ] Calcular tempo médio de tarefa
- [ ] Taxa de sucesso/falha
- [ ] Caminhos mais frequentes
- [ ] Elementos mais clicados

### Testes de Tarefas

- [ ] Sistema para definir "tarefas" aos usuários
- [ ] Cronômetro de conclusão
- [ ] Rastreador de passos
- [ ] Feedback do usuário

### IA e Insights

- [ ] Integrar com API de IA (ChatGPT, Claude, etc)
- [ ] Gerar sugestões de melhoria automáticas
- [ ] Análise de acessibilidade
- [ ] Detecção de padrões de erro

### Relatórios

- [ ] Exportar relatórios em PDF
- [ ] Compartilhar dados com stakeholders
- [ ] Report automático via email

---

## 🔧 Technical Debt

### Segurança

- [ ] Adicionar autenticação no backend
- [ ] Validar origem das requisições
- [ ] Rate limiting para POST /events
- [ ] Encriptação de dados sensíveis

### Manutenção

- [ ] Adicionar testes unitários
- [ ] Adicionar testes de integração
- [ ] Setup CI/CD (GitHub Actions)
- [ ] Documentação de código
- [ ] Cleanup de eventos antigos

### Escalabilidade

- [ ] Considerar banco de dados para big data (Clickhouse, etc)
- [ ] Cache de resultado (Redis)
- [ ] Async workers para processamento
- [ ] Versionamento de API

---

## 📊 Métricas para Acompanhar

| Métrica                       | Baseline | Meta             |
| ----------------------------- | -------- | ---------------- |
| Tempo de resposta API         | ?        | < 100ms          |
| Taxa de sucesso de envio      | ?        | > 99%            |
| Eventos não duplicados        | ?        | 100%             |
| Dados no banco                | ?        | Sem limite       |
| Taxa de sincronização offline | ?        | 100% dos eventos |

---

## 🐛 Possíveis Issues para Futuros

- [ ] Contenção de CORS em alguns domínios
- [ ] Script-tinifying pages pode quebrar o content-script
- [ ] localStorage vs sessionStorage vs IndexedDB
- [ ] Sincronização de relógios entre dispositivos
- [ ] Privacidade do usuário (consentimento, LGPD)
- [ ] iFrames dentro de iFrames
- [ ] Shadow DOM elements
- [ ] Eventos bloqueados por Content Security Policy

---

## 📚 Recursos Úteis

- MDN: https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions
- Chrome Extension Docs: https://developer.chrome.com/docs/extensions/
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Express.js Docs: https://expressjs.com/

---

## 👥 Contatos/Referências

- **Orientador TCC**: [Adicionar nome e email]
- **Banca Avaliadora**: [Adicionar nomes]
- **Coautores**: [Se houver]

---

## 📝 Notas Importantes

1. **Sempre fazer backup do banco antes de migrações**

   ```bash
   pg_dump -U seu_usuario tcc_ux > backup_$(date +%Y%m%d).sql
   ```

2. **Versionar a extensão corretamente**
   - Atualizar `manifest.json` version
   - Tag no git: `git tag -a v1.0.0 -m "Release v1.0.0"`

3. **Testar em diferentes navegadores**
   - Chrome (Chromium-based)
   - Edge (Chromium-based)
   - Firefox (usar WebExtensions API)
   - Safari (usar Safari Web Extensions)

4. **Documentar decisões de design**
   - Por quê batching de eventos?
   - Por quê esses campos específicos?
   - Por quê essa estrutura de pastas?

---

## ✨ Status Final

```
Project: Extensão Avaliadora de Usabilidade
Status: ✅ MVP Completo e Funcional
Next Steps: Testes em produção + Análises
Target Go-Live: [Data a definir]
```
