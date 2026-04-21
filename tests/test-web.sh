#!/bin/bash

# MTZY-MBTI Web Service API 测试脚本
# 测试 /api/preview, /api/export, /api/report 三个端点

set -e

echo "🧪 MTZY-MBTI Web Service API 测试"
echo "=================================="

# 配置
API_PORT=3000
VITE_PORT=3001
INPUT_FILE="$(pwd)/inputs/inputs.json"
OUTPUT_DIR="$(pwd)/test-output-web"
STUDENT_ID="test-student-001"

# 清理旧测试输出
echo ""
echo "🗑️  清理旧测试输出..."
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# 检查输入文件是否存在
if [ ! -f "$INPUT_FILE" ]; then
    echo "❌ 输入文件不存在: $INPUT_FILE"
    exit 1
fi

echo "✅ 输入文件: $INPUT_FILE"

# 启动 Web 服务器
echo ""
echo "🚀 启动 Web 服务器..."
bun run server -p $API_PORT -o "$OUTPUT_DIR" > "$OUTPUT_DIR/server.log" 2>&1 &
SERVER_PID=$!

# 等待服务器启动
echo "⏳ 等待服务器启动..."
sleep 5

# 检查服务器是否运行
if ! ps -p $SERVER_PID > /dev/null 2>&1; then
    echo "❌ 服务器启动失败"
    cat "$OUTPUT_DIR/server.log"
    exit 1
fi

# 检查 API 端口
if lsof -i :$API_PORT > /dev/null 2>&1; then
    echo "✅ API Server 运行在端口 $API_PORT"
else
    echo "❌ API Server 未在端口 $API_PORT 监听"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi

# 检查 Vite 端口
if lsof -i :$VITE_PORT > /dev/null 2>&1; then
    echo "✅ Vite Server 运行在端口 $VITE_PORT"
else
    echo "⚠️  Vite Server 未在端口 $VITE_PORT 监听（可能需要更多时间）"
fi

# 辅助函数：测试 API 端点
test_endpoint() {
    local endpoint=$1
    local name=$2
    local check_url=$3  # "yes" or "no"
    
    echo ""
    echo "📝 测试 $name"
    echo "----------------------"
    
    local response_file="$OUTPUT_DIR/response-${endpoint}.json"
    
    # 发送请求
    local http_code=$(curl -s -o "$response_file" -w "%{http_code}" \
        -X POST "http://localhost:$API_PORT/api/${endpoint}" \
        -H "Content-Type: application/json" \
        -d "{\"student_id\":\"$STUDENT_ID\",\"file_path\":\"$INPUT_FILE\"}" \
        --connect-timeout 10 \
        --max-time 120)
    
    # 检查 HTTP 状态码
    if [ "$http_code" -eq 200 ]; then
        echo "✅ HTTP 状态码: $http_code"
    else
        echo "❌ HTTP 状态码: $http_code"
        echo "响应内容:"
        cat "$response_file"
        return 1
    fi
    
    # 检查响应格式
    echo "📋 响应内容:"
    cat "$response_file" | jq '.' 2>/dev/null || cat "$response_file"
    
    # 检查 status 字段
    local status=$(cat "$response_file" | jq -r '.status' 2>/dev/null)
    if [ "$status" = "success" ]; then
        echo "✅ 状态: success"
    else
        echo "❌ 状态: $status"
        return 1
    fi
    
    # 检查 data.id
    local id=$(cat "$response_file" | jq -r '.data.id' 2>/dev/null)
    if [ "$id" = "$STUDENT_ID" ]; then
        echo "✅ 学生ID: $id"
    else
        echo "❌ 学生ID 不匹配: $id (期望: $STUDENT_ID)"
        return 1
    fi
    
    # 检查 data.timestamp
    local timestamp=$(cat "$response_file" | jq -r '.data.timestamp' 2>/dev/null)
    if [ -n "$timestamp" ] && [ "$timestamp" != "null" ]; then
        echo "✅ 时间戳: $timestamp"
    else
        echo "❌ 时间戳缺失"
        return 1
    fi
    
    # 检查 results 结构
    local results_url=$(cat "$response_file" | jq -r '.data.results.url' 2>/dev/null)
    local results_png=$(cat "$response_file" | jq -r '.data.results.png' 2>/dev/null)
    local results_pdf=$(cat "$response_file" | jq -r '.data.results.pdf' 2>/dev/null)
    
    echo "📁 Results:"
    echo "   url: $results_url"
    echo "   png: $results_png"
    echo "   pdf: $results_pdf"
    
    # 检查时间戳一致性 (url 和文件名中的时间戳应该相同)
    if [ "$check_url" = "yes" ] && [ -n "$results_url" ] && [ "$results_url" != "" ]; then
        local url_ts=$(echo "$results_url" | grep -oE '[0-9]{14}' | tail -1)
        if [ -n "$url_ts" ]; then
            echo "✅ URL 时间戳格式: $url_ts (YYYYMMDDHHmmss)"
            
            # 如果有文件路径，检查文件名时间戳是否一致
            if [ -n "$results_png" ] && [ "$results_png" != "" ]; then
                local png_ts=$(basename "$results_png" | grep -oE '[0-9]{14}' | tail -1)
                if [ "$url_ts" = "$png_ts" ]; then
                    echo "✅ PNG 文件时间戳与 URL 一致: $png_ts"
                else
                    echo "❌ 时间戳不一致: URL=$url_ts, PNG=$png_ts"
                    return 1
                fi
            fi
            
            if [ -n "$results_pdf" ] && [ "$results_pdf" != "" ]; then
                local pdf_ts=$(basename "$results_pdf" | grep -oE '[0-9]{14}' | tail -1)
                if [ "$url_ts" = "$pdf_ts" ]; then
                    echo "✅ PDF 文件时间戳与 URL 一致: $pdf_ts"
                else
                    echo "❌ 时间戳不一致: URL=$url_ts, PDF=$pdf_ts"
                    return 1
                fi
            fi
        fi
    fi
    
    return 0
}

