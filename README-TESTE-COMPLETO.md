# Teste Completo do Crawler Lord

Este teste extrai produtos do Lord e envia para a sua API.

## Passo 1: Descobrir o ID do Concorrente

Primeiro, certifique-se de que o servidor está rodando:

```bash
npm run dev
```

Depois, execute o script para buscar o ID:

```bash
cd crawler-service
node buscar-concorrente-id.js
```

Isso vai mostrar todos os concorrentes cadastrados e o ID do Lord.

## Passo 2: Executar o Teste Completo

Com o ID em mãos, execute:

```bash
CONCORRENTE_ID=<ID_DO_LORD> node test-lord-completo.js
```

Por exemplo:
```bash
CONCORRENTE_ID=1 node test-lord-completo.js
```

## O que o teste faz:

1. ✅ Faz login no Lord
2. ✅ Extrai categorias
3. ✅ Acessa primeira categoria
4. ✅ Extrai URLs dos produtos
5. ✅ Extrai dados dos primeiros 5 produtos:
   - Nome
   - SKU
   - Preços (normal e PIX)
   - Imagem
   - Estoque
   - Disponibilidade
6. ✅ Envia cada produto para a API
7. ✅ Mostra relatório de sucessos/erros

## Resultado Esperado

```
🎉 CONCLUÍDO!
   ✅ Sucessos: 5
   ❌ Erros: 0
```

Depois disso, os produtos devem aparecer na tela de "Produtos dos Concorrentes"!

## Troubleshooting

### Erro de autenticação
Se der erro 401, você precisa estar autenticado. O teste usa a API pública, então certifique-se de que a API não requer autenticação ou ajuste o código para incluir o token.

### Nenhum concorrente encontrado
Cadastre o concorrente Lord primeiro na interface:
- Nome: Lord Distribuidor
- URL: https://lordistribuidor.com.br

### Servidor não está rodando
Execute `npm run dev` na raiz do projeto.
