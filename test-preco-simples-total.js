const puppeteer = require('puppeteer')

async function testarPrecoSimples() {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  
  // Login
  console.log('🔐 Fazendo login...')
  await page.goto('https://totaldistribuicaorj.com.br/Login')
  await new Promise(r => setTimeout(r, 3000))
  
  await page.type('#forminator-field-text-1_6998e35da96bd', '45281091000119')
  await page.type('#forminator-field-password-1_6998e35da96bd', '45281')
  
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    const loginButton = buttons.find(btn => 
      btn.textContent?.toLowerCase().includes('entrar') ||
      btn.textContent?.toLowerCase().includes('login')
    )
    if (loginButton) loginButton.click()
  })
  
  await new Promise(r => setTimeout(r, 5000))
  console.log('✅ Login OK\n')
  
  // Ir para home e pegar primeira categoria
  await page.goto('https://totaldistribuicaorj.com.br')
  await new Promise(r => setTimeout(r, 3000))
  
  const categorias = await page.evaluate(() => {
    const cats = new Set()
    const links = document.querySelectorAll('nav a, .menu a, header a')
    
    links.forEach(link => {
      let href = link.href
      if (!href || !href.startsWith('https://totaldistribuicaorj.com.br')) return
      if (href.includes('#') || href.includes('login') || href.includes('conta')) return
      if (href.includes('carrinho') || href.includes('checkout')) return
      
      href = href.split('?')[0].replace(/\/$/, '')
      if (href !== 'https://totaldistribuicaorj.com.br' && href.length > 'https://totaldistribuicaorj.com.br'.length + 2) {
        cats.add(href)
      }
    })
    
    return Array.from(cats)
  })
  
  console.log(`📂 Primeira categoria: ${categorias[0]}\n`)
  
  // Ir para categoria
  await page.goto(categorias[0])
  await new Promise(r => setTimeout(r, 3000))
  
  // Pegar primeiro produto
  const produtos = await page.evaluate(() => {
    const urls = []
    document.querySelectorAll('a[href*="/produto/"]').forEach(link => {
      let href = link.href
      if (href) {
        href = href.split('?')[0].split('#')[0].replace(/\/$/, '')
        urls.push(href)
      }
    })
    return [...new Set(urls)]
  })
  
  console.log(`📦 Primeiro produto: ${produtos[0]}\n`)
  
  // Testar extração com nova lógica
  await page.goto(produtos[0])
  await new Promise(r => setTimeout(r, 3000))
  
  const dados = await page.evaluate(() => {
    const resultado = {
      nome: '',
      preco: 0,
      preco_original: 0,
      precos_encontrados: []
    }
    
    // Nome
    const h1 = document.querySelector('h1.product_title')
    if (h1) resultado.nome = h1.textContent?.trim()
    
    // NOVA LÓGICA: Buscar preços "à vista"
    const precosAVista = document.querySelectorAll('.wc-simulador-parcelas-offer .woocommerce-Price-amount')
    const precos = []
    
    precosAVista.forEach(el => {
      const match = el.textContent?.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,\d{2})?)/)
      if (match) {
        const preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
        if (preco > 0) {
          precos.push(preco)
          resultado.precos_encontrados.push(`R$ ${preco.toFixed(2)}`)
        }
      }
    })
    
    if (precos.length > 0) {
      resultado.preco = Math.min(...precos)
      if (precos.length > 1) {
        resultado.preco_original = Math.max(...precos)
      } else {
        resultado.preco_original = resultado.preco
      }
    }
    
    return resultado
  })
  
  console.log('=== RESULTADO DA EXTRAÇÃO ===\n')
  console.log('Nome:', dados.nome)
  console.log('\nPreços encontrados "à vista":')
  dados.precos_encontrados.forEach((p, i) => {
    console.log(`  [${i + 1}] ${p}`)
  })
  console.log('\n✅ Preço final (menor):', `R$ ${dados.preco.toFixed(2)}`)
  console.log('📊 Preço original (maior):', `R$ ${dados.preco_original.toFixed(2)}`)
  
  await new Promise(r => setTimeout(r, 10000))
  await browser.close()
}

testarPrecoSimples()
