# Rodar Crawler Localmente

## Pré-requisitos

1. Node.js instalado
2. Credenciais do Supabase
3. ID do concorrente no banco

## Passo a Passo

### 1. Instalar dependências

```bash
cd crawler-service
npm install
```

### 2. Configurar credenciais

Crie um arquivo `.env` na pasta `crawler-service`:

```bash
cp .env.example .env
```

Edite o arquivo `.env` e preencha:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_KEY=sua_service_role_key_aqui
TENANT_ID=1
CONCORRENTE_ID=1
CONCORRENTE_URL=https://lordistribuidor.com.br
```

**Onde encontrar as credenciais:**

- **SUPABASE_URL**: Supabase Dashboard > Settings > API > Project URL
- **SUPABASE_KEY**: Supabase Dashboard > Settings > API > service_role key (⚠️ Mantenha secreta!)
- **TENANT_ID**: ID do seu tenant no banco
- **CONCORRENTE_ID**: ID do concorrente Lord no banco (tabela `ag_concorrentes`)

### 3. Rodar o crawler

```bash
node test-local.js
```

## O que vai acontecer

1. ✅ Faz login no Lord Distribuidor
2. 📂 Mapeia todas as categorias (83 categorias)
3. 📦 Extrai produtos de cada categoria
4. 💾 Salva no Supabase automaticamente
5. 📊 Mostra resumo no final

## Logs esperados

```
🧪 TESTE LOCAL DO CRAWLER

Configuração:
  Concorrente ID: 1
  URL: https://lordistribuidor.com.br
  Tenant ID: 1
  Supabase: https://xxx.supabase.co

🚀 Iniciando crawler...

🔐 Detectado Lord - Fazendo login...
✅ Login realizado
📂 FASE 1: Mapeando TODAS as categorias...
📋 77 categorias iniciais encontradas
✅ 83 categorias mapeadas

📦 FASE 2: Extraindo produtos de 83 categorias...
[1/83] 📂 /promocoes
   Encontrados 15 produtos na página 1
   Página 1: 15 novos
   💾 15 produtos salvos/atualizados
...

✅ CRAWLER CONCLUÍDO!
   Total de produtos: 1234
   Categorias processadas: 83
   Duplicatas ignoradas: 0
```

## Tempo estimado

- **Primeira execução**: 10-15 minutos (extrai todos os produtos)
- **Execuções seguintes**: 5-10 minutos (atualiza apenas produtos novos/alterados)

## Troubleshooting

### Erro: "Cannot find module 'dotenv'"

```bash
npm install dotenv
```

### Erro: "Invalid API key"

Verifique se está usando a **service_role key**, não a anon key.

### Erro: "Row Level Security"

A service_role key bypassa RLS, mas se der erro, verifique as políticas da tabela `ag_concorrentes_produtos`.

### Produtos não aparecem

Verifique:
1. `tenant_id` está correto
2. `concorrente_id` existe na tabela `ag_concorrentes`
3. Logs mostram "produtos salvos/atualizados"

## Alternativa: Editar diretamente no código

Se não quiser usar `.env`, edite o arquivo `test-local.js` diretamente:

```javascript
const CONFIG = {
  concorrenteId: 1,
  urlBase: 'https://lordistribuidor.com.br',
  tenantId: '1',
  supabaseUrl: 'https://seu-projeto.supabase.co',
  supabaseKey: 'sua_service_role_key_aqui'
}
```

## Verificar produtos salvos

Após o crawler terminar, verifique no Supabase:

```sql
SELECT COUNT(*) 
FROM ag_concorrentes_produtos 
WHERE concorrente_id = 1 
  AND tenant_id = '1';
```

Ou na aplicação: **Concorrentes > Lord Distribuidor > Ver Produtos**
