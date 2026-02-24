const puppeteer = require('puppeteer')

/**
 * TESTE ESPECÍFICO - TOTAL DISTRIBUIÇÃO
 * Baseado na estrutura da Lord (WooCommerce)
 */

async function testarTotal() {
  console.log('🧪 TESTE: Total Distribuição\n')
  
  const urlBase = 'https://totaldistribuicaorj.com.br'
  const urlLogin = 'https://totaldistribuicaorj.com.br/Login'
  const email = '45281091000119'
  const senha = '45281'
  
  let browser = null
  
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    // FAZER LOGIN
    console.log('🔐 Fazendo login...')
    await page.goto(urlLogin, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise(r => setTimeout(r, 3000))
    
    // Preencher formulário
    await page.type('#forminator-field-text-1_6998e35da96bd', email)
    await page.type('#forminator-field-password-1_6998e35da96bd', senha)
    
    // Clicar no botão de login
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const loginButton = buttons.find(btn => 
        btn.textContent?.toLowerCase().includes('entrar') ||
        btn.textContent?.toLowerCase().includes('login')
      )
      if (loginButton) loginButton.click()
    })
    
    await new Promise(r => setTimeout(r, 5000))
    console.log('✅ Login realizado\n')
    
    // IR PARA CATEGORIA DE PROMOÇÕES
    const urlCategoria = 'https://totaldistribuicaorj.com.br/categoria-produto/promocoes/'
    console.log(`📂 Acessando categoria: ${urlCategoria}`)
    
    await page.goto(urlCategoria, { waitUntil: 'networkidle2', timeout: 60000 })
    await new Promise(r => setTimeout(r, 3000))
    
    // Scroll para carregar lazy loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })
    await new Promise(r => setTimeout(r, 2000))
    
    // Screenshot da categoria
    await page.screenshot({ path: 'total-categoria.png', fullPage: true })
    console.log('📸 Screenshot: total-categoria.png\n')
    
    // EXTRAIR URLS DE PRODUTOS
    console.log('🔍 Extraindo URLs de produtos...')
    const urlsProdutos = await page.evaluate((urlBase) => {
      const urls = new Set()
      
      // Seletores WooCommerce
      const seletoresProduto = [
        '.product-small a',
        '.product a',
        'li.product a',
        'ul.products li a',
        '.woocommerce-LoopProduct-link',
        '[class*="product"] a[href*="/produto/"]',
        'a[href*="/produto/"]'
      ]
      
      seletoresProduto.forEach(seletor => {
        try {
          const links = document.querySelectorAll(seletor)
          console.log(`   Seletor "${seletor}": ${links.length} links`)
          
          links.forEach(link => {
            let url = link.href
            if (url && 
                url.startsWith(urlBase) &&
                url.includes('/produto/') &&
                !url.includes('/categoria') &&
                !url.includes('/c/') &&
                !url.includes('?') &&
                url !== window.location.href) {
              console.log(`      ✅ ${url}`)
              urls.add(url)
            }
          })
        } catch (e) {
          console.error(`   Erro no seletor "${seletor}":`, e.message)
        }
      })
      
      return Array.from(urls)
    }, urlBase)
    
    console.log(`\n✅ ${urlsProdutos.length} produtos encontrados\n`)
    
    if (urlsProdutos.length === 0) {
      console.log('❌ Nenhum produto encontrado!')
      console.log('Verifique o screenshot: total-categoria.png\n')
      await browser.close()
      return
    }
    
    // Mostrar primeiros 10 produtos
    console.log('📋 Primeiros 10 produtos:')
    urlsProdutos.slice(0, 10).forEach((url, i) => {
      console.log(`   ${i + 1}. ${url}`)
    })
    
    // TESTAR EXTRAÇÃO DO PRIMEIRO PRODUTO
    const urlProduto = urlsProdutos[0]
    console.log(`\n📦 Testando produto: ${urlProduto}`)
    
    await page.goto(urlProduto, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await new Promise(r => setTimeout(r, 3000))
    
    // Screenshot do produto
    await page.screenshot({ path: 'total-produto.png', fullPage: true })
    console.log('📸 Screenshot: total-produto.png\n')
    
    // EXTRAIR DADOS DO PRODUTO
    const dados = await page.evaluate(() => {
      const resultado = {
        nome: '',
        marca: '',
        sku: '',
        preco_normal: null,
        preco_pix: null,
        imagem: '',
        estoque: null,
        disponibilidade: 'disponível'
      }

      // Área do produto (WooCommerce)
      const areaProduto = document.querySelector('.summary, .entry-summary, .product') || document.body

      // NOME
      const nomeEl = areaProduto.querySelector('h1.product_title, h1, .product-title')
      if (nomeEl) resultado.nome = nomeEl.textContent.trim()

      // SKU
      const skuEl = areaProduto.querySelector('.sku, [itemprop="sku"]')
      if (skuEl) resultado.sku = skuEl.textContent.trim()

      // PREÇOS
      const precoEls = areaProduto.querySelectorAll('.price .amount, .price ins .amount, .woocommerce-Price-amount, p.price, .price')
      precoEls.forEach(el => {
        const texto = el.textContent
        const match = texto.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/)
        if (match) {
          const preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
          if (!resultado.preco_normal) {
            resultado.preco_normal = preco
          } else if (preco < resultado.preco_normal) {
            resultado.preco_pix = preco
          }
        }
      })

      if (resultado.preco_normal && !resultado.preco_pix) {
        resultado.preco_pix = resultado.preco_normal
      }

      // IMAGEM
      const imgSelectors = [
        '.woocommerce-product-gallery__image img',
        '.woocommerce-product-gallery img',
        '.wp-post-image',
        'img[itemprop="image"]',
        '.product-image img',
        '.product-gallery img'
      ]
      
      for (const seletor of imgSelectors) {
        const img = document.querySelector(seletor)
        if (img && img.src && img.src.startsWith('http') && !img.src.includes('data:image')) {
          resultado.imagem = img.src
          break
        }
      }
      
      // ESTOQUE
      const textoCompleto = document.body.textContent.toLowerCase()
      
      const estoqueMatch = textoCompleto.match(/(\d+)\s*em\s*estoque/i) || 
                          textoCompleto.match(/estoque:\s*(\d+)/i)
      
      if (estoqueMatch) {
        resultado.estoque = parseInt(estoqueMatch[1])
      }
      
      if (textoCompleto.includes('fora de estoque') || 
          textoCompleto.includes('indisponível') ||
          textoCompleto.includes('esgotado')) {
        resultado.disponibilidade = 'indisponível'
        resultado.estoque = 0
      }

      return resultado
    })
    
    console.log('📊 Dados extraídos:')
    console.log(`   Nome: ${dados.nome || '❌'}`)
    console.log(`   SKU: ${dados.sku || '❌'}`)
    console.log(`   Preço Normal: ${dados.preco_normal ? `R$ ${dados.preco_normal.toFixed(2)}` : '❌'}`)
    console.log(`   Preço PIX: ${dados.preco_pix ? `R$ ${dados.preco_pix.toFixed(2)}` : '❌'}`)
    console.log(`   Imagem: ${dados.imagem ? '✅' : '❌'}`)
    console.log(`   Estoque: ${dados.estoque !== null ? dados.estoque : '❌'}`)
    console.log(`   Disponibilidade: ${dados.disponibilidade}`)
    
    // TESTAR MAIS 2 PRODUTOS
    console.log('\n📦 Testando mais 2 produtos...\n')
    
    const produtosExtraidos = []
    if (dados.nome && dados.preco_normal) {
      produtosExtraidos.push({ url: urlProduto, ...dados })
    }
    
    for (let i = 1; i < Math.min(3, urlsProdutos.length); i++) {
      const url = urlsProdutos[i]
      console.log(`[${i + 1}/3] ${url}`)
      
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await new Promise(r => setTimeout(r, 2000))
        
        const dadosProduto = await page.evaluate(() => {
          const resultado = {
            nome: '',
            sku: '',
            preco_normal: null,
            preco_pix: null,
            imagem: '',
            estoque: null,
            disponibilidade: 'disponível'
          }

          const areaProduto = document.querySelector('.summary, .entry-summary, .product') || document.body
          const nomeEl = areaProduto.querySelector('h1.product_title, h1')
          if (nomeEl) resultado.nome = nomeEl.textContent.trim()
          const skuEl = areaProduto.querySelector('.sku, [itemprop="sku"]')
          if (skuEl) resultado.sku = skuEl.textContent.trim()
          const precoEls = areaProduto.querySelectorAll('.price .amount, .price ins .amount, .woocommerce-Price-amount, p.price')
          precoEls.forEach(el => {
            const texto = el.textContent
            const match = texto.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/)
            if (match) {
              const preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
              if (!resultado.preco_normal) {
                resultado.preco_normal = preco
              } else if (preco < resultado.preco_normal) {
                resultado.preco_pix = preco
              }
            }
          })
          if (resultado.preco_normal && !resultado.preco_pix) {
            resultado.preco_pix = resultado.preco_normal
          }
          const imgSelectors = ['.woocommerce-product-gallery__image img', '.wp-post-image', 'img[itemprop="image"]']
          for (const seletor of imgSelectors) {
            const img = document.querySelector(seletor)
            if (img && img.src && img.src.startsWith('http') && !img.src.includes('data:image')) {
              resultado.imagem = img.src
              break
            }
          }
          const textoCompleto = document.body.textContent.toLowerCase()
          const estoqueMatch = textoCompleto.match(/(\d+)\s*em\s*estoque/i)
          if (estoqueMatch) {
            resultado.estoque = parseInt(estoqueMatch[1])
          }
          if (textoCompleto.includes('fora de estoque') || textoCompleto.includes('indisponível')) {
            resultado.disponibilidade = 'indisponível'
            resultado.estoque = 0
          }
          return resultado
        })
        
        if (dadosProduto.nome && dadosProduto.preco_normal) {
          produtosExtraidos.push({ url, ...dadosProduto })
          console.log(`   ✅ ${dadosProduto.nome} - R$ ${dadosProduto.preco_normal.toFixed(2)}`)
        } else {
          console.log(`   ⚠️ Dados incompletos`)
        }
      } catch (e) {
        console.log(`   ❌ Erro: ${e.message}`)
      }
    }
    
    console.log(`\n📊 Total extraído: ${produtosExtraidos.length} produtos`)
    
    if (produtosExtraidos.length > 0) {
      console.log('\n✅ EXTRAÇÃO FUNCIONANDO!')
      console.log('\n📋 Produtos extraídos:')
      produtosExtraidos.forEach((p, i) => {
        console.log(`\n${i + 1}. ${p.nome}`)
        console.log(`   URL: ${p.url}`)
        console.log(`   SKU: ${p.sku || 'N/A'}`)
        console.log(`   Preço: R$ ${p.preco_normal.toFixed(2)}`)
        console.log(`   PIX: R$ ${p.preco_pix.toFixed(2)}`)
        console.log(`   Imagem: ${p.imagem ? 'Sim' : 'Não'}`)
        console.log(`   Estoque: ${p.estoque !== null ? p.estoque : 'N/A'}`)
      })
    }
    
    console.log('\n⏸️ Navegador ficará aberto. Pressione Ctrl+C para fechar.')
    await new Promise(() => {})
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message)
    if (browser) await browser.close()
  }
}

testarTotal()
