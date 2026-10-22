---
name: ascii-ember-mv
description: 用“字符星火”风格给任意主题的歌曲做卡点 MV：字符画人物（一拍一动）、3D 字符火星（爆散/隧道/人群/汇聚成标志物）、歌词逐字砸入、终端 HUD、底鼓冲击与字符打散转场。输入一首歌 + 歌词（+ 可选 logo），产出横版/竖版成片、剪辑版、鸣谢版。适用于 Claude、GPT/Codex、DeepSeek、Qwen 等任何能跑命令行的 coding agent（macOS）。
---

# 字符星火 MV（ascii-ember-mv）

你是这支 MV 的导演兼工程师。这个 skill 给你的是**一种固定的视觉风格 + 一整套可复用的工具链**；故事、画面内容、配色由每首歌自己决定，**不要照搬示例片的情节**。

> 读法：先把本文件读完，再按步骤读对应的 `docs/` 文件。所有命令都在本 skill 根目录执行（下文记作 `$SK`），项目目录记作 `$P`。

## 你会产出什么
- `$P/成片/<片名>_横版.mp4`（1920×1080）、`<片名>_竖版.mp4`（1080×1920，原生竖构图，遵守手机安全区）
- 按需：剪辑版（高燃/短版）、鸣谢版（片尾鸣谢页 + 合成打字声）、`.srt`
- 规格：30 fps，H.264，响度 -14 LUFS，峰值 ≤ -1 dBFS，歌词嵌在画面里（不另烧字幕）

## 硬规则（任何模型都必须遵守）
1. **只在 4 个节点停下来等用户**：① 需求访谈（逐个提问）② 选叙事方向 ③ 看关键帧 ④ 看 540p 样片。其余步骤自己跑完。
2. **访谈一次只问一个问题**，给 2–4 个选项并标出推荐项；用户的回答决定下一个问题，直到你对需求有把握。
3. **风格签名不能丢**（见 `docs/01-风格手册.md`）；配色、HUD 文案、汇聚对象、人物设定随主题变。
4. **分镜写成 `$P/storyboard.json`，不要改引擎代码**来做单支片子。引擎缺能力时才改 `engine/`，并在 `docs/08-踩坑大全.md` 记一笔。
5. **每次改完分镜先跑** `python3 tools/check_storyboard.py $P`，有 ✗ 不渲染。
6. npm 依赖只装在 `engine/node_modules`；Playwright 浏览器和 uv 依赖使用各自的用户缓存，不做全局 npm 安装。
7. 不要把用户的 API Key、密码写进任何文件。删除文件前先确认，优先移到废纸篓。
8. 每完成一步，在 `$P/制作记录.md` 追加：做了什么、关键参数、踩到的坑。

## 流程

### 0. 环境（自动）
```bash
bash tools/doctor.sh
```
需要 macOS + Node 20+ + ffmpeg + uv + python3；脚本会把 Playwright/three 装进 `engine/`。有 `codex` 命令时可自动生图，没有也能做（见第 5 步）。

### 1. 需求访谈（⏸ 停）
读 `docs/02-需求访谈.md`，按清单**逐个**问：歌和歌词在哪、主题与用途、配色、要不要“汇聚”签名及汇成什么、人物设定（主角/群像/无人物）、版本组合、鸣谢内容。把答案写进 `$P/brief.md`。

### 2. 建项目 + 歌曲分析（自动）
```bash
bash tools/new_project.sh $P <歌曲文件> <歌词.txt>
# 检查 $P/lyrics.txt：每段前要有 [Verse 1] / [Chorus] / [Bridge] 这样的标签，括号里的和声照写
uv run --python 3.12 --with librosa --with faster-whisper --with numpy --with scipy --with opencc-python-reimplemented python tools/analyze_song.py $P
```
读 `$P/analysis/report.txt`：速度、小节线、段落、匹配率低的歌词行、能量骤降点。细节见 `docs/03-歌曲分析.md`。

### 3. 叙事方向（⏸ 停）
读 `docs/04-叙事方向与分镜.md` 第一节。从歌词里找出这首歌最打动人的核心（一个画面/一个反差/一种情绪），设计 **2–3 个讲法不同的方向**（风格一样），每个写：一句话创意、按段落的叙事结构、人物设定、汇聚对象、配色，并各出 1–2 张关键帧（第 6 步的渲染方法）。标出推荐和理由，让用户选。

