# 贡献 / Contributing

这是一个统一的视频制作 skill，不同风格是内部模块。欢迎通过 Issue 反馈问题，或通过 Pull Request 改进现有模块。

## 新增风格

新增原创风格放在 `styles/<lowercase-hyphen-name>/`，包含：

- `README.md`：风格效果、适用场景、所需输入与限制。
- `WORKFLOW.md`：确认风格后的实际制作流程，定义模块工作目录、工具命令和审片节点；详细规则按需放入文档。
- 必需的引擎、工具、模板、字体及许可证；优先保证模块自包含，不提前抽象未经复用的公共引擎。
- 有权公开的作品示例、必要署名及原作事实说明。
- 可复现的环境检查、分镜校验和低分辨率渲染验证。

同步更新根目录 `SKILL.md` 的风格目录和中英文首页。目录记录适用场景、输入要求、限制与制作入口；总入口只按需读取选中的模块。模块中不要添加 `SKILL.md` 或独立安装命令，确保 CLI 仍只发现 `claude-video-skills`。

不要把某一模块的歌曲、歌词、人物或特效规则提升为所有视频的要求；定制项目只有在完成资源整理和验证后才正式收录。不添加未实现的占位模块。

不提交密钥、个人配置、依赖目录、原始歌曲或未经许可的素材。保留依赖锁文件。修改工具或路径后，从实际安装后的目录运行检查与低分辨率渲染，并记录验证结果。

## English

This repository installs one skill, `claude-video-skills`. Add original styles as self-contained modules in `styles/<lowercase-hyphen-name>/`, with a README describing suitability, inputs and limits; a WORKFLOW explaining production, command working directories and review stages; required tools, templates and licenses; authorized examples; and reproducible environment, storyboard and render checks.

Update the root SKILL catalog and both homepages. Do not add nested SKILL.md files or separate installation commands. Load only the selected module and keep style-specific requirements out of the shared entrypoint. Promote custom work to a released style only after packaging and validation. Do not add unimplemented placeholders, credentials, personal configuration, dependencies, original songs, or unauthorized media. Keep lockfiles and validate changed paths using an actual installed copy.
