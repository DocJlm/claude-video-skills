#!/bin/bash
# 批量生图（有 codex 时自动；没有就只打印提示词）
# 用法：bash tools/gen_images.sh <项目目录> <清单.tsv>
# 清单每行：文件名<TAB>参考图（没有就写 -，相对项目目录）<TAB>画面描述<TAB>类型(sheet|single|model)
# 生成到 <项目>/assets/frames/<文件名>.png（sheet/single）或 <项目>/assets/<文件名>.png（model）；已存在的跳过；并行 4 张
P="$(cd "$1" && pwd)"; LIST="$2"; SK="$(cd "$(dirname "$0")/.." && pwd)"
STYLE_BASE="$(cat "$SK/templates/prompt_style.txt")"; SHEET="$(cat "$SK/templates/prompt_sheet.txt")"
HAVE=1; command -v codex >/dev/null || HAVE=0
n=0
while IFS=$'\t' read -r name ref desc kind; do
  [ -z "$name" ] || [[ "$name" == \#* ]] && continue
  [ "$ref" = "-" ] && ref=""
  dir="$P/assets/frames"; [ "$kind" = "model" ] && dir="$P/assets"; mkdir -p "$dir"; out="$dir/$name.png"
  [ -f "$out" ] && continue
  layout=""; [ "$kind" = "sheet" ] && layout="$SHEET"
  prompt="Use your image generation tool to create ONE image and save it as $out . If a reference image is attached, the main character must be THE SAME person (face, hair, clothes). SCENE: $desc $layout $STYLE_BASE"
  if [ $HAVE = 0 ]; then echo "—— $name.png ($kind) ——"; echo "$prompt"; [ -n "$ref" ] && echo "（参考图：$P/$ref）"; echo; continue; fi
  imgs=(); [ -n "$ref" ] && imgs=(-i "$P/$ref")
  ( codex exec --skip-git-repo-check -s workspace-write --add-dir "$dir" "${imgs[@]}" -- "$prompt" < /dev/null > "$dir/.log_$name.txt" 2>&1; [ -f "$out" ] && echo "✓ $name" || echo "✗ $name（看 $dir/.log_$name.txt）" ) &
  n=$((n+1)); [ $((n % 4)) -eq 0 ] && wait
done < <(awk -F'\t' 'BEGIN{OFS="\t"} {for(i=1;i<=NF;i++) if($i=="") $i="-"; print}' "$LIST")
wait
if [ $HAVE = 0 ]; then echo "没有可调用的生图工具：请用上面的提示词生成，按文件名放进 $P/assets/frames/（定妆图放 $P/assets/），或回复“跳过”走无人物版"; fi
