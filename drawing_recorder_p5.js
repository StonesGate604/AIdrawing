// ==========================================
// 全局状态变量
// ==========================================
let currentStrokePoints = []; // 当前笔画的点列表
let currentTool = 'brush';    // 当前工具
let currentColor = '#000000'; // 当前颜色
let brushSize = 12;           // 画笔大小
let isDrawing = false;        // 是否正在画
let undoStack = [];           // 撤销栈
let isRecording = false;      // 是否在录制
let session = [];             // 当前session的所有步骤
let allSessions = [];         // 所有session
let stepCount = 0;            // 当前步数
let strokeStartX = 0;
let strokeStartY = 0;
let sketchModel = null;
let loadedModelName = '';
let isModelLoading = false;
let isAutoDrawing = false;
let pendingStroke = null;
let aiPenX = 0;
let aiPenY = 0;
let aiCurrentPoints = [];
let aiBrushSize = 3;
let aiColor = '#111111';
let currentTimelineIndex = -1;

const COLORS = [
    '#000000', '#ffffff', '#ff4444', '#ff8800',
    '#ffdd00', '#44cc44', '#4488ff', '#aa44ff',
    '#ff44aa', '#8B4513', '#888888', '#cccccc'
];

// ==========================================
// 颜色按钮
// ==========================================
const colorRow = document.getElementById('color-row');
COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.className = 'color-btn' + (c === '#000000' ? ' selected' : '');
    btn.style.background = c;
    btn.onclick = () => selectColor(c);
    colorRow.appendChild(btn);
});

