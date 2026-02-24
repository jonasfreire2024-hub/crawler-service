const { createClient } = require('@supabase/supabase-js')

const CONFIG = {
  supabaseUrl: 'https://xvesjyjriwjfztdcoidk.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZXNqeWpyaXdqZnp0ZGNvaWRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM3NDYxMiwiZXhwIjoyMDgyOTUwNjEyfQ.4LlztMbuVTSgDFkcewuyfrmvqtvmOLzZriFzLwefDes'
}

async function verificarEstrutura() {
  const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey)
  
  console.log('🔍 Verificando estrutura da tabela ag_concorrentes_produtos...\n')
  
  // Pegar um produto qualquer para ver os campos
  const { data: produtos, error } = await supabase
    .from('ag_concorrentes_produtos')
    .select('*')
    .limit(1)
  
  if (error) {
    console.error('❌ Erro:', error)
    return
  }
  
  if (produtos && produtos.length > 0) {
    console.log('📋 Campos disponíveis:')
    Object.keys(produtos[0]).forEach(campo => {
      const valor = produtos[0][campo]
      const tipo = typeof valor
      console.log(`   ${campo}: ${tipo} = ${valor}`)
    })
  }
}

verificarEstrutura()
