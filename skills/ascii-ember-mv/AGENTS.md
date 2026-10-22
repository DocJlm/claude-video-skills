# AGENTS.md（给 Codex / Cursor / Aider / 任何 coding agent）

这是一个“字符星火”风格歌曲 MV 的 skill。**完整说明在 `SKILL.md`，开工前必须完整读一遍**，再按里面的步骤读 `docs/`。

最重要的 8 条：
1. 只在 4 处停下来等用户：需求访谈（一次只问一个问题）、选叙事方向、看关键帧、看 540p 样片。
2. 风格固定（字符画人物一拍一动、3D 字符火星、歌词逐字砸入、终端 HUD、卡点语法），内容按主题重新设计，不照搬示例。
3. 单支片子只写 `$P/storyboard.json`，不改引擎；改完先跑 `python3 tools/check_storyboard.py $P`。
4. 时间用语义写法：`bar:12`、`bar:12+2`、`lyric:某句开头#3`、`end`，加 `~0.2` 微调。
5. 没有生图能力时，运行 `tools/gen_images.sh` 拿到提示词，请用户生成；用户说“跳过”就用无人物版（docs/05）。
6. 依赖只装在 `engine/node_modules` 和 `uv run --with ...`，不全局安装；macOS。
7. 竖版要叠安全区审片（`tools/audit.py`）；交付用 `tools/deliver.py`（-14 LUFS）。
8. 画面上印的名字、署名、拼写，和用户逐字确认。
