#!/bin/bash

# MTZY-MBTI CLI 一键测试脚本
# 测试 dev 和 export 命令功能

set -e

echo "🧪 MTZY-MBTI CLI 功能测试"
echo "========================"

# 配置
INPUT_FILE="./inputs/inputs.json"
TEST_TAG="test-report"
OUTPUT_DIR="./test-output"
PORT=5174

# 清理旧测试输出
echo ""
echo "🗑️  清理旧测试输出..."
rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# 测试 1: dev 命令
echo ""
echo "📝 测试 1: dev 命令"
echo "-------------------"
echo "启动开发服务器 (端口 $PORT)..."

# 启动 dev 服务器（后台运行，5秒后关闭）
# macOS 没有 timeout 命令，使用后台进程
bun run dev -i "$INPUT_FILE" -t "$TEST_TAG" -p $PORT -v > "$OUTPUT_DIR/dev.log" 2>&1 &
DEV_PID=$!

# 等待服务器启动
sleep 3

# 检查进程是否运行
if ps -p $DEV_PID > /dev/null 2>&1; then
    echo "✅ 开发服务器启动成功 (PID: $DEV_PID)"
    
    # 检查端口是否监听
    if lsof -i :$PORT > /dev/null 2>&1; then
        echo "✅ 端口 $PORT 正在监听"
    else
        echo "⚠️  端口 $PORT 未监听（可能需要更多时间启动）"
    fi
    
    # 终止进程
    kill $DEV_PID 2>/dev/null || true
    wait $DEV_PID 2>/dev/null || true
    echo "✅ 开发服务器已关闭"
else
    echo "❌ 开发服务器启动失败"
fi

# 检查日志
echo ""
echo "📋 Dev 命令日志摘要:"
tail -n 20 "$OUTPUT_DIR/dev.log" || echo "日志文件不存在"

# 测试 2: export 命令
echo ""
echo "📝 测试 2: export 命令"
echo "----------------------"
echo "导出报告 (PDF, PNG, WebP, HTML)..."

# 运行 export 命令
bun run export -i "$INPUT_FILE" -o "$OUTPUT_DIR" -t "$TEST_TAG" -f pdf,png,webp,html -v > "$OUTPUT_DIR/export.log" 2>&1
EXPORT_EXIT_CODE=$?

if [ $EXPORT_EXIT_CODE -eq 0 ]; then
    echo "✅ 导出命令执行成功"
else
    echo "❌ 导出命令执行失败 (退出码: $EXPORT_EXIT_CODE)"
fi

# 检查导出日志
echo ""
echo "📋 Export 命令日志摘要:"
tail -n 20 "$OUTPUT_DIR/export.log" || echo "日志文件不存在"

# 检查导出文件（使用通配符匹配）
echo ""
echo "📁 检查导出文件:"
echo "----------------"

# 实际文件名格式: report-test-report-TIMESTAMP.ext
SUCCESS_COUNT=0
FAIL_COUNT=0

echo ""
echo "PDF 文件:"
PDF_COUNT=$(ls -1 "$OUTPUT_DIR"/*.pdf 2>/dev/null | wc -l | tr -d ' ')
if [ "$PDF_COUNT" -gt 0 ]; then
    ls -lh "$OUTPUT_DIR"/*.pdf | awk '{print "✅ "$9" ("$5")"}'
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
    echo "❌ 未找到 PDF 文件"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

echo ""
echo "PNG 文件:"
PNG_COUNT=$(ls -1 "$OUTPUT_DIR"/*.png 2>/dev/null | wc -l | tr -d ' ')
if [ "$PNG_COUNT" -gt 0 ]; then
    ls -lh "$OUTPUT_DIR"/*.png | awk '{print "✅ "$9" ("$5")"}'
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
    echo "❌ 未找到 PNG 文件"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

echo ""
echo "WebP 文件:"
WEBP_COUNT=$(ls -1 "$OUTPUT_DIR"/*.webp 2>/dev/null | wc -l | tr -d ' ')
if [ "$WEBP_COUNT" -gt 0 ]; then
    ls -lh "$OUTPUT_DIR"/*.webp | awk '{print "✅ "$9" ("$5")"}'
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
    echo "⚠️  WebP 导出不支持（需要插件）"
    # WebP 不计数为失败
fi

echo ""
echo "HTML 目录:"
# 查找 report-* 目录（排除文件）
HTML_DIR=$(find "$OUTPUT_DIR" -maxdepth 1 -type d -name "report-*" ! -name "*.pdf" ! -name "*.png" ! -name "*.webp" ! -name "*.log" | head -1)
if [ -n "$HTML_DIR" ]; then
    echo "✅ $HTML_DIR (HTML bundle)"
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
else
    echo "❌ 未找到 HTML 目录"
    FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# 测试汇总
echo ""
echo "📊 测试结果汇总"
echo "================"
echo "Dev 命令: 已测试"
echo "Export 命令: $SUCCESS_COUNT/3 核心格式导出成功 (PDF, PNG, HTML)"

if [ $FAIL_COUNT -eq 0 ]; then
    echo ""
    echo "🎉 所有核心测试通过！"
    echo ""
    echo "💡 提示："
    echo "  - 导出文件位于: $OUTPUT_DIR"
    echo "  - 可用浏览器打开 HTML 目录中的 index.html 验证效果"
    echo "  - 测试完成后可删除: rm -rf $OUTPUT_DIR"
    exit 0
else
    echo ""
    echo "⚠️  有 $FAIL_COUNT 个核心格式导出失败"
    echo "请检查日志文件: $OUTPUT_DIR/*.log"
    exit 1
fi
