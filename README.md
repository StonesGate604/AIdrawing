# AIdrawing — AI Drawing Studio

> A human-AI collaborative drawing tool that keeps you in control of your own creative process.

AIdrawing is an interactive drawing application built with p5.js. It records every stroke you make as structured vector data, replays your drawing process on a scrubable timeline, and lets a SketchRNN model pick up where you left off — while you stay in the driver's seat.

Built for *Code Your Way* at ITP, NYU.

---

## Why This Exists
When I started using generative AI tools for creative work, I kept running into the same frustration: generating an image from a prompt feels like gambling. The output is unpredictable, and when you finally get something close to what you want, you're stuck — no layers, no project file, nothing you can actually edit or build on.
So I tried shifting the approach. Drawing and image editing are fundamentally sequential behaviors — a series of actions unfolding over time, not a single output. I wondered whether training an AI on that sequence, borrowing loosely from how embodied intelligence research thinks about motor learning, might work better than prompting a model for pixels.
I should be clear: I'm not a machine learning researcher, and this project reflects that. It's a personal experiment built by someone learning as they go — part curiosity, part stubbornness, part not knowing what I didn't know. The code is rough in places, the training data is small, and there are almost certainly better ways to do most of what's here.
But the question behind it still feels worth asking: what would it look like if AI assisted the process of making something, rather than just handing you the result?
This is my small attempt at an answer.

---

## Features

- Brush, eraser, and fill tools with color palette and size control
- Full stroke recording as normalized vector point arrays
- Session export to ZIP (PNG snapshots + JSON action data per step)
- Timeline scrubber — drag to any step, canvas re-renders from action history
- SketchRNN AI drawing — load a pretrained model and let it continue your sketch
- AI strokes are recorded and replayed on the timeline just like human strokes

---

## Project Structure

```
AIdrawing/
├── index.html                        # Main page and script loading order
├── drawing_recorder_p5.css           # UI styles
├── drawing_recorder_p5.state.js      # Shared state and helper functions
├── drawing_recorder_p5.canvas.js     # p5 canvas, drawing, recording, export
├── drawing_recorder_p5.timeline.js   # Timeline rendering and scrubbing
├── drawing_recorder_p5.ai.js         # SketchRNN model loading and generation
├── train.py                          # PyTorch behavior cloning training script
└── requirements.txt                  # Python training dependencies
```

---

## Run the App

Open `index.html` in a browser, or serve the folder with a local static server:

```bash
npx serve .
```

The app loads all dependencies from CDN (p5.js, ml5.js, JSZip, Lucide). No build step required.

---

## Training Data Format

The recorder exports a ZIP containing one folder per session:

```
session_0/
  step_0000.png     ← canvas snapshot after this step
  step_0000.json    ← action data for this step
  step_0001.png
  step_0001.json
  ...
```

Each JSON looks like this:

```json
{
  "step_id": 3,
  "action": {
    "type": "stroke_end",
    "tool": "brush",
    "color": "#000000",
    "brush_size": 12,
    "points": [
      { "x": 0.42, "y": 0.36 },
      { "x": 0.43, "y": 0.37 }
    ]
  }
}
```

Coordinates are normalized to `[0, 1]` relative to canvas size.

---

## Train the Model

Set up the Python environment:

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Run training:

```bash
python train.py --data_dir .\session_0 --epochs 100
```

Optional arguments:

| Argument | Default | Description |
|---|---|---|
| `--epochs` | 50 | Number of training epochs |
| `--batch_size` | 4 | Batch size |
| `--lr` | 0.001 | Learning rate |
| `--img_size` | 128 | Input image resolution |

**Output:**
- `best_model.pth` — best checkpoint saved during training
- `drawing_model.onnx` — exported ONNX model for JS integration via `onnxruntime-web`

GPU is used automatically if CUDA is available (recommended: NVIDIA RTX series).

---

## Requirements

**Frontend:** Modern browser with JavaScript enabled.

**Training:**
- Python 3.12+
- PyTorch with CUDA support (recommended)
- See `requirements.txt` for full list

---
⚠️ This project is actively under development. Features and data formats may change.
*Made at ITP, NYU — Code Your Way, Spring 2026*

---
---

# AIdrawing — AI 绘画工作室

> 一个让创作者始终掌握主动权的人机协作绘画工具。

