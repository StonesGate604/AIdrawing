// Shared state and basic UI helpers
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
let aiBrushSize = 6;
let aiStrokeScale = 1;
const AI_BASE_STROKE_SCALE = 2.5;
const AI_BASE_CANVAS_MIN_EDGE = 800;
let aiColor = '#aa44ff';

let currentTimelineIndex = -1;
const STEP_SLOT_WIDTH = 50;
let timelineInteractionsBound = false;

const COLORS = [
    '#000000', '#ffffff', '#ff4444', '#ff8800',
    '#ffdd00', '#44cc44', '#4488ff', '#aa44ff',
    '#ff44aa', '#8B4513', '#888888', '#cccccc'
];

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

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

window.updateAiStrokeScale = function (canvasWidth, canvasHeight) {
    const minEdge = Math.max(1, Math.min(canvasWidth, canvasHeight));
    const ratio = minEdge / AI_BASE_CANVAS_MIN_EDGE;
    aiStrokeScale = +(AI_BASE_STROKE_SCALE * clamp(ratio, 0.6, 2.2)).toFixed(3);
};
