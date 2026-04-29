#!/bin/bash
set -e

# ============================================
# MTZY-MBTI Docker Entrypoint
# ============================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
  echo "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
  echo "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo "${RED}[ERROR]${NC} $1"
}

# ============================================
# Environment Validation
# ============================================

validate_environment() {
  log_info "Validating environment..."

  # Check RUNNING_IN_DOCKER flag
  if [ "$RUNNING_IN_DOCKER" != "true" ]; then
    log_warn "RUNNING_IN_DOCKER not set, setting to true"
    export RUNNING_IN_DOCKER=true
  fi

  # Check Playwright browsers path
  if [ ! -d "$PLAYWRIGHT_BROWSERS_PATH" ]; then
    log_error "Playwright browsers not found at $PLAYWRIGHT_BROWSERS_PATH"
    exit 1
  fi

  # Check Chromium executable
  CHROMIUM_PATH=$(find "$PLAYWRIGHT_BROWSERS_PATH" -name 'chrome' -type f 2>/dev/null | head -1)
  if [ -z "$CHROMIUM_PATH" ]; then
    log_warn "Chromium executable not found in $PLAYWRIGHT_BROWSERS_PATH"
  else
    log_success "Chromium found: $CHROMIUM_PATH"
  fi

  log_success "Environment validated"
}

# ============================================
# Directory Setup
# ============================================

setup_directories() {
  log_info "Setting up directories..."

  # Ensure data directories exist
  for dir in /app/data/input /app/data/output /app/data/logs; do
    if [ ! -d "$dir" ]; then
      log_warn "Creating missing directory: $dir"
      mkdir -p "$dir"
    fi
  done

  # Ensure output/logs are writable (may be mounted with different permissions)
  chmod 755 /app/data 2>/dev/null || true
  chmod 755 /app/data/input 2>/dev/null || true
  chmod 777 /app/data/output 2>/dev/null || true
  chmod 777 /app/data/logs 2>/dev/null || true

  log_success "Directories ready"
  log_info "  - Input:  /app/data/input"
  log_info "  - Output: /app/data/output"
  log_info "  - Logs:   /app/data/logs"
}

# ============================================
# Font Verification
# ============================================

verify_fonts() {
  log_info "Verifying fonts..."

  FONT_DIR="/usr/local/share/fonts/lxgw-wenkai"
  if [ -d "$FONT_DIR" ]; then
    FONT_COUNT=$(ls -1 "$FONT_DIR"/*.ttf 2>/dev/null | wc -l)
    log_success "LxgwWenKai fonts found: $FONT_COUNT files"
  else
    log_warn "LxgwWenKai font directory not found"
  fi

  # Verify fontconfig cache
  if fc-list | grep -q "LxgwWenKai"; then
    log_success "Fontconfig registered LxgwWenKai"
  else
    log_warn "LxgwWenKai not in fontconfig cache"
  fi
}

# ============================================
# Optional: External API Configuration
# ============================================

check_filepath_api() {
  if [ -n "$FILEPATH_API_URL" ]; then
    log_info "External filepath API configured: $FILEPATH_API_URL"
    if [ -n "$API_TOKEN" ]; then
      log_info "API token provided (length: ${#API_TOKEN})"
    else
      log_warn "No API_TOKEN provided for external API"
    fi
  fi
}

# ============================================
# Debug Mode
# ============================================

if [ "$DEBUG" = "true" ]; then
  log_info "=== DEBUG MODE ENABLED ==="
  log_info "Environment variables:"
  env | grep -E '^(RUNNING_IN_DOCKER|PLAYWRIGHT|FILEPATH|API_TOKEN|DEBUG|PORT)' | while read line; do
    log_info "  $line"
  done
  log_info "Directory contents:"
  log_info "  /app/data: $(ls -la /app/data 2>/dev/null | tail -n +2 | wc -l) items"
  log_info "  /app/.playwright: $(ls -la /app/.playwright 2>/dev/null | tail -n +2 | wc -l) items"
fi

# ============================================
# Main Initialization
# ============================================

log_info "============================================"
log_info "MTZY-MBTI Container Starting"
log_info "============================================"

validate_environment
setup_directories
verify_fonts
check_filepath_api

log_info "============================================"
log_info "Ready to execute: $*"
log_info "============================================"

# Execute the main command (pass all arguments)
exec "$@"