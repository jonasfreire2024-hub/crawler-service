const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xvesjyjriwjfztdcoidk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZXNqeWpyaXdqZnp0ZGNvaWRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM3NDYxMiwiZXhwIjoyMDgyOTUwNjEyfQ.4LlztMbuVTSgDFkcewuyfrmvqtvmOLzZriFzLwefDes'
)

async function verificar() {
  const { data, error } = await supabase
    .from('ag_concorrentes_produtos')
    .select('*')
    .eq('url', 'https://lordistribuidor.com.br/produto/aereo-microondas-salvador-cinamomo-grafite/')
    .single()
  
  if (error) {
    console.error('❌ Erro:', error)
    return
  }
  
  console.log('📦 Produto encontrado:')
  console.log('Nome:', data.nome)
  console.log('Preço:', data.preco)
  console.log('Estoque:', data.estoque)
  console.log('Disponibilidade:', data.disponibilidade)
  console.log('Última coleta:', data.ultima_coleta)
}

verificar()
