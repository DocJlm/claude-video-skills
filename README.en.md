# Claude Video Skills

**Turn ideas into videos with Claude / Opus.**

An evolving collection of original video skills, each with a production workflow,
rendering tools, and examples. The first release is **ASCII Ember MV**; more
visual styles and video types will follow.

[简体中文](README.md) · **English**　|　[Download the first skill](https://github.com/DocJlm/claude-video-skills/releases/download/v0.1.0/ascii-ember-mv-v0.1.0.zip)

[![Becoming — ASCII Ember MV](media/becoming/03-tunnel.jpg)](https://github.com/DocJlm/claude-video-skills/releases/tag/v0.1.0)

**[▶ Watch the 20-second chorus preview](https://github.com/DocJlm/claude-video-skills/releases/tag/v0.1.0)** · 720p / MP4 / sound on

https://github.com/user-attachments/assets/419f0eaa-f36e-4587-91b8-fa8460cad893

## Featured work: Becoming /《成为谁》

One person becomes a crowd, and the crowd becomes a house. ASCII characters,
word-by-word lyrics, and a terminal HUD lead into a chorus of 3D glyph particles:
explosions, tunnels, and convergence.

<table>
<tr>
<td><img src="media/becoming/01-character.jpg" alt="字符人物 / ASCII character"><br>字符人物 · ASCII character</td>
<td><img src="media/becoming/02-breakthrough.jpg" alt="推门冲破 / Breakthrough"><br>冲破 · Breakthrough</td>
<td><img src="media/becoming/03-tunnel.jpg" alt="火星隧道 / Ember tunnel"><br>火星隧道 · Ember tunnel</td>
</tr><tr>
<td><img src="media/becoming/04-crowd.jpg" alt="三维字符空间 / 3D glyph space"><br>三维字符空间 · 3D glyph space</td>
<td><img src="media/becoming/05-convergence.jpg" alt="火星汇聚 / Ember convergence"><br>火星汇聚 · Convergence</td>
<td><img src="media/becoming/06-endcard.jpg" alt="终端片尾 / Terminal end card"><br>终端片尾 · End card</td>
</tr>
</table>

Created for **AI Builder House (株洲人工智能创变者之家)**.
The original film used hand-written shot code. This skill's shot library and
workflow were distilled from that production; the showcase is not a claim that
the current skill generated the original in one step or reproduces it frame for frame.

[Production record, Chinese](skills/ascii-ember-mv/examples/成为谁/制作记录.md) · [Creative direction, Chinese](skills/ascii-ember-mv/examples/成为谁/最终方案_v2.md)

## Available skills

| Skill | Visual language and capabilities | Best for |
| --- | --- | --- |
| [ASCII Ember MV · ascii-ember-mv](skills/ascii-ember-mv/README.md) | ASCII characters, 3D glyph embers, word-by-word lyrics, terminal HUD, beat-driven transitions; separate landscape and portrait layouts | Music videos, music-driven community promos, graduation and band projects |

Stories, characters, colors, and convergence targets change with each theme.
This is the only released style so far. Future styles will be separate skills.

## Quick start

### 1. Get the skill

Download and extract the [standalone ZIP](https://github.com/DocJlm/claude-video-skills/releases/download/v0.1.0/ascii-ember-mv-v0.1.0.zip), or clone the repository:

```bash
git clone https://github.com/DocJlm/claude-video-skills.git
cd claude-video-skills/skills/ascii-ember-mv
```

For the ZIP, run subsequent commands inside the extracted `ascii-ember-mv` folder.

### 2. Check your environment

Currently supports **macOS**. Requires **Node.js 20+, ffmpeg, uv, and python3**.

```bash
bash tools/doctor.sh
```

On first run, npm dependencies are installed inside the skill, and Playwright
installs Chromium in the user cache. No global npm packages are installed.
The first song analysis also downloads Python dependencies and a Whisper model.

### 3. Give your agent a song

Open Claude Code in the skill directory and send:

```text
Read SKILL.md in full first.
Use ascii-ember-mv to make a music video for: <absolute path to song>.
Lyrics: <absolute path to lyrics file>.
Ask me one question at a time to establish the theme, characters, colors,
and landscape/portrait requirements.
```

Codex, Cursor, and other coding agents can start with this skill's `AGENTS.md`.
They need local shell and file access; not every client/model combination has
been verified. Character sheets can be generated with an available image tool,
provided manually, or omitted by choosing a character-free storyboard.
The skill's detailed production guides are currently in Chinese; an agent can
read them while interacting with you in English.

## Production workflow

Interview → song analysis → narrative direction → storyboard and character
assets → keyframe review → 540p sample → final delivery.

The engine reads `storyboard.json`, using semantic time references, reusable
shot types, and separate portrait/landscape layouts. Users supply or generate
their own songs, lyrics, character images, and logos; these are not bundled.

- [Full skill instructions](skills/ascii-ember-mv/SKILL.md)
- [Style guide, Chinese](skills/ascii-ember-mv/docs/01-风格手册.md)
- [Bu Xi Zhou: 38-second case study](skills/ascii-ember-mv/examples/不系舟片段/README.md): storyboard, prompts, and review images; a production record rather than a complete runnable project.
- [Validation notes](VALIDATION.md)

## License and credits

Original code and documentation use [MIT](LICENSE). Showcase screenshots,
previews, and example media are excluded; see [media terms](MEDIA_LICENSE.md).
Fonts retain their [SIL OFL and original notices](skills/ascii-ember-mv/engine/fonts/LICENSES.md).

Original Becoming film credits: **超力大（Agent：龙铁蛋）、ALSOPS、非技术老板的AI翻身路**.
Thanks to AI Builder House and everyone involved in the original work.

Visual language reference: [Hello, World on Bilibili](https://www.bilibili.com/video/BV1kpaH6UE9f/).
Production-method reference: [@0xwhrrari](https://x.com/0xwhrrari),
*Motion Engineering: Build a Video Studio Around Opus 5.5*.
These references informed the visual medium, rhythm, and workflow; their
original media is not bundled for redistribution.

An independent community project, not officially affiliated with Anthropic.
[Report an issue](https://github.com/DocJlm/claude-video-skills/issues) · [Contribute](CONTRIBUTING.md)
