// ==========================================
// STATE
// ==========================================
const canvas = document.getElementById('main-canvas');
const ctx = canvas.getContext('2d');

let currentTool = 'brush';
let currentColor = '#000000';
let currentBrushSize = 12;
let currentOpacity = 1.0;
let isDrawing = false;
let strokeStartX = 0, strokeStartY = 0;
let lastX = 0, lastY = 0;
let strokeLength = 0;
let undoStack = [];

// ==========================================
// PALETTE
// ==========================================
const PALETTE = [
  '#000000','#ffffff','#ff4444','#ff8c00','#ffd700',
  '#44dd44','#44aaff','#aa44ff','#ff44aa','#8B4513',
  '#555555','#aaaaaa','#ffaaaa','#aaffaa','#aaaaff',
  '#ff6633','#33ccff','#cc33ff','#ffcc33','#33ffcc'
];

function buildPalette() {
  const el = document.getElementById('palette');
  PALETTE.forEach(c => {
    const div = document.createElement('div');
    div.className = 'palette-color';
    div.style.background = c;
    div.onclick = () => setColor(c);
    el.appendChild(div);
  });
}

function setColor(hex) {
  currentColor = hex;
  document.getElementById('color-picker').value = hex;
  document.getElementById('color-swatch').style.background = hex;
  document.getElementById('hex-display').textContent = hex.toUpperCase();
  document.querySelectorAll('.palette-color').forEach(el => {
    el.classList.toggle('selected', el.style.background === hexToRGB(hex) || el.style.background === hex);
  });
  if (Recorder.isRecording) {
    Recorder.capture('color_change', { color: hex });
  }
}

