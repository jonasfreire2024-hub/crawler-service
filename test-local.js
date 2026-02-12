require('dotenv').config()
const { crawlerCompleto } = require('./src/crawler')

// CONFIGURAÇÃO - Use .env ou edite aqui
const CONFIG = {
  concorrenteId: process.env.CONCORRENTE_ID || 1,
  urlBase: process.env.CONCORRENTE_URL || 'https://lordistribuidor.com.br',
  tenantId: process.env.TENANT_ID || '1',
  supabaseUrl: process.env.SUPABASE_URL || 'SUA_SUPABASE_URL',
  supabaseKey: process.env.SUPABASE_KEY || 'SUA_SUPABASE_KEY'
}

async function testarLocal() {
  console.log('🧪 TESTE LOCAL DO CRAWLER\n')
  console.log('Configuração:')
  console.log(`  Concorrente ID: ${CONFIG.concorrenteId}`)
  console.log(`  URL: ${CONFIG.urlBase}`)
  console.log(`  Tenant ID: ${CONFIG.tenantId}`)
  console.log(`  Supabase: ${CONFIG.supabaseUrl}\n`)
  
  if (CONFIG.supabaseUrl === 'SUA_SUPABASE_URL') {
    console.error('❌ ERRO: Configure as credenciais do Supabase no arquivo test-local.js')
    console.log('\nEdite o arquivo e preencha:')
    console.log('  - supabaseUrl: URL do seu projeto Supabase')
    console.log('  - supabaseKey: Service role key do Supabase')
    console.log('  - tenantId: ID do seu tenant')
    console.log('  - concorrenteId: ID do concorrente (Lord)')
    return
  }
  
  try {
    console.log('🚀 Iniciando crawler...\n')
    
    const resultado = await crawlerCompleto(CONFIG)
    
    console.log('\n✅ CRAWLER CONCLUÍDO!')
    console.log(`   Total de produtos: ${resultado.total}`)
    console.log(`   Categorias processadas: ${resultado.categorias}`)
    console.log(`   Duplicatas ignoradas: ${resultado.duplicatas}`)
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message)
    console.error(error.stack)
  }
}

// Executar
testarLocal()
