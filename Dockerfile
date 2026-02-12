FROM node:20-slim

# Instalar dependências do Chromium e ferramentas de debug
RUN apt-get update && apt-get install -y \
    chromium \
    chromium-sandbox \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libwayland-client0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e instalar dependências
COPY package*.json ./
RUN npm ci --only=production

# Copiar código
COPY . .

# Criar wrapper do Chromium que desabilita crashpad
RUN echo '#!/bin/bash\nexec /usr/bin/chromium "$@" --disable-crash-reporter --disable-breakpad 2>&1 | grep -v "chrome_crashpad_handler"' > /usr/local/bin/chromium-wrapper \
    && chmod +x /usr/local/bin/chromium-wrapper

# Variáveis de ambiente
ENV PUPPETEER_EXECUTABLE_PATH=/usr/local/bin/chromium-wrapper
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production
ENV PORT=3001
ENV CHROME_DEVEL_SANDBOX=/usr/lib/chromium/chrome-sandbox
ENV DISABLE_CRASHPAD=1
ENV CHROME_CRASHPAD_PIPE_NAME=
ENV CHROME_CRASH_REPORTER_ENABLED=0

# Criar usuário não-root para segurança
RUN groupadd -r crawler && useradd -r -g crawler crawler \
    && chown -R crawler:crawler /app \
    && mkdir -p /tmp/.X11-unix \
    && chmod 1777 /tmp/.X11-unix

USER crawler

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Expor porta
EXPOSE 3001

# Comando para iniciar com logs detalhados
CMD ["node", "start.js"]
