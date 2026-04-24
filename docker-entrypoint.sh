#!/bin/bash
set -e

# Clean up stale X lock files from previous runs
rm -f /tmp/.X99-lock /tmp/.X11-unix/X99

# Start Xvfb for headless browser support
Xvfb :99 -screen 0 1920x1080x24 -nolisten tcp &
XVFB_PID=$!

# Wait for Xvfb to start
sleep 2

# Trap SIGTERM and SIGINT to gracefully shutdown
trap 'kill $XVFB_PID 2>/dev/null; exit' SIGTERM SIGINT

# Execute the main command (pass all arguments)
exec "$@"
