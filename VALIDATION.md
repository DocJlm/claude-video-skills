# 验证 / Validation

## 安装与运行

安装 CLI 需要 Node.js 22.20+：

```bash
npx skills add https://github.com/DocJlm/claude-video-skills --skill ascii-character-mv
```

按提示选择目标 agent，默认安装到当前项目。安装只放置 skill 与配套资源；
首次制作由 agent 定位已安装的 skill 根目录，运行 `bash tools/doctor.sh`。
该脚本检查系统工具、按锁文件安装局部 npm 依赖，并准备 Chromium 用户缓存。

## 可复现渲染检查

在已安装的 skill 根目录运行：

```bash
bash tools/doctor.sh
python3 tools/smoke_test.py
```

测试使用合成项目与程序绘制的四格人物测试图，不需要歌曲、ASR 模型或生图 API。
输出保留在系统临时目录，脚本打印具体位置。

- **纯人物项目**：片名、四格人物动作、人物蒙太奇、终端片尾；不包含粒子镜头。
- **可选粒子项目**：片名、隧道、文字汇聚、片尾；确认已有粒子能力仍可使用。
- 两类项目均渲染 640×360 与 360×640 的六秒短片，每段 12 fps、72 帧，并输出关键帧。
- 验证 `converge` 省略或为 `false` 时无粒子警告；显式为 `true` 却没有汇聚镜头时发出提醒。
- 验证固定拍点和非均匀拍点的语义时间换算。

## v0.2.0 发布检查

- CLI 能识别唯一的 `ascii-character-mv`，安装后引擎、工具、模板、字体及其许可证完整。
- 在隔离项目实际安装后运行上述依赖准备和两类横竖版渲染。
- 中英文页面的安装命令、资源与文档链接有效。
- 《成为谁》人物封面、六张截图与重剪约 20 秒预览可展示；预览为 1280×720 H.264/AAC，人物镜头为主。
- 当前版本移除《不系舟》及旧安装标识；历史 v0.1.0 保留，不改写发布历史。
- 原创内容使用标准 MIT；第三方字体保留各自的 SIL OFL 和作者声明。

## 验证边界

检查覆盖 skill 安装、资源完整性、环境准备、分镜解析及渲染，未重新运行整首歌的
Whisper 转录、歌词对齐、人物生图和完整 MV 制作。当前运行环境仍为 macOS，
不声明所有系统、客户端、模型组合或每一种镜头类型都已验证。

## English

Install with the command above (Node.js 22.20+), select an agent, and let the agent
prepare local dependencies on first use. Run the smoke test inside the installed
skill to verify a particle-free character film and a separate optional-particle
film. Both render six-second landscape/portrait clips (72 frames at 12 fps),
with semantic timing and opt-in convergence checks. Fixtures are generated locally;
no song, ASR model, or image API is required. The first-use runtime is macOS,
Node.js 20+, ffmpeg, uv, and python3. Full-song analysis and image generation are
outside this validation. The historical v0.1.0 release remains available.