function selectColor(c) {
    currentColor = c;
    document.querySelectorAll('.color-btn').forEach(b => {
        b.classList.toggle('selected', b.style.background === hexToRgb(c));
    });
}

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${r}, ${g}, ${b})`;
}

function selectTool(tool) {
    currentTool = tool;
    // 更新左侧工具栏按钮
    document.querySelectorAll('#toolbar .tool-btn').forEach(b => b.classList.remove('selected'));
    const btn = document.getElementById('btn-' + tool);
    if (btn) btn.classList.add('selected');
}

function truncateFutureStepsIfNeeded() {
    if (currentTimelineIndex >= stepCount - 1) return;
    const keepCount = Math.max(0, currentTimelineIndex + 1);
    session = session.slice(0, keepCount);
    stepCount = session.length;
    document.getElementById('step-display').textContent = stepCount;
    updateTimeline();
}

function getLastStrokeEndPoint() {
    if (session.length === 0) return null;
    const from = Math.min(currentTimelineIndex, session.length - 1);
    for (let i = from; i >= 0; i--) {
        const action = session[i].action;
        if (!action || !Array.isArray(action.points) || action.points.length === 0) continue;
        const last = action.points[action.points.length - 1];
        return {
            x: last.x * window._p.width,
            y: last.y * window._p.height
        };
    }
    return null;
}

// ==========================================
// p5.js 主程序
// ==========================================
new p5(function (p) {

    p.setup = function () {
        // 插入到canvas-area里
        const area = document.getElementById('canvas-area');
        const cnv = p.createCanvas(area.clientWidth, area.clientHeight);
        cnv.parent(area);

        p.background(255);

        // 暴露p5内部给外部函数使用
        window._p = p;
        window._ctx = p.drawingContext;

        window.addEventListener('resize', function () {
            const snapshot = p.canvas.toDataURL();
            const a = document.getElementById('canvas-area');
            p.resizeCanvas(a.clientWidth, a.clientHeight);
            const img = new Image();
            img.src = snapshot;
            img.onload = () => p.drawingContext.drawImage(img, 0, 0);
        });
    };

    p.draw = function () {
        if (!isAutoDrawing || !pendingStroke) return;

        const prevX = aiPenX;
        const prevY = aiPenY;
        aiPenX += pendingStroke.dx;
        aiPenY += pendingStroke.dy;

        if (pendingStroke.pen === 'down') {
            p.stroke(aiColor);
            p.strokeWeight(aiBrushSize);
            p.line(prevX, prevY, aiPenX, aiPenY);

            if (aiCurrentPoints.length === 0) {
                aiCurrentPoints.push({
                    x: +(prevX / p.width).toFixed(4),
                    y: +(prevY / p.height).toFixed(4)
                });
            }
            aiCurrentPoints.push({
                x: +(aiPenX / p.width).toFixed(4),
                y: +(aiPenY / p.height).toFixed(4)
            });
        }

        if ((pendingStroke.pen === 'up' || pendingStroke.pen === 'end') && aiCurrentPoints.length > 1) {
            captureAIStep();
            aiCurrentPoints = [];
        }

        if (pendingStroke.pen === 'end') {
            stopSketchRNN();
            setAiStatus('status: completed');
            pendingStroke = null;
            return;
        }

        pendingStroke = null;
        requestNextStroke();
    };

    // ---- 鼠标按下 ----
    p.mousePressed = function () {
        if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;

        truncateFutureStepsIfNeeded();
        currentStrokePoints = [];
        undoStack.push(p.canvas.toDataURL());
        if (undoStack.length > 20) undoStack.shift();

        strokeStartX = p.mouseX;
        strokeStartY = p.mouseY;
        isDrawing = true;

        if (currentTool === 'fill') {
            floodFill(Math.floor(p.mouseX), Math.floor(p.mouseY), currentColor);
            captureStep('fill', p.mouseX, p.mouseY);
            isDrawing = false;
        }
    };

    // ---- 鼠标拖动 ----
    p.mouseDragged = function () {
        if (!isDrawing) return;
        if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;

        if (currentTool === 'brush') {
            p.stroke(currentColor);
            p.strokeWeight(brushSize);
            p.line(p.pmouseX, p.pmouseY, p.mouseX, p.mouseY);
        }

        if (currentTool === 'eraser') {
            p.stroke(255);
            p.strokeWeight(brushSize * 2);
            p.line(p.pmouseX, p.pmouseY, p.mouseX, p.mouseY);
        }

        currentStrokePoints.push({
            x: +(p.mouseX / p.width).toFixed(4),
            y: +(p.mouseY / p.height).toFixed(4)
        });
    };

    // ---- 鼠标松开 ----
    p.mouseReleased = function () {
        if (!isDrawing) return;
        isDrawing = false;

        if (currentTool === 'brush' || currentTool === 'eraser') {
            captureStep('stroke_end', p.mouseX, p.mouseY);
        }
    };

    // ---- 键盘撤销 ----
    p.keyPressed = function () {
        if ((p.keyIsDown(p.CONTROL) || p.keyIsDown(p.META)) && p.key === 'z') {
            undoLast();
        }
    };

    // ---- 撤销 ----
    window.undoLast = function () {
        if (undoStack.length === 0) return;
        const img = new Image();
        img.src = undoStack.pop();
        img.onload = () => p.drawingContext.drawImage(img, 0, 0);
    };

    // ---- 清空画布 ----
    window.clearDrawing = function () {
        undoStack.push(p.canvas.toDataURL());
        p.background(255);
        session = [];
        stepCount = 0;
        currentTimelineIndex = -1;
        updateTimeline();
        aiPenX = p.width / 2;
        aiPenY = p.height / 2;
        aiCurrentPoints = [];
        if (sketchModel) sketchModel.reset();
    };

    // ==========================================
    // Flood Fill
    // ==========================================
    function floodFill(startX, startY, fillColor) {
        const imgData = p.drawingContext.getImageData(0, 0, p.width, p.height);
        const data = imgData.data;

        const fr = parseInt(fillColor.slice(1, 3), 16);
        const fg = parseInt(fillColor.slice(3, 5), 16);
        const fb = parseInt(fillColor.slice(5, 7), 16);

        const i0 = (startY * p.width + startX) * 4;
        const tr = data[i0], tg = data[i0 + 1], tb = data[i0 + 2];

        if (tr === fr && tg === fg && tb === fb) return;

        const stack = [[startX, startY]];
        const visited = new Uint8Array(p.width * p.height);

        while (stack.length > 0) {
            const [x, y] = stack.pop();
            if (x < 0 || x >= p.width || y < 0 || y >= p.height) continue;
            const vi = y * p.width + x;
            if (visited[vi]) continue;
            const i = vi * 4;
            if (Math.abs(data[i] - tr) > 30 || Math.abs(data[i + 1] - tg) > 30 || Math.abs(data[i + 2] - tb) > 30) continue;
            visited[vi] = 1;
            data[i] = fr; data[i + 1] = fg; data[i + 2] = fb; data[i + 3] = 255;
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }

        p.drawingContext.putImageData(imgData, 0, 0);
    }

    window._floodFill = floodFill;

    // ==========================================
    // captureStep
    // ==========================================
    window.captureStep = function (actionType, x, y) {
        const snapshot = p.canvas.toDataURL('image/png');

        const step = {
            step_id: stepCount,
            action: {
                type: actionType,
                tool: currentTool,
                color: currentColor,
                brush_size: brushSize,
                ...(actionType === 'fill'
                    ? {
                        x: +(x / p.width).toFixed(4),
                        y: +(y / p.height).toFixed(4)
                    }
                    : {
                        points: currentStrokePoints
                    }
                )
            },
            snapshot
        };

        session.push(step);
        stepCount++;
        document.getElementById('step-display').textContent = stepCount;
        updateTimeline();
    };
});

// ==========================================
// 时间轴
// ==========================================
function updateTimeline() {
    const tl = document.getElementById('timeline');
    tl.max = Math.max(0, stepCount - 1);
    tl.value = Math.max(0, stepCount - 1);
    currentTimelineIndex = stepCount - 1;
    document.getElementById('tl-label').textContent = `step ${stepCount}`;
}

function seekTo(index) {
    if (session.length === 0) return;
    currentTimelineIndex = index;
    document.getElementById('tl-label').textContent = `step ${index + 1}`;
    window._p.background(255);

    for (let i = 0; i <= index; i++) {
        const action = session[i].action;

        if (action.type === 'stroke_end' || action.type === 'ai_stroke_end') {
            window._ctx.beginPath();
            if (action.tool === 'eraser') {
                window._ctx.strokeStyle = '#ffffff';
                window._ctx.lineWidth = action.brush_size * 2;
            } else {
                window._ctx.strokeStyle = action.color;
                window._ctx.lineWidth = action.brush_size;
            }
            window._ctx.lineCap = 'round';
            window._ctx.lineJoin = 'round';
            action.points.forEach((pt, pi) => {
                const x = pt.x * window._p.width;
                const y = pt.y * window._p.height;
                if (pi === 0) window._ctx.moveTo(x, y);
                else window._ctx.lineTo(x, y);
            });
            window._ctx.stroke();

        } else if (action.type === 'fill') {
            window._floodFill(
                Math.floor(action.x * window._p.width),
                Math.floor(action.y * window._p.height),
                action.color
            );
        }
    }
}

// ==========================================
// 录制开关
// ==========================================
function toggleRecording() {
    if (!isRecording) {
        isRecording = true;
        session = [];
        stepCount = 0;
        currentTimelineIndex = -1;
        updateTimeline();
        document.getElementById('rec-btn').textContent = '⏹ Stop Recording';
        document.getElementById('rec-status').textContent = '🔴 recording';
    } else {
        isRecording = false;
        if (session.length > 0) allSessions.push([...session]);
        document.getElementById('rec-btn').textContent = '⏺ Start Recording';
        document.getElementById('rec-status').textContent = 'idle';
        document.getElementById('session-display').textContent = allSessions.length;
    }
}

// ==========================================
// 保存数据
// ==========================================
async function saveData() {
    const toSave = [...allSessions];
    if (isRecording && session.length > 0) toSave.push([...session]);

    if (toSave.length === 0) {
        alert('No recorded data yet!');
        return;
    }

    const zip = new JSZip();
    toSave.forEach((sess, si) => {
        const folder = zip.folder(`session_${si}`);
        sess.forEach(step => {
            const name = `step_${String(step.step_id).padStart(4, '0')}`;
            folder.file(`${name}.png`, step.snapshot.split(',')[1], { base64: true });
            const meta = { ...step };
            delete meta.snapshot;
            folder.file(`${name}.json`, JSON.stringify(meta, null, 2));
        });
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `drawing_data_${Date.now()}.zip`;
    link.click();
}

// ==========================================
// SketchRNN
// ==========================================
function setAiStatus(text) {
    const el = document.getElementById('ai-status');
    if (el) el.textContent = text;
}

function captureAIStep() {
    const p = window._p;
    const snapshot = p.canvas.toDataURL('image/png');
    const step = {
        step_id: stepCount,
        action: {
            type: 'ai_stroke_end',
            tool: 'ai_brush',
            color: aiColor,
            brush_size: aiBrushSize,
            model: loadedModelName,
            points: aiCurrentPoints
        },
        snapshot
    };
    session.push(step);
    stepCount++;
    currentTimelineIndex = stepCount - 1;
    document.getElementById('step-display').textContent = stepCount;
    updateTimeline();
}

function requestNextStroke() {
    if (!isAutoDrawing || !sketchModel) return;
    sketchModel.generate(function (err, strokePath) {
        if (err) {
            console.error(err);
            stopSketchRNN();
            setAiStatus('status: generate failed');
            return;
        }
        pendingStroke = strokePath;
    });
}

function ensureModelLoaded(callback) {
    const selectedName = document.getElementById('ai-model').value;
    if (sketchModel && loadedModelName === selectedName) {
        callback();
        return;
    }
    loadSketchModel(callback);
}

window.loadSketchModel = function (done) {
    if (isModelLoading) return;
    const modelName = document.getElementById('ai-model').value;
    isModelLoading = true;
    setAiStatus(`status: loading ${modelName}...`);

    sketchModel = ml5.sketchRNN(modelName, function () {
        loadedModelName = modelName;
        isModelLoading = false;
        aiPenX = window._p.width / 2;
        aiPenY = window._p.height / 2;
        aiCurrentPoints = [];
        sketchModel.reset();
        setAiStatus(`status: ${modelName} ready ✓`);
        if (typeof done === 'function') done();
    });
};

window.startSketchRNN = function () {
    ensureModelLoaded(function () {
        if (isAutoDrawing) return;
        truncateFutureStepsIfNeeded();
        const anchor = getLastStrokeEndPoint();
        undoStack.push(window._p.canvas.toDataURL());
        isAutoDrawing = true;
        pendingStroke = null;
        aiCurrentPoints = [];
        aiPenX = anchor ? anchor.x : window._p.width / 2;
        aiPenY = anchor ? anchor.y : window._p.height / 2;
        sketchModel.reset();
        setAiStatus('status: drawing...');
        requestNextStroke();
    });
};

window.stopSketchRNN = function () {
    isAutoDrawing = false;
    pendingStroke = null;
    if (aiCurrentPoints.length > 1) {
        captureAIStep();
        aiCurrentPoints = [];
    }
    setAiStatus('status: stopped');
};
