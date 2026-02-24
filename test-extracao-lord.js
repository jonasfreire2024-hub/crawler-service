const puppeteer = require('puppeteer')

async function testarExtracaoLord() {
  console.log('🧪 Testando extração de produtos da Lord...')
  
  let browser = null
  
  try {
    // Iniciar browser (Windows - Puppeteer normal)
    browser = await puppeteer.launch({
      headless: false, // Deixar visível para você ver
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    // LOGIN
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
    
    // Testar uma categoria específica
    const urlTeste = 'https://lordistribuidor.com.br/c/sofas/sofa-2-lugares'
    console.log(`\n📂 Testando categoria: ${urlTeste}`)
    
    await page.goto(urlTeste, { waitUntil: 'domcontentloaded' })
    await new Promise(r => setTimeout(r, 2000))
    
    // Salvar screenshot
    await page.screenshot({ path: 'lord-categoria.png', fullPage: true })
    console.log('📸 Screenshot salvo: lord-categoria.png')
    
    // Testar diferentes seletores
    console.log('\n🔍 Testando seletores...')
    
    const resultados = await page.evaluate(() => {
      const testes = {
        woocommerce1: document.querySelectorAll('.products .product a.woocommerce-LoopProduct-link').length,
        woocommerce2: document.querySelectorAll('ul.products li.product > a').length,
        woocommerce3: document.querySelectorAll('.products li.product a:first-child').length,
        woocommerce4: document.querySelectorAll('li.product > a[href*="/produto/"]').length,
        generico1: document.querySelectorAll('.product-item a').length,
        generico2: document.querySelectorAll('.product a').length,
        generico3: document.querySelectorAll('[data-product] a').length,
        todosLinks: document.querySelectorAll('a[href*="/produto/"]').length,
        todosLinksC: document.querySelectorAll('a[href*="/c/"]').length
      }
      
      // Pegar alguns exemplos de links
      const exemplos = []
      document.querySelectorAll('a').forEach(link => {
        const href = link.href
        if (href && (href.includes('/produto/') || href.includes('/c/'))) {
          exemplos.push({
            href,
            text: link.textContent?.trim().substring(0, 50),
            classes: link.className
          })
        }
      })
      
      return { testes, exemplos: exemplos.slice(0, 10) }
    })
    
    console.log('\n📊 Resultados dos seletores:')
    Object.entries(resultados.testes).forEach(([nome, count]) => {
      console.log(`  ${nome}: ${count} elementos`)
    })
    
    console.log('\n🔗 Exemplos de links encontrados:')
    resultados.exemplos.forEach((ex, i) => {
      console.log(`  ${i + 1}. ${ex.href}`)
      console.log(`     Texto: ${ex.text}`)
      console.log(`     Classes: ${ex.classes}`)
      console.log('')
    })
    
    // Extrair HTML da área de produtos
    const htmlProdutos = await page.evaluate(() => {
      const area = document.querySelector('.products, ul.products, .product-list')
      return area ? area.outerHTML.substring(0, 2000) : 'Área de produtos não encontrada'
    })
    
    console.log('\n📄 HTML da área de produtos (primeiros 2000 chars):')
    console.log(htmlProdutos)
    
    await browser.close()
    console.log('\n✅ Teste concluído!')
    
  } catch (error) {
    console.error('❌ Erro:', error)
    if (browser) await browser.close()
  }
}

testarExtracaoLord()
