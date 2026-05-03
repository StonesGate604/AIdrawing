# 快速参考

## 三个版本一览

| 功能 | Recorder | Player | 原始版本 |
|------|----------|--------|--------|
| 画笔工具 | ✅ | ❌ | ✅ |
| 橡皮/填充 | ✅ | ❌ | ✅ |
| 录制功能 | ✅ | ❌ | ✅ |
| 导出数据 | ✅ | ❌ | ✅ |
| SketchRNN | ❌ | ✅ | ✅ |
| AI 生成 | ❌ | ✅ | ✅ |
| 时间轴 | ✅ | ✅ | ✅ |

## 文件对应表

```
打开这个             用来做这个
├─ launcher.html    👈 选择模式
├─ drawing_recorder.html        👈 记录数据
├─ sketch_rnn_player.html       👈 玩 AI 模型
└─ index.html                   👈 全功能版
```

## 工作流

```
📊 收集训练数据
  └─ drawing_recorder.html
     1. 画画
     2. Record
     3. Save as ZIP

🎨 体验 AI
  └─ sketch_rnn_player.html
     1. 选模型
     2. Load
     3. Start Drawing

🚀 训练模型
  └─ train.py
     用你的数据微调模型
```

## 链接速查

- 🎯 **开始** → `launcher.html`
- 📖 **完整说明** → `MODES.md`
- 🔧 **原始代码** → `index.html`
