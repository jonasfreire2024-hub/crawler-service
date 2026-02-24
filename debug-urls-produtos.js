const puppeteer = require('puppeteer')

async function debugUrlsProdutos() {
  console.log('🔍 Debugando URLs de produtos...')
  
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
  
  // Ir para a página de promoções
  console.log('\n📂 Acessando página de promoções...')
  await page.goto('https://lordistribuidor.com.br/promocoes', { 
    waitUntil: 'networkidle2', 
    timeout: 30000 
  })
  await new Promise(r => setTimeout(r, 3000))
  
  // Extrair TODOS os links da página
  const todosLinks = await page.evaluate(() => {
    const links = []
    document.querySelectorAll('a').forEach(link => {
      if (link.href) {
        links.push(link.href)
      }
    })
    return links
  })
  
  console.log(`\n📋 Total de links na página: ${todosLinks.length}`)
  
  // Filtrar links que parecem ser de produtos
  const linksProdutos = todosLinks.filter(link => 
    link.includes('lordistribuidor.com.br') && 
    !link.includes('minha-conta') &&
    !link.includes('carrinho') &&
    !link.includes('checkout') &&
    !link.includes('categoria') &&
    !link.includes('/c/') &&
    link !== 'https://lordistribuidor.com.br/' &&
    link !== 'https://lordistribuidor.com.br'
  )
  
  console.log(`\n🔍 Links que parecem ser produtos (${linksProdutos.length}):`)
  linksProdutos.slice(0, 10).forEach(link => console.log(`   ${link}`))
  
  // Buscar especificamente por /produto/
  const linksComProduto = todosLinks.filter(link => link.includes('/produto/'))
  console.log(`\n🎯 Links com "/produto/" (${linksComProduto.length}):`)
  linksComProduto.slice(0, 10).forEach(link => console.log(`   ${link}`))
  
  // Verificar o HTML da página
  const html = await page.content()
  const temProduto = html.includes('/produto/')
  console.log(`\n📄 HTML contém "/produto/": ${temProduto}`)
  
  // Buscar padrões alternativos
  const padroes = [
    '/produto/',
    '/product/',
    '/p/',
    '/item/',
    'product_id',
    'produto_id'
  ]
  
  console.log('\n🔎 Buscando padrões alternativos no HTML:')
  padroes.forEach(padrao => {
    const tem = html.includes(padrao)
    console.log(`   ${padrao}: ${tem}`)
  })
  
  await browser.close()
}

debugUrlsProdutos()
