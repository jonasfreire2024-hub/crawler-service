const puppeteer = require('puppeteer')

async function testarLoginTotal() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    console.log('🔐 Acessando página de login...')
    await page.goto('https://totaldistribuicaorj.com.br/Login', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    
    await new Promise(r => setTimeout(r, 3000))
    
    // Tentar método 1: Formulário Forminator (dinâmico)
    const formularioForminator = await page.$('input[id^="forminator-field-text-1"]')
    if (formularioForminator) {
      console.log('✅ Formulário Forminator encontrado')
      const idUsuario = await page.evaluate(() => {
        const input = document.querySelector('input[id^="forminator-field-text-1"]')
        return input ? input.id : null
      })
      const idSenha = await page.evaluate(() => {
        const input = document.querySelector('input[id^="forminator-field-password-1"]')
        return input ? input.id : null
      })
      
      console.log('👤 ID usuário:', idUsuario)
      console.log('🔒 ID senha:', idSenha)
      
      if (idUsuario && idSenha) {
        console.log('⌨️ Digitando credenciais...')
        await page.type(`#${idUsuario}`, '45281091000119', { delay: 50 })
        await page.type(`#${idSenha}`, '45281', { delay: 50 })
        
        console.log('🖱️ Clicando no botão de login...')
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'))
          const loginButton = buttons.find(btn => 
            btn.textContent?.toLowerCase().includes('entrar') ||
            btn.textContent?.toLowerCase().includes('login')
          )
          if (loginButton) {
            console.log('Botão encontrado:', loginButton.textContent)
            loginButton.click()
          }
        })
      }
    } else {
      console.log('⚠️ Formulário Forminator não encontrado, tentando WooCommerce...')
      await page.type('#username', '45281091000119', { delay: 50 })
      await page.type('#password', '45281', { delay: 50 })
      await page.click('button[name="login"]')
    }
    
    console.log('⏳ Aguardando 5 segundos...')
    await new Promise(r => setTimeout(r, 5000))
    
    const url = page.url()
    console.log('📍 URL atual:', url)
    
    if (url.includes('minha-conta') || url.includes('my-account')) {
      console.log('✅ Login realizado com sucesso!')
    } else {
      console.log('⚠️ Login pode não ter funcionado')
    }
    
    // Aguardar 10 segundos para verificação manual
    console.log('⏳ Aguardando 10 segundos para verificação manual...')
    await new Promise(r => setTimeout(r, 10000))
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await browser.close()
  }
}

testarLoginTotal()
