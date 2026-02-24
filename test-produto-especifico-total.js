const puppeteer = require('puppeteer')

async function testarProdutoEspecifico() {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  
  // Login
  console.log('🔐 Login...')
  await page.goto('https://totaldistribuicaorj.com.br/Login')
  await new Promise(r => setTimeout(r, 3000))
  
  await page.type('#forminator-field-text-1_6998e35da96bd', '45281091000119')
  await page.type('#forminator-field-password-1_6998e35da96bd', '45281')
  
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'))
    const loginButton = buttons.find(btn => 
      btn.textContent?.toLowerCase().includes('entrar') ||
      btn.textContent?.toLowerCase().includes('login')
    )
    if (loginButton) loginButton.click()
  })
  
  await new Promise(r => setTimeout(r, 5000))
  console.log('✅ Login OK\n')
  
  // Ir para o produto específico
  const urlProduto = 'https://totaldistribuicaorj.com.br/produto/kit-cozinha-6-portas-mila-151-m-cinamomo-off-white-mgm-moveis/'
  console.log('📦 Indo para produto:', urlProduto)
  await page.goto(urlProduto, { waitUntil: 'domcontentloaded', timeout: 20000 })
  await new Promise(r => setTimeout(r, 3000))
  
  // Extrair com a NOVA lógica (apenas primeiro preço)
  const dados = await page.evaluate(() => {
    const resultado = {
      nome: '',
      preco: 0,
      preco_original: 0,
      debug: {
        primeiro_preco_avista: '',
        todos_precos_avista: [],
        html_price: ''
      }
    }
    
    // Nome
    const h1 = document.querySelector('h1.product_title')
    if (h1) resultado.nome = h1.textContent?.trim()
    
    // DEBUG: Pegar HTML da área de preço
    const priceDiv = document.querySelector('.price')
    if (priceDiv) resultado.debug.html_price = priceDiv.innerHTML
    
    // DEBUG: Pegar TODOS os preços à vista
    const todosPrecos = document.querySelectorAll('.wc-simulador-parcelas-offer .woocommerce-Price-amount')
    todosPrecos.forEach(el => {
      resultado.debug.todos_precos_avista.push(el.textContent?.trim())
    })
    
    // LÓGICA ATUAL: Pegar apenas o PRIMEIRO
    const primeiroPrecoAVista = document.querySelector('.wc-simulador-parcelas-offer .woocommerce-Price-amount')
    
    if (primeiroPrecoAVista) {
      resultado.debug.primeiro_preco_avista = primeiroPrecoAVista.textContent?.trim()
      
      const match = primeiroPrecoAVista.textContent?.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,\d{2})?)/)
      if (match) {
        const preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
        if (preco > 0) {
          resultado.preco = preco
          resultado.preco_original = preco
        }
      }
    }
    
    return resultado
  })
  
  console.log('\n=== RESULTADO ===')
  console.log('Nome:', dados.nome)
  console.log('\nPreço extraído:', `R$ ${dados.preco.toFixed(2)}`)
  console.log('Preço original:', `R$ ${dados.preco_original.toFixed(2)}`)
  
  console.log('\n=== DEBUG ===')
  console.log('Primeiro preço à vista encontrado:', dados.debug.primeiro_preco_avista)
  console.log('\nTodos os preços à vista na página:')
  dados.debug.todos_precos_avista.forEach((p, i) => {
    console.log(`  [${i + 1}] ${p}`)
  })
  
  console.log('\n=== HTML DA ÁREA .price ===')
  console.log(dados.debug.html_price.substring(0, 500) + '...')
  
  await new Promise(r => setTimeout(r, 30000))
  await browser.close()
}

testarProdutoEspecifico()
