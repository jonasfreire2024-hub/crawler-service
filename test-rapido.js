require('dotenv').config()
const { crawlerCompleto } = require('./src/crawler')

// CONFIGURAÇÃO - Use .env ou edite aqui
const CONFIG = {
  concorrenteId: process.env.CONCORRENTE_ID || 1,
  urlBase: process.env.CONCORRENTE_URL || 'https://lordistribuidor.com.br',
  tenantId: process.env.TENANT_ID || '1',
  supabaseUrl: process.env.SUPABASE_URL || 'SUA_SUPABASE_URL',
  supabaseKey: process.env.SUPABASE_KEY || 'SUA_SUPABASE_KEY',
  testeRapido: true // Flag para teste rápido
}

async function testarRapido() {
  console.log('🧪 TESTE RÁPIDO - Apenas 1 categoria\n')
  console.log('Configuração:')
  console.log(`  Concorrente ID: ${CONFIG.concorrenteId}`)
  console.log(`  URL: ${CONFIG.urlBase}`)
  console.log(`  Tenant ID: ${CONFIG.tenantId}`)
  console.log(`  Supabase: ${CONFIG.supabaseUrl}\n`)
  
  if (CONFIG.supabaseUrl === 'SUA_SUPABASE_URL') {
    console.error('❌ ERRO: Configure as credenciais do Supabase no arquivo .env')
    return
  }
  
  try {
    console.log('🚀 Iniciando teste rápido...\n')
    
    const resultado = await crawlerCompleto(CONFIG)
    
    console.log('\n✅ TESTE CONCLUÍDO!')
    console.log(`   Total de produtos: ${resultado.total}`)
    console.log(`   Categorias processadas: ${resultado.categorias}`)
    console.log(`   Duplicatas ignoradas: ${resultado.duplicatas}`)
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message)
    console.error(error.stack)
  }
}

// Executar
testarRapido()
