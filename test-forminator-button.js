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
    
    console.log('⌨️ Preenchendo formulário Forminator...')
    await page.type('#forminator-field-text-1_699bc0386fcb5', '45281091000119', { delay: 100 })
    await new Promise(r => setTimeout(r, 500))
    
    await page.type('#forminator-field-password-1_699bc0386fcb5', '45281', { delay: 100 })
    await new Promise(r => setTimeout(r, 500))
    
    // Verificar valores preenchidos
    const valores = await page.evaluate(() => {
      return {
        username: document.querySelector('#forminator-field-text-1_699bc0386fcb5')?.value,
        password: document.querySelector('#forminator-field-password-1_699bc0386fcb5')?.value
      }
    })
    
    console.log('✅ Valores preenchidos:', valores)
    
    // Clicar no botão Login
    console.log('🖱️ Clicando no botão Login...')
    await page.evaluate(() => {
      const btn = document.querySelector('.forminator-button-submit')
      if (btn) {
        console.log('Botão encontrado:', btn.textContent)
        btn.click()
      }
    })
    
    console.log('⏳ Aguardando 10 segundos...')
    await new Promise(r => setTimeout(r, 10000))
    
    const url = page.url()
    console.log('📍 URL atual:', url)
    
    // Verificar se há mensagens de erro
    const erros = await page.evaluate(() => {
      const msgs = Array.from(document.querySelectorAll('.error, .woocommerce-error, .forminator-error, .forminator-response-message'))
      return msgs.map(m => m.textContent?.trim()).filter(Boolean)
    })
    
    if (erros.length > 0) {
      console.log('❌ Erros/Mensagens:', erros)
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
