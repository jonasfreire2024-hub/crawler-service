const puppeteer = require('puppeteer')

async function testarHtmlBruto() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  })
  
  const page = await browser.newPage()
  
  // LOGIN
  await page.goto('https://lordistribuidor.com.br/minha-conta', { 
    waitUntil: 'domcontentloaded',
    timeout: 30000 
  })
  await new Promise(r => setTimeout(r, 2000))
  
  await page.type('#username', 'projetofabiano1512@gmail.com', { delay: 50 })
  await page.type('#password', '151295', { delay: 50 })
  await page.click('button[name="login"]')
  await new Promise(r => setTimeout(r, 5000))
  
  await page.goto('https://lordistribuidor.com.br/produto/aereo-microondas-salvador-cinamomo-grafite/', { 
    waitUntil: 'domcontentloaded', 
    timeout: 30000 
  })
  await new Promise(r => setTimeout(r, 5000)) // Aguardar mais tempo para JS carregar
  
  const html = await page.content()
  
  // Buscar "Em estoque" no HTML
  const regex = /Em estoque[:\s]*(\d+)/gi
  const matches = [...html.matchAll(regex)]
  
  console.log('🔍 Buscas por "Em estoque" no HTML:')
  matches.forEach((match, i) => {
    console.log(`${i + 1}. ${match[0]} - Quantidade: ${match[1]}`)
  })
  
  // Buscar também por "stock"
  const regexStock = /"stock"[:\s]*(\d+)/gi
  const matchesStock = [...html.matchAll(regexStock)]
  
  console.log('\n🔍 Buscas por "stock" no HTML:')
  matchesStock.forEach((match, i) => {
    console.log(`${i + 1}. ${match[0]}`)
  })
  
  // Buscar por data-stock ou similar
  const regexDataStock = /data-stock[=:"'\s]*(\d+)/gi
  const matchesDataStock = [...html.matchAll(regexDataStock)]
  
  console.log('\n🔍 Buscas por data-stock:')
  matchesDataStock.forEach((match, i) => {
    console.log(`${i + 1}. ${match[0]}`)
  })
  
  // Buscar por availability
  const regexAvail = /"availability"[:\s]*"([^"]+)"/gi
  const matchesAvail = [...html.matchAll(regexAvail)]
  
  console.log('\n🔍 Buscas por availability:')
  matchesAvail.forEach((match, i) => {
    console.log(`${i + 1}. ${match[0]}`)
  })
  
  await browser.close()
}

testarHtmlBruto().catch(console.error)
