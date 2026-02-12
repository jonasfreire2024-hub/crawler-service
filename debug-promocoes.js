const puppeteer = require('puppeteer')

async function debugPromocoes() {
  console.log('🔍 DEBUG: Analisando página de promoções\n')
  
  const urlLogin = 'https://lordistribuidor.com.br/minha-conta'
  const urlPromocoes = 'https://lordistribuidor.com.br/promocoes'
  
  const email = 'projetofabiano1512@gmail.com'
  const senha = '151295'
  
  const browser = await puppeteer.launch({
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
  
  // ACESSAR PROMOÇÕES
  console.log('📦 Acessando promoções...')
  await page.goto(urlPromocoes, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await new Promise(r => setTimeout(r, 5000))
  
  // ANALISAR ESTRUTURA
  const analise = await page.evaluate(() => {
    const resultado = {
      totalLinks: 0,
      linksProduto: [],
      classesEncontradas: new Set(),
      estruturaHTML: ''
    }
    
    // Procurar por produtos
    const possiveisProdutos = document.querySelectorAll('li, article, div[class*="product"], div[class*="item"]')
    
    console.log(`Total de elementos analisados: ${possiveisProdutos.length}`)
    
    possiveisProdutos.forEach((el, i) => {
      if (i < 10) { // Primeiros 10 elementos
        const classes = el.className
        if (classes) {
          resultado.classesEncontradas.add(classes)
        }
        
        // Procurar links dentro
        const links = el.querySelectorAll('a')
        links.forEach(link => {
          if (link.href && link.href.includes('produto')) {
            resultado.linksProduto.push({
              url: link.href,
              texto: link.textContent?.trim().substring(0, 50),
              classes: link.className
            })
          }
        })
      }
    })
    
    // Pegar estrutura de um produto
    const primeiroProduto = document.querySelector('li[class*="product"], article[class*="product"]')
    if (primeiroProduto) {
      resultado.estruturaHTML = primeiroProduto.outerHTML.substring(0, 500)
    }
    
    resultado.totalLinks = document.querySelectorAll('a').length
    resultado.classesEncontradas = Array.from(resultado.classesEncontradas)
    
    return resultado
  })
  
  console.log('\n📊 ANÁLISE:')
  console.log(`Total de links na página: ${analise.totalLinks}`)
  console.log(`Links de produtos encontrados: ${analise.linksProduto.length}`)
  console.log(`\n🏷️ Classes encontradas:`)
  analise.classesEncontradas.slice(0, 10).forEach(c => console.log(`   - ${c}`))
  
  console.log(`\n🔗 Produtos encontrados:`)
  analise.linksProduto.slice(0, 5).forEach(p => {
    console.log(`   ${p.texto}`)
    console.log(`   ${p.url}`)
    console.log(`   Classes: ${p.classes}`)
    console.log('')
  })
  
  if (analise.estruturaHTML) {
    console.log(`\n📝 Estrutura HTML de um produto:`)
    console.log(analise.estruturaHTML)
  }
  
  console.log('\n💡 Deixe o browser aberto para inspecionar...')
  console.log('Pressione Ctrl+C para fechar')
  
  // Manter aberto
  await new Promise(() => {})
}

debugPromocoes().catch(console.error)
