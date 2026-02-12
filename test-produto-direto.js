const puppeteer = require('puppeteer')

const API_URL = 'http://localhost:3000'
const CONCORRENTE_ID = '1'

// URLs de produtos para testar diretamente
const PRODUTOS_TESTE = [
  'https://lordistribuidor.com.br/produto/sofa-2-lugares-slim-1-40m-bege-linho/',
  'https://lordistribuidor.com.br/produto/cabeceira-italia-casal-marrom-veludo/',
  'https://lordistribuidor.com.br/produto/sofa-3-lugares-slim-2-00m-bege-linho/'
]

async function testarProdutoDireto() {
  console.log('🧪 TESTE DIRETO: Acessando produtos específicos\n')
  console.log(`🏢 Concorrente ID: ${CONCORRENTE_ID}\n`)
  
  const urlLogin = 'https://lordistribuidor.com.br/minha-conta'
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
    
    // EXTRAIR DADOS DOS PRODUTOS
    const produtosExtraidos = []
    
    for (let i = 0; i < PRODUTOS_TESTE.length; i++) {
      const urlProduto = PRODUTOS_TESTE[i]
      console.log(`[${i + 1}/${PRODUTOS_TESTE.length}] ${urlProduto}`)
      
      try {
        await page.goto(urlProduto, { waitUntil: 'networkidle2', timeout: 20000 })
        await new Promise(r => setTimeout(r, 3000))
        
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

          // Imagem
          const imgSelectors = [
            '.woocommerce-product-gallery__image img',
            '.wp-post-image',
            'img[itemprop="image"]',
            '.product-gallery img'
          ]
          
          for (const seletor of imgSelectors) {
            const img = document.querySelector(seletor)
            if (img && img.src && img.src.startsWith('http') && !img.src.includes('data:image')) {
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
          console.log(`   ✅ ${dados.nome}`)
          console.log(`   💰 R$ ${dados.preco_normal.toFixed(2)}`)
          console.log(`   📦 Estoque: ${dados.estoque || 'N/A'}`)
          console.log('')
        } else {
          console.log(`   ⚠️ Dados incompletos`)
          console.log(`   Nome: ${dados.nome || 'N/A'}`)
          console.log(`   Preço: ${dados.preco_normal || 'N/A'}`)
          console.log('')
        }
        
      } catch (error) {
        console.log(`   ❌ Erro: ${error.message}\n`)
      }
    }
    
    await browser.close()
    
    console.log(`📊 Total extraído: ${produtosExtraidos.length} produtos\n`)
    
    if (produtosExtraidos.length === 0) {
      console.log('❌ Nenhum produto válido')
      return
    }
    
    // ENVIAR PARA API
    console.log(`📤 Enviando para API...\n`)
    
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
          const result = await response.json()
          console.log(`   ✅ Produto ID: ${result.data?.id}`)
        } else {
          erros++
          const errorText = await response.text()
          console.log(`   ❌ ${response.status}: ${errorText}`)
        }
      } catch (error) {
        erros++
        console.log(`   ❌ ${error.message}`)
      }
    }
    
    console.log(`\n🎉 CONCLUÍDO!`)
    console.log(`   ✅ Sucessos: ${sucessos}`)
    console.log(`   ❌ Erros: ${erros}`)
    
    if (sucessos > 0) {
      console.log(`\n💡 Acesse: ${API_URL}/concorrentes/produtos`)
      console.log(`   Os produtos devem estar visíveis agora!`)
    } else if (erros > 0) {
      console.log(`\n⚠️ Verifique se:`)
      console.log(`   1. O servidor está rodando (npm run dev)`)
      console.log(`   2. O concorrente ID ${CONCORRENTE_ID} existe`)
      console.log(`   3. Você está autenticado`)
    }
    
  } catch (error) {
    console.error('\n❌ ERRO:', error.message)
    if (browser) await browser.close()
  }
}

testarProdutoDireto()
