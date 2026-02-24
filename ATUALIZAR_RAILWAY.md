# 🚀 Atualizar Railway com Correção

## O que foi corrigido
✅ Mudado `waitUntil: 'domcontentloaded'` para `waitUntil: 'networkidle2'`
✅ Aumentado tempo de espera de 300ms para 2000ms
✅ Agora vai encontrar os produtos corretamente

## Opção 1: Via Git (Recomendado)

Se o Railway está conectado ao GitHub:

```bash
# Na pasta raiz do projeto
git add crawler-service/src/crawler.js
git commit -m "fix: corrigir detecção de produtos no Railway (networkidle2)"
git push
```

O Railway detectará o push e fará redeploy automaticamente.

## Opção 2: Via Railway CLI

```bash
cd crawler-service
railway up
```

## Opção 3: Upload Manual

1. Acesse o Railway Dashboard
2. Clique no seu serviço
3. Vá em "Settings"
4. Em "Source" clique em "Disconnect" (se estiver conectado)
5. Arraste a pasta `crawler-service` novamente
6. Aguarde o rebuild

## Opção 4: Redeploy Forçado

Se já está no Railway:

1. Acesse o Railway Dashboard
2. Clique no seu serviço
3. Vá em "Deployments"
4. Clique nos 3 pontinhos do último deployment
5. Clique em "Redeploy"

## Verificar se Funcionou

Após o deploy, teste novamente:

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

Agora deve mostrar:
```
Encontrados 70 produtos na página 1
✅ X novos produtos
```

Ao invés de:
```
Encontrados 0 produtos na página 1
⚠️ Nenhum produto encontrado
```
