# AIdrawing Code Architecture / 代码结构说明

This document explains how the drawing app is split into modules and how those modules depend on each other.

本文档说明这个绘图应用如何拆分为多个模块，以及这些模块之间的依赖和耦合方式。

## 1. File Overview / 文件总览

| File / 文件 | Responsibility / 职责 |
|---|---|
| `drawing_recorder_p5.html` | Page structure and script loading order / 页面结构和脚本加载顺序 |
| `drawing_recorder_p5.css` | UI layout, timeline styling / UI 布局和时间轴样式 |
| `drawing_recorder_p5.state.js` | Shared state + helper methods / 共享状态和辅助方法 |
| `drawing_recorder_p5.timeline.js` | Timeline rendering + interaction / 时间轴渲染与交互 |
| `drawing_recorder_p5.ai.js` | SketchRNN load/start/stop / SketchRNN 加载与启停 |
| `drawing_recorder_p5.canvas.js` | p5 canvas input/drawing/record/save / p5 画布输入绘制与录制保存 |

## 2. Loading Order / 加载顺序

1. `drawing_recorder_p5.state.js`
2. `drawing_recorder_p5.timeline.js`
3. `drawing_recorder_p5.ai.js`
4. `drawing_recorder_p5.canvas.js`

`state.js` should load first because all modules read/write shared state.

`state.js` 需要最先加载，因为所有模块都要访问共享状态。

## 3. Coupling Summary / 耦合关系总结

- Shared globals: `session`, `stepCount`, `currentTimelineIndex`, `currentTool`, `currentColor`.
- Shared canvas handles: `window._p`, `window._ctx`.
- Cross-module core methods: `updateTimeline()`, `seekTo()`, `captureStep()`, `captureAIStep()`.

- 共享全局变量：`session`、`stepCount`、`currentTimelineIndex`、`currentTool`、`currentColor`。
- 共享画布句柄：`window._p`、`window._ctx`。
- 跨模块核心方法：`updateTimeline()`、`seekTo()`、`captureStep()`、`captureAIStep()`。
