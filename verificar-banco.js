const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xvesjyjriwjfztdcoidk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZXNqeWpyaXdqZnp0ZGNvaWRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM3NDYxMiwiZXhwIjoyMDgyOTUwNjEyfQ.4LlztMbuVTSgDFkcewuyfrmvqtvmOLzZriFzLwefDes'
)

async function verificar() {
  console.log('🔍 Verificando produtos no banco...\n')
  
  // Buscar alguns produtos
  const { data, error } = await supabase
    .from('ag_concorrentes_produtos')
    .select('*')
    .eq('concorrente_id', '5e8f3e2e-ed76-4c7a-a508-69fa53cbe6a6')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (error) {
    console.error('❌ Erro:', error)
    return
  }
  
  console.log(`📦 Últimos ${data.length} produtos salvos:\n`)
  
  data.forEach((p, i) => {
    console.log(`${i + 1}. ${p.nome}`)
    console.log(`   Preço: ${p.preco || 'NÃO INFORMADO'}`)
    console.log(`   Estoque: ${p.estoque !== null ? p.estoque : 'NÃO INFORMADO'}`)
    console.log(`   Disponibilidade: ${p.disponibilidade || 'NÃO INFORMADO'}`)
    console.log(`   URL: ${p.url}`)
    console.log(`   Categoria: ${p.categoria}`)
    console.log(`   Atualizado: ${p.ultima_coleta}`)
    console.log('')
  })
  
  // Verificar estrutura da tabela
  console.log('📋 Verificando estrutura da tabela...')
  const { data: colunas } = await supabase
    .from('ag_concorrentes_produtos')
    .select('*')
    .limit(1)
  
  if (colunas && colunas[0]) {
    console.log('\n✅ Colunas disponíveis:')
    Object.keys(colunas[0]).forEach(col => {
      console.log(`   - ${col}: ${typeof colunas[0][col]} = ${colunas[0][col]}`)
    })
  }
}

verificar()
