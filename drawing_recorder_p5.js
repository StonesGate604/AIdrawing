// ==========================================
// 全局状态变量
// ==========================================
let currentStrokePoints = []; // 当前笔画的点列表
let currentTool = 'brush'; // 当前工具
let currentColor = '#000000'; // 当前颜色
let brushSize = 12; // 画笔大小
let isDrawing = false; // 是否正在画

// 撤销用的：每次mousePressed前保存一份画面
let undoStack = [];

// 录制相关
let isRecording = false;
let session = []; // 当前session的所有步骤
let allSessions = []; // 所有session
let stepCount = 0;
let strokeStartX = 0;
let strokeStartY = 0;

// 颜色列表
const COLORS = [
    '#000000', '#ffffff', '#ff4444', '#ff8800',
    '#ffdd00', '#44cc44', '#4488ff', '#aa44ff',
    '#ff44aa', '#8B4513', '#888888', '#cccccc'
];

// ==========================================
// 建颜色按钮（在p5 setup之前就可以做）
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
    // 更新按钮的选中状态
    document.querySelectorAll('.color-btn').forEach(b => {
        b.classList.toggle('selected', b.style.background === hexToRgb(c));
    });
}

// 把 #ff0000 转成 rgb(255, 0, 0) 格式（用于比较）
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgb(${r}, ${g}, ${b})`;
}

function selectTool(tool) {
    currentTool = tool;
    // 更新工具按钮选中状态
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('selected'));
    document.getElementById('btn-' + tool).classList.add('selected');
}

// ==========================================
// p5.js 主程序
// ==========================================
new p5(function (p) {
    p.setup = function () {
        // 创建600x600的画布，放在body最前面（左边）
        const cnv = p.createCanvas(window.innerWidth - 300, window.innerHeight);
        cnv.parent(document.body); // 插到body里，在controls前面
        document.body.insertBefore(cnv.elt, document.getElementById('controls'));

        p.background(255); // 白色背景

        window.addEventListener('resize', function () {
            const snapshot = p.canvas.toDataURL();
            p.resizeCanvas(window.innerWidth - 300, window.innerHeight);
            const img = new Image();
            img.src = snapshot;
            img.onload = () => p.drawingContext.drawImage(img, 0, 0);
        });

    };

    p.draw = function () {
        // p5的draw()每帧都跑，但我们用事件驱动，这里不需要写东西
    };

    // ---- 鼠标按下 ----
    p.mousePressed = function () {

        currentStrokePoints = []; //清空当前笔画的点列表
        // 只在画布范围内响应
        if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;

        // 保存一份画面用于撤销
        undoStack.push(p.canvas.toDataURL());
        if (undoStack.length > 20) undoStack.shift(); // 最多存20步

        strokeStartX = p.mouseX;
        strokeStartY = p.mouseY;
        isDrawing = true;

        // 填充工具：按下就执行，不需要拖动
        if (currentTool === 'fill') {
            floodFill(Math.floor(p.mouseX), Math.floor(p.mouseY), currentColor);

            // 录制：记录这一步
            if (isRecording) {
                captureStep('fill', p.mouseX, p.mouseY);
            }
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
            p.line(p.pmouseX, p.pmouseY, p.mouseX, p.mouseY); // 从上一帧位置画到当前位置
        }

        if (currentTool === 'eraser') {
            p.stroke(255); // 白色 = 橡皮
            p.strokeWeight(brushSize * 2);
            p.line(p.pmouseX, p.pmouseY, p.mouseX, p.mouseY);
        }
        currentStrokePoints.push({
            x: +(p.mouseX / p.width).toFixed(4),
            y: +(p.mouseY / p.height).toFixed(4)
        });
    };

    // ---- 鼠标松开：一笔结束 ----
    p.mouseReleased = function () {
        if (!isDrawing) return;
        isDrawing = false;

        // 录制：一笔画完，保存截图和动作数据
        if (isRecording && (currentTool === 'brush' || currentTool === 'eraser')) {
            captureStep('stroke_end', p.mouseX, p.mouseY);
        }
    };

    // ---- 键盘：Ctrl+Z 撤销 ----
    p.keyPressed = function () {
        if ((p.keyIsDown(p.CONTROL) || p.keyIsDown(p.META)) && p.key === 'z') {
            undoLast();
        }
    };

    // ==========================================
    // 撤销：恢复上一步的画面
    // ==========================================
    window.undoLast = function () {
        if (undoStack.length === 0) return;
        const img = new Image();
        img.src = undoStack.pop();
        img.onload = () => p.drawingContext.drawImage(img, 0, 0);
    };

    // ==========================================
    // 清空画布
    // ==========================================
    window.clearDrawing = function () {
        undoStack.push(p.canvas.toDataURL()); // 清空前也可以撤销
        p.background(255);
    };

    // ==========================================
    // 填充算法（flood fill）
    // 从点击位置开始，把相同颜色的区域填成新颜色
    // ==========================================
    function floodFill(startX, startY, fillColor) {
        // 获取整张画布的像素数据
        const imgData = p.drawingContext.getImageData(0, 0, p.width, p.height);
        const data = imgData.data; // 每个像素4个值：R,G,B,A

        // 把目标颜色hex转成RGB
        const fr = parseInt(fillColor.slice(1, 3), 16);
        const fg = parseInt(fillColor.slice(3, 5), 16);
        const fb = parseInt(fillColor.slice(5, 7), 16);

        // 获取起点颜色
        const i0 = (startY * p.width + startX) * 4;
        const tr = data[i0];
        const tg = data[i0 + 1];
        const tb = data[i0 + 2];

        // 如果起点已经是目标颜色，不用填
        if (tr === fr && tg === fg && tb === fb) return;

        // BFS扩散填充
        const stack = [[startX, startY]];
        const visited = new Uint8Array(p.width * p.height);

        while (stack.length > 0) {
            const [x, y] = stack.pop();
            if (x < 0 || x >= p.width || y < 0 || y >= p.height) continue;

            const vi = y * p.width + x;
            if (visited[vi]) continue;

            const i = vi * 4;
            // 判断这个像素是否和起点颜色接近
            if (Math.abs(data[i] - tr) > 30 || Math.abs(data[i + 1] - tg) > 30 || Math.abs(data[i + 2] - tb) > 30) continue;

            // 填色
            visited[vi] = 1;
            data[i] = fr;
            data[i + 1] = fg;
            data[i + 2] = fb;
            data[i + 3] = 255;

            // 把四个方向加入队列
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }

        p.drawingContext.putImageData(imgData, 0, 0);
    }

    // ==========================================
    // 录制核心：截图 + 记录动作
    // ==========================================
    window.captureStep = function (actionType, x, y) {
        // 截图当前画布（base64格式）
        const snapshot = p.canvas.toDataURL('image/png');

        // 构建这一步的数据
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

        // 更新界面上的步数显示
        document.getElementById('step-display').textContent = stepCount;
    };
});

// ==========================================
// 录制开关
// ==========================================
function toggleRecording() {
    if (!isRecording) {
        // 开始录制
        isRecording = true;
        session = [];
        stepCount = 0;
        document.getElementById('rec-btn').textContent = '⏹ stop recording';
        document.getElementById('rec-status').textContent = '🔴 recording';
    } else {
        // 停止录制
        isRecording = false;
        if (session.length > 0) {
            allSessions.push([...session]); // 把这个session存起来
        }
        document.getElementById('rec-btn').textContent = '⏺ start recording';
        document.getElementById('rec-status').textContent = 'not recording';
        document.getElementById('session-display').textContent = allSessions.length;
    }
}

// ==========================================
// 保存：打包成zip下载
// ==========================================
async function saveData() {
    // 把当前进行中的session也算进去
    const toSave = [...allSessions];
    if (isRecording && session.length > 0) toSave.push([...session]);

    if (toSave.length === 0) {
        alert('还没有录制数据！');
        return;
    }

    const zip = new JSZip();

    // 每个session建一个文件夹
    toSave.forEach((sess, si) => {
        const folder = zip.folder(`session_${si}`);

        sess.forEach(step => {
            const name = `step_${String(step.step_id).padStart(4, '0')}`;

            // 保存截图（base64转文件）
            folder.file(`${name}.png`, step.snapshot.split(',')[1], { base64: true });

            // 保存JSON（不含截图，只存动作数据）
            const meta = { ...step };
            delete meta.snapshot;
            folder.file(`${name}.json`, JSON.stringify(meta, null, 2));
        });
    });

    // 生成zip并触发下载
    const blob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `drawing_data_${Date.now()}.zip`;
    link.click();
}
