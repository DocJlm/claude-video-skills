# AGENTS.md（给 Codex / Cursor / Aider / 任何 coding agent）

这是一个“字符人物”风格歌曲 MV 的 skill。**完整说明在 `SKILL.md`，开工前必须完整读一遍**，再按里面的步骤读 `docs/`。

最重要的 8 条：
1. 只在 4 处停下来等用户：需求访谈（一次只问一个问题）、选叙事方向、看关键帧、看 540p 样片。
2. 以字符人物的动作、表演与群像叙事为核心，配合歌词与音乐卡点。星火、隧道、3D 粒子和汇聚都是可选效果，不能强制副歌进 3D；内容按主题重新设计，不照搬原作。
3. 单支片子只写 `$P/storyboard.json`，不改引擎；改完先跑 `python3 tools/check_storyboard.py $P`。
4. 时间用语义写法：`bar:12`、`bar:12+2`、`lyric:某句开头#3`、`end`，加 `~0.2` 微调。
5. 没有生图能力时，运行 `tools/gen_images.sh` 拿到提示词，请用户生成；优先使用现有角色图，仅当用户明确跳过人物时使用无人物降级版（docs/05）。
6. 首次制作先从 skill 所在目录运行 `bash tools/doctor.sh`；npm 依赖在 `engine/node_modules`，Chromium 与 uv 依赖在用户缓存，不全局安装 npm 包；macOS。
7. 竖版要叠安全区审片（`tools/audit.py`）；交付用 `tools/deliver.py`（-14 LUFS）。
8. 画面上印的名字、署名、拼写，和用户逐字确认。
