const puppeteer = require('puppeteer')

async function testarLoginPrime() {
  console.log('🔐 Testando LOGIN na Prime Distribuidor...')
  console.log('⚠️  ATENÇÃO: Você precisa adicionar suas credenciais neste arquivo!')
  
  // TODO: Adicionar suas credenciais aqui
  const CREDENCIAIS = {
    email: 'SEU_EMAIL_AQUI',
    senha: 'SUA_SENHA_AQUI'
  }
  
  if (CREDENCIAIS.email === 'SEU_EMAIL_AQUI') {
    console.log('❌ Credenciais não configuradas!')
    console.log('📝 Edite este arquivo e adicione seu email e senha')
    return
  }
  
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 800 }
  })
  
  const page = await browser.newPage()
  
  try {
    // 1. Acessar página de login
    console.log('📄 Acessando página de login...')
    await page.goto('https://primedistribuidorj.com.br/minha-conta', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    await new Promise(r => setTimeout(r, 2000))
    
    // 2. Verificar se já está logado
    const jaLogado = await page.evaluate(() => {
      return document.body.textContent.includes('Olá') || 
             document.body.textContent.includes('Sair') ||
             !document.querySelector('#username')
    })
    
    if (jaLogado) {
      console.log('✅ Já estava logado!')
      
      // Verificar informações da conta
      const infoConta = await page.evaluate(() => {
        return {
          temNome: document.body.textContent.includes('Olá'),
          temSair: document.body.textContent.includes('Sair'),
          temPedidos: document.body.textContent.includes('Pedidos'),
          temEndereco: document.body.textContent.includes('Endereço')
        }
      })
      
      console.log('📊 Informações da conta:', infoConta)
      
    } else {
      console.log('🔑 Fazendo login...')
      
      // 3. Preencher formulário
      await page.type('#username', CREDENCIAIS.email, { delay: 50 })
      console.log('✅ Email preenchido')
      
      await page.type('#password', CREDENCIAIS.senha, { delay: 50 })
      console.log('✅ Senha preenchida')
      
      // 4. Clicar no botão de login
      await page.click('button[name="login"]')
      console.log('🖱️  Botão de login clicado')
      
      // 5. Aguardar redirecionamento
      await new Promise(r => setTimeout(r, 5000))
      
      // 6. Verificar se login foi bem-sucedido
      const loginSucesso = await page.evaluate(() => {
        return document.body.textContent.includes('Olá') || 
               document.body.textContent.includes('Sair') ||
               document.body.textContent.includes('Minha conta')
      })
      
      if (loginSucesso) {
        console.log('✅ LOGIN BEM-SUCEDIDO!')
        
        // Capturar screenshot
        await page.screenshot({ path: 'prime-logado.png', fullPage: true })
        console.log('📸 Screenshot salvo: prime-logado.png')
        
      } else {
        console.log('❌ Login falhou!')
        
        // Verificar mensagens de erro
        const erros = await page.evaluate(() => {
          const mensagensErro = []
          const seletores = ['.woocommerce-error', '.error', '[class*="error"]']
          
          seletores.forEach(seletor => {
            const elementos = document.querySelectorAll(seletor)
            elementos.forEach(el => {
              const texto = el.textContent?.trim()
              if (texto) mensagensErro.push(texto)
            })
          })
          
          return mensagensErro
        })
        
        if (erros.length > 0) {
          console.log('⚠️  Mensagens de erro:', erros)
        }
        
        // Capturar screenshot do erro
        await page.screenshot({ path: 'prime-erro-login.png', fullPage: true })
        console.log('📸 Screenshot do erro salvo: prime-erro-login.png')
      }
    }
    
    // 7. Testar acesso a uma categoria (com login)
    console.log('\n📂 Testando acesso a categorias com login...')
    await page.goto('https://primedistribuidorj.com.br', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    await new Promise(r => setTimeout(r, 2000))
    
    // Buscar primeira categoria
    const primeiraCategoria = await page.evaluate(() => {
      const links = document.querySelectorAll('nav a, .menu a')
      for (const link of links) {
        const href = link.href
        const texto = link.textContent?.trim()
        
        if (href && texto && 
            !href.includes('#') &&
            !href.includes('login') &&
            !href.includes('conta') &&
            texto.length > 2) {
          return { url: href, texto }
        }
      }
      return null
    })
    
    if (primeiraCategoria) {
      console.log(`🔍 Acessando categoria: ${primeiraCategoria.texto}`)
      await page.goto(primeiraCategoria.url, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      })
      await new Promise(r => setTimeout(r, 2000))
      
      // Verificar produtos e preços
      const produtos = await page.evaluate(() => {
        const prods = []
        const elementos = document.querySelectorAll('.product, [class*="product"]')
        
        elementos.forEach((el, i) => {
          if (i < 3) {
            const titulo = el.querySelector('.woocommerce-loop-product__title, h2, h3')
            const preco = el.querySelector('.price, [class*="price"]')
            const link = el.querySelector('a')
            
            prods.push({
              titulo: titulo?.textContent?.trim(),
              preco: preco?.textContent?.trim(),
              url: link?.href
            })
          }
        })
        
        return prods
      })
      
      console.log('📦 Produtos encontrados:', produtos.length)
      if (produtos.length > 0) {
        console.log('Exemplos:', produtos)
        console.log('✅ Consegue ver preços!')
      } else {
        console.log('⚠️  Nenhum produto encontrado')
      }
    }
    
    console.log('\n✅ Teste de login concluído!')
    
  } catch (error) {
    console.error('❌ Erro:', error.message)
    await page.screenshot({ path: 'prime-erro.png', fullPage: true })
    console.log('📸 Screenshot do erro salvo: prime-erro.png')
  } finally {
    console.log('\n⏳ Aguardando 5 segundos antes de fechar...')
    await new Promise(r => setTimeout(r, 5000))
    await browser.close()
  }
}

testarLoginPrime()
