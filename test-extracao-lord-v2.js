const puppeteer = require('puppeteer')

async function testarExtracaoLord() {
  console.log('🧪 Testando extração de produtos da Lord V2...')
  
  let browser = null
  
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    // Pular login - ir direto para categoria
    console.log('📂 Indo direto para categoria (sem login)...')
    
    const urlCategoria = 'https://lordistribuidor.com.br/c/sofas/sofa-2-lugares/'
    console.log(`\n📂 Testando categoria: ${urlCategoria}`)
    
    await page.goto(urlCategoria, { waitUntil: 'networkidle2', timeout: 60000 })
    await new Promise(r => setTimeout(r, 3000)) // Esperar mais tempo para AJAX
    
    // Scroll para carregar lazy loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })
    await new Promise(r => setTimeout(r, 2000))
    
    // Procurar por produtos de várias formas
    const analise = await page.evaluate(() => {
      const resultado = {
        linksProduto: [],
        linksImagem: [],
        elementosWoo: [],
        todosLinks: []
      }
      
      // 1. Procurar links com /produto/
      document.querySelectorAll('a[href*="/produto/"]').forEach(link => {
        resultado.linksProduto.push({
          href: link.href,
          text: link.textContent?.trim().substring(0, 50),
          parent: link.parentElement?.className
        })
      })
      
      // 2. Procurar imagens de produtos
      document.querySelectorAll('img').forEach(img => {
        if (img.src && !img.src.includes('logo') && !img.src.includes('icon')) {
          const link = img.closest('a')
          if (link) {
            resultado.linksImagem.push({
              href: link.href,
              src: img.src,
              alt: img.alt
            })
          }
        }
      })
      
      // 3. Procurar elementos WooCommerce
      const wooElements = document.querySelectorAll('.product, [class*="product"]')
      wooElements.forEach(el => {
        const link = el.querySelector('a')
        if (link) {
          resultado.elementosWoo.push({
            href: link.href,
            classes: el.className,
            html: el.outerHTML.substring(0, 200)
          })
        }
      })
      
      // 4. Todos os links da página
      document.querySelectorAll('a').forEach(link => {
        if (link.href && link.href.startsWith('http')) {
          resultado.todosLinks.push({
            href: link.href,
            text: link.textContent?.trim().substring(0, 30)
          })
        }
      })
      
      return resultado
    })
    
    console.log('\n📊 Análise da categoria:')
    console.log(`  Links com /produto/: ${analise.linksProduto.length}`)
    console.log(`  Links com imagens: ${analise.linksImagem.length}`)
    console.log(`  Elementos WooCommerce: ${analise.elementosWoo.length}`)
    console.log(`  Total de links: ${analise.todosLinks.length}`)
    
    if (analise.linksProduto.length > 0) {
      console.log('\n🔗 Primeiros 5 links de produtos:')
      analise.linksProduto.slice(0, 5).forEach((link, i) => {
        console.log(`  ${i + 1}. ${link.href}`)
        console.log(`     Texto: ${link.text}`)
        console.log(`     Parent: ${link.parent}`)
      })
    }
    
    if (analise.linksImagem.length > 0) {
      console.log('\n🖼️ Primeiros 5 links com imagens:')
      analise.linksImagem.slice(0, 5).forEach((link, i) => {
        console.log(`  ${i + 1}. ${link.href}`)
        console.log(`     Alt: ${link.alt}`)
      })
    }
    
    if (analise.elementosWoo.length > 0) {
      console.log('\n🛒 Primeiros 3 elementos WooCommerce:')
      analise.elementosWoo.slice(0, 3).forEach((el, i) => {
        console.log(`  ${i + 1}. ${el.href}`)
        console.log(`     Classes: ${el.classes}`)
        console.log(`     HTML: ${el.html}...`)
      })
    }
    
    // Screenshot
    await page.screenshot({ path: 'lord-categoria-v2.png', fullPage: true })
    console.log('\n📸 Screenshot salvo: lord-categoria-v2.png')
    
    console.log('\n✅ Teste concluído! Verifique o screenshot.')
    
    // Manter aberto para você ver
    console.log('\n⏸️ Navegador ficará aberto. Pressione Ctrl+C para fechar.')
    await new Promise(() => {}) // Manter aberto
    
  } catch (error) {
    console.error('❌ Erro:', error)
    if (browser) await browser.close()
  }
}

testarExtracaoLord()
