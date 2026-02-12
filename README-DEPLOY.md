# Deploy do Crawler no Railway

## Passo a Passo

### 1. Criar novo projeto no Railway

1. Acesse https://railway.app
2. Clique em "New Project"
3. Selecione "Deploy from GitHub repo"
4. Conecte seu repositório
5. Selecione a pasta `crawler-service`

### 2. Configurar variáveis de ambiente

No Railway, adicione estas variáveis:

```
PORT=3001
NODE_ENV=production
```

### 3. Deploy automático

O Railway vai:
- Detectar o Dockerfile
- Instalar Chromium e dependências
- Fazer build da imagem
- Iniciar o servidor na porta 3001

### 4. Obter a URL do serviço

Após o deploy:
1. Vá em Settings > Networking
2. Clique em "Generate Domain"
3. Copie a URL (ex: `https://crawler-service-production.up.railway.app`)

### 5. Configurar no seu app principal

No arquivo `.env` do seu app principal, adicione:

```
CRAWLER_SERVICE_URL=https://sua-url-do-railway.up.railway.app
```

### 6. Testar

Na interface do seu app:
1. Vá em Concorrentes
2. Selecione "Lord Distribuidor"
3. Clique em "Iniciar Crawler"
4. Aguarde a extração (pode levar alguns minutos)
5. Os produtos vão aparecer na lista!

## Troubleshooting

### Erro de memória
Se der erro de memória, aumente o limite no Railway:
- Settings > Resources > Memory: 2GB

### Timeout
Se der timeout, aumente o timeout na API:
- O crawler pode levar 5-10 minutos para extrair todos os produtos

### Logs
Para ver os logs:
```bash
railway logs
```

## Comandos úteis

```bash
# Ver logs em tempo real
railway logs --follow

# Reiniciar serviço
railway restart

# Ver status
railway status
```

## Estrutura do serviço

```
crawler-service/
├── server.js          # Servidor Express
├── src/
│   └── crawler.js     # Lógica do crawler
├── package.json       # Dependências
├── Dockerfile         # Configuração Docker
└── railway.json       # Configuração Railway
```

## Custos

O Railway oferece:
- $5 de crédito grátis por mês
- Depois: ~$0.000463 por GB-hora

Estimativa para o crawler:
- ~$2-3 por mês (uso moderado)
