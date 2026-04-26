#!/bin/bash
set -e

# No Xvfb needed - Playwright uses headless Chromium directly
# with --no-sandbox and --disable-setuid-sandbox flags

# Execute the main command (pass all arguments)
exec "$@"
