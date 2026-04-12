// Timeline rendering and interaction
const STEP_ICON = {
    'stroke_end': 'pencil',
    'fill': 'paint-bucket',
    'eraser': 'eraser',
    'ai_stroke_end': 'sparkles',
};

function getStepClass(action) {
    if (action.type === 'ai_stroke_end') return 'ai';
    if (action.tool === 'eraser') return 'eraser';
    if (action.type === 'fill') return 'fill';
    return 'brush';
}

function updateTimeline() {
    const tl = document.getElementById('timeline');
    bindTimelineInteractions();

    tl.max = Math.max(0, stepCount - 1);
    if (stepCount === 0) {
        currentTimelineIndex = -1;
        tl.value = 0;
        document.getElementById('tl-label').textContent = 'step 0';
    } else {
        if (currentTimelineIndex < 0 || currentTimelineIndex > stepCount - 1) {
            currentTimelineIndex = stepCount - 1;
        }
        tl.value = currentTimelineIndex;
        document.getElementById('tl-label').textContent = `step ${currentTimelineIndex + 1}/${stepCount}`;
    }

    renderTimelineIcons();
    updateTimelineCursor();
    ensureActiveStepVisible(false);
}

function renderTimelineIcons() {
    const container = document.getElementById('tl-icons');
    container.innerHTML = '';
    container.style.width = `${Math.max(1, session.length) * STEP_SLOT_WIDTH + 28}px`;

    session.forEach((step, i) => {
        const action = step.action;
        const cls = getStepClass(action);
        const iconName = STEP_ICON[action.type] || 'pencil';

        const el = document.createElement('div');
        const isActive = i === currentTimelineIndex;
        el.className = `tl-step ${cls}${isActive ? ' active' : ''}`;
        el.title = `Step ${i + 1}: ${action.type} (${action.tool || ''})`;
        el.dataset.index = String(i);
        el.innerHTML = `<i data-lucide="${iconName}"></i>`;
        el.addEventListener('click', () => {
            seekTo(i);
        });
        container.appendChild(el);
    });

    if (window.lucide) lucide.createIcons();
}

function updateTimelineCursor() {
    const track = document.querySelector('.tl-track');
    const cursor = document.getElementById('tl-cursor');
    if (!track || currentTimelineIndex < 0 || session.length === 0) {
        cursor.style.opacity = '0';
        return;
    }

    const active = document.querySelector(`#tl-icons .tl-step[data-index="${currentTimelineIndex}"]`);
    if (!active) {
        cursor.style.opacity = '0';
        return;
    }

    const trackRect = track.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const x = activeRect.left - trackRect.left + activeRect.width / 2;
    cursor.style.left = `${x}px`;
    cursor.style.opacity = '0.75';
}

function updateActiveTimelineStep() {
    const steps = document.querySelectorAll('#tl-icons .tl-step');
    steps.forEach(el => {
        const idx = parseInt(el.dataset.index || '-1', 10);
        el.classList.toggle('active', idx === currentTimelineIndex);
    });
}

function ensureActiveStepVisible(center) {
    const track = document.querySelector('.tl-track');
    const active = document.querySelector(`#tl-icons .tl-step[data-index="${currentTimelineIndex}"]`);
    if (!track || !active) return;

    const centerX = active.offsetLeft + active.offsetWidth / 2;
    const viewLeft = track.scrollLeft;
    const viewRight = viewLeft + track.clientWidth;
    const padding = STEP_SLOT_WIDTH * 2;
    const isOutside = centerX < viewLeft + padding || centerX > viewRight - padding;
    if (!isOutside && !center) return;

    const target = Math.max(0, centerX - track.clientWidth / 2);
    track.scrollTo({ left: target, behavior: 'auto' });
}

function seekNearestStepByClientX(clientX) {
    if (session.length === 0) return;
    const track = document.querySelector('.tl-track');
    const steps = document.querySelectorAll('#tl-icons .tl-step');
    if (!track || steps.length === 0) return;

    const rect = track.getBoundingClientRect();
    const localX = clientX - rect.left + track.scrollLeft;
    let nearest = 0;
    let minDist = Number.POSITIVE_INFINITY;

    steps.forEach((el, idx) => {
        const center = el.offsetLeft + el.offsetWidth / 2;
        const dist = Math.abs(center - localX);
        if (dist < minDist) {
            minDist = dist;
            nearest = idx;
        }
    });

    seekTo(nearest);
}

function bindTimelineInteractions() {
    if (timelineInteractionsBound) return;

    const track = document.querySelector('.tl-track');
    const tl = document.getElementById('timeline');
    if (!track || !tl) return;

    let isScrubbing = false;

    track.addEventListener('scroll', () => {
        updateTimelineCursor();
    });

    track.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('.tl-step')) return;
        isScrubbing = true;
        seekNearestStepByClientX(e.clientX);
    });

    window.addEventListener('mousemove', (e) => {
        if (!isScrubbing) return;
        seekNearestStepByClientX(e.clientX);
    });

    window.addEventListener('mouseup', () => {
        isScrubbing = false;
    });

    track.addEventListener('click', (e) => {
        if (e.target.closest('.tl-step')) return;
        seekNearestStepByClientX(e.clientX);
    });

    tl.addEventListener('input', () => {
        const idx = parseInt(tl.value, 10) || 0;
        seekTo(idx);
    });

    timelineInteractionsBound = true;
}

function seekTo(index) {
    if (session.length === 0) return;
    const tl = document.getElementById('timeline');
    const safeIndex = Math.max(0, Math.min(index, session.length - 1));
    tl.value = safeIndex;
    currentTimelineIndex = safeIndex;
    document.getElementById('tl-label').textContent = `step ${safeIndex + 1}/${stepCount}`;
    updateActiveTimelineStep();
    updateTimelineCursor();
    ensureActiveStepVisible(false);
    window._p.background(255);

    for (let i = 0; i <= safeIndex; i++) {
        const action = session[i].action;

        if (action.type === 'stroke_end' || action.type === 'eraser' || action.type === 'ai_stroke_end') {
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
