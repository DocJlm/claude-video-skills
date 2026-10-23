#!/bin/bash
# macOS environment check; install engine dependencies locally and Chromium in the user cache.
set -euo pipefail
cd "$(dirname "$0")/.."
ok=1
chk() {
  if command -v "$1" >/dev/null 2>&1; then
    echo "✓ $1"
  else
    echo "✗ 缺少 $1 → $2"
    ok=0
  fi
}
chk node "安装 Node.js 20+"
chk npm "随 Node.js 一起安装 npm"
chk ffmpeg "brew install ffmpeg"
chk uv "brew install uv"
chk python3 "brew install python"
if command -v node >/dev/null 2>&1 && ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 20 ? 0 : 1)'; then
  echo "✗ Node.js 版本过低，需要 20+"
  ok=0
fi
[ "$ok" = 1 ] || exit 1
if ! (cd engine && npm ls --omit=dev --depth=0 >/dev/null 2>&1); then
  echo "… 按锁文件安装 engine/node_modules 依赖"
  (cd engine && npm ci --no-audit --no-fund)
fi
# Check the browser separately: node_modules can exist while Chromium is missing.
(cd engine && npx --no-install playwright install chromium)
echo "✓ playwright + chromium + three.js"
if command -v codex >/dev/null 2>&1; then
  echo "✓ codex（可使用生图流程）"
else
  echo "· 没有 codex：生图步骤输出提示词，也可选择无人物版"
fi
echo "环境就绪"
