#!/bin/bash
# 新建项目：bash tools/new_project.sh <项目目录> <歌曲文件> [歌词文件]
set -e; SK="$(cd "$(dirname "$0")/.." && pwd)"; P="$1"; [ -z "$P" ] || [ -z "$2" ] && { echo "用法：bash tools/new_project.sh <项目目录> <歌曲文件> [歌词文件]"; exit 1; }
mkdir -p "$P"/{analysis,assets/frames,assets/prompts,out,成片}
ext="${2##*.}"; cp "$2" "$P/song.$ext"
[ -n "$3" ] && cp "$3" "$P/lyrics.txt" || cp "$SK/templates/project/lyrics.txt" "$P/lyrics.txt"
for f in brief.md storyboard.json; do [ -f "$P/$f" ] || cp "$SK/templates/project/$f" "$P/$f"; done
echo "项目已建好：$P"; echo "下一步：检查 lyrics.txt 的 [段落] 标签 → uv run ... tools/analyze_song.py $P"
