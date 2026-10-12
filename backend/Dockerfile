# Use official Node.js image with Playwright dependencies pre-configured
FROM node:20-bookworm-slim

# Install system dependencies required by Chromium
RUN apt-get update && apt-get install -y --no-install-recommends \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    libasound2 \
    ca-certificates \
    fonts-liberation \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Ensure Playwright stores browsers inside node_modules
ENV PLAYWRIGHT_BROWSERS_PATH=0
ENV NODE_ENV=production

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npx playwright install chromium
RUN npm run build

EXPOSE 3001

CMD ["node", "dist/main"]
