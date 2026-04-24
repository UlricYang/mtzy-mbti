# ============================================
# Stage 1: Base image with Playwright
# ============================================
FROM oven/bun:1.2 AS base

# Install Playwright dependencies and Chromium
RUN apt-get update && apt-get install -y \
  libglib2.0-0 \
  libnss3 \
  libnspr4 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libasound2 \
  libpango-1.0-0 \
  libcairo2 \
  libatspi2.0-0 \
  libxshmfence1 \
  fonts-liberation \
  fonts-noto-color-emoji \
  fontconfig \
  unzip \
  curl
# Install Xvfb for headless browser support in Docker
RUN apt-get update && apt-get install -y \
  xvfb \
  && rm -rf /var/lib/apt/lists/*

# Download and install Maple Mono NF CN font (with Nerd Font icons and Chinese support)
RUN mkdir -p /usr/local/share/fonts/maple && \
  curl --http1.1 -L -o /tmp/maple-font.zip \
    https://github.com/subframe7536/maple-font/releases/download/v7.9/MapleMono-NF-CN-unhinted.zip && \
  unzip /tmp/maple-font.zip -d /tmp/maple-font && \
  cp /tmp/maple-font/*.ttf /usr/local/share/fonts/maple/ && \
  rm -rf /tmp/maple-font.zip /tmp/maple-font

# Rebuild font cache
RUN fc-cache -f -v

WORKDIR /app

# ============================================
# Stage 2: Install dependencies
# ============================================
FROM base AS deps

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies (skip Puppeteer browser download - we use Playwright)
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN bun install --frozen-lockfile

# Install Playwright browsers
RUN bunx playwright install chromium --with-deps

# ============================================
# Stage 3: Build production
# ============================================
FROM deps AS builder

# Copy source code
COPY . .

# Build frontend
RUN bun run build

# ============================================
# Stage 4: Production image
# ============================================
FROM base AS runner

WORKDIR /app

# Create non-root user
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs bunuser

# Copy built files and dependencies
COPY --from=builder --chown=bunuser:nodejs /app/dist ./dist
COPY --from=builder --chown=bunuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=bunuser:nodejs /app/package.json ./
COPY --from=builder --chown=bunuser:nodejs /app/scripts ./scripts
COPY --from=builder --chown=bunuser:nodejs /app/public ./public
COPY --from=builder --chown=bunuser:nodejs /app/src ./src
# Copy entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

COPY --from=builder --chown=bunuser:nodejs /app/index.html ./
COPY --from=builder --chown=bunuser:nodejs /app/vite.config.ts ./
COPY --from=builder --chown=bunuser:nodejs /app/tsconfig.json ./
COPY --from=builder --chown=bunuser:nodejs /app/tsconfig.node.json ./

# Copy Playwright browsers to app directory (accessible by bunuser)
COPY --from=deps /root/.cache/ms-playwright /app/.playwright
RUN chown -R bunuser:nodejs /app/.playwright

# Create data directory structure for Docker volumes
# Single mount point: /app/data contains input/, output/, and log/
RUN mkdir -p /app/data/input /app/data/output /app/data/log && chown -R bunuser:nodejs /app/data

# Give bunuser write permission to entire /app directory (needed for vite config loading)
RUN chown -R bunuser:nodejs /app
# Set environment variables for Docker detection and Playwright
ENV RUNNING_IN_DOCKER=true
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright
# Expose ports
# 3000: API server
# 3001: Vite preview server
EXPOSE 3000 3001

# Switch to non-root user
USER bunuser

# Default command: run web server with Xvfb
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["bun", "scripts/cli/index.ts", "server", "-p", "3000", "-o", "/app/data/output"]
