# Claude Video Skills

**Turn ideas into videos with Claude / Opus.**

One video-making skill with an expanding set of style workflows, tools, and templates. Install once, describe your goal, and your agent recommends an available style for your confirmation before production.

[简体中文](README.md) · **English**

## Install with one command

```bash
npx skills add https://github.com/DocJlm/claude-video-skills
```

The CLI requires **Node.js 22.20+**. Select your target agent, such as Claude Code or Codex, when prompted. Installation is project-local by default and includes all released style modules. Update the same skill to receive future styles.

Installation copies the skill and its resources. On first production use, the agent checks the selected style's environment and prepares local dependencies, reporting missing system tools. Currently supported: macOS. ASCII Character MV requires Node.js 20+, ffmpeg, uv, and python3.

## Usage example

Describe your goal without having to choose a style first:

```text
Use claude-video-skills to make a community promo video.
I have a theme song and lyrics. Show the journey from exploring alone to creating together.
Recommend an available style and explain why. Wait for my confirmation before production.
Ask one question at a time if you need more information.
```

You can also specify: “Use the ASCII Character MV style. Song: <path>; lyrics: <path>.”

If no released style fits, the agent explains the gap and discusses adapting the request or a custom direction. Unimplemented capabilities are not presented as supported features.

## Available styles

| Style | Suitable for | Inputs and capabilities |
| --- | --- | --- |
| [ASCII Character MV](styles/ascii-character-mv/README.md) | Music videos, music-driven community promos, graduation and band projects | Song and lyrics; ASCII characters, four-frame action sheets, performance and ensembles, timed lyrics, beat-driven cuts, native landscape/portrait; optional particles |

Only the style above is currently released. Future styles join as internal modules under the same installation entry. See the [unified workflow](SKILL.md) and [contribution guide](CONTRIBUTING.md). Detailed production guides are currently in Chinese; your agent can read them and respond in English.

## Style showcase

### ASCII Character MV: Becoming /《成为谁》

**Characters lead. Particles are optional.**

From a person alone at a screen to solos, singing together, and an ensemble: action frames, timed lyrics, and music-driven cuts carry the story. This approximately 20-second preview emphasizes character shots, with a brief tunnel effect at the end.

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

Created for AI Builder House. The original film used hand-written shot code; the character module's toolchain and shot library were distilled from that production. Its ember-particle direction was a creative choice for that work. New projects can use no particles at all.

Character MV workflow: interview → song analysis → characters and narrative direction → action assets and storyboard → keyframe review → 540p sample → final delivery.

- [ASCII Character MV production workflow](styles/ascii-character-mv/WORKFLOW.md)
- [Becoming production record](styles/ascii-character-mv/examples/成为谁/README.md)
- [Migration and validation notes](VALIDATION.md)

[MIT License](LICENSE)
