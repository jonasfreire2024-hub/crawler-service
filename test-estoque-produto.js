const puppeteer = require('puppeteer')

async function testarEstoque() {
  console.log('🧪 Testando extração de estoque...')
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  
  const page = await browser.newPage()
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
  
  // LOGIN
  console.log('🔐 Fazendo login...')
  await page.goto('https://lordistribuidor.com.br/minha-conta', { 
    waitUntil: 'domcontentloaded',
    timeout: 30000 
  })
  await new Promise(r => setTimeout(r, 2000))
  
  await page.type('#username', 'projetofabiano1512@gmail.com', { delay: 50 })
  await page.type('#password', '151295', { delay: 50 })
  await page.click('button[name="login"]')
  await new Promise(r => setTimeout(r, 5000))
  console.log('✅ Login realizado')
  
  // Ir para um produto específico
  const urlProduto = 'https://lordistribuidor.com.br/produto/colchao-physical-ultra-resistente-casal-138x188x17'
  console.log('\n📦 Acessando produto:', urlProduto)
  
  await page.goto(urlProduto, { waitUntil: 'domcontentloaded', timeout: 20000 })
  await new Promise(r => setTimeout(r, 2000))
  
  // Extrair dados
  const dados = await page.evaluate(() => {
    const resultado = {
      nome: '',
      preco: 0,
      preco_original: 0,
      imagem: '',
      disponibilidade: 'disponível',
      estoque: null,
      debug: {
        htmlTemEstoque: false,
        htmlTemOutOfStock: false,
        htmlTemInStock: false,
        textoEstoque: '',
        schemaOrg: ''
      }
    }
    
    // Nome
    const h1 = document.querySelector('h1.product_title')
    if (h1) resultado.nome = h1.textContent?.trim()
    
    // Preços
    const precoPromocional = document.querySelector('.price ins .woocommerce-Price-amount bdi')
    const precoOriginal = document.querySelector('.price del .woocommerce-Price-amount bdi')
    
    if (precoPromocional) {
      const match = precoPromocional.textContent?.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,\d{2})?)/)
      if (match) {
        resultado.preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
      }
    }
    
    if (precoOriginal) {
      const match = precoOriginal.textContent?.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,\d{2})?)/)
      if (match) {
        resultado.preco_original = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
      }
    }
    
    if (!resultado.preco && precoOriginal) {
      resultado.preco = resultado.preco_original
      resultado.preco_original = 0
    }
    
    if (!resultado.preco) {
      const qualquerPreco = document.querySelector('.price .woocommerce-Price-amount bdi')
      if (qualquerPreco) {
        const match = qualquerPreco.textContent?.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,\d{2})?)/)
        if (match) {
          resultado.preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
        }
      }
    }
    
    // Imagem
    const img = document.querySelector('.wp-post-image, .woocommerce-product-gallery__image img')
    if (img) resultado.imagem = img.src
    
    // ESTOQUE - DEBUG COMPLETO
    const htmlCompleto = document.documentElement.outerHTML
    
    // Verificar se tem "Em estoque"
    resultado.debug.htmlTemEstoque = htmlCompleto.includes('Em estoque')
    
    // Buscar padrão "Em estoque: 123"
    const matchEstoque = htmlCompleto.match(/Em estoque[:\s]*(\d+)/i)
    if (matchEstoque) {
      resultado.estoque = parseInt(matchEstoque[1])
      resultado.disponibilidade = 'disponível'
      resultado.debug.textoEstoque = matchEstoque[0]
    }
    
    // Verificar schema.org
    resultado.debug.htmlTemOutOfStock = htmlCompleto.includes('OutOfStock')
    resultado.debug.htmlTemInStock = htmlCompleto.includes('InStock')
    
    if (htmlCompleto.includes('OutOfStock')) {
      resultado.disponibilidade = 'indisponível'
      resultado.estoque = 0
    } else if (htmlCompleto.includes('InStock')) {
      resultado.disponibilidade = 'disponível'
      if (resultado.estoque === null) {
        resultado.estoque = 1
      }
    }
    
    // Buscar schema.org completo
    const schemaScript = document.querySelector('script[type="application/ld+json"]')
    if (schemaScript) {
      resultado.debug.schemaOrg = schemaScript.textContent
    }
    
    return resultado
  })
  
  console.log('\n📊 RESULTADO:')
  console.log('Nome:', dados.nome)
  console.log('Preço:', dados.preco)
  console.log('Preço Original:', dados.preco_original)
  console.log('Estoque:', dados.estoque)
  console.log('Disponibilidade:', dados.disponibilidade)
  
  console.log('\n🔍 DEBUG:')
  console.log('HTML tem "Em estoque":', dados.debug.htmlTemEstoque)
  console.log('HTML tem "OutOfStock":', dados.debug.htmlTemOutOfStock)
  console.log('HTML tem "InStock":', dados.debug.htmlTemInStock)
  console.log('Texto estoque encontrado:', dados.debug.textoEstoque || 'NENHUM')
  
  if (dados.debug.schemaOrg) {
    console.log('\n📄 Schema.org encontrado:')
    try {
      const schema = JSON.parse(dados.debug.schemaOrg)
      console.log(JSON.stringify(schema, null, 2))
    } catch (e) {
      console.log(dados.debug.schemaOrg.substring(0, 500))
    }
  }
  
  await browser.close()
}

testarEstoque()
