#!/bin/bash

# Test script for MTZY-MBTI Web Service API
# Usage: ./scripts/cli/test-web.sh [port] [input_file]

# Configuration
PORT=${1:-3000}
INPUT_FILE=${2:-"./inputs/inputs.json"}
API_BASE="http://localhost:$PORT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "  MTZY-MBTI Web Service Test Script"
echo "=========================================="
echo ""

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}Error: Input file not found: $INPUT_FILE${NC}"
    exit 1
fi

# Get absolute path
ABSOLUTE_INPUT=$(realpath "$INPUT_FILE")
echo -e "${YELLOW}Using input file: $ABSOLUTE_INPUT${NC}"
echo ""

# Test 1: Health Check
echo "=========================================="
echo "Test 1: Health Check"
echo "=========================================="
HEALTH_RESPONSE=$(curl -s "$API_BASE/api/assessment/health")
echo "Response: $HEALTH_RESPONSE"
if echo "$HEALTH_RESPONSE" | grep -q '"status":"ok"'; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
fi
echo ""

# Test 2: Preview API
echo "=========================================="
echo "Test 2: Preview API (/api/assessment/mbti/preview)"
echo "=========================================="
PREVIEW_RESPONSE=$(curl -s -X POST "$API_BASE/api/assessment/mbti/preview" \
    -H "Content-Type: application/json" \
    -d "{\"userid\":\"20240001\",\"filepath\":\"$ABSOLUTE_INPUT\"}")

echo "Response:"
echo "$PREVIEW_RESPONSE" | jq '.' 2>/dev/null || echo "$PREVIEW_RESPONSE"

if echo "$PREVIEW_RESPONSE" | grep -q '"status":"success"'; then
    echo -e "${GREEN}✓ Preview API passed${NC}"
    PREVIEW_URL=$(echo "$PREVIEW_RESPONSE" | jq -r '.data.results.url')
    echo -e "${YELLOW}Preview URL: $PREVIEW_URL${NC}"
else
    echo -e "${RED}✗ Preview API failed${NC}"
fi
echo ""

# Test 3: Link API
echo "=========================================="
echo "Test 3: Link API (/api/assessment/mbti/link)"
echo "=========================================="
LINK_RESPONSE=$(curl -s -X POST "$API_BASE/api/assessment/mbti/link" \
    -H "Content-Type: application/json" \
    -d "{\"userid\":\"20240001\",\"filepath\":\"$ABSOLUTE_INPUT\"}")

echo "Response:"
echo "$LINK_RESPONSE" | jq '.' 2>/dev/null || echo "$LINK_RESPONSE"

if echo "$LINK_RESPONSE" | grep -q '"status":"success"'; then
    echo -e "${GREEN}✓ Link API passed${NC}"
    LINK_URL=$(echo "$LINK_RESPONSE" | jq -r '.data.results.url')
    echo -e "${YELLOW}Link URL: $LINK_URL${NC}"
else
    echo -e "${RED}✗ Link API failed${NC}"
fi
echo ""

# Test 4: Export API
echo "=========================================="
echo "Test 4: Export API (/api/assessment/mbti/export)"
echo "=========================================="
EXPORT_RESPONSE=$(curl -s -X POST "$API_BASE/api/assessment/mbti/export" \
    -H "Content-Type: application/json" \
    -d "{\"userid\":\"20240001\",\"filepath\":\"$ABSOLUTE_INPUT\"}")

echo "Response:"
echo "$EXPORT_RESPONSE" | jq '.' 2>/dev/null || echo "$EXPORT_RESPONSE"

if echo "$EXPORT_RESPONSE" | grep -q '"status":"success"'; then
    echo -e "${GREEN}✓ Export API passed${NC}"
    PNG_PATH=$(echo "$EXPORT_RESPONSE" | jq -r '.data.results.png')
    PDF_PATH=$(echo "$EXPORT_RESPONSE" | jq -r '.data.results.pdf')
    echo -e "${YELLOW}PNG: $PNG_PATH${NC}"
    echo -e "${YELLOW}PDF: $PDF_PATH${NC}"
else
    echo -e "${RED}✗ Export API failed${NC}"
fi
echo ""

# Test 5: Report API (Legacy combined)
echo "=========================================="
echo "Test 5: Report API (/api/assessment/mbti/report)"
echo "=========================================="
REPORT_RESPONSE=$(curl -s -X POST "$API_BASE/api/assessment/mbti/report" \
    -H "Content-Type: application/json" \
    -d "{\"userid\":\"20240002\",\"filepath\":\"$ABSOLUTE_INPUT\"}")

echo "Response:"
echo "$REPORT_RESPONSE" | jq '.' 2>/dev/null || echo "$REPORT_RESPONSE"

if echo "$REPORT_RESPONSE" | grep -q '"status":"success"'; then
    echo -e "${GREEN}✓ Report API passed${NC}"
else
    echo -e "${RED}✗ Report API failed${NC}"
fi
echo ""

# Test 6: Error handling - Missing file
echo "=========================================="
echo "Test 6: Error Handling (missing file)"
echo "=========================================="
ERROR_RESPONSE=$(curl -s -X POST "$API_BASE/api/assessment/mbti/preview" \
    -H "Content-Type: application/json" \
    -d '{"userid":"20240001","filepath":"/nonexistent/file.json"}')

echo "Response:"
echo "$ERROR_RESPONSE" | jq '.' 2>/dev/null || echo "$ERROR_RESPONSE"

if echo "$ERROR_RESPONSE" | grep -q '"status":"error"'; then
    echo -e "${GREEN}✓ Error handling passed${NC}"
else
    echo -e "${RED}✗ Error handling failed${NC}"
fi
echo ""

# Test 7: Error handling - Missing fields
echo "=========================================="
echo "Test 7: Error Handling (missing fields)"
echo "=========================================="
ERROR_RESPONSE2=$(curl -s -X POST "$API_BASE/api/assessment/mbti/preview" \
    -H "Content-Type: application/json" \
    -d '{"userid":"20240001"}')

echo "Response:"
echo "$ERROR_RESPONSE2" | jq '.' 2>/dev/null || echo "$ERROR_RESPONSE2"

if echo "$ERROR_RESPONSE2" | grep -q '"status":"error"'; then
    echo -e "${GREEN}✓ Validation passed${NC}"
else
    echo -e "${RED}✗ Validation failed${NC}"
fi
echo ""

echo "=========================================="
echo "  Test Summary Complete"
echo "=========================================="
