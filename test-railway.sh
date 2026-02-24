#!/bin/bash

# Script para testar o crawler no Railway

RAILWAY_URL="https://seu-app.railway.app"

echo "🧪 Testando crawler no Railway..."
echo ""

# 1. Health Check
echo "1️⃣ Health Check..."
curl -s "$RAILWAY_URL/health" | jq .
echo ""

# 2. Teste Rápido (1 categoria)
echo "2️⃣ Teste Rápido (1 categoria)..."
curl -X POST "$RAILWAY_URL/crawler/lord-completo" \
  -H "Content-Type: application/json" \
  -d '{
    "concorrenteId": "5e8f3e2e-ed76-4c7a-a508-69fa53cbe6a6",
    "urlBase": "https://lordistribuidor.com.br",
    "tenantId": "092f9f19-6b3f-4246-a946-14dbb962f1a5",
    "testeRapido": true
  }' | jq .
echo ""

echo "✅ Testes concluídos!"
