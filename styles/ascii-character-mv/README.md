# 字符人物 MV / ASCII Character MV

`claude-video-skills` 内部的风格模块，让字符人物随着音乐表演，用动作、情绪和群像讲故事。

- 灰阶角色图转 ASCII 字符画，2×2 四格动作帧结合节拍切换。
- 逐字歌词、音乐卡点与原生横竖版构图。
- 星火、隧道和粒子汇聚是可选效果，可以完全不用。

## 使用

从仓库的 [统一入口](../../README.md) 安装 `claude-video-skills`，然后描述视频需求，或明确指定字符人物 MV。
本模块不是单独安装的 skill。需要歌曲和歌词；角色动作帧可以提供或生成。

风格确认后读取 [WORKFLOW.md](WORKFLOW.md)。该文件所在目录是本模块的工作根目录；首次制作从这里运行 `bash tools/doctor.sh`，自动准备局部依赖。
运行环境为 macOS、Node.js 20+、ffmpeg、uv、python3；缺少系统工具时给出安装提示。

## 制作资源与原作

- [完整制作流程](WORKFLOW.md)
- [人物风格手册](docs/01-风格手册.md)
- [《成为谁》展示](../../README.md#风格展示)
- [《成为谁》制作记录](examples/成为谁/README.md)：原作采用手写镜头代码，镜头库与流程由此提炼；其粒子选择不是新项目的强制要求。
- `templates/project/`：人物主导的新项目模板，需提供或生成角色动作帧。

[MIT License](LICENSE)。第三方字体保留各自的 [SIL OFL 与作者声明](engine/fonts/LICENSES.md)。
