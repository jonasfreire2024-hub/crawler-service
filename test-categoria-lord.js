const puppeteer = require('puppeteer')

async function testarCategoria() {
  console.log('🔍 Testando detecção de produtos em categoria do Lord\n')
  
  const urlLogin = 'https://lordistribuidor.com.br/minha-conta'
  const urlCategoria = 'https://lordistribuidor.com.br/c/sofas/sofa-2-lugares'
  const urlBase = 'https://lordistribuidor.com.br'
  
  let browser = null
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    })

    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    // LOGIN
    console.log('🔐 Fazendo login...')
    await page.goto(urlLogin, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await new Promise(r => setTimeout(r, 5000))
    
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
    console.log('✅ Login realizado\n')
    
    // IR PARA CATEGORIA
    console.log(`📂 Acessando categoria: ${urlCategoria}`)
    await page.goto(urlCategoria, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await new Promise(r => setTimeout(r, 5000))
    
    // ANALISAR ESTRUTURA
    const analise = await page.evaluate((urlBase) => {
      const info = {
        totalLinks: 0,
        linksComImagem: 0,
        linksComPreco: 0,
        urlsEncontradas: [],
        urlsFiltradas: []
      }
      
      const todosLinks = document.querySelectorAll('a')
      info.totalLinks = todosLinks.length
      
      todosLinks.forEach(link => {
        let href = link.href
        if (!href || !href.startsWith('http')) return
        
        // Limpar URL
        const hrefLimpo = href.split('?')[0].split('#')[0].replace(/\/$/, '')
        
        // Verificar contexto
        const parent = link.closest('li, div, article')
        if (parent) {
          const temImagem = parent.querySelector('img')
          const temPreco = parent.textContent.includes('R$')
          
          if (temImagem) info.linksComImagem++
          if (temPreco) info.linksComPreco++
          
          if (temImagem || temPreco) {
            // Verificar filtros
            if (hrefLimpo === urlBase ||
                hrefLimpo === window.location.href ||
                hrefLimpo.includes('/c/') ||
                hrefLimpo.includes('/categoria') ||
                hrefLimpo.includes('/minha-conta') ||
                hrefLimpo.includes('/carrinho') ||
                hrefLimpo.includes('/checkout') ||
                hrefLimpo.includes('promocoes')) {
              info.urlsFiltradas.push({
                url: hrefLimpo,
                motivo: hrefLimpo === urlBase ? 'URL base' : 
                        hrefLimpo.includes('/c/') ? 'Categoria' :
                        hrefLimpo.includes('promocoes') ? 'Promoções' : 'Outro'
              })
            } else {
              info.urlsEncontradas.push(hrefLimpo)
            }
          }
        }
      })
      
      return info
    }, urlBase)
    
    console.log('\n📊 ANÁLISE:')
    console.log(`   Total de links: ${analise.totalLinks}`)
    console.log(`   Links com imagem: ${analise.linksComImagem}`)
    console.log(`   Links com preço: ${analise.linksComPreco}`)
    console.log(`\n   URLs de produtos encontradas: ${analise.urlsEncontradas.length}`)
    if (analise.urlsEncontradas.length > 0) {
      analise.urlsEncontradas.slice(0, 5).forEach(url => {
        console.log(`     ✅ ${url}`)
      })
    }
    
    console.log(`\n   URLs filtradas: ${analise.urlsFiltradas.length}`)
    if (analise.urlsFiltradas.length > 0) {
      analise.urlsFiltradas.slice(0, 5).forEach(item => {
        console.log(`     ❌ ${item.url} (${item.motivo})`)
      })
    }
    
    // TESTAR SELETORES CSS
    console.log('\n🔍 Testando seletores CSS:')
    const seletores = await page.evaluate(() => {
      const testes = {}
      const seletoresProduto = [
        '.product-item a',
        '.product a',
        '.products li a',
        'ul.products li a',
        '.woocommerce-LoopProduct-link',
        'li.product a'
      ]
      
      seletoresProduto.forEach(seletor => {
        try {
          const elementos = document.querySelectorAll(seletor)
          testes[seletor] = {
            encontrados: elementos.length,
            exemplos: Array.from(elementos).slice(0, 2).map(el => el.href)
          }
        } catch (e) {
          testes[seletor] = { erro: e.message }
        }
      })
      
      return testes
    })
    
    Object.entries(seletores).forEach(([seletor, info]) => {
      if (info.erro) {
        console.log(`   ❌ ${seletor}: ${info.erro}`)
      } else if (info.encontrados > 0) {
        console.log(`   ✅ ${seletor}: ${info.encontrados} elementos`)
        info.exemplos.forEach(url => console.log(`      - ${url}`))
      } else {
        console.log(`   ⚠️  ${seletor}: 0 elementos`)
      }
    })
    
    await browser.close()
    console.log('\n✅ Teste concluído!')
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message)
    if (browser) await browser.close()
  }
}

testarCategoria()
