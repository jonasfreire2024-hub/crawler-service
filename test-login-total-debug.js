const puppeteer = require('puppeteer')

async function testarLoginTotal() {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    
    // Capturar logs do console
    page.on('console', msg => console.log('🌐 Console:', msg.text()))
    
    console.log('🔐 Acessando página de login...')
    await page.goto('https://totaldistribuicaorj.com.br/Login', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    })
    
    await new Promise(r => setTimeout(r, 3000))
    
    // Verificar se há mensagens de erro
    const erros = await page.evaluate(() => {
      const msgs = Array.from(document.querySelectorAll('.error, .woocommerce-error, .forminator-error'))
      return msgs.map(m => m.textContent)
    })
    
    if (erros.length > 0) {
      console.log('⚠️ Erros encontrados:', erros)
    }
    
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
        
        // Verificar botões disponíveis
        const botoes = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'))
          return buttons.map(btn => ({
            text: btn.textContent?.trim(),
            type: btn.type,
            name: btn.name,
            class: btn.className
          }))
        })
        
        console.log('🔘 Botões encontrados:', JSON.stringify(botoes, null, 2))
        
        console.log('🖱️ Clicando no botão de login...')
        const clicou = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'))
          const loginButton = buttons.find(btn => 
            btn.textContent?.toLowerCase().includes('entrar') ||
            btn.textContent?.toLowerCase().includes('login')
          )
          if (loginButton) {
            loginButton.click()
            return true
          }
          return false
        })
        
        console.log('✅ Clique realizado:', clicou)
      }
    }
    
    console.log('⏳ Aguardando 8 segundos...')
    await new Promise(r => setTimeout(r, 8000))
    
    const url = page.url()
    console.log('📍 URL atual:', url)
    
    // Verificar se há mensagens de erro após login
    const errosLogin = await page.evaluate(() => {
      const msgs = Array.from(document.querySelectorAll('.error, .woocommerce-error, .forminator-error'))
      return msgs.map(m => m.textContent)
    })
    
    if (errosLogin.length > 0) {
      console.log('❌ Erros após login:', errosLogin)
    }
    
    if (url.includes('minha-conta') || url.includes('my-account')) {
      console.log('✅ Login realizado com sucesso!')
    } else {
      console.log('⚠️ Login pode não ter funcionado')
    }
    
    // Aguardar 15 segundos para verificação manual
    console.log('⏳ Aguardando 15 segundos para verificação manual...')
    await new Promise(r => setTimeout(r, 15000))
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await browser.close()
  }
}

testarLoginTotal()
