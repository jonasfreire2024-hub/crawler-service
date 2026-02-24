const puppeteer = require('puppeteer')

/**
 * TESTE PARA NOVO CONCORRENTE
 * 
 * Este script analisa a estrutura do site do concorrente e cria o código de extração
 * 
 * INSTRUÇÕES:
 * 1. Substitua a URL_BASE pela URL do novo concorrente
 * 2. Se precisar de login, preencha EMAIL e SENHA
 * 3. Execute: node test-novo-concorrente.js
 * 4. Analise os screenshots e logs para entender a estrutura
 * 5. Ajuste os seletores conforme necessário
 */

// ============================================
// CONFIGURAÇÕES - TOTAL DISTRIBUIÇÃO
// ============================================
const URL_BASE = 'https://totaldistribuicaorj.com.br'
const PRECISA_LOGIN = true
const EMAIL = '45281091000119'
const SENHA = '45281'
const URL_LOGIN = 'https://totaldistribuicaorj.com.br/Login'

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

async function fazerLogin(page) {
  if (!PRECISA_LOGIN) {
    console.log('⏭️ Login não necessário, pulando...\n')
    return true
  }
  
  console.log('🔐 Fazendo login...')
  console.log(`   URL: ${URL_LOGIN}`)
  
  try {
    await page.goto(URL_LOGIN, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await new Promise(r => setTimeout(r, 3000))
    
    // Screenshot da página de login
    await page.screenshot({ path: 'debug-01-login-page.png' })
    console.log('   📸 Screenshot: debug-01-login-page.png')
    
    // Inspecionar campos do formulário
    const formInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'))
      return inputs.map(input => ({
        type: input.type,
        name: input.name,
        id: input.id,
        placeholder: input.placeholder,
        className: input.className
      }))
    })
    
    console.log('   📋 Campos encontrados:', JSON.stringify(formInfo, null, 2))
    
    // Encontrar campo de email/usuário
    const emailField = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'))
      const emailInput = inputs.find(input => 
        input.type === 'email' || 
        input.type === 'text' ||
        input.name?.toLowerCase().includes('email') ||
        input.name?.toLowerCase().includes('usuario') ||
        input.name?.toLowerCase().includes('login') ||
        input.id?.toLowerCase().includes('email') ||
        input.id?.toLowerCase().includes('usuario') ||
        input.placeholder?.toLowerCase().includes('email') ||
        input.placeholder?.toLowerCase().includes('usuário')
      )
      
      if (!emailInput) return null
      
      return {
        selector: emailInput.id ? `#${emailInput.id}` : 
                 emailInput.name ? `input[name="${emailInput.name}"]` :
                 emailInput.className ? `.${emailInput.className.split(' ')[0]}` : null
      }
    })
    
    // Encontrar campo de senha
    const passwordField = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'))
      const passwordInput = inputs.find(input => 
        input.type === 'password' ||
        input.name?.toLowerCase().includes('senha') ||
        input.name?.toLowerCase().includes('password') ||
        input.id?.toLowerCase().includes('senha') ||
        input.id?.toLowerCase().includes('password')
      )
      
      if (!passwordInput) return null
      
      return {
        selector: passwordInput.id ? `#${passwordInput.id}` : 
                 passwordInput.name ? `input[name="${passwordInput.name}"]` :
                 passwordInput.className ? `.${passwordInput.className.split(' ')[0]}` : null
      }
    })
    
    if (!emailField || !passwordField) {
      console.log('   ❌ Campos de login não encontrados')
      console.log('   Email field:', emailField)
      console.log('   Password field:', passwordField)
      return false
    }
    
    console.log(`   ✅ Campos encontrados:`)
    console.log(`      Email: ${emailField.selector}`)
    console.log(`      Senha: ${passwordField.selector}`)
    
    // Preencher formulário
    await page.type(emailField.selector, EMAIL)
    await page.type(passwordField.selector, SENHA)
    
    // Encontrar e clicar no botão de login
    const buttonClicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'))
      const loginButton = buttons.find(btn => 
        btn.textContent?.toLowerCase().includes('entrar') ||
        btn.textContent?.toLowerCase().includes('login') ||
        btn.value?.toLowerCase().includes('entrar') ||
        btn.className?.toLowerCase().includes('login')
      )
      
      if (loginButton) {
        loginButton.click()
        return true
      }
      return false
    })
    
    if (!buttonClicked) {
      console.log('   ❌ Botão de login não encontrado')
      return false
    }
    
    // Aguardar navegação
    try {
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 })
      console.log('   ✅ Login realizado com sucesso!\n')
    } catch (e) {
      console.log('   ⚠️ Timeout na navegação, mas pode ter funcionado\n')
    }
    
    await new Promise(r => setTimeout(r, 2000))
    return true
    
  } catch (error) {
    console.error('   ❌ Erro no login:', error.message)
    return false
  }
}

