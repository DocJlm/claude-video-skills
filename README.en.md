# Claude Video Skills

**Turn ideas into videos with Claude / Opus.**

An evolving collection of original video skills. First up: **ASCII Character MV** —
characters performing, interacting, and telling stories through music.
Each style includes a production workflow, rendering tools, and real work examples.

[简体中文](README.md) · **English**

![Becoming: ASCII character performing](media/becoming/03-solo.jpg)

## Install with one command

```bash
npx skills add https://github.com/DocJlm/claude-video-skills --skill ascii-character-mv
```

Requires **Node.js 22.20+**. Select your target agent, such as Claude Code or Codex,
when prompted. The CLI installs into the current project by default.

Then ask your agent:

```text
Use ascii-character-mv to make a music video for: <path to song>.
Lyrics: <path to lyrics>.
Focus on character actions, performance, and ensemble storytelling.
Ask me one question at a time to establish the direction.
```

The command installs the skill and its resources. On first use, the agent checks
the environment and prepares local rendering dependencies. Runtime requirements:
**macOS, Node.js 20+, ffmpeg, uv, and python3**. Missing system tools are reported
with installation instructions. Detailed production guides are currently in Chinese;
your agent can read them and interact with you in English.
See the [full instructions](skills/ascii-character-mv/SKILL.md).

## Featured work: Becoming /《成为谁》

**Characters lead. Particles are optional.**

From a person alone at a screen to solos, singing together, and an ensemble:
action frames, timed lyrics, and music-driven cuts carry the story.
This approximately 20-second preview emphasizes character shots, with a brief
tunnel effect at the end.

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

Created for AI Builder House. The original film used hand-written shot code;
this skill's toolchain and shot library were distilled from that production.
The original film's ember-particle direction was a creative choice for that work.
New projects can use no particles at all.

## Available skills

| Skill | Core capabilities | Optional effects |
| --- | --- | --- |
| [ASCII Character MV · ascii-character-mv](skills/ascii-character-mv/README.md) | ASCII characters, four-frame action sheets, performance and ensemble storytelling, word-timed lyrics, beat-driven cuts, native landscape/portrait layouts | Terminal HUD, embers, tunnels, particle convergence |

For music videos, music-driven community promos, graduation and band projects.
Adapt characters, story, actions, colors, and effects to the theme rather than
copying the showcase.

## Production workflow

Interview → song analysis → characters and narrative direction → action assets
and storyboard → keyframe review → 540p sample → final delivery.

- [Style guide](skills/ascii-character-mv/docs/01-风格手册.md)
- [Becoming production record](skills/ascii-character-mv/examples/成为谁/README.md)
- [Validation notes](VALIDATION.md)

[MIT License](LICENSE)
