# Deploy do Crawler no Railway

## ✅ Pré-requisitos
- Conta no Railway (https://railway.app)
- Código testado localmente

## 📦 Passos para Deploy

### 1. Preparar o Repositório
```bash
cd crawler-service
git init
git add .
git commit -m "Initial commit - Crawler Lord"
```

### 2. Criar Projeto no Railway
1. Acesse https://railway.app
2. Clique em "New Project"
3. Selecione "Deploy from GitHub repo" ou "Empty Project"

### 3. Configurar Variáveis de Ambiente
No Railway, adicione as seguintes variáveis:

```
SUPABASE_URL=https://xvesjyjriwjfztdcoidk.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZXNqeWpyaXdqZnp0ZGNvaWRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM3NDYxMiwiZXhwIjoyMDgyOTUwNjEyfQ.4LlztMbuVTSgDFkcewuyfrmvqtvmOLzZriFzLwefDes
PORT=3001
NODE_ENV=production
```

### 4. Deploy
O Railway detectará automaticamente o Dockerfile e fará o build.

### 5. Testar
Após o deploy, teste o endpoint:
```bash
curl https://seu-app.railway.app/health
```

### 6. Executar Crawler
Faça uma requisição POST para:
```bash
POST https://seu-app.railway.app/crawler/lord-completo
Content-Type: application/json

{
  "concorrenteId": "5e8f3e2e-ed76-4c7a-a508-69fa53cbe6a6",
  "urlBase": "https://lordistribuidor.com.br",
  "tenantId": "092f9f19-6b3f-4246-a946-14dbb962f1a5"
}
```

## 🔧 Troubleshooting

### Erro de Chromium
Se der erro de Chromium, verifique:
- O Dockerfile está instalando todas as dependências
- A versão do @sparticuz/chromium está correta

### Timeout
Se der timeout:
- Aumente o timeout do Railway (Settings > Deploy)
- Use `testeRapido: true` para processar apenas 1 categoria

### Memória
Se faltar memória:
- Upgrade do plano no Railway
- Processar categorias em lotes menores

## 📊 Monitoramento
- Logs: Railway Dashboard > Logs
- Métricas: Railway Dashboard > Metrics
- Health: https://seu-app.railway.app/health

## 🎯 Próximos Passos
1. Configurar webhook no Supabase para disparar crawler automaticamente
2. Adicionar cron job para atualização periódica
3. Implementar fila de processamento para múltiplos concorrentes
