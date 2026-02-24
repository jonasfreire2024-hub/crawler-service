# 🚀 Deploy Imediato no Railway

## Status Atual
✅ Código testado e funcionando localmente
✅ Preços sendo capturados corretamente
✅ Estoque sendo capturado corretamente
✅ UPSERT configurado (não duplica produtos)
✅ Dockerfile pronto
✅ Todas as dependências configuradas

## Opção 1: Deploy Direto (Mais Rápido)

### 1. Acesse o Railway
https://railway.app

### 2. Crie um Novo Projeto
- Clique em "New Project"
- Selecione "Empty Project"

### 3. Adicione um Serviço
- Clique em "+ New"
- Selecione "GitHub Repo" OU "Empty Service"

### 4. Se escolheu Empty Service:
- Clique no serviço criado
- Vá em "Settings"
- Em "Source" clique em "Connect Repo"
- OU arraste a pasta `crawler-service` para fazer upload

### 5. Configure as Variáveis de Ambiente
Vá em "Variables" e adicione:

```
SUPABASE_URL=https://xvesjyjriwjfztdcoidk.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZXNqeWpyaXdqZnp0ZGNvaWRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM3NDYxMiwiZXhwIjoyMDgyOTUwNjEyfQ.4LlztMbuVTSgDFkcewuyfrmvqtvmOLzZriFzLwefDes
PORT=3001
NODE_ENV=production
```

### 6. Deploy Automático
O Railway detectará o Dockerfile e fará o build automaticamente.

### 7. Aguarde o Build (5-10 minutos)
Acompanhe os logs na aba "Deployments"

### 8. Pegue a URL do Serviço
- Vá em "Settings"
- Em "Networking" clique em "Generate Domain"
- Copie a URL gerada (ex: `crawler-lord-production.up.railway.app`)

## Opção 2: Via Railway CLI

```bash
# Instalar Railway CLI
npm i -g @railway/cli

# Login
railway login

# Ir para a pasta do crawler
cd crawler-service

# Inicializar projeto
railway init

# Adicionar variáveis
railway variables set SUPABASE_URL=https://xvesjyjriwjfztdcoidk.supabase.co
railway variables set SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZXNqeWpyaXdqZnp0ZGNvaWRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM3NDYxMiwiZXhwIjoyMDgyOTUwNjEyfQ.4LlztMbuVTSgDFkcewuyfrmvqtvmOLzZriFzLwefDes
railway variables set PORT=3001
railway variables set NODE_ENV=production

# Deploy
railway up
```

## Testar Após Deploy

### 1. Health Check
```bash
curl https://SUA-URL.railway.app/health
```

Resposta esperada:
```json
{
  "status": "ok",
  "timestamp": "2026-02-12T..."
}
```

### 2. Teste Rápido (1 categoria)
```bash
curl -X POST https://SUA-URL.railway.app/crawler/lord-completo \
  -H "Content-Type: application/json" \
  -d '{
    "concorrenteId": "5e8f3e2e-ed76-4c7a-a508-69fa53cbe6a6",
    "urlBase": "https://lordistribuidor.com.br",
    "tenantId": "092f9f19-6b3f-4246-a946-14dbb962f1a5",
    "testeRapido": true
  }'
```

### 3. Crawler Completo (77 categorias)
```bash
curl -X POST https://SUA-URL.railway.app/crawler/lord-completo \
  -H "Content-Type: application/json" \
  -d '{
    "concorrenteId": "5e8f3e2e-ed76-4c7a-a508-69fa53cbe6a6",
    "urlBase": "https://lordistribuidor.com.br",
    "tenantId": "092f9f19-6b3f-4246-a946-14dbb962f1a5"
  }'
```

## Monitoramento

### Ver Logs em Tempo Real
No Railway Dashboard:
- Clique no serviço
- Vá em "Deployments"
- Clique no deployment ativo
- Veja os logs em tempo real

### Verificar Produtos no Supabase
Acesse o Supabase e veja a tabela `ag_concorrentes_produtos` sendo preenchida.

## Troubleshooting

### Erro de Chromium
Se der erro relacionado ao Chromium, verifique os logs. O Dockerfile já instala todas as dependências necessárias.

### Timeout
Se der timeout, o Railway pode estar limitando o tempo de execução. Use `testeRapido: true` primeiro.

### Memória Insuficiente
Se faltar memória, faça upgrade do plano no Railway ou processe menos categorias por vez.

## Próximos Passos

Após o deploy funcionar:
1. Integrar com o sistema principal
2. Configurar cron job para atualização automática
3. Adicionar webhook para disparar crawler sob demanda
4. Implementar fila para múltiplos concorrentes

## Suporte

Se tiver problemas:
1. Verifique os logs no Railway
2. Teste localmente primeiro com `node test-crawler-completo-lord.js`
3. Verifique se as variáveis de ambiente estão corretas
