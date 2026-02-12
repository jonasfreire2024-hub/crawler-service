const puppeteer = require('puppeteer')

const API_URL = 'http://localhost:3000'

async function buscarConcorrenteId() {
  try {
    const response = await fetch(`${API_URL}/api/concorrentes/lista-simples`)
    if (!response.ok) return '1'
    const data = await response.json()
    const lord = data.find(c => c.nome?.toLowerCase().includes('lord') || c.url?.includes('lord'))
    return lord ? lord.id : '1'
  } catch {
    return '1'
  }
}

async function testarLordFinal() {
  console.log('🧪 TESTE FINAL: Lord com espera de carregamento\n')
  
  const CONCORRENTE_ID = await buscarConcorrenteId()
  console.log(`🏢 Concorrente ID: ${CONCORRENTE_ID}\n`)
  
  const urlLogin = 'https://lordistribuidor.com.br/minha-conta'
  const urlCategoria = 'https://lordistribuidor.com.br/c/sofas/sofa-2-lugares/' // Categoria específica
  
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
    
    // LOGIN
    console.log('🔐 Fazendo login...')
    await page.goto(urlLogin, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise(r => setTimeout(r, 5000))
    
    await page.type('#username', email)
    await page.type('#password', senha)
    
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'))
      const loginButton = buttons.find(btn => 
        btn.textContent?.toLowerCase().includes('entrar') ||
        btn.value?.toLowerCase().includes('entrar')
      )
      if (loginButton) loginButton.click()
    })
    
    await new Promise(r => setTimeout(r, 3000))
    console.log('✅ Login OK\n')
    
    // ACESSAR CATEGORIA
    console.log(`📦 Acessando categoria: ${urlCategoria}`)
    await page.goto(urlCategoria, { waitUntil: 'networkidle2', timeout: 30000 })
    
    // ESPERAR PRODUTOS CARREGAREM (importante!)
    console.log('⏳ Aguardando produtos carregarem...')
    await new Promise(r => setTimeout(r, 8000)) // Esperar 8 segundos
    
    // Scroll para carregar lazy loading
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2)
    })
    await new Promise(r => setTimeout(r, 2000))
    
    // EXTRAIR PRODUTOS
    const urlsProdutos = await page.evaluate(() => {
      const urls = new Set()
      
      // Todos os links da página
      const todosLinks = document.querySelectorAll('a')
      console.log(`Total de links: ${todosLinks.length}`)
      
      todosLinks.forEach(link => {
        const url = link.href
        if (url && url.includes('/produto/')) {
          urls.add(url)
        }
      })
      
      return Array.from(urls)
    })
    
    console.log(`✅ ${urlsProdutos.length} produtos encontrados\n`)
    
    if (urlsProdutos.length === 0) {
      console.log('❌ Nenhum produto encontrado')
      await browser.close()
      return
    }
    
    // EXTRAIR DADOS DOS PRIMEIROS 3 PRODUTOS
    const LIMITE = 3
    console.log(`📦 Extraindo dados de ${LIMITE} produtos...\n`)
    
    const produtosExtraidos = []
    
    for (let i = 0; i < Math.min(LIMITE, urlsProdutos.length); i++) {
      const urlProduto = urlsProdutos[i]
      console.log(`[${i + 1}/${LIMITE}] ${urlProduto}`)
      
      try {
        await page.goto(urlProduto, { waitUntil: 'networkidle2', timeout: 20000 })
        await new Promise(r => setTimeout(r, 2000))
        
        const dados = await page.evaluate(() => {
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
      console.log('❌ Nenhum produto válido')
      return
    }
    
    // ENVIAR PARA API
    console.log(`\n📤 Enviando para API...`)
    
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
      console.log(`\n💡 Produtos adicionados! Verifique na interface.`)
    }
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message)
    if (browser) await browser.close()
  }
}

testarLordFinal()
