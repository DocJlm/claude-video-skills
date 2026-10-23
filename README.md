# Claude Video Skills

**用 Claude / Opus，把想法做成视频。**

一个视频制作 skill，持续补充不同风格的制作流程、工具和模板。安装一次，描述你的需求，agent 会推荐合适的已有风格，确认后开始制作。

**简体中文** · [English](README.en.md)

## 一行安装

```bash
npx skills add https://github.com/DocJlm/claude-video-skills
```

安装 CLI 需要 **Node.js 22.20+**。按提示选择 Claude Code、Codex 等目标 agent，默认安装到当前项目。所有已收录风格随统一 skill 一起安装；后续更新同一个 skill 即可获得新增风格。

安装只放置 skill 与配套资源。首次制作时，agent 按选中风格检查环境、准备局部依赖；缺少系统工具会提示安装方法。目前支持 macOS，字符人物 MV 的运行环境为 Node.js 20+、ffmpeg、uv、python3。

## 使用示例

直接对 agent 描述需求，不必先记住风格名称：

```text
用 claude-video-skills 帮我做一支社区宣传视频。
我有一首主题歌和歌词，希望表现从独自探索到一群人共同创造的过程。
先推荐适合的已有风格，说明理由，等我确认后开始；需要补充信息时一次问一个问题。
```

也可以明确指定：“用字符人物 MV 风格制作，歌曲：<路径>，歌词：<路径>。”

需求不适合现有风格时，agent 会说明差距，再与你协商调整需求或定制方向，不把尚未实现的能力当作已支持功能。

## 已支持风格

| 风格 | 适用场景 | 输入与能力 |
| --- | --- | --- |
| [字符人物 MV · ASCII Character MV](styles/ascii-character-mv/README.md) | 歌曲 MV、音乐驱动的社区宣传片、毕业季与乐队作品 | 歌曲与歌词；字符人物、四格动作帧、表演与群像、逐字歌词、音乐卡点、原生横竖版；粒子可选 |

当前仅收录以上风格。后续风格会作为内部模块加入，继续使用同一个安装入口。详见 [统一制作入口](SKILL.md) 与 [新增风格说明](CONTRIBUTING.md)。

## 风格展示

### 字符人物 MV：《成为谁》

**人物是主角，粒子是可选的表达。**

角色从独自面对屏幕，到独唱、合唱与群像互动；动作帧、逐字歌词和音乐卡点共同推进故事。以下约 20 秒预览以人物镜头为主，末尾保留短暂隧道效果作为点缀。

https://github.com/user-attachments/assets/0c9a12df-ff8d-4894-abad-3ae1b3828219

<table>
<tr>
<td><img src="media/becoming/01-character.jpg" alt="字符人物 / ASCII character"><br>角色 · Character</td>
<td><img src="media/becoming/02-character-action.jpg" alt="人物动作 / Character action"><br>动作 · Action</td>
<td><img src="media/becoming/03-solo.jpg" alt="人物独唱 / Solo performance"><br>独唱 · Solo</td>
</tr><tr>
<td><img src="media/becoming/04-crew.jpg" alt="字符群像 / Character ensemble"><br>群像 · Ensemble</td>
<td><img src="media/becoming/05-tunnel.jpg" alt="可选隧道效果 / Optional tunnel"><br>可选隧道 · Optional tunnel</td>
<td><img src="media/becoming/06-convergence.jpg" alt="可选粒子汇聚 / Optional convergence"><br>可选汇聚 · Optional convergence</td>
</tr>
</table>

《成为谁》为 AI Builder House 制作。原片使用手写镜头代码，当前字符人物模块的工具链和镜头库从该作品提炼。原片的“字符星火”方案是该作品的设计选择；新项目可完全不使用粒子。

人物 MV 流程：需求访谈 → 歌曲分析 → 人物与叙事方向 → 动作素材与分镜 → 关键帧确认 → 540p 样片 → 成片交付。

- [字符人物 MV 制作说明](styles/ascii-character-mv/WORKFLOW.md)
- [《成为谁》原作制作记录](styles/ascii-character-mv/examples/成为谁/README.md)
- [安装迁移与验证说明](VALIDATION.md)

[MIT License](LICENSE)
