# 🚀 Comandos Rápidos para Deploy

## Deploy via Railway (Método mais fácil)

### 1. Preparar código
```bash
cd crawler-service
```

### 2. Criar projeto no Railway
1. Acesse: https://railway.app
2. Clique em "New Project"
3. Selecione "Empty Project"
4. Clique em "Deploy from GitHub repo" ou arraste a pasta

### 3. Configurar variáveis (copie e cole no Railway)
```
SUPABASE_URL=https://xvesjyjriwjfztdcoidk.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZXNqeWpyaXdqZnp0ZGNvaWRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM3NDYxMiwiZXhwIjoyMDgyOTUwNjEyfQ.4LlztMbuVTSgDFkcewuyfrmvqtvmOLzZriFzLwefDes
PORT=3001
NODE_ENV=production
```

### 4. Aguardar build (5-10 minutos)

### 5. Testar (substitua SEU_APP pela URL do Railway)
```bash
# Health check
curl https://SEU_APP.railway.app/health

# Teste rápido (1 categoria)
curl -X POST https://SEU_APP.railway.app/crawler/lord-completo \
  -H "Content-Type: application/json" \
  -d '{"concorrenteId":"5e8f3e2e-ed76-4c7a-a508-69fa53cbe6a6","urlBase":"https://lordistribuidor.com.br","tenantId":"092f9f19-6b3f-4246-a946-14dbb962f1a5","testeRapido":true}'

# Crawler completo (todas as 77 categorias)
curl -X POST https://SEU_APP.railway.app/crawler/lord-completo \
  -H "Content-Type: application/json" \
  -d '{"concorrenteId":"5e8f3e2e-ed76-4c7a-a508-69fa53cbe6a6","urlBase":"https://lordistribuidor.com.br","tenantId":"092f9f19-6b3f-4246-a946-14dbb962f1a5"}'
```

## Alternativa: Deploy via GitHub

```bash
# 1. Criar repositório
cd crawler-service
git init
git add .
git commit -m "Crawler Lord pronto"

# 2. Criar repo no GitHub e conectar
git remote add origin https://github.com/SEU_USUARIO/crawler-lord.git
git push -u origin main

# 3. No Railway: New Project > Deploy from GitHub repo
# 4. Selecionar o repositório
# 5. Adicionar variáveis de ambiente (mesmas acima)
```

## 📊 Monitorar

- **Logs:** Railway Dashboard > Logs
- **Métricas:** Railway Dashboard > Metrics  
- **Status:** https://SEU_APP.railway.app/health

## ⚡ Dicas

- Use `testeRapido: true` primeiro para validar
- O crawler completo pode levar 30-60 minutos
- Monitore os logs durante a execução
- Verifique o Supabase para ver os produtos sendo salvos

## 🎯 Resultado Esperado

- ✅ 77 categorias processadas
- ✅ ~1.500-2.000 produtos salvos
- ✅ Dados atualizados no Supabase
- ✅ Logs detalhados no Railway