async function analisarHome(page) {
  console.log('🏠 Analisando página inicial...')
  console.log(`   URL: ${URL_BASE}`)
  
  await page.goto(URL_BASE, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await new Promise(r => setTimeout(r, 3000))
  
  // Screenshot da home
  await page.screenshot({ path: 'debug-02-home-page.png', fullPage: true })
  console.log('   📸 Screenshot: debug-02-home-page.png')
  
  // Analisar estrutura da página
  const analiseHome = await page.evaluate(() => {
    return {
      title: document.title,
      url: window.location.href,
      hasWooCommerce: !!document.querySelector('.woocommerce, [class*="woocommerce"]'),
      hasShopify: !!document.querySelector('[data-shopify], .shopify'),
      hasVtex: !!document.querySelector('[data-vtex], .vtex'),
      menuLinks: Array.from(document.querySelectorAll('nav a, .menu a, header a')).length,
      productElements: Array.from(document.querySelectorAll('.product, [class*="product"]')).length,
      images: Array.from(document.querySelectorAll('img')).length
    }
  })
  
  console.log('   📊 Análise da home:')
  console.log(`      Título: ${analiseHome.title}`)
  console.log(`      WooCommerce: ${analiseHome.hasWooCommerce ? '✅' : '❌'}`)
  console.log(`      Shopify: ${analiseHome.hasShopify ? '✅' : '❌'}`)
  console.log(`      VTEX: ${analiseHome.hasVtex ? '✅' : '❌'}`)
  console.log(`      Links no menu: ${analiseHome.menuLinks}`)
  console.log(`      Elementos de produto: ${analiseHome.productElements}`)
  console.log(`      Imagens: ${analiseHome.images}\n`)
  
  return analiseHome
}

async function extrairCategorias(page) {
  console.log('📂 Extraindo categorias do menu...')
  
  const categorias = await page.evaluate((baseUrl) => {
    const cats = new Set()
    
    // Seletores comuns para menus
    const seletores = [
      'nav a',
      '.menu a',
      'header a',
      '[class*="menu"] a',
      '[class*="nav"] a',
      'ul.menu li a',
      '.navbar a',
      '[role="navigation"] a'
    ]
    
    seletores.forEach(seletor => {
      try {
        const links = document.querySelectorAll(seletor)
        
        links.forEach(link => {
          let href = link.href
          if (!href || !href.startsWith(baseUrl)) return
          
          // Filtrar links indesejados
          if (href.includes('#') || 
              href.includes('login') || 
              href.includes('conta') ||
              href.includes('contato') || 
              href.includes('sobre') || 
              href.includes('blog') ||
              href.includes('carrinho') ||
              href.includes('checkout')) return
          
          href = href.split('?')[0].replace(/\/$/, '')
          
          if (href !== baseUrl && href.length > baseUrl.length + 2) {
            cats.add(href)
          }
        })
      } catch (e) {}
    })
    
    return Array.from(cats)
  }, URL_BASE)
  
  console.log(`   ✅ ${categorias.length} categorias encontradas`)
  
  if (categorias.length > 0) {
    console.log('   📋 Primeiras 10 categorias:')
    categorias.slice(0, 10).forEach((cat, i) => {
      console.log(`      ${i + 1}. ${cat}`)
    })
  }
  
  console.log('')
  return categorias
}

async function analisarCategoria(page, urlCategoria) {
  console.log('📦 Analisando página de categoria...')
  console.log(`   URL: ${urlCategoria}`)
  
  await page.goto(urlCategoria, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await new Promise(r => setTimeout(r, 3000))
  
  // Scroll para carregar lazy loading
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight)
  })
  await new Promise(r => setTimeout(r, 2000))
  
  // Screenshot da categoria
  await page.screenshot({ path: 'debug-03-categoria-page.png', fullPage: true })
  console.log('   📸 Screenshot: debug-03-categoria-page.png')
  
  // Analisar estrutura de produtos
  const analiseProdutos = await page.evaluate(() => {
    const resultado = {
      linksProduto: [],
      linksImagem: [],
      elementosComClasse: [],
      estruturaHTML: []
    }
    
    // 1. Procurar links que parecem ser de produtos
    document.querySelectorAll('a').forEach(link => {
      const href = link.href
      const text = link.textContent?.trim()
      const parent = link.parentElement
      
      // Verificar se tem imagem dentro
      const hasImage = link.querySelector('img') !== null
      
      if (hasImage && href && href.startsWith('http')) {
        resultado.linksProduto.push({
          href: href,
          text: text?.substring(0, 50),
          parentClass: parent?.className,
          hasImage: true
        })
      }
    })
    
    // 2. Procurar elementos com classes relacionadas a produtos
    const classesComuns = ['product', 'item', 'card', 'box', 'showcase']
    classesComuns.forEach(classe => {
      const elementos = document.querySelectorAll(`[class*="${classe}"]`)
      elementos.forEach(el => {
        const link = el.querySelector('a')
        if (link && link.href) {
          resultado.elementosComClasse.push({
            classe: el.className,
            href: link.href,
            html: el.outerHTML.substring(0, 200)
          })
        }
      })
    })
    
    // 3. Analisar estrutura HTML comum
    const containers = document.querySelectorAll('ul, div[class*="list"], div[class*="grid"], div[class*="products"]')
    containers.forEach(container => {
      const links = container.querySelectorAll('a')
      if (links.length > 2) { // Se tem vários links, pode ser lista de produtos
        resultado.estruturaHTML.push({
          tag: container.tagName,
          classe: container.className,
          qtdLinks: links.length,
          html: container.outerHTML.substring(0, 300)
        })
      }
    })
    
    return resultado
  })
  
  console.log('   📊 Análise de produtos:')
  console.log(`      Links com imagem: ${analiseProdutos.linksProduto.length}`)
  console.log(`      Elementos com classe: ${analiseProdutos.elementosComClasse.length}`)
  console.log(`      Containers HTML: ${analiseProdutos.estruturaHTML.length}`)
  
  if (analiseProdutos.linksProduto.length > 0) {
    console.log('\n   🔗 Primeiros 5 links de produtos:')
    analiseProdutos.linksProduto.slice(0, 5).forEach((link, i) => {
      console.log(`      ${i + 1}. ${link.href}`)
      console.log(`         Classe pai: ${link.parentClass}`)
    })
  }
  
  if (analiseProdutos.elementosComClasse.length > 0) {
    console.log('\n   📦 Primeiros 3 elementos com classe:')
    analiseProdutos.elementosComClasse.slice(0, 3).forEach((el, i) => {
      console.log(`      ${i + 1}. Classe: ${el.classe}`)
      console.log(`         URL: ${el.href}`)
    })
  }
  
  console.log('')
  return analiseProdutos
}

