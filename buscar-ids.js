const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  'https://xvesjyjriwjfztdcoidk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZXNqeWpyaXdqZnp0ZGNvaWRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM3NDYxMiwiZXhwIjoyMDgyOTUwNjEyfQ.4LlztMbuVTSgDFkcewuyfrmvqtvmOLzZriFzLwefDes'
)

async function buscarIds() {
  const { data: tenants, error: errorT } = await supabase.from('ag_tenants').select('id, nome')
  const { data: concorrentes, error: errorC } = await supabase.from('ag_concorrentes').select('*')
  
  console.log('TENANTS:', JSON.stringify(tenants, null, 2))
  console.log('ERROR TENANTS:', errorT)
  console.log('\nCONCORRENTES:', JSON.stringify(concorrentes, null, 2))
  console.log('ERROR CONCORRENTES:', errorC)
}

buscarIds()
