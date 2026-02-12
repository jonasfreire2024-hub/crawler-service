const puppeteer = require('puppeteer')

// CONFIGURAÇÃO - Ajuste se necessário
const API_URL = 'http://localhost:3000'

async function buscarConcorrenteId() {
  console.log('🔍 Buscando concorrente Lord na API...')
  
  try {
    const response = await fetch(`${API_URL}/api/concorrentes/lista-simples`)
    
    if (!response.ok) {
      console.log('⚠️ Não foi possível buscar da API. Usando ID padrão: 1')
      return '1'
    }
    
    const data = await response.json()
    const lord = data.find(c => 
      c.nome?.toLowerCase().includes('lord') || 
      c.url?.includes('lord')
    )
    
    if (lord) {
      console.log(`✅ Concorrente encontrado: ${lord.nome} (ID: ${lord.id})`)
      return lord.id
    } else {
      console.log('⚠️ Lord não encontrado. Usando ID padrão: 1')
      return '1'
    }
  } catch (error) {
    console.log('⚠️ Erro ao buscar API. Usando ID padrão: 1')
    return '1'
  }
}

async function testarLordCompleto() {
  console.log('🧪 TESTE COMPLETO: Extrair e enviar produtos do Lord\n')
  
  // Buscar ID do concorrente
  const CONCORRENTE_ID = await buscarConcorrenteId()
  console.log(`📡 API: ${API_URL}`)
  console.log(`🏢 Concorrente ID: ${CONCORRENTE_ID}\n`)
  
  const urlBase = 'https://lordistribuidor.com.br'
  const urlLogin = 'https://lordistribuidor.com.br/minha-conta'
  const urlHome = 'https://lordistribuidor.com.br'
  
  // Credenciais
  const email = 'projetofabiano1512@gmail.com'
  const senha = '151295'
  
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
    await new Promise(r => setTimeout(r, 5000))
    
    // Encontrar campos de login
    const emailField = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'))
      const emailInput = inputs.find(input => 
        input.type === 'text' && input.name === 'username'
      )
      return emailInput ? `#${emailInput.id}` : null
    })
    
    const passwordField = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'))
      const passwordInput = inputs.find(input => input.type === 'password')
      return passwordInput ? `#${passwordInput.id}` : null
    })
    
    if (!emailField || !passwordField) {
      console.log('❌ Não foi possível encontrar os campos de login')
      await browser.close()
      return
    }
    
    await page.type(emailField, email)
    await page.type(passwordField, senha)
    
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
    await page.goto(urlHome, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise(r => setTimeout(r, 3000))
    
    // Extrair categorias
    console.log('🔍 Extraindo categorias...')
    const categorias = await page.evaluate((baseUrl) => {
      const cats = new Set()
      const seletores = ['nav a', '.menu a', 'header a']
      
      seletores.forEach(seletor => {
        const links = document.querySelectorAll(seletor)
        links.forEach(link => {
          let href = link.href
          if (!href || !href.startsWith(baseUrl)) return
          if (href.includes('#') || href.includes('login') || href.includes('conta')) return
          href = href.split('?')[0].replace(/\/$/, '')
          if (href !== baseUrl && href.length > baseUrl.length + 2) {
            cats.add(href)
          }
        })
      })
      
      return Array.from(cats)
    }, urlBase)
    
    console.log(`✅ ${categorias.length} categorias encontradas\n`)
    
    if (categorias.length === 0) {
      console.log('❌ Nenhuma categoria encontrada')
      await browser.close()
      return
    }
    
    // Testar primeira categoria
    const urlCategoria = categorias[0]
    console.log(`📦 Acessando categoria: ${urlCategoria}`)
    await page.goto(urlCategoria, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise(r => setTimeout(r, 3000))
    
    // Extrair URLs de produtos (mesma lógica do test-lord.js que funcionou)
    const urlsProdutos = await page.evaluate((urlBase) => {
      const urls = new Set()
      
      const seletoresProduto = [
        '.product-item a',
        '.product a',
        '[data-product] a',
        '.item-product a',
        '.produto a',
        'li[itemtype*="Product"] a',
        '.showcase-item a',
        '[class*="product"] a[href*="/"]',
        '.products li a',
        'ul.products li a'
      ]
      
      seletoresProduto.forEach(seletor => {
        try {
          const links = document.querySelectorAll(seletor)
          console.log(`   Seletor "${seletor}": ${links.length} links encontrados`)
          
          links.forEach(link => {
            let url = link.href
            if (url && url.startsWith('http')) {
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
                urls.add(url)
              }
            }
          })
        } catch (e) {
          console.error(`   Erro no seletor "${seletor}":`, e.message)
        }
      })
      
      return Array.from(urls)
    }, urlBase)
    
    console.log(`✅ ${urlsProdutos.length} produtos encontrados\n`)
    
    if (urlsProdutos.length === 0) {
      console.log('❌ Nenhum produto encontrado')
      await browser.close()
      return
    }
    
    // Extrair dados dos primeiros 3 produtos (reduzido para teste rápido)
    const LIMITE = 3
    console.log(`📦 Extraindo dados dos primeiros ${LIMITE} produtos...\n`)
    
    const produtosExtraidos = []
    
    for (let i = 0; i < Math.min(LIMITE, urlsProdutos.length); i++) {
      const urlProduto = urlsProdutos[i]
      console.log(`[${i + 1}/${LIMITE}] ${urlProduto}`)
      
      try {
        await page.goto(urlProduto, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await new Promise(r => setTimeout(r, 2000))
        
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

          const areaProduto = document.querySelector('.summary, .entry-summary, .product') || document.body

          // Nome
          const nomeEl = areaProduto.querySelector('h1.product_title, h1')
          if (nomeEl) resultado.nome = nomeEl.textContent.trim()

          // SKU
          const skuEl = areaProduto.querySelector('.sku, [itemprop="sku"]')
          if (skuEl) resultado.sku = skuEl.textContent.trim()

          // Preços
          const precoEls = areaProduto.querySelectorAll('.price .amount, .price ins .amount, .woocommerce-Price-amount')
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

          // Imagem
          const imgSelectors = [
            '.woocommerce-product-gallery__image img',
            '.wp-post-image',
            'img[itemprop="image"]'
          ]
          
          for (const seletor of imgSelectors) {
            const img = document.querySelector(seletor)
            if (img && img.src && img.src.startsWith('http')) {
              resultado.imagem = img.src
              break
            }
          }
          
          // Estoque
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
        
        if (dados.nome && dados.preco_normal) {
          produtosExtraidos.push({
            url: urlProduto,
            ...dados
          })
          console.log(`   ✅ ${dados.nome} - R$ ${dados.preco_normal.toFixed(2)}`)
        } else {
          console.log(`   ⚠️ Dados incompletos`)
        }
        
      } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`)
      }
    }
    
    await browser.close()
    
    console.log(`\n📊 Total extraído: ${produtosExtraidos.length} produtos`)
    
    if (produtosExtraidos.length === 0) {
      console.log('❌ Nenhum produto válido para enviar')
      return
    }
    
    // ENVIAR PARA API
    console.log(`\n📤 Enviando produtos para a API...`)
    console.log(`⚠️ NOTA: Certifique-se de que o servidor está rodando!\n`)
    
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
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })
        
        if (response.ok) {
          sucessos++
          console.log(`   ✅ Sucesso!`)
        } else {
          erros++
          const errorText = await response.text()
          console.log(`   ❌ Erro: ${response.status} - ${errorText}`)
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
      console.log(`\n💡 Acesse a tela de Produtos dos Concorrentes para ver os produtos!`)
    }
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message)
    if (browser) await browser.close()
  }
}

// Executar teste
testarLordCompleto()
