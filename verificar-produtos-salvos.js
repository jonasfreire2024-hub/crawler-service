const { createClient } = require('@supabase/supabase-js')

const CONFIG = {
  supabaseUrl: 'https://xvesjyjriwjfztdcoidk.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZXNqeWpyaXdqZnp0ZGNvaWRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM3NDYxMiwiZXhwIjoyMDgyOTUwNjEyfQ.4LlztMbuVTSgDFkcewuyfrmvqtvmOLzZriFzLwefDes',
  concorrenteId: '5e8f3e2e-ed76-4c7a-a508-69fa53cbe6a6'
}

async function verificarProdutos() {
  const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey)
  
  console.log('🔍 Verificando produtos salvos...\n')
  
  // Buscar produtos atualizados HOJE
  const hoje = new Date().toISOString().split('T')[0]
  
  const { data: produtos, error } = await supabase
    .from('ag_concorrentes_produtos')
    .select('*')
    .eq('concorrente_id', CONFIG.concorrenteId)
    .gte('ultima_coleta', hoje)
    .order('ultima_coleta', { ascending: false })
    .limit(10)
  
  if (error) {
    console.error('❌ Erro:', error)
    return
  }
  
  console.log(`📦 Total de produtos: ${produtos.length}\n`)
  
  produtos.forEach((p, i) => {
    console.log(`\n[${i + 1}] ${p.nome}`)
    console.log(`   URL: ${p.url}`)
    console.log(`   Preço: R$ ${p.preco || 'NÃO INFORMADO'}`)
    console.log(`   Estoque: ${p.estoque !== null ? p.estoque : 'NÃO INFORMADO'}`)
    console.log(`   Disponibilidade: ${p.disponibilidade}`)
    console.log(`   Categoria: ${p.categoria}`)
    console.log(`   Atualizado: ${p.ultima_coleta}`)
  })
}

verificarProdutos()
