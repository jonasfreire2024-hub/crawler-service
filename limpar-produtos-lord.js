const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xvesjyjriwjfztdcoidk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZXNqeWpyaXdqZnp0ZGNvaWRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM3NDYxMiwiZXhwIjoyMDgyOTUwNjEyfQ.4LlztMbuVTSgDFkcewuyfrmvqtvmOLzZriFzLwefDes'
)

async function limpar() {
  console.log('🗑️  Limpando produtos da Lord...')
  
  const { data, error } = await supabase
    .from('ag_concorrentes_produtos')
    .delete()
    .eq('concorrente_id', '5e8f3e2e-ed76-4c7a-a508-69fa53cbe6a6')
  
  if (error) {
    console.error('❌ Erro:', error)
  } else {
    console.log('✅ Produtos limpos! Agora rode o crawler novamente.')
  }
}

limpar()
