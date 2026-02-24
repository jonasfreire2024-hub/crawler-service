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
    
    // Verificar todos os formulários e campos visíveis
    const formularios = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'))
      return forms.map((form, idx) => {
        const inputs = Array.from(form.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]'))
        return {
          index: idx,
          action: form.action,
          visible: form.offsetParent !== null,
          inputs: inputs.map(input => ({
            id: input.id,
            name: input.name,
            type: input.type,
            visible: input.offsetParent !== null
          }))
        }
      })
    })
    
    console.log('📋 Formulários encontrados:', JSON.stringify(formularios, null, 2))
    
    // Aguardar 20 segundos para inspeção manual
    console.log('⏳ Aguardando 20 segundos para inspeção manual...')
    await new Promise(r => setTimeout(r, 20000))
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await browser.close()
  }
}

testarLoginTotal()
