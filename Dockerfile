FROM ghcr.io/puppeteer/puppeteer:21.6.1

WORKDIR /app

# Copiar arquivos
COPY package.json ./
RUN npm install --omit=dev

COPY . .

# Porta
EXPOSE 3001

# Iniciar
CMD ["node", "src/index.js"]
