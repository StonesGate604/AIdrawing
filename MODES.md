# AI Drawing Studio - 三种模式

您的画板现已分裂成 3 个专门版本，让不同的用户可以专注于他们的目标。

## 🚀 快速开始

打开 **`launcher.html`** 来选择您要使用的模式。

---

## 📋 三种模式详解

### 1️⃣ **Drawing Recorder** (`drawing_recorder.html`)
**用途**: 记录绘图操作和训练数据收集

这是一个专注于**数据录制**的工具，让您能够：
- ✏️ 使用**刷子、橡皮、填充工具**绘画
- 🎨 选择**12 种颜色**
- 📏 调整**笔刷大小** (2-60px)
- ⏹️ **开始/停止录制**您的绘图过程
- 📊 记录**每一步操作**（笔画、颜色、工具类型）
- 💾 **导出为 ZIP**（包含快照和 JSON 数据）
- 📤 上传录制的数据
- ⏱️ **时间线滑块**：拖动任意位置重新查看绘图过程

**适合**：
- 收集 AI 训练的数据
- 记录创意过程
- 导出绘图历史

**隐藏的功能**：
- SketchRNN 面板被隐藏（此版本不支持 AI）

---

### 2️⃣ **SketchRNN Player** (`sketch_rnn_player.html`)
**用途**: 体验和玩耍 AI 生成的绘画

这是一个专注于**AI 交互和娱乐**的工具，让您能够：
- 🧠 加载 **30+ 预训练的 SketchRNN 模型**
  - 动物: 猫、鸟、狗、螃蟹、蝴蝶等
  - 物体: 自行车、房子、树、灯泡、皇冠等
  - 食物: 苹果、香蕉、蛋糕、甜甜圈等
  - 还有更多...
- ▶️ **启动 AI 绘画**：让模型自动生成笔画
- ⏸️ **停止 AI 绘画**
- 🔄 **清空画布**开始新的绘画
- 📺 **实时观看** AI 一笔一笔地绘画
- ⏱️ **时间线滑块**：回放 AI 的绘图过程

**适合**：
- 探索 AI 生成的艺术
- 娱乐和实验
- 了解 SketchRNN 模型的工作原理

**隐藏的功能**：
- 绘画工具（刷子、橡皮、填充）被隐藏
- 录制功能被隐藏

---

### 3️⃣ **Launcher** (`launcher.html`)
**用途**: 在两种模式之间切换

一个美观的**启动菜单**，让您轻松选择：
- 切换到**Drawing Recorder**录制模式
- 切换到**SketchRNN Player**体验 AI
- 快速查看每种模式的功能

---

## 📁 文件结构

```
AIdrawing/
├── launcher.html                     # 🎯 启动菜单（推荐从这里开始）
├── drawing_recorder.html             # 录制模式
├── sketch_rnn_player.html            # AI 体验模式
├── index.html                        # 原始综合版本（保留）
│
├── drawing_recorder_p5.css           # 共享样式
├── drawing_recorder_p5.state.js      # 共享状态管理
├── drawing_recorder_p5.canvas.js     # 共享画布/绘画逻辑
├── drawing_recorder_p5.timeline.js   # 共享时间线功能
├── drawing_recorder_p5.ai.js         # SketchRNN/AI 逻辑
│
├── train.py                          # 训练脚本
└── requirements.txt                  # 依赖
```

---

## 🎯 使用流程建议

### 📊 如果您想记录训练数据：
1. 打开 `launcher.html` 或直接打开 `drawing_recorder.html`
2. 点击 **"Start Recording"** 开始录制
3. 自由绘画
4. 点击 **"Save Data"** 导出为 ZIP 文件
5. 使用这些数据训练您自己的模型

### 🎨 如果您想体验 AI 绘画：
1. 打开 `launcher.html` 或直接打开 `sketch_rnn_player.html`
2. 从下拉菜单选择一个模型（如"cat"、"flower"等）
3. 点击 **"Load Model"** 加载模型
4. 点击 **"Start Drawing"** 让 AI 为您绘画
5. 使用时间线观看绘画过程

---

## ✨ 新增功能亮点

### Drawing Recorder
- 🎨 **清晰的 UI**：只显示与录制相关的控件
- 📊 **实时反馈**：显示录制状态、步数、会话数
- 💾 **一键导出**：将所有数据导出为结构化的 ZIP 文件

### SketchRNN Player
- 🧠 **扩展的模型列表**：从 6 个模型增加到 30+ 模型
- 🏷️ **模型标签化**：带有 emoji 图标的易读标签
- 🎯 **专注体验**：隐藏所有与录制无关的控件
- 📍 **模型状态显示**：实时显示当前加载的模型

---

## 💡 常见问题

**Q: 我可以同时使用两种模式吗？**
A: 可以！每个模式都独立运行，您可以在浏览器标签中同时打开两个模式。

**Q: 我可以在 SketchRNN Player 中手动绘画吗？**
A: 在当前版本中，SketchRNN Player 专注于 AI 生成。如果需要混合使用，请使用原始的 `index.html`。

**Q: 如何在两种模式之间切换？**
A: 每个页面都有链接可以返回到启动菜单或切换到另一个模式。

**Q: 我的录制数据会丢失吗？**
A: 不会！每个模式都使用相同的底层 JavaScript，数据格式相同。

---

## 🔧 技术细节

所有三个版本使用**相同的核心代码**（JavaScript 模块），只是在 HTML 中：
- 隐藏不相关的 UI 面板
- 加载不同的脚本（例如 SketchRNN Player 加载 `drawing_recorder_p5.ai.js`）
- 使用 CSS 的 `display: none` 来隐藏元素

这意味着：
- 维护变得更简单（一份代码）
- 功能可以轻松扩展
- 代码大小保持最小

---

## 🚀 下一步

- **录制数据**：使用 Drawing Recorder 收集绘图数据
- **训练模型**：运行 `train.py` 使用您的数据进行微调
- **体验结果**：在 SketchRNN Player 中测试您的新模型

祝您创意编程愉快！ 🎨✨
