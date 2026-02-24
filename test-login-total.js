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
    
    // Descobrir os seletores corretos
    const seletores = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'))
      return inputs.map(input => ({
        id: input.id,
        name: input.name,
        type: input.type,
        placeholder: input.placeholder,
        class: input.className
      }))
    })
    
    console.log('📋 Inputs encontrados:', JSON.stringify(seletores, null, 2))
    
    // Tentar encontrar campos de login
    const campoUsuario = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"]'))
      return inputs.map(i => i.id || i.name || i.className).filter(Boolean)
    })
    
    const campoSenha = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="password"]'))
      return inputs.map(i => i.id || i.name || i.className).filter(Boolean)
    })
    
    console.log('👤 Campos de usuário:', campoUsuario)
    console.log('🔒 Campos de senha:', campoSenha)
    
    // Aguardar 10 segundos para inspeção manual
    console.log('⏳ Aguardando 10 segundos para inspeção manual...')
    await new Promise(r => setTimeout(r, 10000))
    
  } catch (error) {
    console.error('❌ Erro:', error)
  } finally {
    await browser.close()
  }
}

testarLoginTotal()
