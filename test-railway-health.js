// Teste de health check do Railway
const RAILWAY_URL = 'https://crawler-service-production-15da.up.railway.app'

async function testarRailway() {
  console.log('🔍 Testando conexão com Railway...\n')
  
  // Teste 1: Health check básico
  console.log('1️⃣ Testando health check...')
  try {
    const response = await fetch(`${RAILWAY_URL}/health`)
    const data = await response.json()
    console.log('✅ Health check OK:', data)
  } catch (error) {
    console.log('❌ Health check falhou:', error.message)
  }
  
  console.log('\n2️⃣ Testando endpoint raiz...')
  try {
    const response = await fetch(RAILWAY_URL)
    const data = await response.json()
    console.log('✅ Endpoint raiz OK:', data)
  } catch (error) {
    console.log('❌ Endpoint raiz falhou:', error.message)
  }
  
  console.log('\n3️⃣ Testando endpoint de crawler (sem executar)...')
  try {
    const response = await fetch(`${RAILWAY_URL}/crawler/rapido`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    const data = await response.json()
    console.log('Status:', response.status)
    console.log('Resposta:', data)
  } catch (error) {
    console.log('❌ Erro:', error.message)
  }
}

testarRailway()
