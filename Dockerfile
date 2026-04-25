# ============================================
# Stage 1: Build + Install Playwright
# ============================================
FROM oven/bun:1.2-slim AS builder

WORKDIR /app

# Install Playwright dependencies (minimal)
RUN apt-get update && apt-get install -y --no-install-recommends \
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
  && rm -rf /var/lib/apt/lists/*

# Copy dependencies
COPY package.json bun.lock* ./
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN bun install --frozen-lockfile

# Install Playwright Chromium (bundled version, not system)
RUN bunx playwright install chromium

# Copy source and build
COPY . .
RUN bun run build

# ============================================
# Stage 2: Runtime (Debian slim)
# ============================================
FROM debian:bookworm-slim AS runner

# Install runtime deps (minimal, no chromium package)
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  curl \
  unzip \
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
  libpangoft2-1.0-0 \
  libharfbuzz0b \
  libfreetype6 \
  libcairo2 \
  libatspi2.0-0 \
  libxshmfence1 \
  fonts-liberation \
  fonts-noto-color-emoji \
  fontconfig \
  && rm -rf /var/lib/apt/lists/*

# Install bun binary only
RUN curl -fsSL https://bun.sh/install | bash && \
  mv /root/.bun/bin/bun /usr/local/bin/bun && \
  rm -rf /root/.bun

# Download LxgwWenKai font (霞鹜文楷)
RUN mkdir -p /usr/local/share/fonts/lxgw-wenkai && \
  curl --http1.1 -L -o /tmp/lxgw-wenkai.ttf \
    https://github.com/lxgw/LxgwWenKai/releases/download/v1.522/LxgwWenKai.ttf && \
  curl --http1.1 -L -o /tmp/lxgw-wenkai-bold.ttf \
    https://github.com/lxgw/LxgwWenKai/releases/download/v1.522/LxgwWenKai-Bold.ttf && \
  cp /tmp/lxgw-wenkai*.ttf /usr/local/share/fonts/lxgw-wenkai/ && \
  rm -rf /tmp/lxgw-wenkai*.ttf && \
  fc-cache -f && \
  chmod -R 755 /usr/local/share/fonts/lxgw-wenkai && \
  chmod -R 644 /var/cache/fontconfig

WORKDIR /app

# Create user
RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs bunuser

# Copy Playwright browsers from builder
COPY --from=builder /root/.cache/ms-playwright /app/.playwright
RUN chown -R bunuser:nodejs /app/.playwright

# Copy only necessary files
COPY --from=builder --chown=bunuser:nodejs /app/dist ./dist
COPY --from=builder --chown=bunuser:nodejs /app/public ./public
COPY --from=builder --chown=bunuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=bunuser:nodejs /app/package.json ./
COPY --chown=bunuser:nodejs scripts/cli ./scripts/cli
COPY --chown=bunuser:nodejs docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create data directories (input, output, logs)
RUN mkdir -p /app/data/input /app/data/output /app/data/logs && chown -R bunuser:nodejs /app/data

# Environment - use Playwright bundled Chromium
ENV RUNNING_IN_DOCKER=true
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.playwright

EXPOSE 3000

USER bunuser

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["bun", "scripts/cli/index.ts", "server", "-p", "3000", "-o", "/app/data/output", "-l", "/app/data/logs"]