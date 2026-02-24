const puppeteer = require('puppeteer')

async function testarLoginLord() {
  console.log('🧪 Testando login na Lord...')
  
  let browser = null
  
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    // Ir para página de login
    console.log('📍 Indo para página de login...')
    await page.goto('https://lordistribuidor.com.br/minha-conta', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    await new Promise(r => setTimeout(r, 2000))
    
    // Verificar se já está logado
    const jaLogado = await page.evaluate(() => {
      return document.body.textContent.includes('Olá') || 
             document.body.textContent.includes('Sair') ||
             !document.querySelector('#username')
    })
    
    if (jaLogado) {
      console.log('✅ Já está logado!')
    } else {
      console.log('🔐 Fazendo login...')
      
      // Preencher formulário
      await page.type('#username', 'projetofabiano1512@gmail.com', { delay: 100 })
      await page.type('#password', '151295', { delay: 100 })
      
      console.log('📝 Formulário preenchido')
      
      // Clicar no botão de login
      await page.click('button[name="login"]')
      console.log('🖱️ Clicou no botão de login')
      
      // Esperar 5 segundos para o login processar
      await new Promise(r => setTimeout(r, 5000))
      
      // Verificar se logou
      const loginSucesso = await page.evaluate(() => {
        return document.body.textContent.includes('Olá') || 
               document.body.textContent.includes('Sair') ||
               !document.querySelector('#username')
      })
      
      if (loginSucesso) {
        console.log('✅ Login realizado com sucesso!')
      } else {
        console.log('❌ Login falhou')
        await page.screenshot({ path: 'login-falhou.png' })
        console.log('📸 Screenshot salvo: login-falhou.png')
      }
    }
    
    // Pegar cookies
    const cookies = await page.cookies()
    console.log('\n🍪 Cookies obtidos:', cookies.length)
    console.log('Cookies importantes:')
    cookies.forEach(cookie => {
      if (cookie.name.includes('wordpress') || cookie.name.includes('woocommerce') || cookie.name.includes('session')) {
        console.log(`  - ${cookie.name}: ${cookie.value.substring(0, 50)}...`)
      }
    })
    
    // Salvar cookies em arquivo
    const fs = require('fs')
    fs.writeFileSync('lord-cookies.json', JSON.stringify(cookies, null, 2))
    console.log('\n💾 Cookies salvos em: lord-cookies.json')
    
    // Testar acessar uma categoria
    console.log('\n📂 Testando acesso a categoria com login...')
    await page.goto('https://lordistribuidor.com.br/c/sofas/sofa-2-lugares/', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    })
    await new Promise(r => setTimeout(r, 3000))
    
    // Procurar produtos
    const produtos = await page.evaluate(() => {
      const links = []
      document.querySelectorAll('a[href*="/produto/"]').forEach(link => {
        links.push({
          href: link.href,
          text: link.textContent?.trim().substring(0, 50)
        })
      })
      return links
    })
    
    console.log(`\n📦 Produtos encontrados: ${produtos.length}`)
    if (produtos.length > 0) {
      console.log('Primeiros 5 produtos:')
      produtos.slice(0, 5).forEach((p, i) => {
        console.log(`  ${i + 1}. ${p.text}`)
        console.log(`     ${p.href}`)
      })
    }
    
    await page.screenshot({ path: 'categoria-com-login.png', fullPage: true })
    console.log('\n📸 Screenshot salvo: categoria-com-login.png')
    
    console.log('\n✅ Teste concluído!')
    console.log('⏸️ Navegador ficará aberto. Pressione Ctrl+C para fechar.')
    await new Promise(() => {}) // Manter aberto
    
  } catch (error) {
    console.error('❌ Erro:', error)
    if (browser) await browser.close()
  }
}

testarLoginLord()