async function analisarProduto(page, urlProduto) {
  console.log('🔍 Analisando página de produto...')
  console.log(`   URL: ${urlProduto}`)
  
  await page.goto(urlProduto, { waitUntil: 'domcontentloaded', timeout: 30000 })
  await new Promise(r => setTimeout(r, 3000))
  
  // Screenshot do produto
  await page.screenshot({ path: 'debug-04-produto-page.png', fullPage: true })
  console.log('   📸 Screenshot: debug-04-produto-page.png')
  
  // Analisar estrutura do produto
  const dadosProduto = await page.evaluate(() => {
    const resultado = {
      // Dados extraídos
      nome: '',
      sku: '',
      preco: null,
      imagem: '',
      
      // Análise de seletores
      possiveisNomes: [],
      possiveisSKUs: [],
      possiveisPrecos: [],
      possiveisImagens: []
    }
    
    // NOME - procurar h1, h2, títulos
    const titulos = document.querySelectorAll('h1, h2, [class*="title"], [class*="name"]')
    titulos.forEach(el => {
      const texto = el.textContent?.trim()
      if (texto && texto.length > 5 && texto.length < 200) {
        resultado.possiveisNomes.push({
          seletor: el.tagName + (el.className ? `.${el.className.split(' ')[0]}` : ''),
          texto: texto.substring(0, 100)
        })
      }
    })
    
    // Pegar o primeiro h1 como nome principal
    const h1 = document.querySelector('h1')
    if (h1) resultado.nome = h1.textContent?.trim() || ''
    
    // SKU - procurar por padrões comuns
    const textoCompleto = document.body.textContent
    const skuPatterns = [
      /SKU[:\s]+([A-Z0-9-]+)/i,
      /Código[:\s]+([A-Z0-9-]+)/i,
      /Ref[:\s]+([A-Z0-9-]+)/i,
      /Referência[:\s]+([A-Z0-9-]+)/i
    ]
    
    skuPatterns.forEach(pattern => {
      const match = textoCompleto.match(pattern)
      if (match) {
        resultado.possiveisSKUs.push({
          pattern: pattern.toString(),
          valor: match[1]
        })
      }
    })
    
    // PREÇO - procurar por valores em R$
    const elementosPreco = document.querySelectorAll('[class*="price"], [class*="preco"], [class*="valor"]')
    elementosPreco.forEach(el => {
      const texto = el.textContent
      const match = texto?.match(/R\$\s*([0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]{2})?)/)
      if (match) {
        const preco = parseFloat(match[1].replace(/\./g, '').replace(',', '.'))
        resultado.possiveisPrecos.push({
          seletor: el.className,
          texto: texto?.trim().substring(0, 50),
          valor: preco
        })
      }
    })
    
    // Pegar o menor preço como principal
    if (resultado.possiveisPrecos.length > 0) {
      resultado.preco = Math.min(...resultado.possiveisPrecos.map(p => p.valor))
    }
    
    // IMAGEM - procurar imagens principais
    const imagens = document.querySelectorAll('img')
    imagens.forEach(img => {
      if (img.src && 
          img.src.startsWith('http') && 
          !img.src.includes('logo') && 
          !img.src.includes('icon') &&
          !img.src.includes('data:image') &&
          img.width > 100) {
        resultado.possiveisImagens.push({
          src: img.src,
          alt: img.alt,
          width: img.width,
          seletor: img.className || img.id || 'img'
        })
      }
    })
    
    // Pegar a primeira imagem grande como principal
    if (resultado.possiveisImagens.length > 0) {
      resultado.imagem = resultado.possiveisImagens[0].src
    }
    
    return resultado
  })
  
  console.log('   📊 Dados extraídos:')
  console.log(`      Nome: ${dadosProduto.nome || '❌ Não encontrado'}`)
  console.log(`      Preço: ${dadosProduto.preco ? `R$ ${dadosProduto.preco.toFixed(2)}` : '❌ Não encontrado'}`)
  console.log(`      Imagem: ${dadosProduto.imagem ? '✅ Encontrada' : '❌ Não encontrada'}`)
  
  console.log(`\n   🔍 Análise de seletores:`)
  console.log(`      Possíveis nomes: ${dadosProduto.possiveisNomes.length}`)
  console.log(`      Possíveis SKUs: ${dadosProduto.possiveisSKUs.length}`)
  console.log(`      Possíveis preços: ${dadosProduto.possiveisPrecos.length}`)
  console.log(`      Possíveis imagens: ${dadosProduto.possiveisImagens.length}`)
  
  if (dadosProduto.possiveisNomes.length > 0) {
    console.log('\n   📝 Possíveis seletores para NOME:')
    dadosProduto.possiveisNomes.slice(0, 3).forEach((item, i) => {
      console.log(`      ${i + 1}. ${item.seletor}`)
      console.log(`         "${item.texto}"`)
    })
  }
  
  if (dadosProduto.possiveisPrecos.length > 0) {
    console.log('\n   💰 Possíveis seletores para PREÇO:')
    dadosProduto.possiveisPrecos.slice(0, 3).forEach((item, i) => {
      console.log(`      ${i + 1}. .${item.seletor}`)
      console.log(`         R$ ${item.valor.toFixed(2)} - "${item.texto}"`)
    })
  }
  
  if (dadosProduto.possiveisImagens.length > 0) {
    console.log('\n   🖼️ Possíveis seletores para IMAGEM:')
    dadosProduto.possiveisImagens.slice(0, 3).forEach((item, i) => {
      console.log(`      ${i + 1}. ${item.seletor}`)
      console.log(`         ${item.src.substring(0, 80)}...`)
    })
  }
  
  console.log('')
  return dadosProduto
}