AIdrawing 是一个基于 p5.js 的交互式绘图应用。它将你的每一笔记录为结构化的矢量数据，通过可拖拽的时间轴回放绘制过程，并允许 SketchRNN 模型从你停下的地方继续——而控制权始终在你手中。

为 NYU ITP *Code Your Way* 课程而建。

---

## 为什么做这个

为什么做这个
在用生成式 AI 做创作的时候，我一直遇到同一个问题：用 prompt 生成图片像是在赌博。结果不可预测，好不容易得到一张还算满意的，你却什么都做不了——没有图层，没有工程文件，无从编辑，也无法继续。
于是我尝试换了一个思路。画画和图片编辑本质上是序列行为——随时间展开的一系列动作，而不是一次性的输出。我想，如果借鉴具身智能研究中对动作学习的一些思路，让 AI 去学习这个动作序列，或许会比用 prompt 生成像素更有效？
需要说明的是：我不是机器学习专业的学生，这个项目也如实反映了这一点。它是一个边学边做的个人实验——一部分出于好奇，一部分出于执着，还有一部分是不知道自己不知道什么。代码有些地方比较粗糙，训练数据量很小，很多地方应该有更好的做法。
但背后的问题依然值得问：如果 AI 辅助的是制作过程，而不只是把结果交给你，会是什么样子？
这个项目是我对这个问题的一次小小尝试。

---

## 功能

- 画笔、橡皮擦、填充工具，支持颜色面板和尺寸控制
- 完整笔触录制，以归一化矢量点数组存储
- 导出为 ZIP（每步包含 PNG 截图 + JSON 动作数据）
- 时间轴拖拽——拖到任意步骤，画布从动作历史重新渲染
- SketchRNN AI 绘图——加载预训练模型，让 AI 继续你的草图
- AI 笔触与人类笔触一样被记录并在时间轴中显示

---

## 项目结构

```
AIdrawing/
├── index.html                        # 主页面与脚本加载顺序
├── drawing_recorder_p5.css           # 界面样式
├── drawing_recorder_p5.state.js      # 共享状态与辅助方法
├── drawing_recorder_p5.canvas.js     # p5 画布、绘制、录制、导出
├── drawing_recorder_p5.timeline.js   # 时间轴渲染与交互
├── drawing_recorder_p5.ai.js         # SketchRNN 模型加载与生成
├── train.py                          # PyTorch 行为克隆训练脚本
└── requirements.txt                  # Python 训练依赖
```

---

## 运行前端应用

直接在浏览器中打开 `index.html`，或使用本地静态服务器：

```bash
npx serve .
```

所有依赖通过 CDN 加载（p5.js、ml5.js、JSZip、Lucide），无需构建步骤。

---

## 训练数据格式

录制器导出的 ZIP 中每个 session 一个文件夹：

```
session_0/
  step_0000.png     ← 该步完成后的画布截图
  step_0000.json    ← 该步的动作数据
  step_0001.png
  step_0001.json
  ...
```

每个 JSON 格式如下：

```json
{
  "step_id": 3,
  "action": {
    "type": "stroke_end",
    "tool": "brush",
    "color": "#000000",
    "brush_size": 12,
    "points": [
      { "x": 0.42, "y": 0.36 },
      { "x": 0.43, "y": 0.37 }
    ]
  }
}
```

坐标归一化到 `[0, 1]`，相对于画布尺寸。

---

## 训练模型

配置 Python 环境：

```bash
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

运行训练：

```bash
python train.py --data_dir .\session_0 --epochs 100
```

可选参数：

| 参数 | 默认值 | 说明 |
|---|---|---|
| `--epochs` | 50 | 训练轮数 |
| `--batch_size` | 4 | 批大小 |
| `--lr` | 0.001 | 学习率 |
| `--img_size` | 128 | 输入图像分辨率 |

**输出：**
- `best_model.pth` — 训练过程中保存的最佳权重
- `drawing_model.onnx` — 导出的 ONNX 模型，通过 `onnxruntime-web` 在 JS 中集成

有 CUDA 时自动使用 GPU（推荐 NVIDIA RTX 系列）。

---

## 环境要求

**前端：** 支持 JavaScript 的现代浏览器。

**训练：**
- Python 3.12+
- 建议使用支持 CUDA 的 PyTorch
- 完整依赖见 `requirements.txt`
> ⚠️ 本项目正在开发中，功能与数据格式可能随时变动。
---

*Made at ITP, NYU — Code Your Way, Spring 2026*
