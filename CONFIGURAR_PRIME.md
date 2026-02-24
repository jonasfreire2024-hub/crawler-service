# Configuração do Crawler - Prime Distribuidor

## Status Atual
✅ Código preparado e aguardando credenciais
⏳ Credenciais pendentes

## Padrão Identificado
A Prime Distribuidor usa **WooCommerce** (mesmo padrão do Lord Distribuidor)

## Quando Tiver as Credenciais

### 1. Atualizar o arquivo `crawler-service/src/crawler.js`

Localizar a seção da Prime (linha ~95) e substituir:

```javascript
// ANTES (código atual - comentado):
if (!jaLogado) {
  // TODO: Adicionar credenciais quando fornecidas
  // await page.type('#username', 'SEU_EMAIL_AQUI', { delay: 50 })
  // await page.type('#password', 'SUA_SENHA_AQUI', { delay: 50 })
  // await page.click('button[name="login"]')
  // await new Promise(r => setTimeout(r, 5000))
  console.log('⚠️ Credenciais da Prime não configuradas - continuando sem login')
}

// DEPOIS (com suas credenciais):
if (!jaLogado) {
  await page.type('#username', 'seu_email@exemplo.com', { delay: 50 })
  await page.type('#password', 'sua_senha_aqui', { delay: 50 })
  await page.click('button[name="login"]')
  await new Promise(r => setTimeout(r, 5000))
  console.log('✅ Login realizado')
}
```

### 2. Testar Localmente

Antes de fazer deploy, teste localmente:

```bash
cd crawler-service
node test-prime.js
```

Este teste vai:
- ✅ Verificar a estrutura da página
- ✅ Identificar os campos de login
- ✅ Mapear categorias disponíveis
- ✅ Testar extração de produtos

### 3. Testar Login Completo

Depois de adicionar as credenciais, teste o login:

```bash
node test-login-prime.js
```

### 4. Deploy no Railway

Após confirmar que funciona localmente:

```bash
git add .
git commit -m "feat: adicionar credenciais Prime Distribuidor"
git push origin main
```

O Railway vai fazer deploy automaticamente.

## Estrutura Esperada

### URL Base
```
https://primedistribuidorj.com.br
```

### Página de Login
```
https://primedistribuidorj.com.br/minha-conta
```

### Campos de Login (WooCommerce padrão)
- **Usuário:** `#username` ou `input[name="username"]`
- **Senha:** `#password` ou `input[name="password"]`
- **Botão:** `button[name="login"]`

## Comparação com Outros Concorrentes

| Concorrente | Plataforma | Login | Padrão Similar |
|-------------|-----------|-------|----------------|
| Lord | WooCommerce | Sim | ✅ IGUAL |
| Total | Forminator | Sim | ❌ Diferente |
| Rufer | WooCommerce | Não | Parcial |
| Prime | WooCommerce | Sim | ✅ IGUAL ao Lord |

## Próximos Passos

1. ⏳ Aguardar credenciais (email + senha)
2. ✏️ Atualizar código com credenciais
3. 🧪 Testar localmente
4. 🚀 Deploy no Railway
5. ✅ Validar funcionamento

## Observações

- O código já está preparado para funcionar SEM login (vai pegar preços públicos)
- Com login, terá acesso a preços especiais/atacado
- A estrutura é idêntica ao Lord, então deve funcionar perfeitamente
- Não precisa alterar nada além das credenciais

## Contato

Quando tiver as credenciais, me avise que eu atualizo o código imediatamente!
