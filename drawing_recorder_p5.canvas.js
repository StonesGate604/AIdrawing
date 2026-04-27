// Canvas interactions, recording, and data export
new p5(function (p) {
    p.setup = function () {
        const area = document.getElementById('canvas-area');
        const cnv = p.createCanvas(area.clientWidth, area.clientHeight);
        cnv.parent(area);

        p.background(255);
        if (typeof window.updateAiStrokeScale === 'function') {
            window.updateAiStrokeScale(p.width, p.height);
        }

        window._p = p;
        window._ctx = p.drawingContext;

        window.addEventListener('resize', function () {
            const snapshot = p.canvas.toDataURL();
            const a = document.getElementById('canvas-area');
            p.resizeCanvas(a.clientWidth, a.clientHeight);
            if (typeof window.updateAiStrokeScale === 'function') {
                window.updateAiStrokeScale(p.width, p.height);
            }
            const img = new Image();
            img.src = snapshot;
            img.onload = () => p.drawingContext.drawImage(img, 0, 0);
        });
    };

    p.draw = function () {
        if (!isAutoDrawing || !pendingStroke) return;

        const prevX = aiPenX;
        const prevY = aiPenY;
        aiPenX += pendingStroke.dx * aiStrokeScale;
        aiPenY += pendingStroke.dy * aiStrokeScale;

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

    p.mousePressed = function () {
        if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;

        truncateFutureStepsIfNeeded();
        currentStrokePoints = [];
        undoStack.push(p.canvas.toDataURL());
        if (undoStack.length > 20) undoStack.shift();

        strokeStartX = p.mouseX;
        strokeStartY = p.mouseY;
        isDrawing = true;

        if (currentTool === 'brush' || currentTool === 'eraser') {
            currentStrokePoints.push({
                x: +(p.mouseX / p.width).toFixed(4),
                y: +(p.mouseY / p.height).toFixed(4)
            });
        }

        if (currentTool === 'fill') {
            floodFill(Math.floor(p.mouseX), Math.floor(p.mouseY), currentColor);
            captureStep('fill', p.mouseX, p.mouseY);
            isDrawing = false;
        }
    };

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

    p.mouseReleased = function () {
        if (!isDrawing) return;
        isDrawing = false;
        commitCurrentStroke(p.mouseX, p.mouseY);
    };

    p.mouseOut = function () {
        if (!isDrawing) return;
        isDrawing = false;
        commitCurrentStroke(p.mouseX, p.mouseY);
    };

    p.keyPressed = function () {
        if ((p.keyIsDown(p.CONTROL) || p.keyIsDown(p.META)) && p.key === 'z') {
            undoLast();
        }
    };

    window.undoLast = function () {
        if (session.length === 0) return;
        if (isAutoDrawing) stopSketchRNN();

        session.pop();
        stepCount = session.length;
        document.getElementById('step-display').textContent = stepCount;

        if (stepCount === 0) {
            currentTimelineIndex = -1;
            p.background(255);
            updateTimeline();
            return;
        }

        currentTimelineIndex = stepCount - 1;
        updateTimeline();
        seekTo(currentTimelineIndex);
    };

    window.clearDrawing = function () {
        if (isAutoDrawing) {
            stopSketchRNN();
        }
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
            data[i] = fr;
            data[i + 1] = fg;
            data[i + 2] = fb;
            data[i + 3] = 255;
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }

        p.drawingContext.putImageData(imgData, 0, 0);
    }

    window._floodFill = floodFill;

    function commitCurrentStroke(x, y) {
        if (currentTool !== 'brush' && currentTool !== 'eraser') return;
        if (currentStrokePoints.length < 2) {
            currentStrokePoints = [];
            return;
        }
        const actionType = currentTool === 'eraser' ? 'eraser' : 'stroke_end';
        captureStep(actionType, x, y);
        currentStrokePoints = [];
    }

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
        currentTimelineIndex = stepCount - 1;
        document.getElementById('step-display').textContent = stepCount;
        updateTimeline();
    };
});

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

async function uploadData() {
    const toSave = [...allSessions];
    if (isRecording && session.length > 0) toSave.push([...session]);
    if (toSave.length === 0) { alert('No data to upload!'); return; }

    // 只发JSON动作数据，不发截图
    const payload = toSave.map(sess => 
        sess.map(step => {
            const meta = { ...step };
            delete meta.snapshot;
            return meta;
        })
    );

    try {
        const res = await fetch('https://http://34.61.122.32:3000/stats/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessions: payload })
        });
        if (res.ok) alert('Uploaded! Thank you for contributing data.');
        else alert('Upload failed, please try again.');
    } catch (e) {
        alert('Network error: ' + e.message);
    }
}