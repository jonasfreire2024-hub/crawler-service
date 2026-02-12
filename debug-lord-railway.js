const puppeteer = require('puppeteer')

async function debugLord() {
  console.log('🔍 DEBUG: Analisando estrutura do Lord\n')
  
  const urlBase = 'https://lordistribuidor.com.br'
  const urlLogin = 'https://lordistribuidor.com.br/minha-conta'
  
  let browser = null
  
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium-browser',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ]
    })

    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    // LOGIN
    console.log('🔐 Fazendo login...')
    await page.goto(urlLogin, { waitUntil: 'domcontentloaded', timeout: 60000 })
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
    
    await new Promise(r => setTimeout(r, 3000))
    console.log('✅ Login realizado\n')
    
    // Ir para home
    await page.goto(urlBase, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await new Promise(r => setTimeout(r, 3000))
    
    // EXTRAIR CATEGORIAS
    console.log('📂 Extraindo categorias...')
    const categorias = await page.evaluate((baseUrl) => {
      const cats = new Set()
      const seletores = ['nav a', '.menu a', 'header a', '[class*="menu"] a']
      
      seletores.forEach(seletor => {
        const links = document.querySelectorAll(seletor)
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
      })
      
      return Array.from(cats)
    }, urlBase)
    
    console.log(`✅ ${categorias.length} categorias encontradas`)
    categorias.slice(0, 5).forEach(cat => console.log(`   - ${cat}`))
    console.log()
    
    if (categorias.length === 0) {
      console.log('❌ PROBLEMA: Nenhuma categoria encontrada!')
      await browser.close()
      return
    }
    
    // TESTAR PRIMEIRA CATEGORIA
    const urlCategoria = categorias[0]
    console.log(`📦 Testando categoria: ${urlCategoria}`)
    await page.goto(urlCategoria, { waitUntil: 'domcontentloaded', timeout: 60000 })
    await new Promise(r => setTimeout(r, 3000))
    
    // DEBUG: Analisar estrutura HTML
    const estrutura = await page.evaluate(() => {
      const info = {
        totalLinks: document.querySelectorAll('a').length,
        linksComHref: Array.from(document.querySelectorAll('a')).filter(a => a.href).length,
        seletoresTestados: {}
      }
      
      // Testar vários seletores
      const seletores = [
        '.product-item a',
        '.product a',
        '.products li a',
        'ul.products li a',
        '[data-product] a',
        '.item-product a',
        '.produto a',
        'li[itemtype*="Product"] a',
        '.showcase-item a',
        '[class*="product"] a',
        '.woocommerce-LoopProduct-link'
      ]
      
      seletores.forEach(seletor => {
        try {
          const elementos = document.querySelectorAll(seletor)
          info.seletoresTestados[seletor] = {
            encontrados: elementos.length,
            exemplos: Array.from(elementos).slice(0, 3).map(el => ({
              href: el.href,
              texto: el.textContent.trim().substring(0, 50)
            }))
          }
        } catch (e) {
          info.seletoresTestados[seletor] = { erro: e.message }
        }
      })
      
      // Buscar classes que contenham "product"
      const classesProduct = new Set()
      document.querySelectorAll('[class*="product"]').forEach(el => {
        el.className.split(' ').forEach(cls => {
          if (cls.toLowerCase().includes('product')) {
            classesProduct.add(cls)
          }
        })
      })
      info.classesProduct = Array.from(classesProduct)
      
      return info
    })
    
    console.log('\n📊 ANÁLISE DA ESTRUTURA:')
    console.log(`   Total de links: ${estrutura.totalLinks}`)
    console.log(`   Links com href: ${estrutura.linksComHref}`)
    console.log(`\n   Classes com "product": ${estrutura.classesProduct.join(', ')}`)
    
    console.log('\n   Seletores testados:')
    Object.entries(estrutura.seletoresTestados).forEach(([seletor, info]) => {
      if (info.erro) {
        console.log(`      ❌ ${seletor}: ${info.erro}`)
      } else if (info.encontrados > 0) {
        console.log(`      ✅ ${seletor}: ${info.encontrados} elementos`)
        info.exemplos.forEach(ex => {
          console.log(`         - ${ex.href}`)
        })
      } else {
        console.log(`      ⚠️  ${seletor}: 0 elementos`)
      }
    })
    
    // EXTRAIR URLs DE PRODUTOS COM MÉTODO MAIS AGRESSIVO
    console.log('\n🔍 Tentando extrair URLs de produtos...')
    const urlsProdutos = await page.evaluate((urlBase) => {
      const urls = new Set()
      
      // Método 1: Todos os links da página
      const todosLinks = document.querySelectorAll('a')
      todosLinks.forEach(link => {
        const href = link.href
        if (!href || !href.startsWith('http')) return
        
        // Filtrar apenas URLs que parecem ser de produtos
        if (href.includes(urlBase) &&
            !href.includes('/c/') &&
            !href.includes('/categoria') &&
            !href.includes('/minha-conta') &&
            !href.includes('/carrinho') &&
            !href.includes('/checkout') &&
            !href.includes('/sobre') &&
            !href.includes('/contato') &&
            !href.includes('/blog') &&
            !href.includes('?pagina=') &&
            !href.includes('#') &&
            href !== window.location.href) {
          
          // Verificar se o link tem imagem ou preço próximo (indicativo de produto)
          const parent = link.closest('li, div, article')
          if (parent) {
            const temImagem = parent.querySelector('img')
            const temPreco = parent.textContent.includes('R$')
            if (temImagem || temPreco) {
              urls.add(href)
            }
          }
        }
      })
      
      return Array.from(urls)
    }, urlBase)
    
    console.log(`✅ ${urlsProdutos.length} URLs de produtos encontradas`)
    urlsProdutos.slice(0, 5).forEach(url => console.log(`   - ${url}`))
    
    if (urlsProdutos.length === 0) {
      console.log('\n❌ PROBLEMA: Nenhum produto encontrado!')
      console.log('   Possíveis causas:')
      console.log('   1. A página usa JavaScript para carregar produtos')
      console.log('   2. Os seletores não correspondem à estrutura HTML')
      console.log('   3. É necessário scroll ou interação para carregar produtos')
    } else {
      // TESTAR EXTRAÇÃO DE DADOS DO PRIMEIRO PRODUTO
      console.log(`\n📦 Testando extração de dados do primeiro produto...`)
      const urlProduto = urlsProdutos[0]
      await page.goto(urlProduto, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await new Promise(r => setTimeout(r, 3000))
      
      const dadosProduto = await page.evaluate(() => {
        const resultado = {
          nome: '',
          preco_normal: null,
          preco_pix: null,
          imagem: '',
          estruturaHTML: {}
        }
        
        // Buscar nome
        const nomeSelectors = ['h1', '.product_title', '[itemprop="name"]', '.product-title']
        nomeSelectors.forEach(sel => {
          const el = document.querySelector(sel)
          if (el && !resultado.nome) {
            resultado.nome = el.textContent.trim()
            resultado.estruturaHTML.nome = sel
          }
        })
        
        // Buscar preços
        const precoSelectors = ['.price', '.woocommerce-Price-amount', '[itemprop="price"]']
        precoSelectors.forEach(sel => {
          const els = document.querySelectorAll(sel)
          els.forEach(el => {
            const texto = el.textContent
            const match = texto.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/)
            if (match) {
              const preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
              if (!resultado.preco_normal) {
                resultado.preco_normal = preco
                resultado.estruturaHTML.preco = sel
              }
            }
          })
        })
        
        // Buscar imagem
        const imgSelectors = ['img[itemprop="image"]', '.wp-post-image', '.product-image img']
        imgSelectors.forEach(sel => {
          const el = document.querySelector(sel)
          if (el && el.src && !resultado.imagem) {
            resultado.imagem = el.src
            resultado.estruturaHTML.imagem = sel
          }
        })
        
        return resultado
      })
      
      console.log('\n✅ Dados extraídos:')
      console.log(`   Nome: ${dadosProduto.nome || 'NÃO ENCONTRADO'}`)
      console.log(`   Preço: R$ ${dadosProduto.preco_normal?.toFixed(2) || 'NÃO ENCONTRADO'}`)
      console.log(`   Imagem: ${dadosProduto.imagem ? 'OK' : 'NÃO ENCONTRADA'}`)
      console.log('\n   Seletores que funcionaram:')
      console.log(`   - Nome: ${dadosProduto.estruturaHTML.nome || 'nenhum'}`)
      console.log(`   - Preço: ${dadosProduto.estruturaHTML.preco || 'nenhum'}`)
      console.log(`   - Imagem: ${dadosProduto.estruturaHTML.imagem || 'nenhum'}`)
    }
    
    await browser.close()
    console.log('\n✅ Debug concluído!')
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message)
    if (browser) await browser.close()
  }
}

debugLord()