function hexToRGB(hex) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgb(${r}, ${g}, ${b})`;
}

document.getElementById('color-picker').addEventListener('input', e => {
  setColor(e.target.value);
});

// ==========================================
// TOOL SELECTION
// ==========================================
function selectTool(tool) {
  currentTool = tool;
  document.querySelectorAll('.tool-btn[data-tool]').forEach(b => {
    b.classList.toggle('active', b.dataset.tool === tool);
  });
  canvas.style.cursor = tool === 'fill' ? 'cell' : 'crosshair';
  if (Recorder.isRecording) {
    Recorder.capture('tool_change', { tool });
  }
}

// ==========================================
// BRUSH CONTROLS
// ==========================================
document.getElementById('brush-slider').addEventListener('input', e => {
  currentBrushSize = parseInt(e.target.value);
  document.getElementById('brush-size-label').textContent = `${currentBrushSize} px`;
  const s = Math.min(currentBrushSize, 40);
  document.getElementById('brush-circle').style.width = s + 'px';
  document.getElementById('brush-circle').style.height = s + 'px';
});

document.getElementById('opacity-slider').addEventListener('input', e => {
  currentOpacity = parseInt(e.target.value) / 100;
  document.getElementById('opacity-label').textContent = e.target.value + '%';
});

// ==========================================
// DRAWING
// ==========================================
function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY
  };
}

canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', endDraw);
canvas.addEventListener('mouseleave', endDraw);
canvas.addEventListener('touchstart', e => { e.preventDefault(); startDraw(e); }, {passive:false});
canvas.addEventListener('touchmove', e => { e.preventDefault(); draw(e); }, {passive:false});
canvas.addEventListener('touchend', e => { e.preventDefault(); endDraw(e); }, {passive:false});

function startDraw(e) {
  saveUndo();
  isDrawing = true;
  strokeLength = 0;
  const pos = getPos(e);
  lastX = strokeStartX = pos.x;
  lastY = strokeStartY = pos.y;

  if (currentTool === 'fill') {
    floodFill(Math.round(pos.x), Math.round(pos.y), currentColor);
    if (Recorder.isRecording) {
      Recorder.capture('fill', { x: pos.x, y: pos.y, color: currentColor });
    }
    isDrawing = false;
    return;
  }

  ctx.beginPath();
  ctx.arc(pos.x, pos.y, getBrushRadius(), 0, Math.PI * 2);
  ctx.fillStyle = getDrawColor();
  ctx.fill();
}

function draw(e) {
  if (!isDrawing) return;
  const pos = getPos(e);
  const dx = pos.x - lastX, dy = pos.y - lastY;
  strokeLength += Math.sqrt(dx*dx + dy*dy);

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(pos.x, pos.y);
  ctx.strokeStyle = getDrawColor();
  ctx.lineWidth = getBrushRadius() * 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = currentOpacity;
  ctx.stroke();
  ctx.globalAlpha = 1.0;

  lastX = pos.x;
  lastY = pos.y;
}

function endDraw(e) {
  if (!isDrawing) return;
  isDrawing = false;
  const pos = e.type === 'mouseleave' ? { x: lastX, y: lastY } : getPos(e);

  if (strokeLength > 3 && Recorder.isRecording) {
    Recorder.capture('stroke_end', {
      x: pos.x,
      y: pos.y,
      x_start: strokeStartX,
      y_start: strokeStartY,
      stroke_length: strokeLength
    });
  }
}

function getBrushRadius() {
  return currentTool === 'eraser' ? currentBrushSize * 1.5 : currentBrushSize / 2;
}

function getDrawColor() {
  return currentTool === 'eraser' ? '#ffffff' : currentColor;
}

// ==========================================
// FLOOD FILL
// ==========================================
function floodFill(startX, startY, fillColorHex) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const idx = (y, x) => (y * canvas.width + x) * 4;
  const targetIdx = idx(startY, startX);
  const tr = data[targetIdx], tg = data[targetIdx+1], tb = data[targetIdx+2], ta = data[targetIdx+3];

  const fr = parseInt(fillColorHex.slice(1,3),16);
  const fg = parseInt(fillColorHex.slice(3,5),16);
  const fb = parseInt(fillColorHex.slice(5,7),16);

  if (tr === fr && tg === fg && tb === fb) return;

  const match = i => Math.abs(data[i]-tr)<30 && Math.abs(data[i+1]-tg)<30 && Math.abs(data[i+2]-tb)<30 && Math.abs(data[i+3]-ta)<30;

  const stack = [[startX, startY]];
  const visited = new Uint8Array(canvas.width * canvas.height);

  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue;
    const vi = y * canvas.width + x;
    if (visited[vi]) continue;
    const i = vi * 4;
    if (!match(i)) continue;
    visited[vi] = 1;
    data[i] = fr; data[i+1] = fg; data[i+2] = fb; data[i+3] = 255;
    stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
  }
  ctx.putImageData(imageData, 0, 0);
}

// ==========================================
// UNDO
// ==========================================
function saveUndo() {
  if (undoStack.length > 30) undoStack.shift();
  undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
}

function undo() {
  if (undoStack.length === 0) return;
  ctx.putImageData(undoStack.pop(), 0, 0);
  if (Recorder.isRecording) {
    Recorder.capture('undo', {});
  }
}

function clearCanvas() {
  saveUndo();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); }
});

// ==========================================
// CANVAS RESIZE
// ==========================================
function resizeCanvas(w, h) {
  const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  canvas.width = w;
  canvas.height = h;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  ctx.putImageData(snapshot, 0, 0);
  document.querySelectorAll('.size-btn').forEach(b => {
    b.classList.toggle('active', b.textContent === `${w}²`);
  });
  undoStack = [];
}

// ==========================================
// RECORDER
// ==========================================
const Recorder = {
  isRecording: false,
  currentSession: [],
  allSessions: [],
  stepCount: 0,
  sessionCount: 0,
  totalSteps: 0,
  sessionId: null,

  start() {
    this.currentSession = [];
    this.stepCount = 0;
    this.isRecording = true;
    this.sessionId = `s${Date.now()}`;
    this.sessionCount++;

    document.getElementById('rec-dot').classList.add('active');
    document.getElementById('rec-label').classList.add('active');
    document.getElementById('rec-label').textContent = 'REC';
    document.getElementById('rec-btn-icon').textContent = '⏹';
    document.getElementById('rec-btn-text').textContent = 'STOP REC';

    this.log(`Session ${this.sessionId} started`, 'tool');
    this.updateStats();
  },

  stop() {
    this.isRecording = false;
    if (this.currentSession.length > 0) {
      this.allSessions.push({
        id: this.sessionId,
        steps: [...this.currentSession],
        canvas_w: canvas.width,
        canvas_h: canvas.height,
        timestamp: Date.now()
      });
      this.totalSteps += this.currentSession.length;
    }

    document.getElementById('rec-dot').classList.remove('active');
    document.getElementById('rec-label').classList.remove('active');
    document.getElementById('rec-label').textContent = 'IDLE';
    document.getElementById('rec-btn-icon').textContent = '⏺';
    document.getElementById('rec-btn-text').textContent = 'START REC';

    this.log(`Stopped. ${this.currentSession.length} steps saved.`, 'color');
    this.updateStats();
  },

  capture(actionType, details = {}) {
    if (!this.isRecording) return;

    const imageDataURL = canvas.toDataURL('image/png');

    const step = {
      step_id: this.stepCount,
      session_id: this.sessionId,
      timestamp: Date.now(),
      action: {
        type: actionType,
        tool: details.tool || currentTool,
        color: details.color || currentColor,
        x: details.x !== undefined ? +(details.x / canvas.width).toFixed(4) : null,
        y: details.y !== undefined ? +(details.y / canvas.height).toFixed(4) : null,
        x_start: details.x_start !== undefined ? +(details.x_start / canvas.width).toFixed(4) : null,
        y_start: details.y_start !== undefined ? +(details.y_start / canvas.height).toFixed(4) : null,
        brush_size: currentBrushSize,
        opacity: currentOpacity,
        stroke_length: details.stroke_length ? +details.stroke_length.toFixed(1) : null
      },
      snapshot: imageDataURL
    };

    this.currentSession.push(step);
    this.stepCount++;

    document.getElementById('step-count').textContent = `${this.totalSteps + this.stepCount} steps`;

    const logClass = {stroke_end:'stroke', fill:'fill', color_change:'color', tool_change:'tool', undo:''}[actionType] || '';
    this.log(`[${String(this.stepCount).padStart(3,'0')}] ${actionType}`, logClass);
    this.updateStats();
  },

  log(msg, cls='') {
    const el = document.getElementById('session-log');
    const line = document.createElement('div');
    line.className = `log-line ${cls}`;
    line.textContent = msg;
    el.appendChild(line);
    el.scrollTop = el.scrollHeight;
  },

  updateStats() {
    document.getElementById('stat-steps').textContent = this.totalSteps + this.stepCount;
    document.getElementById('stat-sessions').textContent = this.allSessions.length + (this.isRecording ? 1 : 0);
  },

  async buildZip(sessions) {
    if (sessions.length === 0) { alert('No session data to save.'); return; }

    const zip = new JSZip();

    for (const session of sessions) {
      const folder = zip.folder(session.id);
      for (const step of session.steps) {
        const name = `step_${String(step.step_id).padStart(4,'0')}`;
        folder.file(`${name}.png`, step.snapshot.split(',')[1], { base64: true });
        const meta = { ...step };
        delete meta.snapshot;
        folder.file(`${name}.json`, JSON.stringify(meta, null, 2));
      }
      const summary = {
        session_id: session.id,
        total_steps: session.steps.length,
        canvas_width: session.canvas_w,
        canvas_height: session.canvas_h,
        recorded_at: new Date(session.timestamp).toISOString(),
        steps: session.steps.map(s => { const c = {...s}; delete c.snapshot; return c; })
      };
      folder.file('_summary.json', JSON.stringify(summary, null, 2));
    }

    return zip;
  },

  async saveSession() {
    const target = this.isRecording
      ? [{ id: this.sessionId, steps: this.currentSession, canvas_w: canvas.width, canvas_h: canvas.height, timestamp: Date.now() }]
      : this.allSessions.slice(-1);

    if (target.length === 0 || target[0].steps.length === 0) {
      alert('No steps recorded in current session yet.');
      return;
    }

    this.log('Saving...', '');
    const zip = await this.buildZip(target);
    const blob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `drawrec_${target[0].id}.zip`;
    link.click();
    this.log(`Saved ${target[0].steps.length} steps`, 'color');
  },

  async saveAll() {
    const all = [...this.allSessions];
    if (this.isRecording && this.currentSession.length > 0) {
      all.push({ id: this.sessionId, steps: this.currentSession, canvas_w: canvas.width, canvas_h: canvas.height, timestamp: Date.now() });
    }
    if (all.length === 0) { alert('No data to save.'); return; }

    this.log('Building archive...', '');
    const zip = await this.buildZip(all);
    const blob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `drawrec_ALL_${Date.now()}.zip`;
    link.click();
    this.log(`Saved ${all.length} sessions, ${this.totalSteps + this.stepCount} total steps`, 'color');
  },

  clear() {
    if (!confirm('Delete all recorded session data?')) return;
    this.allSessions = [];
    this.totalSteps = 0;
    this.updateStats();
    document.getElementById('session-log').innerHTML = '';
    this.log('All data cleared.', '');
  }
};

function toggleRecording() {
  Recorder.isRecording ? Recorder.stop() : Recorder.start();
}
function saveSession() { Recorder.saveSession(); }
function saveAllSessions() { Recorder.saveAll(); }
function clearSessions() { Recorder.clear(); }

// ==========================================
// INIT
// ==========================================
buildPalette();
setColor('#000000');
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, canvas.width, canvas.height);

const s = Math.min(currentBrushSize, 40);
document.getElementById('brush-circle').style.width = s + 'px';
document.getElementById('brush-circle').style.height = s + 'px';
