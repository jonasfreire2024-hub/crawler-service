const puppeteer = require('puppeteer')
const { createClient } = require('@supabase/supabase-js')

const CONFIG = {
  supabaseUrl: 'https://xvesjyjriwjfztdcoidk.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZXNqeWpyaXdqZnp0ZGNvaWRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM3NDYxMiwiZXhwIjoyMDgyOTUwNjEyfQ.4LlztMbuVTSgDFkcewuyfrmvqtvmOLzZriFzLwefDes',
  tenantId: '092f9f19-6b3f-4246-a946-14dbb962f1a5',
  concorrenteId: '5e8f3e2e-ed76-4c7a-a508-69fa53cbe6a6'
}

async function testarPreco() {
  console.log('🧪 Testando extração de preço...')
  
  const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey)
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  })
  
  const page = await browser.newPage()
  
  // LOGIN
  console.log('🔐 Fazendo login...')
  await page.goto('https://lordistribuidor.com.br/minha-conta', { 
    waitUntil: 'domcontentloaded',
    timeout: 30000 
  })
  await new Promise(r => setTimeout(r, 2000))
  
  await page.type('#username', 'projetofabiano1512@gmail.com', { delay: 50 })
  await page.type('#password', '151295', { delay: 50 })
  await page.click('button[name="login"]')
  await new Promise(r => setTimeout(r, 5000))
  console.log('✅ Login realizado')
  
  // Testar com um produto
  const urlProduto = 'https://lordistribuidor.com.br/produto/aereo-microondas-salvador-cinamomo-grafite/'
  console.log('\n📦 Testando produto:', urlProduto)
  
  await page.goto(urlProduto, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await new Promise(r => setTimeout(r, 3000))
  
  const dados = await page.evaluate(() => {
    const resultado = {
      nome: '',
      preco: 0,
      preco_original: 0,
      imagem: '',
      disponibilidade: 'disponível',
      estoque: null
    }
    
    // Nome
    const h1 = document.querySelector('h1.product_title')
    if (h1) resultado.nome = h1.textContent?.trim()
    
    // Preços - WooCommerce usa del (preço original) e ins (preço promocional)
    const precoPromocional = document.querySelector('.price ins .woocommerce-Price-amount bdi')
    const precoOriginal = document.querySelector('.price del .woocommerce-Price-amount bdi')
    
    if (precoPromocional) {
      const match = precoPromocional.textContent?.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,\d{2})?)/)
      if (match) {
        resultado.preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
      }
    }
    
    if (precoOriginal) {
      const match = precoOriginal.textContent?.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,\d{2})?)/)
      if (match) {
        resultado.preco_original = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
      }
    }
    
    // Se não tem preço promocional, usar o preço normal
    if (!resultado.preco && precoOriginal) {
      resultado.preco = resultado.preco_original
      resultado.preco_original = 0
    }
    
    // Se ainda não tem preço, tentar pegar qualquer preço
    if (!resultado.preco) {
      const qualquerPreco = document.querySelector('.price .woocommerce-Price-amount bdi')
      if (qualquerPreco) {
        const match = qualquerPreco.textContent?.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,\d{2})?)/)
        if (match) {
          resultado.preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
        }
      }
    }
    
    // Imagem
    const img = document.querySelector('.wp-post-image, .woocommerce-product-gallery__image img')
    if (img) resultado.imagem = img.src
    
    // Estoque - Buscar no HTML completo
    const htmlCompleto = document.documentElement.outerHTML
    const matchEstoque = htmlCompleto.match(/Em estoque[:\s]*(\d+)/i)
    if (matchEstoque) {
      resultado.estoque = parseInt(matchEstoque[1])
      resultado.disponibilidade = 'disponível'
    }
    
    // Verificar disponibilidade no schema.org
    if (htmlCompleto.includes('OutOfStock')) {
      resultado.disponibilidade = 'indisponível'
      resultado.estoque = 0
    } else if (htmlCompleto.includes('InStock')) {
      resultado.disponibilidade = 'disponível'
      if (resultado.estoque === null) {
        resultado.estoque = 1 // Assume pelo menos 1 se está em estoque
      }
    }
    
    return resultado
  })
  
  console.log('\n📊 DADOS EXTRAÍDOS:')
  console.log('Nome:', dados.nome)
  console.log('Preço:', dados.preco)
  console.log('Preço Original:', dados.preco_original)
  console.log('Estoque:', dados.estoque)
  console.log('Disponibilidade:', dados.disponibilidade)
  console.log('Imagem:', dados.imagem ? 'Sim' : 'Não')
  
  // Salvar no banco
  if (dados.nome && dados.preco > 0) {
    console.log('\n💾 Salvando no Supabase...')
    const { error } = await supabase
      .from('ag_concorrentes_produtos')
      .upsert([{
        tenant_id: CONFIG.tenantId,
        concorrente_id: CONFIG.concorrenteId,
        nome: dados.nome,
        preco: dados.preco, // Usar preço promocional (188)
        url: urlProduto,
        imagem_url: dados.imagem,
        categoria: '/teste',
        disponibilidade: dados.disponibilidade,
        estoque: dados.estoque,
        ativo: true,
        ultima_coleta: new Date().toISOString()
      }], { onConflict: 'url' })
    
    if (error) {
      console.error('❌ Erro ao salvar:', error)
    } else {
      console.log('✅ Salvo com sucesso!')
    }
  } else {
    console.log('\n❌ Dados incompletos, não salvou')
  }
  
  await new Promise(r => setTimeout(r, 5000))
  await browser.close()
}

testarPreco().catch(console.error)
