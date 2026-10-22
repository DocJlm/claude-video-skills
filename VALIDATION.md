# 验证 / Validation

首版在 macOS 上验证。以下检查使用合成数据，不需要原始歌曲或生图 API。

## 可复现检查

在 skill 根目录运行：

```bash
bash tools/doctor.sh
python3 tools/smoke_test.py
```

`smoke_test.py` 在系统临时目录建立六秒测试项目，生成片名、3D 隧道、
文字粒子汇聚与片尾；进行分镜校验，并以 12 fps 渲染 640×360 和 360×640
视频及关键帧。通过 ffprobe 检查尺寸、时长及每个视频的 72 帧。
输出保留在终端打印的目录中，不进入仓库。

同时验证固定速度与非均匀拍点的语义时间，防止校验与实际渲染时间不一致。

## v0.1.0 发布验证

- `SKILL.md` 名称与 YAML 入口通过 skill 校验器。
- 环境检查从无 `node_modules` 的副本按锁文件安装成功。
- 独立 skill ZIP 不包含依赖目录、系统文件、原始歌曲或完整成片。
- ZIP 解压后独立安装与横竖版测试渲染通过。
- 中英文 README 的本地链接、图片引用和许可证引用均可解析。
- 《成为谁》展示素材从字符星火版成片提取，六张截图与 20 秒预览已检查；预览为 H.264 + AAC / 1280×720。

## 验证边界

上述检查覆盖安装、分镜解析及渲染，不代表从歌曲分析、生图到完整 MV 的
全过程都重新运行过。Whisper 转录、歌曲对齐、生图服务，以及每一种镜头类型，
仍需结合使用者提供的素材和客户端验证。当前不声明 Windows 或 Linux 支持。

## English

Validated on macOS. Run `bash tools/doctor.sh`, then
`python3 tools/smoke_test.py` inside the skill. The smoke test creates a synthetic
six-second project in a temporary directory, checks semantic timing and the
storyboard, and renders landscape and portrait clips plus keyframes. ffprobe
verifies dimensions, duration, and 72 frames per clip at 12 fps.

Release checks include clean dependency installation, standalone ZIP extraction
and rendering, local Markdown/media links, and the original-film showcase.
The preview is 20 seconds, 1280×720, H.264/AAC. This validates installation,
storyboard parsing, and rendering; it does not claim a fresh full-song ASR,
image-generation, or end-to-end MV production run. Other operating systems,
client/model combinations, and every individual shot type are not certified.