# 测试计数
SUCCESS_COUNT=0
FAIL_COUNT=0

# 测试 1: /api/preview
echo ""
echo "═══════════════════════════════════════"
echo "测试 1: POST /api/preview"
echo "═══════════════════════════════════════"
if test_endpoint "preview" "Preview API" "yes"; then
    echo "✅ Preview API 测试通过"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
    echo "❌ Preview API 测试失败"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# 测试 2: /api/export
echo ""
echo "═══════════════════════════════════════"
echo "测试 2: POST /api/export"
echo "═══════════════════════════════════════"
if test_endpoint "export" "Export API" "no"; then
    echo "✅ Export API 测试通过"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    
    # 验证文件是否生成
    echo ""
    echo "📁 检查生成的文件..."
    sleep 2  # 等待文件写入完成
    
    PNG_COUNT=$(ls -1 "$OUTPUT_DIR"/*.png 2>/dev/null | wc -l | tr -d ' ')
    PDF_COUNT=$(ls -1 "$OUTPUT_DIR"/*.pdf 2>/dev/null | wc -l | tr -d ' ')
    
    if [ "$PNG_COUNT" -gt 0 ]; then
        echo "✅ PNG 文件已生成: $(ls -lh "$OUTPUT_DIR"/*.png | awk '{print $9" ("$5")"}')"
    else
        echo "⚠️  未找到 PNG 文件"
    fi
    
    if [ "$PDF_COUNT" -gt 0 ]; then
        echo "✅ PDF 文件已生成: $(ls -lh "$OUTPUT_DIR"/*.pdf | awk '{print $9" ("$5")"}')"
    else
        echo "⚠️  未找到 PDF 文件"
    fi
else
    echo "❌ Export API 测试失败"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# 测试 3: /api/report (preview + export combined)
echo ""
echo "═══════════════════════════════════════"
echo "测试 3: POST /api/report (复合接口: preview + export)"
echo "═══════════════════════════════════════"

echo "📝 发送请求..."
RESPONSE=$(curl -s -X POST "http://localhost:$API_PORT/api/report" \
    -H "Content-Type: application/json" \
    -d "{\"student_id\":\"$STUDENT_ID\",\"file_path\":\"$INPUT_FILE\"}" \
    --connect-timeout 10 \
    --max-time 120)

echo "📋 响应内容:"
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# 检查 status
STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
if [ "$STATUS" = "success" ]; then
    echo "✅ 状态: success"
else
    echo "❌ 状态: $STATUS"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# 检查 data.id
ID=$(echo "$RESPONSE" | jq -r '.data.id' 2>/dev/null)
if [ "$ID" = "$STUDENT_ID" ]; then
    echo "✅ 学生ID: $ID"
else
    echo "❌ 学生ID 不匹配: $ID (期望: $STUDENT_ID)"
fi

# 检查 timestamp
TIMESTAMP=$(echo "$RESPONSE" | jq -r '.data.timestamp' 2>/dev/null)
if [ -n "$TIMESTAMP" ] && [ "$TIMESTAMP" != "null" ]; then
    echo "✅ 时间戳: $TIMESTAMP"
else
    echo "❌ 时间戳缺失"
fi

# 获取 results
RESULTS_URL=$(echo "$RESPONSE" | jq -r '.data.results.url' 2>/dev/null)
RESULTS_PNG=$(echo "$RESPONSE" | jq -r '.data.results.png' 2>/dev/null)
RESULTS_PDF=$(echo "$RESPONSE" | jq -r '.data.results.pdf' 2>/dev/null)

echo ""
echo "📁 Results:"
echo "   url: $RESULTS_URL"
echo "   png: $RESULTS_PNG"
echo "   pdf: $RESULTS_PDF"

# 检查 URL (preview 功能)
if [ -n "$RESULTS_URL" ] && [ "$RESULTS_URL" != "null" ] && [ "$RESULTS_URL" != "" ]; then
    URL_TS=$(echo "$RESULTS_URL" | grep -oE '[0-9]{14}' | tail -1)
    if [ -n "$URL_TS" ]; then
        echo "✅ URL 时间戳格式: $URL_TS (YYYYMMDDHHmmss)"
    else
        echo "❌ URL 时间戳格式不正确"
    fi
else
    echo "❌ URL 缺失 (preview 功能失败)"
fi

# 检查文件生成 (export 功能)
sleep 2  # 等待文件写入完成

PNG_EXISTS=false
PDF_EXISTS=false

if [ -n "$RESULTS_PNG" ] && [ "$RESULTS_PNG" != "null" ] && [ "$RESULTS_PNG" != "" ]; then
    # 获取文件名并检查是否存在
    PNG_FILE=$(basename "$RESULTS_PNG")
    PNG_COUNT=$(ls -1 "$OUTPUT_DIR"/*.png 2>/dev/null | wc -l | tr -d ' ')
    if [ "$PNG_COUNT" -gt 0 ]; then
        echo "✅ PNG 文件已生成: $(ls -lh "$OUTPUT_DIR"/*.png | awk '{print $9" ("$5")"}')"
        PNG_EXISTS=true
    else
        echo "❌ PNG 文件未找到"
    fi
else
    echo "❌ PNG 路径缺失 (export 功能失败)"
fi

if [ -n "$RESULTS_PDF" ] && [ "$RESULTS_PDF" != "null" ] && [ "$RESULTS_PDF" != "" ]; then
    PDF_FILE=$(basename "$RESULTS_PDF")
    PDF_COUNT=$(ls -1 "$OUTPUT_DIR"/*.pdf 2>/dev/null | wc -l | tr -d ' ')
    if [ "$PDF_COUNT" -gt 0 ]; then
        echo "✅ PDF 文件已生成: $(ls -lh "$OUTPUT_DIR"/*.pdf | awk '{print $9" ("$5")"}')"
        PDF_EXISTS=true
    else
        echo "❌ PDF 文件未找到"
    fi
else
    echo "❌ PDF 路径缺失 (export 功能失败)"
fi

# 综合判断
if [ "$STATUS" = "success" ] && [ "$PNG_EXISTS" = "true" ] && [ "$PDF_EXISTS" = "true" ]; then
    echo ""
    echo "✅ Report API 测试通过 (preview + export 都成功)"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
    echo ""
    echo "❌ Report API 测试失败"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi
# 关闭服务器
echo ""
echo "🛑 关闭服务器..."
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true
echo "✅ 服务器已关闭"

# 测试汇总
echo ""
echo "═══════════════════════════════════════"
echo "📊 测试结果汇总"
echo "═══════════════════════════════════════"
echo "Preview API: $([ $SUCCESS_COUNT -ge 1 ] && echo '✅ 通过' || echo '❌ 失败')"
echo "Export API:  $([ $SUCCESS_COUNT -ge 2 ] && echo '✅ 通过' || echo '❌ 失败')"
echo "Report API:  $([ $SUCCESS_COUNT -ge 3 ] && echo '✅ 通过' || echo '❌ 失败')"
echo ""
echo "总计: $SUCCESS_COUNT/3 通过"

if [ $FAIL_COUNT -eq 0 ]; then
    echo ""
    echo "🎉 所有测试通过！"
    echo ""
    echo "💡 提示："
    echo "  - 生成的文件位于: $OUTPUT_DIR"
    echo "  - API 响应保存在: $OUTPUT_DIR/response-*.json"
    echo "  - 测试完成后可删除: rm -rf $OUTPUT_DIR"
    exit 0
else
    echo ""
    echo "⚠️  有 $FAIL_COUNT 个测试失败"
    echo "请检查日志文件: $OUTPUT_DIR/server.log"
    exit 1
fi
