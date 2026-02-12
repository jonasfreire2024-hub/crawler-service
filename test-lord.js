const puppeteer = require('puppeteer')

async function testarLord() {
  console.log('🧪 TESTE: Verificando extração de produtos do Lord\n')
  
  const urlBase = 'https://lordistribuidor.com.br'
  const urlLogin = 'https://lordistribuidor.com.br/minha-conta'
  const urlHome = 'https://lordistribuidor.com.br' // Começar pela home após login
  
  // Credenciais
  const email = 'projetofabiano1512@gmail.com'
  const senha = '151295'
  
  let browser = null
  
  try {
    browser = await puppeteer.launch({
      headless: false, // Mostra o browser para você ver
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    // FAZER LOGIN
    console.log('🔐 Fazendo login...')
    console.log(`Acessando: ${urlLogin}`)
    
    try {
      await page.goto(urlLogin, { waitUntil: 'domcontentloaded', timeout: 30000 })
    } catch (e) {
      console.log('❌ Erro ao acessar página de login:', e.message)
      console.log('Tentando continuar mesmo assim...')
    }
    
    await new Promise(r => setTimeout(r, 5000))
    
    // Verificar se a página carregou
    const pageTitle = await page.title()
    const pageUrl = page.url()
    console.log(`Título da página: ${pageTitle}`)
    console.log(`URL atual: ${pageUrl}`)
    
    // Tirar screenshot para debug
    await page.screenshot({ path: 'debug-login-page.png' })
    console.log('📸 Screenshot salvo em: debug-login-page.png')
    
    // Primeiro, vamos inspecionar a página para encontrar os campos
    console.log('\n🔍 Inspecionando formulário de login...')
    const formInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'))
      return inputs.map(input => ({
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder,
        className: input.className
      }))
    })
    
    console.log('Campos encontrados:', JSON.stringify(formInfo, null, 2))
    
    if (formInfo.length === 0) {
      console.log('\n❌ Nenhum campo de input encontrado na página!')
      console.log('A página pode não ter carregado corretamente ou requer interação adicional.')
      console.log('Verifique o screenshot: debug-login-page.png')
      await browser.close()
      return
    }
    
    // Tentar encontrar os campos de forma mais flexível
    const emailField = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'))
      const emailInput = inputs.find(input => 
        input.type === 'email' || 
        input.type === 'text' ||
        input.name?.toLowerCase().includes('email') ||
        input.name?.toLowerCase().includes('usuario') ||
        input.name?.toLowerCase().includes('login') ||
        input.id?.toLowerCase().includes('email') ||
        input.id?.toLowerCase().includes('usuario') ||
        input.placeholder?.toLowerCase().includes('email') ||
        input.placeholder?.toLowerCase().includes('usuário')
      )
      
      if (!emailInput) return null
      
      return {
        selector: emailInput.id ? `#${emailInput.id}` : 
                 emailInput.name ? `input[name="${emailInput.name}"]` :
                 emailInput.className ? `.${emailInput.className.split(' ')[0]}` : null
      }
    })
    
    const passwordField = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'))
      const passwordInput = inputs.find(input => 
        input.type === 'password' ||
        input.name?.toLowerCase().includes('senha') ||
        input.name?.toLowerCase().includes('password') ||
        input.id?.toLowerCase().includes('senha') ||
        input.id?.toLowerCase().includes('password')
      )
      
      if (!passwordInput) return null
      
      return {
        selector: passwordInput.id ? `#${passwordInput.id}` : 
                 passwordInput.name ? `input[name="${passwordInput.name}"]` :
                 passwordInput.className ? `.${passwordInput.className.split(' ')[0]}` : null
      }
    })
    
    if (!emailField || !passwordField) {
      console.log('❌ Não foi possível encontrar os campos de login')
      console.log('Email field:', emailField)
      console.log('Password field:', passwordField)
      await browser.close()
      return
    }
    
    console.log(`✅ Campos encontrados:`)
    console.log(`   Email: ${emailField.selector}`)
    console.log(`   Senha: ${passwordField.selector}`)
    
    // Preencher formulário de login
    await page.type(emailField.selector, email)
    await page.type(passwordField.selector, senha)
    
    // Encontrar e clicar no botão de login
    const buttonClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'))
      const loginButton = buttons.find(btn => 
        btn.textContent?.toLowerCase().includes('entrar') ||
        btn.textContent?.toLowerCase().includes('login') ||
        btn.value?.toLowerCase().includes('entrar') ||
        btn.className?.toLowerCase().includes('login')
      )
      
      if (loginButton) {
        loginButton.click()
        return true
      }
      return false
    })
    
    if (!buttonClicked) {
      console.log('❌ Não foi possível encontrar o botão de login')
      await browser.close()
      return
    }
    
    // Aguardar navegação após login
    try {
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 })
      console.log('✅ Login realizado com sucesso!\n')
    } catch (e) {
      console.log('⚠️ Timeout na navegação, mas pode ter funcionado. Continuando...\n')
    }
    
    await new Promise(r => setTimeout(r, 2000))
    
    console.log(`📂 Acessando home: ${urlHome}`)
    await page.goto(urlHome, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise(r => setTimeout(r, 3000))
    
    // Tirar screenshot da home
    await page.screenshot({ path: 'debug-home-page.png' })
    console.log('📸 Screenshot da home salvo em: debug-home-page.png')
    
    // Extrair categorias do menu
    console.log('\n🔍 Extraindo categorias do menu...')
    const categorias = await page.evaluate((baseUrl) => {
      const cats = new Set()
      
      const seletores = [
        'nav a',
        '.menu a',
        'header a',
        '[class*="menu"] a',
        '[class*="nav"] a',
        'ul.menu li a'
      ]
      
      seletores.forEach(seletor => {
        try {
          const links = document.querySelectorAll(seletor)
          console.log(`   Seletor "${seletor}": ${links.length} links`)
          
          links.forEach(link => {
            let href = link.href
            if (!href || !href.startsWith(baseUrl)) return
            if (href.includes('#') || href.includes('-p')) return
            if (href.includes('goto') || href.includes('login') || href.includes('conta')) return
            if (href.includes('contato') || href.includes('sobre') || href.includes('blog')) return
            
            href = href.split('?')[0].replace(/\/$/, '')
            
            if (href !== baseUrl && href.length > baseUrl.length + 2) {
              cats.add(href)
              console.log(`      ✅ Categoria: ${href}`)
            }
          })
        } catch (e) {}
      })
      
      return Array.from(cats)
    }, urlBase)
    
    console.log(`\n✅ ${categorias.length} categorias encontradas`)
    
    if (categorias.length === 0) {
      console.log('\n❌ Nenhuma categoria encontrada!')
      await browser.close()
      return
    }
    
    // Testar primeira categoria
    const urlTeste = categorias[0]
    console.log(`\n📦 Testando primeira categoria: ${urlTeste}`)
    await page.goto(urlTeste, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise(r => setTimeout(r, 3000))
    
    // Tirar screenshot da categoria
    await page.screenshot({ path: 'debug-categoria-page.png' })
    console.log('📸 Screenshot da categoria salvo em: debug-categoria-page.png')
    
    // Extrair URLs de produtos usando a lógica do Lord
    console.log('\n🔍 Extraindo URLs de produtos...')
    const urlsProdutos = await page.evaluate((urlBase) => {
      const urls = new Set()
      
      // Detectar que é Lord
      const isLord = urlBase.includes('lord') || urlBase.includes('lorddistribuidor')
      
      console.log('Detectado como Lord:', isLord)
      
      if (isLord) {
        console.log('✅ Detectado como site Lord')
        
        const seletoresProduto = [
          '.product-item a',
          '.product a',
          '[data-product] a',
          '.item-product a',
          '.produto a',
          'li[itemtype*="Product"] a',
          '.showcase-item a',
          '[class*="product"] a[href*="/"]',
          '.products li a', // WooCommerce padrão
          'ul.products li a' // WooCommerce padrão
        ]
        
        seletoresProduto.forEach(seletor => {
          try {
            const links = document.querySelectorAll(seletor)
            console.log(`   Seletor "${seletor}": ${links.length} links encontrados`)
            
            links.forEach(link => {
              let url = link.href
              if (url && url.startsWith('http')) {
                // Log para debug
                console.log(`      Analisando URL: ${url}`)
                
                if (!url.includes('/c/') && 
                    !url.includes('/categoria') &&
                    !url.includes('/sobre') &&
                    !url.includes('/contato') &&
                    !url.includes('/blog') &&
                    !url.includes('?pagina=') &&
                    !url.includes('solicite-assistencia') &&
                    !url.includes('troca-e-devolucao') &&
                    !url.includes('atendimento') &&
                    !url.includes('novidades') &&
                    !url.includes('cdn-cgi') &&
                    !url.includes('/minha-conta') &&
                    !url.includes('/carrinho') &&
                    !url.includes('/finalizar-compra') &&
                    url !== window.location.href) {
                  console.log(`      ✅ URL aceita: ${url}`)
                  urls.add(url)
                } else {
                  console.log(`      ❌ URL rejeitada (filtro)`)
                }
              }
            })
          } catch (e) {
            console.error(`   Erro no seletor "${seletor}":`, e.message)
          }
        })
      }
      
      return Array.from(urls)
    }, urlBase)
    
    console.log(`\n✅ ${urlsProdutos.length} URLs de produtos encontradas`)
    
    if (urlsProdutos.length === 0) {
      console.log('\n❌ PROBLEMA: Nenhum produto encontrado!')
      console.log('Verifique se os seletores estão corretos.')
      await browser.close()
      return
    }
    
    // Testar extração de dados do primeiro produto
    console.log('\n📦 Testando extração de dados do primeiro produto...')
    const urlProduto = urlsProdutos[0]
    console.log(`URL: ${urlProduto}`)
    
    await page.goto(urlProduto, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await new Promise(r => setTimeout(r, 2000))
    
    // Screenshot do produto
    await page.screenshot({ path: 'debug-produto-page.png' })
    console.log('📸 Screenshot do produto salvo em: debug-produto-page.png')
    
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

      // Tentar múltiplos seletores para área do produto (WooCommerce)
      const seletoresArea = [
        '.summary',
        '.entry-summary',
        '.product',
        'article[itemtype*="Product"]',
        '.woocommerce-product-details',
        'main'
      ]
      
      let areaProduto = null
      for (const seletor of seletoresArea) {
        areaProduto = document.querySelector(seletor)
        if (areaProduto) {
          console.log(`✅ Área encontrada com: ${seletor}`)
          break
        }
      }
      
      if (!areaProduto) {
        areaProduto = document.body
        console.log('⚠️ Usando body como área do produto')
      }

      // NOME - WooCommerce
      const seletoresNome = ['h1.product_title', 'h1', '[itemprop="name"]']
      for (const seletor of seletoresNome) {
        const nomeEl = areaProduto.querySelector(seletor)
        if (nomeEl && nomeEl.textContent.trim()) {
          resultado.nome = nomeEl.textContent.trim()
          break
        }
      }

      // SKU - WooCommerce
      const skuEl = areaProduto.querySelector('.sku, [itemprop="sku"]')
      if (skuEl) resultado.sku = skuEl.textContent.trim()

      // PREÇOS - WooCommerce
      const precoEls = areaProduto.querySelectorAll('.price .amount, .price ins .amount, .woocommerce-Price-amount, p.price')
      if (precoEls.length > 0) {
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
      }

      if (resultado.preco_normal && !resultado.preco_pix) {
        resultado.preco_pix = resultado.preco_normal
      }

      // IMAGEM - WooCommerce (mais seletores)
      const imgSelectors = [
        '.woocommerce-product-gallery__image img',
        '.woocommerce-product-gallery img',
        '.wp-post-image',
        'img[itemprop="image"]',
        '.product-image img',
        '.product-gallery img',
        'img.attachment-woocommerce_single'
      ]
      
      for (const seletor of imgSelectors) {
        const img = document.querySelector(seletor)
        if (img && img.src && img.src.startsWith('http') && !img.src.includes('data:image')) {
          resultado.imagem = img.src
          console.log(`Imagem encontrada com: ${seletor}`)
          break
        }
      }
      
      // ESTOQUE - WooCommerce
      const textoCompleto = document.body.textContent.toLowerCase()
      
      // Buscar quantidade em estoque
      const estoqueMatch = textoCompleto.match(/(\d+)\s*em\s*estoque/i) || 
                          textoCompleto.match(/estoque:\s*(\d+)/i) ||
                          textoCompleto.match(/disponível:\s*(\d+)/i)
      
      if (estoqueMatch) {
        resultado.estoque = parseInt(estoqueMatch[1])
      }
      
      // Verificar disponibilidade
      if (textoCompleto.includes('fora de estoque') || 
          textoCompleto.includes('indisponível') ||
          textoCompleto.includes('esgotado')) {
        resultado.disponibilidade = 'indisponível'
        resultado.estoque = 0
      } else if (textoCompleto.includes('em estoque')) {
        resultado.disponibilidade = 'disponível'
      }

      return resultado
    })
    
    // Extrair mais 2 produtos
    const produtosExtraidos = []
    
    if (dados.nome && dados.preco_normal) {
      produtosExtraidos.push({ url: urlProduto, ...dados })
    }
    
    console.log('\n📦 Extraindo mais 2 produtos...\n')
    for (let i = 1; i < Math.min(3, urlsProdutos.length); i++) {
      const url = urlsProdutos[i]
      console.log(`[${i + 1}/3] ${url}`)
      
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await new Promise(r => setTimeout(r, 2000))
        
        const dadosProduto = await page.evaluate(() => {
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
        }
      } catch (e) {
        console.log(`   ❌ Erro: ${e.message}`)
      }
    }
    
    await browser.close()
    
    console.log(`\n📊 Total extraído: ${produtosExtraidos.length} produtos`)
    
    if (produtosExtraidos.length === 0) {
      console.log('❌ Nenhum produto válido')
      return
    }
    
    // ENVIAR PARA API
    console.log(`\n📤 Enviando para API...\n`)
    const API_URL = 'http://localhost:3000'
    const CONCORRENTE_ID = '1'
    
    let sucessos = 0
    let erros = 0
    
    for (const produto of produtosExtraidos) {
      try {
        const payload = {
          concorrente_id: parseInt(CONCORRENTE_ID),
          nome: produto.nome,
          url: produto.url,
          preco_atual: produto.preco_pix || produto.preco_normal,
          preco_promocional: produto.preco_pix !== produto.preco_normal ? produto.preco_pix : null,
          disponivel: produto.disponibilidade === 'disponível',
          categoria: null,
          especificacoes: {
            sku: produto.sku,
            marca: produto.marca,
            imagem: produto.imagem,
            estoque: produto.estoque,
            preco_normal: produto.preco_normal
          },
          ativo: true
        }
        
        console.log(`   Enviando: ${produto.nome}...`)
        
        const response = await fetch(`${API_URL}/api/concorrentes/produtos/criar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (response.ok) {
          sucessos++
          console.log(`   ✅ Sucesso!`)
        } else {
          erros++
          console.log(`   ❌ Erro: ${response.status}`)
        }
      } catch (error) {
        erros++
        console.log(`   ❌ Erro: ${error.message}`)
      }
    }
    
    console.log(`\n🎉 CONCLUÍDO!`)
    console.log(`   ✅ Sucessos: ${sucessos}`)
    console.log(`   ❌ Erros: ${erros}`)
    
    if (sucessos > 0) {
      console.log(`\n💡 Produtos adicionados! Verifique na interface.`)
    }
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message)
    if (browser) await browser.close()
  }
}

// Executar teste
testarLord()
