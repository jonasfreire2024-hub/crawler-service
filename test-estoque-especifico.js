const puppeteer = require('puppeteer')

async function testarEstoque() {
  console.log('🔍 Testando extração de estoque...')
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  })
  
  const page = await browser.newPage()
  
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
  
  // Testar com um produto
  const urlProduto = 'https://lordistribuidor.com.br/produto/aereo-microondas-salvador-cinamomo-grafite/'
  console.log('\n📦 Testando produto:', urlProduto)
  
  await page.goto(urlProduto, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await new Promise(r => setTimeout(r, 3000))
  
  // Buscar TODOS os elementos que podem conter informação de estoque
  const debug = await page.evaluate(() => {
    const resultado = {
      html_stock: '',
      texto_completo: document.body.textContent,
      elementos_stock: []
    }
    
    // Buscar elemento .stock
    const stockEl = document.querySelector('.stock')
    if (stockEl) {
      resultado.html_stock = stockEl.outerHTML
    }
    
    // Buscar todos os elementos que contêm "estoque"
    const todosElementos = document.querySelectorAll('*')
    todosElementos.forEach(el => {
      const texto = el.textContent.toLowerCase()
      if (texto.includes('estoque') && el.children.length === 0) {
        resultado.elementos_stock.push({
          tag: el.tagName,
          classe: el.className,
          id: el.id,
          texto: el.textContent.trim()
        })
      }
    })
    
    return resultado
  })
  
  console.log('\n📊 RESULTADO:')
  console.log('\n=== HTML do elemento .stock ===')
  console.log(debug.html_stock || 'NÃO ENCONTRADO')
  
  console.log('\n=== Elementos com "estoque" ===')
  debug.elementos_stock.forEach((el, i) => {
    console.log(`\n${i + 1}. <${el.tag}> ${el.classe ? `class="${el.classe}"` : ''} ${el.id ? `id="${el.id}"` : ''}`)
    console.log(`   Texto: ${el.texto}`)
  })
  
  console.log('\n=== Busca no texto completo ===')
  const linhasComEstoque = debug.texto_completo.split('\n').filter(l => l.toLowerCase().includes('estoque'))
  linhasComEstoque.forEach((linha, i) => {
    if (i < 10) { // Mostrar apenas as primeiras 10
      console.log(`${i + 1}. ${linha.trim()}`)
    }
  })
  
  await new Promise(r => setTimeout(r, 30000))
  await browser.close()
}

testarEstoque().catch(console.error)
