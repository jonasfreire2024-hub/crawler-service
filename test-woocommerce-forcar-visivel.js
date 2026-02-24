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
    
    // Tornar o formulário WooCommerce visível
    console.log('👁️ Tornando formulário WooCommerce visível...')
    await page.evaluate(() => {
      const form = document.querySelector('form.woocommerce-form-login')
      if (form) {
        form.style.display = 'block'
        form.style.visibility = 'visible'
        form.style.opacity = '1'
        
        const username = document.querySelector('#username')
        const password = document.querySelector('#password')
        
        if (username) {
          username.style.display = 'block'
          username.style.visibility = 'visible'
        }
        if (password) {
          password.style.display = 'block'
          password.style.visibility = 'visible'
        }
      }
    })
    
    await new Promise(r => setTimeout(r, 1000))
    
    console.log('⌨️ Preenchendo formulário WooCommerce...')
    await page.evaluate(() => {
      document.querySelector('#username').value = '45281091000119'
      document.querySelector('#password').value = '45281'
    })
    
    await new Promise(r => setTimeout(r, 500))
    
    // Verificar valores preenchidos
    const valores = await page.evaluate(() => {
      return {
        username: document.querySelector('#username')?.value,
        password: document.querySelector('#password')?.value
      }
    })
    
    console.log('✅ Valores preenchidos:', valores)
    
    // Clicar no botão
    console.log('🖱️ Clicando no botão Acessar...')
    await page.evaluate(() => {
      const btn = document.querySelector('button[name="login"]')
      if (btn) {
        btn.click()
      }
    })
    
    console.log('⏳ Aguardando 10 segundos...')
    await new Promise(r => setTimeout(r, 10000))
    
    const url = page.url()
    console.log('📍 URL atual:', url)
    
    // Verificar se há mensagens de erro
    const erros = await page.evaluate(() => {
      const msgs = Array.from(document.querySelectorAll('.error, .woocommerce-error'))
      return msgs.map(m => m.textContent?.trim()).filter(Boolean)
    })
    
    if (erros.length > 0) {
      console.log('❌ Erros:', erros)
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
