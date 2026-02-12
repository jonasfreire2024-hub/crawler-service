// Script para buscar o ID do concorrente Lord
const API_URL = 'http://localhost:3000'

async function buscarConcorrenteId() {
  console.log('🔍 Buscando ID do concorrente Lord...\n')
  
  try {
    const response = await fetch(`${API_URL}/api/concorrentes/lista-simples`)
    
    if (!response.ok) {
      console.log('❌ Erro ao buscar concorrentes:', response.statusText)
      console.log('⚠️ Certifique-se de que:')
      console.log('   1. O servidor está rodando (npm run dev)')
      console.log('   2. Você está autenticado')
      return
    }
    
    const data = await response.json()
    
    if (!data || data.length === 0) {
      console.log('❌ Nenhum concorrente cadastrado')
      console.log('💡 Cadastre o concorrente Lord primeiro na interface')
      return
    }
    
    console.log('📋 Concorrentes cadastrados:\n')
    data.forEach(c => {
      console.log(`   ID: ${c.id}`)
      console.log(`   Nome: ${c.nome}`)
      console.log(`   URL: ${c.url}`)
      console.log(`   Ativo: ${c.ativo ? '✅' : '❌'}`)
      console.log('')
    })
    
    const lord = data.find(c => 
      c.nome?.toLowerCase().includes('lord') || 
      c.url?.includes('lord')
    )
    
    if (lord) {
      console.log(`🎯 Concorrente Lord encontrado!`)
      console.log(`   ID: ${lord.id}`)
      console.log(`\n💡 Execute o teste completo com:`)
      console.log(`   CONCORRENTE_ID=${lord.id} node test-lord-completo.js`)
    } else {
      console.log('⚠️ Concorrente Lord não encontrado')
      console.log('💡 Cadastre o concorrente primeiro com:')
      console.log('   Nome: Lord Distribuidor')
      console.log('   URL: https://lordistribuidor.com.br')
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  }
}

buscarConcorrenteId()