// ============================================
// FUNÇÃO PRINCIPAL
// ============================================

async function testarNovoConcorrente() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║  🧪 TESTE DE NOVO CONCORRENTE                              ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')
  
  console.log(`🌐 Site: ${URL_BASE}`)
  console.log(`🔐 Login necessário: ${PRECISA_LOGIN ? 'Sim' : 'Não'}\n`)
  
  let browser = null
  
  try {
    // Iniciar browser
    console.log('🚀 Iniciando navegador...\n')
    browser = await puppeteer.launch({
      headless: false, // Mostra o browser
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process'
      ]
    })
    
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    await page.setViewport({ width: 1920, height: 1080 })
    
    // Fazer login se necessário
    if (PRECISA_LOGIN) {
      const loginSucesso = await fazerLogin(page)
      if (!loginSucesso) {
        console.log('❌ Falha no login. Abortando teste.')
        await browser.close()
        return
      }
    }
    
    // Analisar home
    const analiseHome = await analisarHome(page)
    
    // Extrair categorias
    const categorias = await extrairCategorias(page)
    
    if (categorias.length === 0) {
      console.log('❌ Nenhuma categoria encontrada. Verifique a estrutura do site.')
      console.log('💡 Dica: Abra o screenshot debug-02-home-page.png e identifique manualmente as URLs das categorias.\n')
    } else {
      // Analisar primeira categoria
      const urlCategoria = categorias[0]
      const analiseProdutos = await analisarCategoria(page, urlCategoria)
      
      if (analiseProdutos.linksProduto.length > 0) {
        // Analisar primeiro produto
        const urlProduto = analiseProdutos.linksProduto[0].href
        const dadosProduto = await analisarProduto(page, urlProduto)
      } else {
        console.log('❌ Nenhum produto encontrado na categoria.')
        console.log('💡 Dica: Abra o screenshot debug-03-categoria-page.png e identifique manualmente os seletores.\n')
      }
    }
    
    console.log('╔════════════════════════════════════════════════════════════╗')
    console.log('║  ✅ TESTE CONCLUÍDO                                        ║')
    console.log('╚════════════════════════════════════════════════════════════╝\n')
    
    console.log('📸 Screenshots gerados:')
    console.log('   1. debug-01-login-page.png (se login necessário)')
    console.log('   2. debug-02-home-page.png')
    console.log('   3. debug-03-categoria-page.png')
    console.log('   4. debug-04-produto-page.png\n')
    
    console.log('📋 Próximos passos:')
    console.log('   1. Analise os screenshots e logs acima')
    console.log('   2. Identifique os seletores corretos para:')
    console.log('      - Categorias no menu')
    console.log('      - Links de produtos nas categorias')
    console.log('      - Nome, preço, imagem, SKU do produto')
    console.log('   3. Crie o arquivo de extração específico baseado nos seletores')
    console.log('   4. Teste a extração completa\n')
    
    console.log('⏸️ Navegador ficará aberto. Pressione Ctrl+C para fechar.')
    await new Promise(() => {}) // Manter aberto
    
  } catch (error) {
    console.error('\n❌ ERRO NO TESTE:', error.message)
    console.error(error.stack)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

// Executar teste
testarNovoConcorrente()
