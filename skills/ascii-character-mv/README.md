# 字符人物 MV / ASCII Character MV

让字符人物随着音乐表演，用动作、情绪和群像讲故事。

- 灰阶角色图转为 ASCII 字符画，2×2 四格动作帧结合节拍切换。
- 逐字歌词、音乐卡点与原生横竖版构图。
- 星火、隧道和粒子汇聚是可选效果，可以完全不用。

## 安装

```bash
npx skills add https://github.com/DocJlm/claude-video-skills --skill ascii-character-mv
```

安装命令需要 Node.js 22.20+，按 CLI 提示选择目标 agent。安装 skill 后直接提出制作需求：

```text
用 ascii-character-mv 给这首歌做 MV：<歌曲路径>。
歌词：<歌词路径>。以字符人物的动作和群像叙事为主。
```

首次制作时 agent 从本 skill 所在目录运行 `bash tools/doctor.sh`，自动准备局部依赖。
运行环境为 macOS、Node.js 20+、ffmpeg、uv、python3；缺少系统工具时给出安装提示。
Claude Code 读取 `SKILL.md`，Codex 等也可从 `AGENTS.md` 开始。

## 文件与原作

- [完整说明](SKILL.md)
- [人物风格手册](docs/01-风格手册.md)
- [《成为谁》制作记录](examples/成为谁/README.md)：原作采用手写镜头代码，镜头库与流程由此提炼；其粒子选择不是新项目的强制规则。
- `templates/project/`：人物主导的新项目模板，需提供或生成角色动作帧。

[MIT License](LICENSE)。第三方字体保留其各自的 [SIL OFL 与作者声明](engine/fonts/LICENSES.md)。
