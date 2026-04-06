#!/bin/bash

# ============================================
# SCRIPT DE VALIDAÇÃO RÁPIDA
# ============================================
# Verifica se tudo está configurado corretamente
# para o Avaliador UX funcionar

echo "╔════════════════════════════════════════════════════════════════════════╗"
echo "║     🧪 VALIDAÇÃO RÁPIDA - EXTENSÃO AVALIADOR UX                      ║"
echo "╚════════════════════════════════════════════════════════════════════════╝"
echo ""

# Cores para saída
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0

# ============================================
# Função para testar componentes
# ============================================

test_item() {
  local test_name=$1
  local command=$2
  
  echo -n "🔍 Testando $test_name... "
  
  if eval "$command" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ OK${NC}"
    ((TESTS_PASSED++))
  else
    echo -e "${RED}✗ FALHOU${NC}"
    ((TESTS_FAILED++))
  fi
}

# ============================================
# 1. Verificar Node.js
# ============================================

echo "📦 DEPENDÊNCIAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_item "Node.js instalado (v14+)" "node --version"
test_item "npm instalado" "npm --version"
test_item "PostgreSQL cliente instalado" "psql --version"

echo ""

# ============================================
# 2. Verificar Backend
# ============================================

echo "🚀 BACKEND"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_item "Server.js existe" "test -f ../server.js"
test_item "package.json existe" "test -f ../package.json"
test_item "Diretório src/ existe" "test -d ../src"
test_item "EventController existe" "test -f ../src/controllers/eventController.js"
test_item "EventService existe" "test -f ../src/services/eventService.js"

echo ""

# ============================================
# 3. Verificar Backend Online
# ============================================

echo "🌐 TESTE DE CONECTIVIDADE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -n "🔍 Backend respondendo em localhost:3000... "
if curl -s http://localhost:3000 > /dev/null 2>&1; then
  echo -e "${GREEN}✓ OK${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ FALHOU (backend não está rodando)${NC}"
  echo "   Dica: Execute 'npm start' na pasta raiz"
  ((TESTS_FAILED++))
fi

echo ""

# ============================================
# 4. Verificar Banco de Dados
# ============================================

echo "💾 BANCO DE DADOS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -n "🔍 Conectando ao PostgreSQL... "
if psql -U postgres -d tcc_ux -c "\d events" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ OK${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ FALHOU${NC}"
  echo "   Dica: Certifique-se que tcc_ux existe e possui tabela events"
  ((TESTS_FAILED++))
fi

echo -n "🔍 Tabela 'events' tem coluna 'url'... "
if psql -U postgres -d tcc_ux -c "\d events" | grep "url" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ OK${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ FALHOU${NC}"
  echo "   Dica: Execute migration: psql -U postgres -d tcc_ux -f migrations/001_add_positioning_and_url.sql"
  ((TESTS_FAILED++))
fi

echo -n "🔍 Tabela 'events' tem coluna 'x'... "
if psql -U postgres -d tcc_ux -c "\d events" | grep "x" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ OK${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ FALHOU${NC}"
  ((TESTS_FAILED++))
fi

echo -n "🔍 Tabela 'events' tem coluna 'y'... "
if psql -U postgres -d tcc_ux -c "\d events" | grep "y" > /dev/null 2>&1; then
  echo -e "${GREEN}✓ OK${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ FALHOU${NC}"
  ((TESTS_FAILED++))
fi

echo ""

# ============================================
# 5. Verificar Arquivos da Extensão
# ============================================

echo "🔌 EXTENSÃO DE NAVEGADOR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

test_item "manifest.json existe" "test -f ./manifest.json"
test_item "content-script.js existe" "test -f ./src/scripts/content-script.js"
test_item "background.js existe" "test -f ./src/scripts/background.js"
test_item "popup.html existe" "test -f ./src/popup/popup.html"
test_item "popup.css existe" "test -f ./src/popup/popup.css"
test_item "popup.js existe" "test -f ./src/popup/popup.js"
test_item "test-page.html existe" "test -f ./test-page.html"

echo ""

# ============================================
# 6. Testar API
# ============================================

echo "🔗 TESTES DE API"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -n "🔍 POST /events responde corretamente... "

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:3000/events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test",
    "timestamp": "'$(date -u +'%Y-%m-%dT%H:%M:%S.000Z')'",
    "url": "http://test.com"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "201" ]; then
  echo -e "${GREEN}✓ OK${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ FALHOU (HTTP $HTTP_CODE)${NC}"
  echo "   Resposta: $(echo "$RESPONSE" | head -n -1)"
  ((TESTS_FAILED++))
fi

echo -n "🔍 GET /events responde corretamente... "

RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/events?limit=1)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ OK${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ FALHOU (HTTP $HTTP_CODE)${NC}"
  ((TESTS_FAILED++))
fi

echo -n "🔍 GET /events/stats responde corretamente... "

RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/events/stats)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ OK${NC}"
  ((TESTS_PASSED++))
else
  echo -e "${RED}✗ FALHOU (HTTP $HTTP_CODE)${NC}"
  ((TESTS_FAILED++))
fi

echo ""

# ============================================
# 7. Resumo Final
# ============================================

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "✓ ${GREEN}Testes Passados: $TESTS_PASSED${NC}"
echo -e "✗ ${RED}Testes Falhados: $TESTS_FAILED${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $TESTS_FAILED -eq 0 ]; then
  echo ""
  echo -e "${GREEN}🎉 TUDO FUNCIONANDO!${NC}"
  echo ""
  echo "Próximos passos:"
  echo "1. Abra chrome://extensions/"
  echo "2. Ative 'Modo do desenvolvedor'"
  echo "3. Clique em 'Carregar extensão sem empacotamento'"
  echo "4. Selecione a pasta 'browser-extension'"
  echo "5. Abra test-page.html e faça testes"
  echo ""
  exit 0
else
  echo ""
  echo -e "${RED}❌ ALGUNS TESTES FALHARAM${NC}"
  echo ""
  echo "Verifique os erros acima e corrija antes de continuar."
  echo ""
  exit 1
fi
