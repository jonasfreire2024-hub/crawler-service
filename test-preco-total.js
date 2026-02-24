const puppeteer = require('puppeteer')

async function testarPreco() {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  
  // Login
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
  
  // Ir para produto específico
  const urlProduto = 'https://totaldistribuicaorj.com.br/produto/kit-cozinha-6-portas-mila-1-51-m-cinamomo-off-white-mgm-moveis/'
  await page.goto(urlProduto)
  await new Promise(r => setTimeout(r, 3000))
  
  // Extrair estrutura de preços
  const estrutura = await page.evaluate(() => {
    const resultado = {
      html_price: '',
      todos_precos: []
    }
    
    // Pegar HTML da área de preço
    const priceDiv = document.querySelector('.price')
    if (priceDiv) {
      resultado.html_price = priceDiv.innerHTML
    }
    
    // Pegar todos os elementos com preço
    const todosPrecos = document.querySelectorAll('.price *')
    todosPrecos.forEach(el => {
      if (el.textContent && el.textContent.includes('R$')) {
        resultado.todos_precos.push({
          tag: el.tagName,
          class: el.className,
          text: el.textContent.trim()
        })
      }
    })
    
    return resultado
  })
  
  console.log('\n=== ESTRUTURA DE PREÇOS ===')
  console.log('\nHTML completo da área .price:')
  console.log(estrutura.html_price)
  
  console.log('\n\nTodos os elementos com R$:')
  estrutura.todos_precos.forEach((p, i) => {
    console.log(`\n[${i + 1}] <${p.tag}> class="${p.class}"`)
    console.log(`    Texto: ${p.text}`)
  })
  
  await new Promise(r => setTimeout(r, 60000)) // Esperar 1 minuto para análise
  await browser.close()
}

testarPreco()
