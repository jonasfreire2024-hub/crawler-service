const puppeteer = require('puppeteer')

async function simularEndpoint() {
  console.log('🧪 Simulando comportamento do endpoint...')
  
  let browser = null
  
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    })

    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    // LOGIN - EXATAMENTE COMO NO ENDPOINT
    console.log('🔐 Fazendo login...')
    await page.goto('https://lordistribuidor.com.br/minha-conta', { waitUntil: 'domcontentloaded' })
    await new Promise(r => setTimeout(r, 3000))
    
    await page.type('#username', 'projetofabiano1512@gmail.com')
    await page.type('#password', '151295')
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'))
      const loginButton = buttons.find(btn => 
        btn.textContent?.toLowerCase().includes('entrar') ||
        btn.value?.toLowerCase().includes('entrar')
      )
      if (loginButton) loginButton.click()
    })
    
    await new Promise(r => setTimeout(r, 5000))
    console.log('✅ Login realizado')

    // MAPEAR CATEGORIAS - EXATAMENTE COMO NO ENDPOINT
    console.log('\n📂 Mapeando categorias...')
    await page.goto('https://lordistribuidor.com.br', { waitUntil: 'domcontentloaded' })
    await new Promise(r => setTimeout(r, 3000))

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
    }, 'https://lordistribuidor.com.br')

    console.log(`📋 ${categorias.length} categorias encontradas`)

    // TESTAR PRIMEIRA CATEGORIA - EXATAMENTE COMO NO ENDPOINT
    const urlCategoria = categorias[0]
    const nomeCategoria = urlCategoria.replace('https://lordistribuidor.com.br', '') || '/'
    
    console.log(`\n[1/${categorias.length}] 📂 ${nomeCategoria}`)

    await page.goto(urlCategoria, { waitUntil: 'networkidle2', timeout: 30000 })
    await new Promise(r => setTimeout(r, 2000))
    
    // Extrair URLs de produtos - EXATAMENTE COMO NO ENDPOINT
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
    
    if (urlsProdutos.length > 0) {
      console.log('\n✅ SUCESSO! O código do endpoint funciona localmente!')
      console.log('   Primeiros 5 produtos:')
      urlsProdutos.slice(0, 5).forEach(url => console.log(`   - ${url}`))
    } else {
      console.log('\n❌ FALHOU! Mesmo código não encontrou produtos')
      console.log('   Isso indica um problema no ambiente do Nuxt')
    }

    await browser.close()

  } catch (error) {
    console.error('❌ Erro:', error)
    if (browser) await browser.close()
  }
}

simularEndpoint()
