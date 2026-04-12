// SketchRNN / AI drawing logic
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
