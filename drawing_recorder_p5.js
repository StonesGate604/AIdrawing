// This file is intentionally slim after refactor.
// The app logic has been split into focused modules for readability:
// - drawing_recorder_p5.state.js    (global state + UI helpers)
// - drawing_recorder_p5.timeline.js (timeline render + interactions)
// - drawing_recorder_p5.ai.js       (SketchRNN load/start/stop + AI steps)
// - drawing_recorder_p5.canvas.js   (p5 canvas input/drawing + record/save)
//
// Current HTML loads those modules directly in order.
