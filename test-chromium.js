const puppeteer = require('puppeteer')

async function testChromium() {
  console.log('🧪 Testando inicialização do Chromium...')
  console.log('Environment:')
  console.log('  PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH)
  console.log('  NODE_ENV:', process.env.NODE_ENV)
  console.log('  DISABLE_CRASHPAD:', process.env.DISABLE_CRASHPAD)
  console.log('')

  const commonArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--disable-software-rasterizer',
    '--disable-extensions',
    '--no-first-run',
    '--disable-crash-reporter',
    '--disable-breakpad',
    '--no-zygote',
    '--single-process',
    '--disable-background-networking',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-features=TranslateUI',
    '--disable-ipc-flooding-protection',
    '--disable-hang-monitor',
    '--disable-popup-blocking',
    '--disable-prompt-on-repost',
    '--disable-sync',
    '--force-color-profile=srgb',
    '--metrics-recording-only',
    '--no-default-browser-check',
    '--safebrowsing-disable-auto-update',
    '--enable-automation',
    '--password-store=basic',
    '--use-mock-keychain',
    '--hide-scrollbars',
    '--mute-audio'
  ]

  const chromiumPaths = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/nix/var/nix/profiles/default/bin/chromium'
  ].filter(Boolean)

  let browser = null

  for (const execPath of chromiumPaths) {
    try {
      console.log(`\n📍 Tentando: ${execPath}`)
      browser = await puppeteer.launch({
        headless: 'new',
        executablePath: execPath,
        args: commonArgs
      })
      console.log(`✅ Sucesso com: ${execPath}`)
      
      // Testar navegação
      const page = await browser.newPage()
      await page.goto('https://example.com', { waitUntil: 'domcontentloaded', timeout: 10000 })
      const title = await page.title()
      console.log(`📄 Página carregada: ${title}`)
      
      await browser.close()
      console.log('\n🎉 Chromium funcionando perfeitamente!')
      process.exit(0)
    } catch (err) {
      console.log(`❌ Falhou: ${err.message}`)
      if (browser) {
        try { await browser.close() } catch {}
      }
    }
  }

  // Tentar bundled como último recurso
  try {
    console.log(`\n📍 Tentando Chromium bundled do Puppeteer`)
    browser = await puppeteer.launch({
      headless: 'new',
      args: commonArgs
    })
    console.log(`✅ Sucesso com Chromium bundled`)
    
    const page = await browser.newPage()
    await page.goto('https://example.com', { waitUntil: 'domcontentloaded', timeout: 10000 })
    const title = await page.title()
    console.log(`📄 Página carregada: ${title}`)
    
    await browser.close()
    console.log('\n🎉 Chromium funcionando perfeitamente!')
    process.exit(0)
  } catch (err) {
    console.log(`❌ Falhou: ${err.message}`)
    if (browser) {
      try { await browser.close() } catch {}
    }
  }

  console.error('\n💥 Nenhum método funcionou!')
  process.exit(1)
}

testChromium()
