#!/bin/bash
# Simple Docker CLI wrapper
# Usage: sh scripts/mbti.sh export --input <file.json> --tag <tag> [--format pdf,png]
#        sh scripts/mbti.sh server [--port 3000]
#        sh scripts/mbti.sh stop

set -e
cd "$(dirname "$0")/.."

# Parse command
COMMAND="$1"
shift

case "$COMMAND" in
  export)
    INPUT=""
    TAG=""
    FORMAT="pdf,png"

    while [[ $# -gt 0 ]]; do
      case "$1" in
        --input|-i)
          INPUT="$2"
          shift 2
          ;;
        --tag|-t)
          TAG="$2"
          shift 2
          ;;
        --format|-f)
          FORMAT="$2"
          shift 2
          ;;
        *)
          echo "Unknown option: $1"
          exit 1
          ;;
      esac
    done

    if [[ -z "$INPUT" || -z "$TAG" ]]; then
      echo "Error: --input and --tag are required"
      echo "Usage: sh scripts/mbti.sh export --input <file.json> --tag <tag> [--format pdf,png]"
      exit 1
    fi

    docker run --rm -v ./data:/app/data mtzy-mbti:latest \
      bun scripts/cli/index.ts export \
      -i /app/data/input/"$INPUT" -o /app/data/output -t "$TAG" -f "$FORMAT" -l /app/data/logs
    ;;
  server)
    PORT="3000"

    while [[ $# -gt 0 ]]; do
      case "$1" in
        --port|-p)
          PORT="$2"
          shift 2
          ;;
        *)
          echo "Unknown option: $1"
          exit 1
          ;;
      esac
    done

    docker run -d --name mbti-server -p "$PORT:3000" -v ./data:/app/data mtzy-mbti:latest \
      bun scripts/cli/index.ts server -p 3000 -o /app/data/output -l /app/data/logs
    ;;
  stop)
    docker stop mbti-server 2>/dev/null || true
    docker rm mbti-server 2>/dev/null || true
    ;;
  *)
    echo "Usage:"
    echo "  sh scripts/mbti.sh export --input <file.json> --tag <tag> [--format pdf,png]"
    echo "  sh scripts/mbti.sh server [--port 3000]"
    echo "  sh scripts/mbti.sh stop"
    ;;
esac