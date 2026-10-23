# Claude Video Skills：统一 agent 入口

制作视频前读取本目录的 [SKILL.md](SKILL.md)。这是一个 skill，风格模块不是独立 skill。

- 用户未指定风格时，先理解用途与素材，再推荐已支持风格并等待确认；信息不足一次问一个问题。
- 用户明确指定已有风格时沿用选择；不适合现有风格时说明差距，与用户协商调整或定制。
- 只按需读取选中的风格流程。字符人物 MV 的入口为 `styles/ascii-character-mv/WORKFLOW.md`，其工具命令从该模块目录执行。
- 新增风格属于维护任务，按 CONTRIBUTING.md 操作；正常视频制作不擅自更新安装内容。
