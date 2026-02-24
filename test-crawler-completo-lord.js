const puppeteer = require('puppeteer')
const { createClient } = require('@supabase/supabase-js')

// CONFIGURAÇÃO - Preenchido automaticamente do .env
const CONFIG = {
  supabaseUrl: 'https://xvesjyjriwjfztdcoidk.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh2ZXNqeWpyaXdqZnp0ZGNvaWRrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzM3NDYxMiwiZXhwIjoyMDgyOTUwNjEyfQ.4LlztMbuVTSgDFkcewuyfrmvqtvmOLzZriFzLwefDes',
  tenantId: '092f9f19-6b3f-4246-a946-14dbb962f1a5', // Alpoim RJ
  concorrenteId: '5e8f3e2e-ed76-4c7a-a508-69fa53cbe6a6', // Lord Distribuidora
  urlBase: 'https://lordistribuidor.com.br'
}

async function crawlerCompletoLord() {
  console.log('🚀 Iniciando crawler completo da Lord...')
  
  const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey)
  let browser = null
  
  try {
    browser = await puppeteer.launch({
      headless: false, // Deixar visível para você acompanhar
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
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
    
    // MAPEAR CATEGORIAS
    console.log('\n📂 Mapeando categorias...')
    await page.goto(CONFIG.urlBase, { waitUntil: 'domcontentloaded' })
    await new Promise(r => setTimeout(r, 2000))
    
    const categorias = await page.evaluate((baseUrl) => {
      const cats = new Set()
      const links = document.querySelectorAll('nav a, .menu a, header a')
      
      links.forEach(link => {
        let href = link.href
        if (!href || !href.startsWith(baseUrl)) return
        if (href.includes('#') || href.includes('login') || href.includes('conta')) return
        if (href.includes('carrinho') || href.includes('checkout')) return
        
        href = href.split('?')[0].replace(/\/$/, '')
        if (href !== baseUrl && href.length > baseUrl.length + 2) {
          cats.add(href)
        }
      })
      
      return Array.from(cats)
    }, CONFIG.urlBase)
    
    console.log(`📋 ${categorias.length} categorias encontradas`)
    
    // EXTRAIR PRODUTOS
    const produtosMap = new Map()
    let totalSalvos = 0
    
    // Buscar produtos já existentes
    const { data: produtosExistentes } = await supabase
      .from('ag_concorrentes_produtos')
      .select('url')
      .eq('concorrente_id', CONFIG.concorrenteId)
    
    const urlsJaSalvas = new Set(produtosExistentes?.map(p => p.url) || [])
    console.log(`📋 ${urlsJaSalvas.size} produtos já existentes no banco\n`)
    
    // Processar todas as categorias
    const categoriasParaProcessar = categorias
    console.log(`🔄 Processando ${categoriasParaProcessar.length} categorias\n`)
    
    for (let i = 0; i < categoriasParaProcessar.length; i++) {
      const urlCategoria = categoriasParaProcessar[i]
      const nomeCategoria = urlCategoria.replace(CONFIG.urlBase, '') || '/'
      
      console.log(`[${i + 1}/${categoriasParaProcessar.length}] 📂 ${nomeCategoria}`)
      
      try {
        await page.goto(urlCategoria, { waitUntil: 'networkidle2', timeout: 30000 })
        await new Promise(r => setTimeout(r, 2000))
        
        // Extrair URLs de produtos
        const urlsProdutos = await page.evaluate(() => {
          const urls = new Set()
          document.querySelectorAll('a[href*="/produto/"]').forEach(link => {
            let href = link.href
            if (href) {
              href = href.split('?')[0].split('#')[0].replace(/\/$/, '')
              urls.add(href)
            }
          })
          return Array.from(urls)
        })
        
        console.log(`   Encontrados ${urlsProdutos.length} produtos`)
        
        let novos = 0
        for (const urlProd of urlsProdutos) {
          if (urlsJaSalvas.has(urlProd) || produtosMap.has(urlProd)) continue
          
          try {
            await page.goto(urlProd, { waitUntil: 'domcontentloaded', timeout: 20000 })
            await new Promise(r => setTimeout(r, 500))
            
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
            
            if (dados.nome && dados.preco > 0) {
              produtosMap.set(urlProd, {
                ...dados,
                url: urlProd,
                categoria: nomeCategoria
              })
              urlsJaSalvas.add(urlProd)
              novos++
            }
          } catch (err) {
            // Ignorar erros de produtos individuais
          }
        }
        
        console.log(`   ✅ ${novos} novos produtos`)
        
        // Salvar produtos da categoria
        if (produtosMap.size > totalSalvos) {
          const produtosParaSalvar = Array.from(produtosMap.values()).slice(totalSalvos)
          
          const { error } = await supabase
            .from('ag_concorrentes_produtos')
            .upsert(
              produtosParaSalvar.map(p => ({
                tenant_id: CONFIG.tenantId,
                concorrente_id: CONFIG.concorrenteId,
                nome: p.nome,
                preco: p.preco, // Usar preço promocional (ou normal se não tiver promoção)
                url: p.url,
                imagem_url: p.imagem,
                categoria: p.categoria,
                disponibilidade: p.disponibilidade,
                estoque: p.estoque,
                ativo: true,
                ultima_coleta: new Date().toISOString()
              })),
              { onConflict: 'url' }
            )
          
          if (!error) {
            totalSalvos = produtosMap.size
            console.log(`   💾 ${totalSalvos} produtos salvos no Supabase`)
          } else {
            console.error(`   ❌ Erro ao salvar: ${error.message}`)
          }
        }
        
      } catch (error) {
        console.error(`   ❌ Erro na categoria: ${error.message}`)
      }
    }
    
    await browser.close()
    
    console.log(`\n✅ Crawler concluído!`)
    console.log(`📦 Total de produtos: ${totalSalvos}`)
    console.log(`📂 Categorias processadas: ${categoriasParaProcessar.length}`)
    
  } catch (error) {
    console.error('❌ Erro:', error)
    if (browser) await browser.close()
  }
}

// Verificar se configuração foi preenchida
if (CONFIG.supabaseUrl.includes('seu-projeto')) {
  console.error('❌ ERRO: Configure as variáveis no início do arquivo!')
  console.log('\nEdite o arquivo e preencha:')
  console.log('- supabaseUrl')
  console.log('- supabaseKey')
  console.log('- tenantId')
  console.log('- concorrenteId')
  process.exit(1)
}

console.log('✅ Configuração carregada:')
console.log(`   Tenant: ${CONFIG.tenantId}`)
console.log(`   Concorrente: ${CONFIG.concorrenteId}`)
console.log(`   URL Base: ${CONFIG.urlBase}\n`)

crawlerCompletoLord()
