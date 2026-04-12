# AIdrawing Diagrams / AIdrawing 流程与依赖图

## 1. Runtime Flowchart / 运行流程图

```mermaid
flowchart TD
    A[Page loads / 页面加载] --> B[Load modules / 加载模块]
    B --> C[state.js init / 状态初始化]
    C --> D[canvas.js p5 setup / p5 初始化]

    D --> E{User action / 用户动作}
    E -->|Draw| F[mouse input / 鼠标输入]
    F --> G[captureStep]
    G --> H[updateTimeline]

    E -->|Seek timeline| I[seekTo]
    I --> J[canvas replay / 画布重放]

    E -->|Start AI| K[startSketchRNN]
    K --> L[requestNextStroke]
    L --> M[captureAIStep]
    M --> H
```

## 2. Dependency Graph / 依赖关系图

```mermaid
graph LR
    HTML[drawing_recorder_p5.html] --> STATE[drawing_recorder_p5.state.js]
    HTML --> TL[drawing_recorder_p5.timeline.js]
    HTML --> AI[drawing_recorder_p5.ai.js]
    HTML --> CV[drawing_recorder_p5.canvas.js]

    STATE --> TL
    STATE --> AI
    STATE --> CV

    TL --> CV
    AI --> TL
    CV --> AI
```

## 3. Quick Notes / 快速说明

- Global shared state keeps code simple but increases coupling.
- Timeline/AI/Canvas all read and write the same `session` timeline.

- 共享全局状态让代码更直观，但耦合会更强。
- 时间轴/AI/画布都围绕同一份 `session` 数据工作。
