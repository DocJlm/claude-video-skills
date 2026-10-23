# 验证 / Validation

## 安装与运行

安装 CLI 需要 Node.js 22.20+：

```bash
npx skills add https://github.com/DocJlm/claude-video-skills
```

按提示选择目标 agent，默认安装到当前项目。安装只放置 skill 与配套资源；
首次制作由 agent 定位已安装的 风格模块目录 `styles/ascii-character-mv/`，运行 `bash tools/doctor.sh`。
该脚本检查系统工具、按锁文件安装局部 npm 依赖，并准备 Chromium 用户缓存。

## 可复现渲染检查

在已安装的 风格模块目录 `styles/ascii-character-mv/`运行：

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

## v0.3.0 发布检查

- CLI 能识别唯一的 `claude-video-skills`，安装后引擎、工具、模板、字体及其许可证完整。
- 在隔离项目实际安装后运行上述依赖准备和两类横竖版渲染。
- 中英文页面的安装命令、资源与文档链接有效。
- 《成为谁》风格展示区的六张截图与重剪约 20 秒预览可展示；预览为 1280×720 H.264/AAC，人物镜头为主。
- 当前版本移除《不系舟》及旧安装标识；历史 v0.1.0 与 v0.2.0 保留，不改写发布历史。
- 原创内容使用标准 MIT；第三方字体保留各自的 SIL OFL 和作者声明。

## 统一入口与迁移

- 根目录只保留一个 `SKILL.md`，安装标识为 `claude-video-skills`；字符人物为内部模块，不再单独发现或安装。
- 从 v0.2.0 迁移：先在目标 agent 的技能管理中移除旧的 `ascii-character-mv` 安装，再运行新的统一安装命令；保留用户制作项目。安装工具不会自动移除旧标识，避免两个入口同时触发。更早的 `ascii-ember-mv` 安装同样需要移除。
- 后续维护者发布新风格后，用户运行 `npx skills update` 更新已安装 skill。
- 行为检查：模糊需求先逐个澄清；未指定风格先推荐并确认；已明确指定则沿用；否决推荐则重新协商；没有适合风格则说明差距，不直接套用人物 MV。
- 指令静态检查与实际模型行为验证分别记录，不能用文字规则检查宣称已完成模型行为测试。

## v0.3.0 本次验证记录

- CLI 本地干净分发包发现并安装唯一 `claude-video-skills`，分别安装到 Claude Code 与 Codex 的隔离项目目录；62 个分发文件逐字节校验。发布后另以 GitHub URL 重验安装。
- 从安装后的 `styles/ascii-character-mv/` 完成 `doctor.sh`（按锁文件 npm ci 与 Chromium 准备）及完整 smoke test；纯人物、可选粒子各两种构图，共四段六秒短片，每段 72 帧。
- 入口 frontmatter 校验通过，中英文页面各六张截图，无重复顶部大图；40 个本地文档与图片链接检查通过。
- 对模糊需求、明确指定、否决推荐、无合适风格逐项进行指令走查；未将这些静态走查当作独立模型行为实测。未开展跨模型自动访谈评测。

## 验证边界

检查覆盖 skill 安装、资源完整性、环境准备、分镜解析及渲染，未重新运行整首歌的
Whisper 转录、歌词对齐、人物生图和完整 MV 制作。当前运行环境仍为 macOS，
不声明所有系统、客户端、模型组合或每一种镜头类型都已验证。

## English

Install with the command above (Node.js 22.20+), select an agent, and let the agent
prepare local dependencies on first use. Run the smoke test inside the installed
style module (`styles/ascii-character-mv/`) to verify a particle-free character film and a separate optional-particle
film. Both render six-second landscape/portrait clips (72 frames at 12 fps),
with semantic timing and opt-in convergence checks. Fixtures are generated locally;
no song, ASR model, or image API is required. The first-use runtime is macOS,
Node.js 20+, ffmpeg, uv, and python3. Full-song analysis and image generation are
outside this validation. The historical v0.1.0 and v0.2.0 releases remains available.


For v0.3.0, install the single `claude-video-skills` entry. Remove an old
`ascii-character-mv` (or `ascii-ember-mv`) installation through your agent's skill
management first, keeping your video projects. The installer does not remove
previous skill names automatically. Future updates use `npx skills update`.
Routing rules were manually reviewed for ambiguous requests, explicit choices,
rejected recommendations and unsupported styles; no independent cross-model
behavior evaluation was run.
