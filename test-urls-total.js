const puppeteer = require('puppeteer')

async function testarURLs() {
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
  
  // Ir para home
  console.log('📂 Buscando categorias...')
  await page.goto('https://totaldistribuicaorj.com.br')
  await new Promise(r => setTimeout(r, 3000))
  
  // Extrair primeira categoria
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
  
  console.log(`✅ ${categorias.length} categorias encontradas`)
  console.log('Primeira categoria:', categorias[0])
  
  // Ir para primeira categoria
  console.log('\n📦 Extraindo produtos da primeira categoria...')
  await page.goto(categorias[0])
  await new Promise(r => setTimeout(r, 3000))
  
  // Extrair URLs de produtos
  const produtos = await page.evaluate(() => {
    const urls = []
    document.querySelectorAll('a[href*="/produto/"]').forEach(link => {
      let href = link.href
      if (href) {
        href = href.split('?')[0].split('#')[0].replace(/\/$/, '')
        
        // Pegar também o texto do link para debug
        const texto = link.textContent?.trim() || ''
        urls.push({ url: href, texto: texto.substring(0, 50) })
      }
    })
    return urls
  })
  
  // Remover duplicatas
  const produtosUnicos = []
  const urlsVistas = new Set()
  produtos.forEach(p => {
    if (!urlsVistas.has(p.url)) {
      urlsVistas.add(p.url)
      produtosUnicos.push(p)
    }
  })
  
  console.log(`\n✅ ${produtosUnicos.length} produtos únicos encontrados\n`)
  
  // Mostrar primeiros 5 produtos
  console.log('=== PRIMEIROS 5 PRODUTOS ===\n')
  produtosUnicos.slice(0, 5).forEach((p, i) => {
    console.log(`[${i + 1}] ${p.texto}`)
    console.log(`    URL: ${p.url}\n`)
  })
  
  // Testar primeiro produto
  console.log('\n🔍 Testando extração do primeiro produto...\n')
  const urlPrimeiro = produtosUnicos[0].url
  
  try {
    await page.goto(urlPrimeiro)
    await new Promise(r => setTimeout(r, 3000))
    
    const dados = await page.evaluate(() => {
      const resultado = {
        nome: '',
        precos_encontrados: [],
        html_price: ''
      }
      
      // Nome
      const h1 = document.querySelector('h1.product_title')
      if (h1) resultado.nome = h1.textContent?.trim()
      
      // HTML da área de preço
      const priceDiv = document.querySelector('.price')
      if (priceDiv) resultado.html_price = priceDiv.innerHTML
      
      // Todos os preços
      const todosPrecos = document.querySelectorAll('.price *')
      todosPrecos.forEach(el => {
        if (el.textContent && el.textContent.includes('R$')) {
          resultado.precos_encontrados.push({
            tag: el.tagName,
            class: el.className,
            text: el.textContent.trim()
          })
        }
      })
      
      return resultado
    })
    
    console.log('Nome:', dados.nome)
    console.log('\nHTML da área .price:')
    console.log(dados.html_price)
    console.log('\nPreços encontrados:')
    dados.precos_encontrados.forEach((p, i) => {
      console.log(`  [${i + 1}] <${p.tag}> class="${p.class}"`)
      console.log(`      ${p.text}`)
    })
    
  } catch (error) {
    console.log('❌ Erro ao acessar produto:', error.message)
  }
  
  await new Promise(r => setTimeout(r, 60000)) // Esperar 1 minuto
  await browser.close()
}

testarURLs()