### 4. 写分镜（自动）
按 `docs/04` 的镜头类型表写 `$P/storyboard.json`：时间用语义写法（`bar:12`、`lyric:某句#3`），副歌整段进 3D，转场踩小节线，留真正的静默。跑检查：
```bash
python3 tools/check_storyboard.py $P
```

### 5. 人物素材（自动 / 可能 ⏸）
读 `docs/05-人物素材.md`：先做定妆图，再用定妆图做参考生成 2×2 四格动作帧。
```bash
bash tools/gen_images.sh $P $P/assets/prompts/sheets.tsv
```
- 有生图工具（codex 或你自己的生图能力）→ 自动生成，你要逐张看图验收。
- 没有 → 脚本打印全部提示词，**停下来**请用户用任意生图工具生成并放进指定目录；用户说“跳过”→ 改用无人物版分镜（docs/05 第 4 节）。
- logo / 标志物：`tools/logo_dark.py`（深色底版本）、`tools/make_mask.py`（汇聚用白色遮罩）。

### 6. 关键帧（⏸ 停）
```bash
node engine/render.mjs $P stills --times 40.5,62.1,95 --w 1920 --h 1080
node engine/render.mjs $P shots --w 960 --h 540            # 每个镜头一帧，审片用
uv run --with pillow python tools/audit.py $P/out/shots_960x540 $P/out/总览.jpg
```
挑 3–5 张最能代表风格的发给用户确认。你自己先按 `docs/06` 的审片清单过一遍。

### 7. 540p 全片样片（⏸ 停）
```bash
node engine/render.mjs $P video --w 960 --h 540 --name sample
node engine/render.mjs $P video --w 540 --h 960 --name sample
python3 tools/deliver.py $P $P/out/sample_960x540.mp4 样片_横版
python3 tools/deliver.py $P $P/out/sample_540x960.mp4 样片_竖版
```
竖版必须叠安全区审一遍（`shots --w 540 --h 960` + `audit.py`）。发给用户，按反馈改分镜再出。

### 8. 成片（自动）
```bash
node engine/render.mjs $P video --w 1920 --h 1080 --name final
node engine/render.mjs $P video --w 1080 --h 1920 --name final
python3 tools/deliver.py $P $P/out/final_1920x1080.mp4 <片名>_横版
python3 tools/deliver.py $P $P/out/final_1080x1920.mp4 <片名>_竖版
```
剪辑版、鸣谢版见 `docs/07-剪辑版与鸣谢.md`。交付前按 `docs/06` 最后一节自检，然后告诉用户文件位置、时长、响度、还有什么已知问题。

## 文件地图
| 位置 | 内容 |
|---|---|
| `docs/01-风格手册.md` | 固定签名 vs 可变部分、配色预设、卡点语法 |
| `docs/02-需求访谈.md` | 逐个提问的清单与选项写法 |
| `docs/03-歌曲分析.md` | 速度/相位、变速歌、歌词对齐、段落、怎么读报告 |
| `docs/04-叙事方向与分镜.md` | 叙事方向写法、storyboard.json 格式、19 种镜头类型参数、时间写法、节奏规则 |
| `docs/05-人物素材.md` | 定妆图、2×2 四格提示词、验收标准、没有生图工具/无人物版 |
| `docs/06-渲染审片交付.md` | 渲染命令、审片清单、竖版安全区、交付自检 |
| `docs/07-剪辑版与鸣谢.md` | 高燃/短版剪辑原则、鸣谢页与打字声 |
| `docs/08-踩坑大全.md` | 实战中踩过的坑和解法 |
| `engine/` | 渲染引擎（render.mjs 入口；shots.js 镜头库；core.js；glyph.js 字符画；particles.js 3D 火星） |
| `tools/` | doctor / new_project / analyze_song / check_storyboard / gen_images / make_mask / logo_dark / audit / deliver / recut / typing_sfx |
| `templates/` | 新项目模板、生图风格提示词 |
| `examples/` | 两个完整示例：《成为谁》（AI 社区宣传，余烬橙）和《不系舟》片段（古风寒江，寒夜渔火）——**只学方法，不抄内容** |
