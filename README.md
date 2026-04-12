# AIdrawing / AI Drawing Studio

## English

AIdrawing is an interactive drawing app built with p5.js. It supports brush-based drawing, erasing, fill operations, timeline replay, session recording, ZIP export, and SketchRNN-based AI drawing.

### Features

- Brush, eraser, and fill tools
- Color palette and brush size control
- Session recording and export to ZIP
- Timeline replay for recorded strokes
- SketchRNN AI drawing

### Project Structure

- `index.html` - Main page and script loading order
- `drawing_recorder_p5.css` - UI styles
- `drawing_recorder_p5.state.js` - Shared state and helpers
- `drawing_recorder_p5.timeline.js` - Timeline rendering and interaction
- `drawing_recorder_p5.ai.js` - SketchRNN logic
- `drawing_recorder_p5.canvas.js` - p5 canvas input, drawing, recording, export
- `train.py` - PyTorch training script

### Requirements

- Modern browser
- Python 3.12+ for training
- Python packages: `torch`, `torchvision`, `pillow`

### Run the App

1. Open `index.html` in a browser, or serve the folder with a local web server.
2. Wait for the external CDN libraries to load: p5.js, ml5.js, JSZip, and Lucide.

### Training Data Format

The training script expects a folder that contains recorded session folders such as:

```text
session_0/
  step_0000.png
  step_0000.json
  step_0001.png
  step_0001.json
  ...
```

Each JSON file should contain an `action` field and a `snapshot` image reference produced by the recorder.

### Train the Model

Install the dependencies with the project virtual environment:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

Run training:

```powershell
.\.venv\Scripts\python.exe train.py --data_dir .\your_session_folder
```

Optional arguments:

- `--epochs` - Number of training epochs
- `--batch_size` - Batch size
- `--lr` - Learning rate
- `--img_size` - Input image size

### Output

- `best_model.pth` - Best checkpoint saved during training
- `drawing_model.onnx` - Exported ONNX model for JS integration

### Notes

- The project uses CDN-hosted front-end libraries, so no build step is required.
- The recommended Python environment is `.venv` in the project root.
- `requirements.txt` contains the minimal training dependencies.

## 中文

AIdrawing 是一个基于 p5.js 的交互式绘图应用，支持画笔绘制、橡皮擦、填充、时间轴回放、会话录制、ZIP 导出，以及基于 SketchRNN 的 AI 绘图。

### 功能

- 画笔、橡皮擦、填充工具
- 颜色面板与画笔大小控制
- 会话录制并导出为 ZIP
- 支持录制步骤的时间轴回放
- SketchRNN AI 绘图

### 项目结构

- `index.html` - 主页面与脚本加载顺序
- `drawing_recorder_p5.css` - 界面样式
- `drawing_recorder_p5.state.js` - 共享状态与辅助方法
- `drawing_recorder_p5.timeline.js` - 时间轴渲染与交互
- `drawing_recorder_p5.ai.js` - SketchRNN 逻辑
- `drawing_recorder_p5.canvas.js` - p5 画布输入、绘制、录制与导出
- `train.py` - PyTorch 训练脚本

### 环境要求

- 现代浏览器
- 训练脚本需要 Python 3.12+
- Python 依赖：`torch`、`torchvision`、`pillow`

### 运行前端应用

1. 在浏览器中直接打开 `index.html`，或者使用本地静态服务器运行该目录。
2. 等待外部 CDN 库加载完成：p5.js、ml5.js、JSZip 和 Lucide。

### 训练数据格式

训练脚本期望的数据目录结构如下：

```text
session_0/
  step_0000.png
  step_0000.json
  step_0001.png
  step_0001.json
  ...
```

每个 JSON 文件应包含录制器生成的 `action` 字段和 `snapshot` 图像引用。

### 训练模型

使用项目虚拟环境安装依赖：

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

开始训练：

```powershell
.\.venv\Scripts\python.exe train.py --data_dir .\your_session_folder
```

可选参数：

- `--epochs` - 训练轮数
- `--batch_size` - 批大小
- `--lr` - 学习率
- `--img_size` - 输入图像尺寸

### 输出结果

- `best_model.pth` - 训练过程中保存的最佳权重
- `drawing_model.onnx` - 导出的 ONNX 模型，用于 JS 集成

### 说明

- 前端库通过 CDN 加载，因此不需要构建步骤。
- 推荐使用项目根目录下的 `.venv`。
- `requirements.txt` 已包含最小训练依赖。