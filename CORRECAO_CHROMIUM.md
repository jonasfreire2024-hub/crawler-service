# Correção do Erro do Chromium no Railway

## Problema
```
chrome_crashpad_handler: --database is required
Failed to launch the browser process!
```

## Causa
O Chromium estava tentando usar o crash reporter (crashpad), mas não conseguia inicializar corretamente no ambiente do Railway.

## Solução Aplicada

### 1. Ordem de Tentativas Alterada
Agora tenta primeiro os caminhos do sistema (mais confiáveis no Railway):
- `/usr/bin/chromium` (instalado via apt)
- `/usr/bin/chromium-browser`
- `/nix/var/nix/profiles/default/bin/chromium`
- Chromium bundled do Puppeteer (fallback)

### 2. Flags Adicionadas
Adicionadas flags mais agressivas para desabilitar completamente o crash reporter:
```javascript
'--disable-crash-reporter',
'--disable-breakpad',
'--no-zygote',
'--single-process',
'--disable-background-networking',
'--disable-background-timer-throttling',
'--disable-backgrounding-occluded-windows',
'--disable-renderer-backgrounding',
'--disable-features=TranslateUI',
'--disable-ipc-flooding-protection',
'--disable-hang-monitor',
'--disable-popup-blocking',
'--disable-prompt-on-repost',
'--disable-sync',
'--force-color-profile=srgb',
'--metrics-recording-only',
'--no-default-browser-check',
'--safebrowsing-disable-auto-update',
'--enable-automation',
'--password-store=basic',
'--use-mock-keychain',
'--hide-scrollbars',
'--mute-audio'
```

### 3. Variáveis de Ambiente Adicionadas
No Dockerfile:
```dockerfile
ENV CHROME_CRASHPAD_PIPE_NAME=
ENV CHROME_CRASH_REPORTER_ENABLED=0
```

## Como Testar

### Localmente (se tiver Docker)
```bash
cd crawler-service
docker build -t crawler-test .
docker run -p 3001:3001 crawler-test node test-chromium.js
```

### No Railway
1. Faça commit das alterações:
```bash
git add crawler-service/
git commit -m "fix: corrigir erro do Chromium crashpad"
git push
```

2. O Railway vai fazer redeploy automaticamente

3. Verifique os logs:
```bash
railway logs
```

4. Teste o endpoint:
```bash
curl -X POST https://seu-crawler.railway.app/atualizar-precos \
  -H "Content-Type: application/json" \
  -d '{
    "concorrenteId": "seu-id",
    "tenantId": "seu-tenant",
    "supabaseUrl": "sua-url",
    "supabaseKey": "sua-key"
  }'
```

## Verificação de Sucesso
Nos logs você deve ver:
```
✅ Puppeteer iniciado com: /usr/bin/chromium
```

E NÃO deve ver:
```
❌ Chromium bundled falhou: Failed to launch the browser process!
chrome_crashpad_handler: --database is required
```

## Rollback (se necessário)
Se algo der errado, você pode reverter:
```bash
git revert HEAD
git push
```

## Arquivos Modificados
- `crawler-service/src/atualizar-precos.js` - Lógica de inicialização do Puppeteer
- `crawler-service/Dockerfile` - Variáveis de ambiente
- `crawler-service/test-chromium.js` - Script de teste (novo)
