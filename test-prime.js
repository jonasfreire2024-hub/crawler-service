const puppeteer = require('puppeteer')

async function testarPrime() {
  console.log('🧪 Testando Prime Distribuidor...')
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  })
  
  const page = await browser.newPage()
  
  try {
    // 1. Acessar página inicial
    console.log('📄 Acessando página inicial...')
    await page.goto('https://primedistribuidorj.com.br', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    await new Promise(r => setTimeout(r, 3000))
    
    // 2. Verificar estrutura da página
    const estrutura = await page.evaluate(() => {
      return {
        titulo: document.title,
        temMenuPrincipal: !!document.querySelector('nav, .menu, header'),
        temProdutos: !!document.querySelector('.product, .produto, [class*="product"]'),
        temCategorias: !!document.querySelector('.category, .categoria, [class*="category"]'),
        temLogin: !!document.querySelector('a[href*="conta"], a[href*="login"]'),
        plataforma: document.body.className.includes('woocommerce') ? 'WooCommerce' : 'Desconhecida'
      }
    })
    
    console.log('📊 Estrutura da página:', estrutura)
    
    // 3. Tentar acessar página de login
    console.log('🔐 Tentando acessar página de login...')
    await page.goto('https://primedistribuidorj.com.br/minha-conta', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    await new Promise(r => setTimeout(r, 2000))
    
    // 4. Verificar campos de login
    const camposLogin = await page.evaluate(() => {
      const campos = {
        username: null,
        password: null,
        botaoLogin: null,
        formulario: null
      }
      
      // Procurar campo de usuário/email
      const possiveisUsername = [
        '#username', '#user', '#email', 
        'input[name="username"]', 'input[name="email"]',
        'input[type="email"]', 'input[type="text"]'
      ]
      
      for (const seletor of possiveisUsername) {
        const campo = document.querySelector(seletor)
        if (campo) {
          campos.username = {
            id: campo.id,
            name: campo.name,
            type: campo.type,
            placeholder: campo.placeholder
          }
          break
        }
      }
      
      // Procurar campo de senha
      const possiveisSenha = [
        '#password', '#pass', '#senha',
        'input[name="password"]', 'input[type="password"]'
      ]
      
      for (const seletor of possiveisSenha) {
        const campo = document.querySelector(seletor)
        if (campo) {
          campos.password = {
            id: campo.id,
            name: campo.name,
            type: campo.type,
            placeholder: campo.placeholder
          }
          break
        }
      }
      
      // Procurar botão de login
      const possiveisBotoes = [
        'button[name="login"]',
        'button[type="submit"]',
        'input[type="submit"]',
        '.login-button',
        '[class*="login"]'
      ]
      
      for (const seletor of possiveisBotoes) {
        const botao = document.querySelector(seletor)
        if (botao) {
          campos.botaoLogin = {
            tag: botao.tagName,
            name: botao.name,
            type: botao.type,
            text: botao.textContent?.trim()
          }
          break
        }
      }
      
      // Verificar formulário
      const form = document.querySelector('form')
      if (form) {
        campos.formulario = {
          action: form.action,
          method: form.method,
          id: form.id,
          class: form.className
        }
      }
      
      return campos
    })
    
    console.log('🔍 Campos de login encontrados:', JSON.stringify(camposLogin, null, 2))
    
    // 5. Buscar categorias
    console.log('📂 Buscando categorias...')
    await page.goto('https://primedistribuidorj.com.br', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    await new Promise(r => setTimeout(r, 2000))
    
    const categorias = await page.evaluate(() => {
      const cats = []
      const links = document.querySelectorAll('a')
      
      links.forEach(link => {
        const href = link.href
        const texto = link.textContent?.trim()
        
        // Filtrar links que parecem ser categorias
        if (href && texto && 
            !href.includes('#') &&
            !href.includes('login') &&
            !href.includes('conta') &&
            !href.includes('carrinho') &&
            texto.length > 2 &&
            texto.length < 50) {
          
          const isMenu = link.closest('nav, header, .menu')
          if (isMenu) {
            cats.push({
              texto,
              url: href,
              localizacao: 'menu'
            })
          }
        }
      })
      
      return cats.slice(0, 10) // Primeiras 10
    })
    
    console.log('📋 Categorias encontradas:', categorias.length)
    if (categorias.length > 0) {
      console.log('Exemplos:', categorias.slice(0, 5))
    }
    
    // 6. Testar uma categoria (se encontrou)
    if (categorias.length > 0) {
      const primeiraCategoria = categorias[0]
      console.log(`\n🔍 Testando categoria: ${primeiraCategoria.texto}`)
      
      await page.goto(primeiraCategoria.url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      })
      await new Promise(r => setTimeout(r, 2000))
      
      const produtos = await page.evaluate(() => {
        const prods = []
        
        // Seletores comuns para produtos WooCommerce
        const seletores = [
          '.product',
          '.produto',
          '[class*="product"]',
          '.woocommerce-loop-product'
        ]
        
        for (const seletor of seletores) {
          const elementos = document.querySelectorAll(seletor)
          if (elementos.length > 0) {
            elementos.forEach((el, i) => {
              if (i < 3) { // Primeiros 3
                const link = el.querySelector('a')
                const titulo = el.querySelector('.woocommerce-loop-product__title, h2, h3, .product-title')
                const preco = el.querySelector('.price, .preco, [class*="price"]')
                
                prods.push({
                  titulo: titulo?.textContent?.trim(),
                  preco: preco?.textContent?.trim(),
                  url: link?.href
                })
              }
            })
            break
          }
        }
        
        return prods
      })
      
      console.log('📦 Produtos encontrados:', produtos.length)
      if (produtos.length > 0) {
        console.log('Exemplos:', produtos)
      }
    }
    
    console.log('\n✅ Teste concluído!')
    console.log('\n📝 RESUMO:')
    console.log('- Plataforma:', estrutura.plataforma)
    console.log('- Tem login:', estrutura.temLogin)
    console.log('- Campos de login:', camposLogin.username ? 'Encontrados' : 'Não encontrados')
    console.log('- Categorias:', categorias.length)
    console.log('- Padrão similar a:', estrutura.plataforma === 'WooCommerce' ? 'Lord Distribuidor' : 'Desconhecido')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await browser.close()
  }
}

testarPrime()
