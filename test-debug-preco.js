const puppeteer = require('puppeteer')

async function debugPreco() {
  console.log('🔍 Debug: Identificando estrutura de preços...')
  
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
  
  // Ir para um produto específico
  const urlProduto = 'https://lordistribuidor.com.br/produto/aereo-microondas-salvador-cinamomo-grafite/'
  console.log('\n📦 Acessando produto:', urlProduto)
  
  await page.goto(urlProduto, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await new Promise(r => setTimeout(r, 3000))
  
  // EXTRAIR TODAS AS INFORMAÇÕES POSSÍVEIS
  const debug = await page.evaluate(() => {
    const resultado = {
      html_completo: document.body.innerHTML.substring(0, 5000),
      seletores_testados: {},
      texto_completo: document.body.textContent.substring(0, 2000)
    }
    
    // Testar vários seletores de preço
    const seletoresPreco = [
      '.price',
      '.woocommerce-Price-amount',
      '.amount',
      'bdi',
      '.product-price',
      '[itemprop="price"]',
      '.price ins',
      '.price del',
      'span.woocommerce-Price-amount.amount',
      'p.price',
      '.summary .price'
    ]
    
    seletoresPreco.forEach(seletor => {
      try {
        const el = document.querySelector(seletor)
        if (el) {
          resultado.seletores_testados[seletor] = {
            texto: el.textContent,
            html: el.innerHTML,
            existe: true
          }
        } else {
          resultado.seletores_testados[seletor] = { existe: false }
        }
      } catch (e) {
        resultado.seletores_testados[seletor] = { erro: e.message }
      }
    })
    
    // Buscar todos os elementos que contêm "R$"
    resultado.elementos_com_rs = []
    const todosElementos = document.querySelectorAll('*')
    todosElementos.forEach(el => {
      if (el.textContent.includes('R$') && el.children.length === 0) {
        resultado.elementos_com_rs.push({
          tag: el.tagName,
          classe: el.className,
          id: el.id,
          texto: el.textContent.trim(),
          html: el.innerHTML
        })
      }
    })
    
    return resultado
  })
  
  console.log('\n📊 RESULTADO DO DEBUG:')
  console.log('\n=== SELETORES TESTADOS ===')
  Object.entries(debug.seletores_testados).forEach(([seletor, info]) => {
    if (info.existe) {
      console.log(`\n✅ ${seletor}`)
      console.log(`   Texto: ${info.texto}`)
      console.log(`   HTML: ${info.html}`)
    }
  })
  
  console.log('\n=== ELEMENTOS COM R$ ===')
  debug.elementos_com_rs.forEach((el, i) => {
    console.log(`\n${i + 1}. <${el.tag}> ${el.classe ? `class="${el.classe}"` : ''} ${el.id ? `id="${el.id}"` : ''}`)
    console.log(`   Texto: ${el.texto}`)
  })
  
  console.log('\n=== TEXTO COMPLETO (primeiros 500 chars) ===')
  console.log(debug.texto_completo.substring(0, 500))
  
  // Aguardar para você ver
  console.log('\n⏸️  Navegador ficará aberto por 30 segundos para você inspecionar...')
  await new Promise(r => setTimeout(r, 30000))
  
  await browser.close()
}

debugPreco().catch(console.error)
