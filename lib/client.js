(() => {
  // src/client/react.js
  var runtime = null;
  var Fragment = null;
  function setReact(react) {
    if (!react) throw new Error("CueFlow: React was not provided by the DSH module loader.");
    runtime = react;
    Fragment = react.Fragment;
  }
  var React = new Proxy(
    {},
    {
      get(_target, property) {
        if (!runtime) throw new Error("CueFlow: React accessed before setReact().");
        return runtime[property];
      },
      has(_target, property) {
        return runtime ? property in runtime : false;
      }
    }
  );
  function h(type, props, ...children) {
    if (!runtime) throw new Error("CueFlow: h() called before setReact().");
    return runtime.createElement(type, props, ...children);
  }

  // src/client/styles.js
  var CSS = String.raw`
.cue-root {
  --cue-canvas: var(--dsw-alias-bg-layer-1, #e9edf2);
  --cue-canvas-2: var(--dsw-alias-bg-layer-2, #dfe5ec);
  --cue-grid: var(--dsw-alias-border-l1, #d2d9e2);
  --cue-panel: var(--dsw-alias-bg-layer-2, #f7f9fb);
  --cue-panel-2: var(--dsw-alias-bg-layer-3, #eef2f6);
  --cue-node: var(--dsw-alias-bg-layer-3, #ffffff);
  --cue-node-head: var(--dsw-alias-bg-layer-4, #f3f6f9);
  --cue-border: var(--dsw-alias-border-l2, #cfd7e1);
  --cue-border-strong: var(--dsw-alias-border-l4, #b5c0cd);
  --cue-text: var(--dsw-alias-label-primary, #141a22);
  --cue-muted: var(--dsw-alias-label-secondary, #5d6b7c);
  --cue-faint: var(--dsw-alias-label-tertiary, #8b97a7);
  --cue-amber: #b5791f;
  --cue-amber-bg: rgba(183, 121, 31, .12);
  --cue-cyan: #2f7f91;
  --cue-violet: #7655a8;
  --cue-green: #2f7d52;
  --cue-red: #b23a34;
  --cue-orange: #a55a26;
  --cue-blue: #2f6b9e;
  --cue-shadow: 0 16px 40px rgba(20, 28, 38, .14);
  --cue-rail: 3px;
  --cue-radius: 10px;
  --cue-font: "Segoe UI Variable Text", "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
  --cue-mono: "Cascadia Code", "JetBrains Mono", "SFMono-Regular", Consolas, monospace;
  position: relative;
  inset: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--cue-panel);
  color: var(--cue-text);
  font-family: var(--cue-font);
  font-size: 13px;
  line-height: 1.45;
  padding-top: var(--dsh-frame-top-clearance, 0px);
  box-sizing: border-box;
}

body[data-ds-dark-theme] .cue-root, html[data-ds-dark-theme] .cue-root, .cue-root[data-theme="dark"] {
  --cue-canvas: #0d1015;
  --cue-canvas-2: #11161d;
  --cue-grid: #1b222c;
  --cue-panel: #141920;
  --cue-panel-2: #1a212a;
  --cue-node: #1c232d;
  --cue-node-head: #242d39;
  --cue-border: #2b3542;
  --cue-border-strong: #3b4859;
  --cue-text: #e7edf5;
  --cue-muted: #93a1b4;
  --cue-faint: #647184;
  --cue-amber: #e7b75f;
  --cue-amber-bg: rgba(231, 183, 95, .12);
  --cue-cyan: #6fb7c8;
  --cue-violet: #b79ce0;
  --cue-green: #6fbf8f;
  --cue-red: #e07a72;
  --cue-orange: #e0a06f;
  --cue-blue: #6fa8dc;
  --cue-shadow: 0 16px 40px rgba(0, 0, 0, .42);
}

.cue-root *, .cue-root *::before, .cue-root *::after { box-sizing: border-box; }
.cue-root button, .cue-root input, .cue-root textarea, .cue-root select { font: inherit; }
.cue-root button { color: inherit; }
.cue-root ::selection { background: var(--cue-amber-bg); }
.cue-root :focus-visible { outline: 2px solid var(--cue-amber); outline-offset: 2px; }

/* top bar */
.cue-top {
  flex: 0 0 auto;
  height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border-bottom: 1px solid var(--cue-border);
  background: var(--cue-panel);
  z-index: 5;
}
.cue-brand { display: flex; align-items: center; gap: 8px; min-width: 0; color: var(--cue-text); }
.cue-brand-mark { width: 24px; height: 24px; color: var(--cue-muted); display: flex; align-items: center; justify-content: center; }
.cue-brand-name { font-weight: 600; font-size: 14px; letter-spacing: .01em; white-space: nowrap; }
.cue-brand-sub { font-size: 11px; color: var(--cue-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cue-sep { width: 1px; height: 22px; background: var(--cue-border); flex: 0 0 auto; }
.cue-workflow-picker { display: flex; align-items: center; gap: 6px; min-width: 0; }
.cue-workflow-select {
  max-width: 260px;
  height: 30px;
  border: 1px solid var(--cue-border);
  border-radius: 7px;
  background: var(--cue-panel-2);
  color: var(--cue-text);
  padding: 0 8px;
  font-size: 12px;
}
.cue-dirty { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--cue-faint); white-space: nowrap; }
.cue-dirty::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--cue-faint); }
.cue-dirty.is-dirty::before { background: var(--cue-amber); }
.cue-top-spacer { flex: 1 1 auto; min-width: 6px; }
.cue-top-actions { display: flex; align-items: center; gap: 6px; flex-wrap: nowrap; }
.cue-zoom-label { font-family: var(--cue-mono); font-size: 10.5px; color: var(--cue-faint); min-width: 34px; text-align: center; }

/* buttons */
.cue-btn {
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: 7px;
  padding: 0 10px;
  background: transparent;
  color: var(--cue-text);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  user-select: none;
}
.cue-btn:hover { background: var(--cue-panel-2); }
.cue-btn:disabled { opacity: .45; cursor: not-allowed; }
.cue-btn.primary { background: var(--cue-amber); border-color: var(--cue-amber); color: #1b1408; font-weight: 600; }
.cue-btn.primary:hover { filter: brightness(1.05); }
.cue-btn.outline { border-color: var(--cue-border); background: var(--cue-panel); }
.cue-btn.outline:hover { border-color: var(--cue-border-strong); }
.cue-btn.danger { color: var(--cue-red); }
.cue-btn.danger:hover { background: rgba(224, 122, 114, .12); }
.cue-btn.ghost { color: var(--cue-muted); }
.cue-btn.ghost:hover { color: var(--cue-text); }
.cue-btn.icon { width: 30px; padding: 0; }
.cue-btn.sm { height: 26px; padding: 0 8px; font-size: 11px; }
.cue-btn.sm.icon { width: 26px; }
.cue-btn .cue-btn-badge { font-family: var(--cue-mono); font-size: 10px; opacity: .75; }

/* body columns */
.cue-body { flex: 1 1 auto; min-height: 0; display: flex; }
.cue-library {
  flex: 0 0 220px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--cue-border);
  background: var(--cue-panel);
  z-index: 4;
}
.cue-library-head { padding: 12px 12px 8px; display: flex; flex-direction: column; gap: 8px; }
.cue-eyebrow { font-size: 10.5px; color: var(--cue-faint); letter-spacing: .04em; text-transform: uppercase; }
.cue-search {
  height: 30px;
  border: 1px solid var(--cue-border);
  border-radius: 7px;
  background: var(--cue-panel-2);
  color: var(--cue-text);
  padding: 0 9px;
  font-size: 12px;
  width: 100%;
}
.cue-library-list { flex: 1 1 auto; overflow: auto; padding: 0 8px 12px; }
.cue-library-group { margin-top: 10px; }
.cue-library-group-title { display: flex; align-items: center; justify-content: space-between; width: 100%; border: 0; background: transparent; font-size: 10.5px; color: var(--cue-faint); padding: 4px 6px; }
.cue-library-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  padding: 6px 7px;
  text-align: left;
  cursor: pointer;
  color: var(--cue-text);
}
.cue-library-search-icon { position: absolute; left: 9px; top: 8px; display: flex; color: var(--cue-faint); }
.cue-library-item:hover { background: var(--cue-panel-2); border-color: var(--cue-border); }
.cue-library-icon { width: 22px; height: 22px; flex: 0 0 auto; display: flex; align-items: center; justify-content: center; border-radius: 5px; background: var(--cue-panel-2); color: var(--cue-muted); }
.cue-library-item:hover .cue-library-icon { color: var(--cue-text); }
.cue-library-text { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.cue-library-label { font-size: 12px; line-height: 1.25; }
.cue-library-desc { font-size: 10.5px; color: var(--cue-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }
.cue-library-foot { padding: 8px 12px; border-top: 1px solid var(--cue-border); font-size: 10.5px; color: var(--cue-faint); display: flex; justify-content: space-between; }

/* canvas */
.cue-canvas-wrap { position: relative; flex: 1 1 auto; min-width: 0; min-height: 0; overflow: hidden; background: var(--cue-canvas); }
.cue-canvas {
  position: absolute;
  inset: 0;
  overflow: hidden;
  cursor: grab;
  background-color: var(--cue-canvas);
  background-image:
    linear-gradient(to right, var(--cue-grid) 1px, transparent 1px),
    linear-gradient(to bottom, var(--cue-grid) 1px, transparent 1px),
    linear-gradient(to right, color-mix(in srgb, var(--cue-grid) 70%, transparent) 1px, transparent 1px),
    linear-gradient(to bottom, color-mix(in srgb, var(--cue-grid) 70%, transparent) 1px, transparent 1px);
  background-size:
    calc(24px * var(--cue-zoom, 1)) calc(24px * var(--cue-zoom, 1)),
    calc(24px * var(--cue-zoom, 1)) calc(24px * var(--cue-zoom, 1)),
    calc(120px * var(--cue-zoom, 1)) calc(120px * var(--cue-zoom, 1)),
    calc(120px * var(--cue-zoom, 1)) calc(120px * var(--cue-zoom, 1));
  background-position: var(--cue-pan-x, 0px) var(--cue-pan-y, 0px);
}
.cue-canvas.is-panning { cursor: grabbing; }
.cue-world { position: absolute; left: 0; top: 0; width: 1px; height: 1px; transform-origin: 0 0; pointer-events: none; }
.cue-links { position: absolute; left: 0; top: 0; width: 1px; height: 1px; overflow: visible; pointer-events: none; }
.cue-link { fill: none; stroke-width: 1.6; stroke-linecap: round; pointer-events: none; }
.cue-link.running { stroke-dasharray: 6 7; animation: cue-dash 1.2s linear infinite; }
.cue-link-hit { fill: none; stroke: transparent; stroke-width: 14; pointer-events: stroke; cursor: pointer; }
.cue-link-hit:hover + .cue-link, .cue-link.selected { stroke-width: 2.4; }
.cue-link-dot { pointer-events: none; }

.cue-node {
  position: absolute;
  width: 264px;
  border: 1px solid var(--cue-border);
  border-radius: var(--cue-radius);
  background: var(--cue-node);
  pointer-events: auto;
  overflow: visible;
  box-shadow: 0 1px 0 rgba(0,0,0,.04);
  transition: border-color .12s ease, box-shadow .12s ease;
}
.cue-node:hover { border-color: var(--cue-border-strong); }
.cue-node.selected { border-color: var(--cue-amber); box-shadow: 0 0 0 1px var(--cue-amber), 0 8px 22px rgba(0,0,0,.10); }
.cue-node.has-error { border-color: var(--cue-red); }
.cue-node.is-running { border-color: var(--cue-amber); }
.cue-node.is-waiting-approval { border-color: var(--cue-orange); box-shadow: 0 0 0 1px color-mix(in srgb, var(--cue-orange) 35%, transparent); }
.cue-node.is-disabled { opacity: .62; }
.cue-node-rail { position: absolute; left: 0; top: 0; bottom: 0; width: var(--cue-rail); border-radius: var(--cue-radius) 0 0 var(--cue-radius); background: var(--cue-node-accent, var(--cue-amber)); }
.cue-node-head {
  height: 36px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 8px 0 12px;
  border-bottom: 1px solid var(--cue-border);
  border-radius: var(--cue-radius) var(--cue-radius) 0 0;
  background: var(--cue-node-head);
  cursor: grab;
  user-select: none;
}
.cue-node-head:active { cursor: grabbing; }
.cue-cue-light { width: 8px; height: 8px; border-radius: 50%; background: var(--cue-faint); flex: 0 0 auto; box-shadow: 0 0 0 3px var(--cue-node-head); }
.cue-cue-light.running { background: var(--cue-amber); animation: cue-pulse 1.2s ease-in-out infinite; }
.cue-cue-light.waiting-approval { background: var(--cue-orange); animation: cue-pulse 1.2s ease-in-out infinite; }
.cue-cue-light.queued { background: var(--cue-blue); }
.cue-cue-light.success { background: var(--cue-green); }
.cue-cue-light.error { background: var(--cue-red); }
.cue-cue-light.skipped { background: transparent; border: 1px solid var(--cue-faint); }
.cue-cue-light.cancelled { background: var(--cue-orange); }
.cue-node-title { flex: 1 1 auto; min-width: 0; font-size: 12.5px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cue-node-type { font-family: var(--cue-mono); font-size: 9.5px; color: var(--cue-faint); text-transform: lowercase; }
.cue-node-head-btn { width: 20px; height: 20px; border: 0; border-radius: 4px; background: transparent; color: var(--cue-faint); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; padding: 0; }
.cue-node-head-btn:hover { background: var(--cue-panel-2); color: var(--cue-text); }
.cue-node-body { padding: 8px 10px 9px; }
.cue-ports { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10px; }
.cue-port-list { display: flex; flex-direction: column; min-width: 0; }
.cue-port-list.out { align-items: flex-end; }
.cue-port {
  position: relative;
  height: 22px;
  display: flex;
  align-items: center;
  gap: 5px;
  font-family: var(--cue-mono);
  font-size: 10.5px;
  color: var(--cue-muted);
  min-width: 0;
  max-width: 100%;
}
.cue-port.in { padding-left: 9px; }
.cue-port.out { padding-right: 9px; justify-content: flex-end; }
.cue-port-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cue-port-required { color: var(--cue-amber); font-size: 10px; }
.cue-port-type { font-size: 9px; color: var(--cue-faint); opacity: .85; }
.cue-dot {
  position: absolute;
  top: 50%;
  width: 10px;
  height: 10px;
  margin-top: -5px;
  border-radius: 50%;
  background: var(--cue-port-color, var(--cue-muted));
  border: 2px solid var(--cue-node);
  box-shadow: 0 0 0 1px var(--cue-border);
  cursor: crosshair;
  padding: 0;
}
.cue-dot.in { left: -5px; }
.cue-dot.out { right: -5px; }
.cue-dot:hover, .cue-dot.active { transform: scale(1.25); box-shadow: 0 0 0 1px var(--cue-amber); }
.cue-dot.connected { box-shadow: 0 0 0 1px var(--cue-port-color), 0 0 0 4px color-mix(in srgb, var(--cue-port-color) 18%, transparent); }
.cue-node-summary { margin-top: 7px; padding-top: 7px; border-top: 1px dashed var(--cue-border); font-family: var(--cue-mono); font-size: 10px; color: var(--cue-faint); line-height: 1.45; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cue-node-preview { margin-top: 7px; padding: 6px 7px; border-radius: 5px; background: var(--cue-panel-2); font-family: var(--cue-mono); font-size: 10px; line-height: 1.45; color: var(--cue-muted); white-space: pre-wrap; max-height: 54px; overflow: hidden; }
.cue-node-error { margin-top: 7px; color: var(--cue-red); font-size: 10.5px; line-height: 1.4; max-height: 44px; overflow: hidden; }
.cue-node-badge { font-family: var(--cue-mono); font-size: 9px; color: var(--cue-faint); border: 1px solid var(--cue-border); border-radius: 3px; padding: 0 4px; }
.cue-node[data-type="note"] { background: color-mix(in srgb, var(--cue-node) 82%, transparent); }
.cue-node[data-type="note"] .cue-node-head { cursor: grab; }
.cue-node[data-type="note"] .cue-note-text { font-size: 11.5px; color: var(--cue-muted); white-space: pre-wrap; line-height: 1.5; max-height: 150px; overflow: hidden; }

.cue-canvas-controls { position: absolute; right: 12px; bottom: 12px; display: flex; align-items: center; gap: 4px; padding: 3px; border: 1px solid var(--cue-border); border-radius: 8px; background: color-mix(in srgb, var(--cue-panel) 92%, transparent); backdrop-filter: blur(8px); z-index: 8; }
.cue-canvas-controls .cue-btn { height: 26px; }
.cue-canvas-hint { position: absolute; left: 12px; bottom: 14px; display: flex; align-items: center; gap: 8px; font-family: var(--cue-mono); font-size: 10px; color: var(--cue-faint); pointer-events: none; z-index: 6; }
.cue-canvas-hint .dot { width: 5px; height: 5px; border-radius: 50%; background: var(--cue-faint); }
.cue-empty-state { position: absolute; left: 50%; top: 46%; transform: translate(-50%, -50%); text-align: center; z-index: 5; pointer-events: none; max-width: 380px; }
.cue-empty-title { font-size: 15px; font-weight: 600; color: var(--cue-muted); }
.cue-empty-desc { margin-top: 5px; font-size: 12px; color: var(--cue-faint); line-height: 1.6; }
.cue-empty-actions { margin-top: 12px; display: flex; gap: 8px; justify-content: center; pointer-events: auto; }

/* palette / menus */
.cue-palette { position: absolute; z-index: 40; width: 340px; max-height: min(480px, calc(100% - 24px)); display: flex; flex-direction: column; background: var(--cue-panel); border: 1px solid var(--cue-border); border-radius: 10px; box-shadow: var(--cue-shadow); overflow: hidden; }
.cue-palette-head { padding: 9px; border-bottom: 1px solid var(--cue-border); }
.cue-palette-list { overflow: auto; padding: 6px; }
.cue-palette-group { padding: 6px 6px 2px; font-size: 10px; color: var(--cue-faint); }
.cue-palette-item { width: 100%; display: flex; align-items: center; gap: 8px; border: 1px solid transparent; border-radius: 6px; background: transparent; padding: 6px 7px; text-align: left; cursor: pointer; }
.cue-palette-item:hover, .cue-palette-item.active { background: var(--cue-panel-2); border-color: var(--cue-border); }
.cue-palette-item .cue-library-icon { width: 20px; height: 20px; }
.cue-palette-item-text { min-width: 0; display: flex; flex-direction: column; }
.cue-palette-item-label { font-size: 12px; }
.cue-palette-item-desc { font-size: 10.5px; color: var(--cue-faint); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cue-palette-empty { padding: 18px 12px; text-align: center; font-size: 12px; color: var(--cue-faint); }
.cue-menu { position: absolute; z-index: 45; min-width: 160px; padding: 5px; background: var(--cue-panel); border: 1px solid var(--cue-border); border-radius: 8px; box-shadow: var(--cue-shadow); }
.cue-menu-item { width: 100%; display: flex; align-items: center; gap: 8px; border: 0; border-radius: 5px; background: transparent; padding: 6px 8px; text-align: left; font-size: 12px; cursor: pointer; }
.cue-menu-item:hover { background: var(--cue-panel-2); }
.cue-menu-item.danger { color: var(--cue-red); }
.cue-menu-sep { height: 1px; margin: 4px 6px; background: var(--cue-border); }

/* inspector */
.cue-inspector { flex: 0 0 320px; min-width: 0; min-height: 0; display: flex; flex-direction: column; border-left: 1px solid var(--cue-border); background: var(--cue-panel); z-index: 4; }
.cue-tabs { display: flex; align-items: center; gap: 2px; padding: 7px 8px 0; border-bottom: 1px solid var(--cue-border); flex: 0 0 auto; }
.cue-tab { border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--cue-faint); font-size: 12px; padding: 6px 9px 7px; cursor: pointer; }
.cue-tab:hover { color: var(--cue-text); }
.cue-tab.active { color: var(--cue-text); border-bottom-color: var(--cue-amber); }
.cue-tab-body { flex: 1 1 auto; overflow: auto; padding: 12px; }
.cue-inspector-empty { color: var(--cue-faint); font-size: 12px; line-height: 1.65; padding: 8px 2px; }
.cue-section { margin-bottom: 14px; }
.cue-section-title { font-size: 10.5px; color: var(--cue-faint); margin: 0 0 7px; letter-spacing: .03em; text-transform: uppercase; }
.cue-node-heading { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 12px; }
.cue-node-heading .cue-library-icon { width: 28px; height: 28px; }
.cue-node-heading-text { min-width: 0; flex: 1 1 auto; }
.cue-node-heading-title { font-size: 14px; font-weight: 600; }
.cue-node-heading-type { font-family: var(--cue-mono); font-size: 10px; color: var(--cue-faint); }
.cue-field { display: flex; flex-direction: column; gap: 5px; padding: 8px 0; border-top: 1px solid var(--cue-border); }
.cue-field:first-child { border-top: 0; }
.cue-field-label { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px; }
.cue-field-hint { font-size: 10.5px; color: var(--cue-faint); line-height: 1.5; }
.cue-input, .cue-textarea, .cue-select {
  width: 100%;
  border: 1px solid var(--cue-border);
  border-radius: 6px;
  background: var(--cue-panel-2);
  color: var(--cue-text);
  padding: 6px 8px;
  font-size: 12px;
  line-height: 1.45;
}
.cue-input { height: 30px; }
.cue-textarea { min-height: 68px; resize: vertical; font-family: var(--cue-mono); font-size: 11px; }
.cue-textarea.json { min-height: 100px; }
.cue-select { height: 30px; }
.cue-input:focus, .cue-textarea:focus, .cue-select:focus { outline: none; border-color: var(--cue-amber); }
.cue-inline { display: flex; align-items: center; gap: 6px; }
.cue-inline .cue-input, .cue-inline .cue-select { flex: 1 1 auto; min-width: 0; }
.cue-check { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--cue-muted); cursor: pointer; }
.cue-check input { accent-color: var(--cue-amber); width: 14px; height: 14px; }
.cue-switch { position: relative; width: 34px; height: 19px; border-radius: 999px; border: 0; background: var(--cue-border-strong); cursor: pointer; flex: 0 0 auto; padding: 2px; }
.cue-switch::after { content: ""; display: block; width: 15px; height: 15px; border-radius: 50%; background: #fff; transition: transform .12s ease; }
.cue-switch.on { background: var(--cue-amber); }
.cue-switch.on::after { transform: translateX(15px); }
.cue-switch:disabled { opacity: .5; }
.cue-port-status { display: flex; flex-direction: column; gap: 3px; font-family: var(--cue-mono); font-size: 10.5px; color: var(--cue-muted); }
.cue-port-status-row { display: flex; align-items: center; gap: 6px; }
.cue-port-status-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--cue-port-color, var(--cue-faint)); }
.cue-port-status-name { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cue-port-status-state { color: var(--cue-faint); font-size: 9.5px; }
.cue-divider { height: 1px; background: var(--cue-border); margin: 10px 0; }

/* issues / badges */
.cue-badge { display: inline-flex; align-items: center; gap: 4px; height: 18px; border: 1px solid var(--cue-border); border-radius: 4px; padding: 0 5px; font-family: var(--cue-mono); font-size: 9.5px; color: var(--cue-faint); white-space: nowrap; }
.cue-badge.amber { color: var(--cue-amber); border-color: color-mix(in srgb, var(--cue-amber) 40%, var(--cue-border)); }
.cue-badge.green { color: var(--cue-green); border-color: color-mix(in srgb, var(--cue-green) 40%, var(--cue-border)); }
.cue-badge.red { color: var(--cue-red); border-color: color-mix(in srgb, var(--cue-red) 40%, var(--cue-border)); }
.cue-badge.violet { color: var(--cue-violet); border-color: color-mix(in srgb, var(--cue-violet) 40%, var(--cue-border)); }
.cue-issues { display: flex; flex-direction: column; gap: 5px; }
.cue-issue { display: flex; gap: 7px; align-items: flex-start; padding: 7px 8px; border: 1px solid var(--cue-border); border-radius: 6px; background: var(--cue-panel-2); font-size: 11px; line-height: 1.45; cursor: pointer; }
.cue-issue:hover { border-color: var(--cue-border-strong); }
.cue-issue.error { border-left: 3px solid var(--cue-red); }
.cue-issue.warning { border-left: 3px solid var(--cue-orange); }
.cue-issue-text { flex: 1 1 auto; min-width: 0; }
.cue-issue-code { font-family: var(--cue-mono); font-size: 9.5px; color: var(--cue-faint); }
.cue-empty-note { font-size: 11.5px; color: var(--cue-faint); line-height: 1.6; }

/* dock */
.cue-dock { flex: 0 0 auto; border-top: 1px solid var(--cue-border); background: var(--cue-panel); display: flex; flex-direction: column; transition: height .16s ease; height: 34px; overflow: hidden; }
.cue-dock.open { height: 228px; }
.cue-dock-head { height: 34px; flex: 0 0 auto; display: flex; align-items: center; gap: 4px; padding: 0 8px; cursor: pointer; user-select: none; }
.cue-dock-title { font-size: 11.5px; color: var(--cue-muted); }
.cue-dock-status { display: flex; align-items: center; gap: 6px; font-family: var(--cue-mono); font-size: 10px; color: var(--cue-faint); }
.cue-dock-tabs { display: flex; gap: 2px; margin-left: 8px; }
.cue-dock-body { flex: 1 1 auto; min-height: 0; display: flex; overflow: hidden; border-top: 1px solid var(--cue-border); }
.cue-log { flex: 1 1 auto; overflow: auto; padding: 7px 10px; font-family: var(--cue-mono); font-size: 10.5px; line-height: 1.65; }
.cue-log-row { display: flex; gap: 8px; color: var(--cue-muted); }
.cue-log-time { color: var(--cue-faint); flex: 0 0 auto; }
.cue-log-node { color: var(--cue-amber); flex: 0 0 auto; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cue-log-msg { min-width: 0; white-space: pre-wrap; word-break: break-word; }
.cue-log-row.error .cue-log-msg { color: var(--cue-red); }
.cue-log-row.warn .cue-log-msg { color: var(--cue-orange); }
.cue-output-pane { flex: 0 0 42%; min-width: 0; border-left: 1px solid var(--cue-border); overflow: auto; padding: 9px 10px; }
.cue-output-pre { margin: 0; font-family: var(--cue-mono); font-size: 10.5px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; color: var(--cue-muted); }
.cue-output-title { font-size: 11px; color: var(--cue-text); margin: 0 0 5px; }
.cue-output-item { margin-bottom: 10px; }

/* run dialog / modal */
.cue-modal-backdrop { position: fixed; inset: 0; z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; background: rgba(8, 11, 15, .48); backdrop-filter: blur(2px); }
.cue-modal { width: min(620px, 94vw); max-height: min(760px, 88vh); display: flex; flex-direction: column; background: var(--cue-panel); border: 1px solid var(--cue-border); border-radius: 12px; box-shadow: var(--cue-shadow); overflow: hidden; color: var(--cue-text); }
.cue-modal.wide { width: min(860px, 94vw); }
.cue-modal-head { flex: 0 0 auto; padding: 14px 16px 12px; border-bottom: 1px solid var(--cue-border); display: flex; align-items: flex-start; gap: 10px; }
.cue-modal-title { font-size: 15px; font-weight: 600; margin: 0; }
.cue-modal-sub { margin: 2px 0 0; font-size: 11.5px; color: var(--cue-faint); line-height: 1.5; }
.cue-modal-body { flex: 1 1 auto; overflow: auto; padding: 14px 16px; }
.cue-modal-foot { flex: 0 0 auto; padding: 10px 16px; border-top: 1px solid var(--cue-border); display: flex; align-items: center; gap: 8px; }
.cue-modal-foot .cue-spacer { flex: 1 1 auto; }
.cue-warning { display: flex; gap: 7px; align-items: flex-start; padding: 8px 9px; border: 1px solid color-mix(in srgb, var(--cue-orange) 40%, var(--cue-border)); border-radius: 6px; background: color-mix(in srgb, var(--cue-orange) 9%, transparent); color: var(--cue-orange); font-size: 11.5px; line-height: 1.5; margin-bottom: 12px; }
.cue-warning .cue-warning-text { flex: 1 1 auto; }
.cue-approval-modal { width: min(560px, 94vw); }
.cue-approval-row { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 6px 0; border-bottom: 1px solid color-mix(in srgb, var(--cue-border) 55%, transparent); }
.cue-approval-row:last-of-type { border-bottom: 0; }
.cue-approval-path { font-family: var(--cue-mono); font-size: 11px; color: var(--cue-muted); overflow-wrap: anywhere; text-align: right; }
.cue-approval-command { margin: 4px 0 0; padding: 9px 10px; max-height: 180px; overflow: auto; border: 1px solid var(--cue-border); border-radius: 6px; background: var(--cue-panel-2); color: var(--cue-text); font-family: var(--cue-mono); font-size: 11px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; }

/* templates */
.cue-template-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.cue-template-card { text-align: left; border: 1px solid var(--cue-border); border-radius: 8px; background: var(--cue-panel-2); padding: 11px; cursor: pointer; }
.cue-template-card:hover { border-color: var(--cue-amber); }
.cue-template-name { font-size: 12.5px; font-weight: 600; }
.cue-template-desc { margin-top: 4px; font-size: 11px; color: var(--cue-faint); line-height: 1.5; }

/* history */
.cue-history { display: flex; flex-direction: column; gap: 4px; }
.cue-history-row { display: flex; align-items: center; gap: 7px; padding: 6px 7px; border: 1px solid var(--cue-border); border-radius: 6px; background: var(--cue-panel-2); cursor: pointer; font-size: 11px; }
.cue-history-row:hover { border-color: var(--cue-border-strong); }
.cue-history-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cue-history-meta { font-family: var(--cue-mono); font-size: 9.5px; color: var(--cue-faint); }

/* toast */
.cue-toast { position: fixed; right: 18px; bottom: 20px; z-index: 2000; max-width: min(420px, 90vw); padding: 9px 12px; border: 1px solid var(--cue-border); border-left: 3px solid var(--cue-green); border-radius: 7px; background: var(--cue-panel); box-shadow: var(--cue-shadow); font-size: 12px; line-height: 1.5; color: var(--cue-text); }
.cue-toast.error { border-left-color: var(--cue-red); }
.cue-toast.warn { border-left-color: var(--cue-orange); }

/* spinner */
.cue-spinner { width: 14px; height: 14px; border: 2px solid var(--cue-border); border-top-color: var(--cue-amber); border-radius: 50%; animation: cue-spin .8s linear infinite; flex: 0 0 auto; }

/* status text */
.cue-status { display: inline-flex; align-items: center; gap: 5px; font-family: var(--cue-mono); font-size: 10px; color: var(--cue-faint); }
.cue-status-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--cue-faint); }
.cue-status-dot.running { background: var(--cue-amber); }
.cue-status-dot.waiting-approval { background: var(--cue-orange); }
.cue-status-dot.success, .cue-status-dot.completed { background: var(--cue-green); }
.cue-status-dot.error { background: var(--cue-red); }
.cue-status-dot.cancelled { background: var(--cue-orange); }
.cue-status-dot.queued { background: var(--cue-blue); }
.cue-status-dot.skipped { background: transparent; border: 1px solid var(--cue-faint); }

/* responsive */
.cue-inspector-toggle { display: none; }

/* Container-driven layout: the DSH panel is narrower than the window because
   the app sidebar is still visible. These classes come from a ResizeObserver. */
.cue-root.compact .cue-library { flex-basis: 64px; }
.cue-root.compact .cue-library-head { padding: 10px 6px 8px; }
.cue-root.compact .cue-library-head .cue-search,
.cue-root.compact .cue-library-search-icon,
.cue-root.compact .cue-library-head .cue-eyebrow,
.cue-root.compact .cue-library-group-title,
.cue-root.compact .cue-library-text,
.cue-root.compact .cue-library-foot { display: none; }
.cue-root.compact .cue-library-list { padding: 0 4px 10px; }
.cue-root.compact .cue-library-group { margin-top: 6px; }
.cue-root.compact .cue-library-item { justify-content: center; padding: 7px 0; }
.cue-root.compact .cue-brand-sub { display: none; }
.cue-root.compact .cue-workflow-select { max-width: 200px; }
.cue-root.compact .cue-inspector-toggle { display: inline-flex; }
.cue-root.narrow .cue-library { flex-basis: 56px; }
.cue-root.narrow .cue-inspector { position: absolute; right: 0; top: 0; bottom: 0; width: min(340px, 88vw); flex-basis: auto; z-index: 30; box-shadow: var(--cue-shadow); }
.cue-root.narrow .cue-template-grid { grid-template-columns: 1fr; }
.cue-root.narrow .cue-dirty span { display: none; }

@media (max-width: 1200px) {
  .cue-library { flex-basis: 64px; }
  .cue-library-head { padding: 10px 6px 8px; }
  .cue-library-head .cue-search, .cue-library-head .cue-eyebrow, .cue-library-group-title, .cue-library-text, .cue-library-foot { display: none; }
  .cue-library-list { padding: 0 4px 10px; }
  .cue-library-group { margin-top: 6px; }
  .cue-library-item { justify-content: center; padding: 7px 0; }
  .cue-brand-sub { display: none; }
  .cue-workflow-select { max-width: 200px; }
}
@media (max-width: 1100px) {
  .cue-inspector { position: absolute; right: 0; top: 0; bottom: 0; width: min(340px, 88vw); flex-basis: auto; z-index: 30; box-shadow: var(--cue-shadow); }
  .cue-inspector-toggle { display: inline-flex; }
  .cue-template-grid { grid-template-columns: 1fr; }
  .cue-dirty span { display: none; }
}
@media (max-width: 860px) {
  .cue-library { flex-basis: 56px; }
  .cue-top { gap: 6px; padding: 0 8px; }
  .cue-workflow-select { max-width: 150px; }
}
@media (max-width: 620px) {
  .cue-top { flex-wrap: wrap; height: auto; min-height: 48px; padding: 6px 8px; }
  .cue-top-actions { width: 100%; justify-content: flex-end; }
  .cue-dock.open { height: 180px; }
  .cue-output-pane { display: none; }
}

@keyframes cue-pulse { 0%, 100% { box-shadow: 0 0 0 3px var(--cue-node-head), 0 0 0 0 rgba(231,183,95,.35); } 50% { box-shadow: 0 0 0 3px var(--cue-node-head), 0 0 0 5px rgba(231,183,95,.06); } }
@keyframes cue-dash { to { stroke-dashoffset: -26; } }
@keyframes cue-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .cue-root *, .cue-root *::before, .cue-root *::after { animation-duration: .001ms !important; transition-duration: .001ms !important; }
}
`;

  // src/client/api.js
  var API_BASE = "/api/dsh/dsh-plugin-cueflow";
  var ApiError = class extends Error {
    constructor(message, { status = 0, code = "API_ERROR", details } = {}) {
      super(message);
      this.name = "ApiError";
      this.status = status;
      this.code = code;
      if (details !== void 0) this.details = details;
    }
  };
  async function request(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      credentials: "same-origin",
      ...options,
      headers: {
        "x-cueflow-request": "1",
        ...options.body ? { "content-type": "application/json" } : {},
        ...options.headers ?? {}
      }
    });
    let body = null;
    const text = await response.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        throw new ApiError(`Host returned non-JSON (${response.status}).`, {
          status: response.status,
          code: "BAD_RESPONSE"
        });
      }
    }
    if (!response.ok || body && body.ok === false) {
      throw new ApiError(body?.error ?? `Request failed (${response.status}).`, {
        status: response.status,
        code: body?.code ?? "HTTP_ERROR",
        details: body?.details
      });
    }
    return body ?? {};
  }
  function getCatalog({ cwd, sessionId } = {}) {
    const query = new URLSearchParams();
    if (cwd) query.set("cwd", cwd);
    if (sessionId) query.set("sessionId", sessionId);
    const suffix = query.toString() ? `?${query}` : "";
    return request(`/catalog${suffix}`);
  }
  function listWorkflows() {
    return request("/workflows");
  }
  function getWorkflow(id) {
    return request(`/workflows/${encodeURIComponent(id)}`);
  }
  function saveWorkflow(workflow) {
    return request("/workflows", {
      method: "POST",
      body: JSON.stringify({ workflow })
    });
  }
  function deleteWorkflow(id) {
    return request(`/workflows/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
  function listWorkflowVersions(id) {
    return request(`/workflows/${encodeURIComponent(id)}/versions`);
  }
  function restoreWorkflowVersion(id, version) {
    return request(`/workflows/${encodeURIComponent(id)}/versions/${encodeURIComponent(version)}/restore`, {
      method: "POST"
    });
  }
  function startRun({ workflow, inputs, sessionId, cwd, concurrency }) {
    return request("/runs", {
      method: "POST",
      body: JSON.stringify({ workflow, inputs, sessionId, cwd, concurrency })
    });
  }
  function getRun(id, after) {
    const query = after === void 0 || after === null ? "" : `?after=${encodeURIComponent(after)}`;
    return request(`/runs/${encodeURIComponent(id)}${query}`);
  }
  function cancelRun(id) {
    return request(`/runs/${encodeURIComponent(id)}/cancel`, { method: "POST" });
  }
  function rerunRun(id, fromNodeId) {
    return request(`/runs/${encodeURIComponent(id)}/rerun`, {
      method: "POST",
      body: JSON.stringify(fromNodeId ? { fromNodeId } : {})
    });
  }
  function decideApproval(runId, approvalId, decision) {
    return request(`/runs/${encodeURIComponent(runId)}/approvals/${encodeURIComponent(approvalId)}`, {
      method: "POST",
      body: JSON.stringify({ decision })
    });
  }
  function listRuns(limit = 20) {
    return request(`/runs?limit=${encodeURIComponent(limit)}`);
  }

  // shared/constants.js
  var SCHEMA_VERSION = 1;
  var LIMITS = Object.freeze({
    maxNodes: 200,
    maxEdges: 500,
    maxBodyBytes: 1024 * 1024,
    maxOutputChars: 2e4,
    maxPreviewChars: 4e3,
    maxEvents: 2e3,
    maxInMemoryRuns: 20,
    runRetention: 50,
    pollIntervalMs: 600,
    maxSkillChars: 2e5,
    maxLogsPerNode: 80,
    heartbeatMs: 1e4,
    workflowVersions: 20
  });
  var DEFAULT_APPROVAL_TIMEOUT_MS = 5 * 60 * 1e3;
  var APPROVAL_NODE_TYPES = Object.freeze(["shell", "command"]);
  var APPROVAL_MODES = Object.freeze(["allow", "ask", "deny"]);
  var DEFAULT_CONCURRENCY = 2;
  var MIN_CONCURRENCY = 1;
  var MAX_CONCURRENCY = 8;
  var PORT_TYPES = Object.freeze(["text", "json", "number", "boolean", "any"]);
  var PORT_COLORS = Object.freeze({
    text: "#6fb7c8",
    json: "#b79ce0",
    number: "#93a1b4",
    boolean: "#6fbf8f",
    any: "#e7edf5"
  });
  var CATEGORY_COLORS = Object.freeze({
    io: "#e7b75f",
    transform: "#6fb7c8",
    agents: "#b79ce0",
    dsh: "#d98f5f",
    exec: "#6fbf8f",
    control: "#c9a36a",
    note: "#8a94a6"
  });
  var RUN_STATUS = Object.freeze([
    "created",
    "queued",
    "running",
    "completed",
    "error",
    "cancelled"
  ]);
  var TERMINAL_RUN_STATUS = Object.freeze(["completed", "error", "cancelled"]);
  var NODE_STATUS = Object.freeze([
    "idle",
    "queued",
    "waiting-approval",
    "running",
    "success",
    "error",
    "skipped",
    "cancelled"
  ]);
  var TERMINAL_NODE_STATUS = Object.freeze([
    "success",
    "error",
    "skipped",
    "cancelled"
  ]);
  var DEFAULT_TIMEOUTS = Object.freeze({
    agent: 6e5,
    skill: 6e5,
    command: 12e4,
    shell: 12e4,
    "file-read": 3e4,
    template: 5e3,
    input: 5e3,
    condition: 5e3,
    merge: 5e3,
    output: 5e3
  });
  var DEFAULT_WORKFLOW_SETTINGS = Object.freeze({
    concurrency: DEFAULT_CONCURRENCY,
    cwd: "",
    defaultProvider: "",
    defaultModel: "",
    sessionMode: "isolated",
    cancelPolicy: "abort-all"
  });
  function isTerminalRun(status) {
    return TERMINAL_RUN_STATUS.includes(status);
  }
  function clampConcurrency(value, fallback = DEFAULT_CONCURRENCY) {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return Math.max(MIN_CONCURRENCY, Math.min(MAX_CONCURRENCY, Math.floor(n)));
  }
  function makeId(prefix = "id", random = Math.random) {
    const body = Math.floor(random() * 36 ** 8).toString(36).padStart(8, "0").slice(-8);
    return `${prefix}_${body}`;
  }

  // shared/node-types.js
  var VALUE_TYPE_OPTIONS = ["text", "json", "number", "boolean"];
  function field(key, label, kind = "text", extra = {}) {
    return { key, label, kind, ...extra };
  }
  var RETRY_FIELDS = [
    field("retry", "Retry count", "number", { min: 0, max: 5, step: 1, hint: "Extra attempts after the first failure." }),
    field("retryDelayMs", "Retry delay (ms)", "number", { min: 0, max: 6e4, step: 100 }),
    field("onError", "On error", "select", {
      options: ["fail", "skip"],
      hint: "fail = stop the run; skip = mark this node skipped and continue."
    })
  ];
  var RETRY_DEFAULTS = { retry: 0, retryDelayMs: 500, onError: "fail" };
  var NODE_TYPES = Object.freeze({
    input: {
      type: "input",
      title: "Input",
      category: "io",
      description: "Expose one run input as a typed value.",
      inputs: [],
      outputs: [{ id: "value", label: "value", type: "any", typeFrom: "valueType" }],
      fields: [
        field("label", "Label", "text", { placeholder: "Task", hint: "Shown in the run dialog." }),
        field("valueType", "Value type", "select", { options: VALUE_TYPE_OPTIONS, hint: "Port type and runtime coercion." }),
        field("defaultValue", "Default value", "textarea", { rows: 3, hint: "Used when the run dialog leaves the field empty." }),
        field("placeholder", "Placeholder", "text", { placeholder: "Describe the task\u2026" }),
        field("required", "Required", "boolean", { hint: "Block the run when this input is empty." }),
        field("options", "Options", "text", { placeholder: "one, two, three", hint: "Comma-separated values render a select box." })
      ],
      defaults: {
        label: "Input",
        valueType: "text",
        defaultValue: "",
        placeholder: "",
        required: true,
        options: ""
      }
    },
    template: {
      type: "template",
      title: "Template",
      category: "transform",
      description: "Interpolate upstream values into text.",
      inputs: [{ id: "value", label: "value", type: "any", required: false }],
      outputs: [{ id: "text", label: "text", type: "text" }],
      fields: [
        field("template", "Template", "textarea", {
          rows: 6,
          placeholder: "Summarize this diff:\n\n{{input}}",
          hint: "Use {{input}} or {{nodeId.portId}}; unknown tokens are preserved."
        }),
        field("trim", "Trim whitespace", "boolean")
      ],
      defaults: { template: "", trim: true }
    },
    agent: {
      type: "agent",
      title: "Agent",
      category: "agents",
      description: "Run a subagent with a prompt and optional structured output.",
      inputs: [
        { id: "prompt", label: "prompt", type: "text", required: false },
        { id: "context", label: "context", type: "any", required: false }
      ],
      outputs: [
        { id: "text", label: "text", type: "text" },
        { id: "json", label: "json", type: "json" }
      ],
      fields: [
        field("prompt", "Prompt", "textarea", { rows: 7, placeholder: "Implement the requested change\u2026", hint: "A connected prompt input overrides this." }),
        field("instructions", "Workflow instructions", "textarea", { rows: 3, placeholder: "Read the repository before editing. Keep the diff focused.", hint: "Prepended as <workflow_instructions>." }),
        field("provider", "Provider", "text", { placeholder: "inherit parent" }),
        field("model", "Model", "text", { placeholder: "inherit parent" }),
        field("reasoningEffort", "Reasoning effort", "text", { placeholder: "inherit parent" }),
        field("agentPreset", "Agent preset", "text", { placeholder: "inherit parent" }),
        field("outputSchema", "Output JSON Schema", "json", { rows: 5, placeholder: '{\n  "type": "object",\n  "properties": {}\n}' }),
        field("parseJson", "Parse text as JSON", "boolean"),
        field("allowPartial", "Accept partial output on max-tokens", "boolean"),
        field("timeoutMs", "Timeout (ms)", "number", { min: 1e3, step: 1e3 }),
        ...RETRY_FIELDS
      ],
      defaults: {
        prompt: "",
        instructions: "",
        provider: "",
        model: "",
        reasoningEffort: "",
        agentPreset: "",
        outputSchema: "",
        parseJson: false,
        allowPartial: false,
        timeoutMs: DEFAULT_TIMEOUTS.agent,
        ...RETRY_DEFAULTS
      }
    },
    skill: {
      type: "skill",
      title: "Skill",
      category: "agents",
      description: "Load a DSH Skill (model- or user-invocable) and run it in a subagent.",
      inputs: [
        { id: "input", label: "input", type: "text", required: false },
        { id: "context", label: "context", type: "any", required: false }
      ],
      outputs: [
        { id: "text", label: "text", type: "text" },
        { id: "json", label: "json", type: "json" }
      ],
      fields: [
        field("skill", "Skill", "skill", { hint: "User-only skills are allowed: CueFlow is a trusted caller." }),
        field("instructions", "Workflow instructions", "textarea", { rows: 3 }),
        field("provider", "Provider", "text", { placeholder: "inherit parent" }),
        field("model", "Model", "text", { placeholder: "inherit parent" }),
        field("reasoningEffort", "Reasoning effort", "text", { placeholder: "inherit parent" }),
        field("outputSchema", "Output JSON Schema", "json", { rows: 5 }),
        field("parseJson", "Parse text as JSON", "boolean"),
        field("timeoutMs", "Timeout (ms)", "number", { min: 1e3, step: 1e3 }),
        ...RETRY_FIELDS
      ],
      defaults: {
        skill: "",
        instructions: "",
        provider: "",
        model: "",
        reasoningEffort: "",
        outputSchema: "",
        parseJson: false,
        timeoutMs: DEFAULT_TIMEOUTS.skill,
        ...RETRY_DEFAULTS
      }
    },
    command: {
      type: "command",
      title: "Command",
      category: "dsh",
      description: "Run a DSH slash command against a live session. Does not send it to the model.",
      inputs: [{ id: "input", label: "input", type: "text", required: false }],
      outputs: [
        { id: "text", label: "text", type: "text" },
        { id: "json", label: "json", type: "json" }
      ],
      fields: [
        field("command", "Command", "command", { hint: "Without the leading slash." }),
        field("fallbackInput", "Fallback input", "textarea", { rows: 3, hint: "Used when the input port is not connected." }),
        field("approval", "Approval", "select", {
          options: ["ask", "allow", "deny"],
          hint: "ask = require a one-shot confirmation; allow = run directly; deny = never run."
        }),
        field("timeoutMs", "Timeout (ms)", "number", { min: 1e3, step: 1e3 }),
        ...RETRY_FIELDS
      ],
      defaults: {
        command: "",
        fallbackInput: "",
        approval: "ask",
        timeoutMs: DEFAULT_TIMEOUTS.command,
        ...RETRY_DEFAULTS
      }
    },
    shell: {
      type: "shell",
      title: "Shell",
      category: "exec",
      description: "Run a shell command through DSH (subprocess/sandbox policy applies).",
      inputs: [
        { id: "command", label: "command", type: "text", required: false },
        { id: "stdin", label: "stdin", type: "text", required: false }
      ],
      outputs: [
        { id: "stdout", label: "stdout", type: "text" },
        { id: "stderr", label: "stderr", type: "text" },
        { id: "exitCode", label: "exitCode", type: "number" },
        { id: "text", label: "text", type: "text" }
      ],
      fields: [
        field("command", "Command", "textarea", { rows: 3, placeholder: "git diff --stat", hint: "A connected command input overrides this." }),
        field("workdir", "Working directory", "text", { placeholder: "run working directory" }),
        field("approval", "Approval", "select", {
          options: ["ask", "allow", "deny"],
          hint: "ask = require a one-shot confirmation; allow = run directly; deny = never run."
        }),
        field("timeoutMs", "Timeout (ms)", "number", { min: 1e3, step: 1e3 }),
        field("failOnNonZero", "Fail on non-zero exit", "boolean"),
        field("maxOutputChars", "Max output characters", "number", { min: 1e3, step: 1e3 }),
        ...RETRY_FIELDS
      ],
      defaults: {
        command: "",
        workdir: "",
        approval: "ask",
        timeoutMs: DEFAULT_TIMEOUTS.shell,
        failOnNonZero: true,
        maxOutputChars: 2e4,
        ...RETRY_DEFAULTS
      }
    },
    subflow: {
      type: "subflow",
      title: "Subflow",
      category: "control",
      description: "Run another saved workflow and return its outputs.",
      inputs: [{ id: "input", label: "input", type: "json", required: false }],
      outputs: [
        { id: "text", label: "text", type: "text" },
        { id: "json", label: "json", type: "json" }
      ],
      fields: [
        field("workflowId", "Workflow ID", "text", {
          placeholder: "wf_...",
          hint: "The saved workflow to run. Its Input nodes receive the input object by node id."
        }),
        ...RETRY_FIELDS
      ],
      defaults: {
        workflowId: "",
        ...RETRY_DEFAULTS
      }
    },
    "file-read": {
      type: "file-read",
      title: "Read File",
      category: "io",
      description: "Read a text file through DSH fs (no writes).",
      inputs: [{ id: "path", label: "path", type: "text", required: false }],
      outputs: [
        { id: "text", label: "text", type: "text" },
        { id: "info", label: "info", type: "json" }
      ],
      fields: [
        field("path", "Path", "text", { placeholder: "src/index.ts", hint: "Relative to the run working directory, or absolute." }),
        field("maxChars", "Max characters", "number", { min: 1e3, step: 1e3 }),
        ...RETRY_FIELDS
      ],
      defaults: { path: "", maxChars: 2e5, ...RETRY_DEFAULTS }
    },
    condition: {
      type: "condition",
      title: "Condition",
      category: "control",
      description: "Route a value into a true or false branch.",
      inputs: [{ id: "value", label: "value", type: "any", required: true }],
      outputs: [
        { id: "true", label: "true", type: "any" },
        { id: "false", label: "false", type: "any" }
      ],
      fields: [
        field("operator", "Operator", "select", {
          options: ["truthy", "falsy", "equals", "notEquals", "contains", "regex", "gt", "lt", "always"]
        }),
        field("compare", "Compare with", "text", { placeholder: "value or regular expression" }),
        field("caseSensitive", "Case sensitive", "boolean")
      ],
      defaults: { operator: "truthy", compare: "", caseSensitive: true }
    },
    merge: {
      type: "merge",
      title: "Merge",
      category: "control",
      description: "Combine optional branches into one value.",
      inputs: [
        { id: "a", label: "a", type: "any", required: false },
        { id: "b", label: "b", type: "any", required: false },
        { id: "c", label: "c", type: "any", required: false },
        { id: "d", label: "d", type: "any", required: false }
      ],
      outputs: [{ id: "value", label: "value", type: "any" }],
      fields: [
        field("mode", "Mode", "select", { options: ["first", "array", "concat"] }),
        field("separator", "Separator", "text", { placeholder: "\\n\\n" })
      ],
      defaults: { mode: "first", separator: "\n\n" }
    },
    output: {
      type: "output",
      title: "Output",
      category: "io",
      description: "Collect a final result for the run panel.",
      inputs: [{ id: "value", label: "value", type: "any", required: true }],
      outputs: [],
      fields: [
        field("name", "Name", "text", { placeholder: "Output" }),
        field("format", "Format", "select", { options: ["text", "json"] }),
        field("previewLines", "Preview lines", "number", { min: 1, max: 40 })
      ],
      defaults: { name: "Output", format: "text", previewLines: 12 }
    },
    note: {
      type: "note",
      title: "Note",
      category: "note",
      description: "Canvas annotation. Never executes.",
      inputs: [],
      outputs: [],
      fields: [
        field("text", "Text", "textarea", { rows: 5, placeholder: "Why this branch exists\u2026" }),
        field("color", "Color", "select", { options: ["amber", "gray", "blue", "green", "rose"] })
      ],
      defaults: { text: "", color: "amber" },
      executable: false
    }
  });
  var NODE_TYPE_LIST = Object.freeze(Object.values(NODE_TYPES));
  var NODE_CATEGORIES = Object.freeze([
    { id: "io", title: "Input / Output", color: CATEGORY_COLORS.io },
    { id: "transform", title: "Transform", color: CATEGORY_COLORS.transform },
    { id: "agents", title: "Agents", color: CATEGORY_COLORS.agents },
    { id: "dsh", title: "DSH", color: CATEGORY_COLORS.dsh },
    { id: "exec", title: "Execution", color: CATEGORY_COLORS.exec },
    { id: "control", title: "Control", color: CATEGORY_COLORS.control },
    { id: "note", title: "Notes", color: CATEGORY_COLORS.note }
  ]);
  function getNodeType(type) {
    const def = NODE_TYPES[type];
    if (!def) throw new Error(`Unknown node type: ${type}`);
    return def;
  }
  function hasNodeType(type) {
    return Object.prototype.hasOwnProperty.call(NODE_TYPES, type);
  }
  function normalizeConfig(type, config) {
    const def = getNodeType(type);
    return { ...def.defaults, ...isPlainObject(config) ? config : {} };
  }
  function resolvePortType(port, config) {
    if (port.typeFrom && config && VALUE_TYPE_OPTIONS.includes(config[port.typeFrom])) {
      return config[port.typeFrom];
    }
    return PORT_TYPES.includes(port.type) ? port.type : "any";
  }
  function getInputs(type, config) {
    const def = getNodeType(type);
    return def.inputs.map((port) => ({ ...port, type: resolvePortType(port, config) }));
  }
  function getOutputs(type, config) {
    const def = getNodeType(type);
    return def.outputs.map((port) => ({ ...port, type: resolvePortType(port, config) }));
  }
  function findPort(type, config, portId, direction) {
    const ports = direction === "in" ? getInputs(type, config) : getOutputs(type, config);
    return ports.find((port) => port.id === portId);
  }
  function createNode(type, options = {}) {
    const def = getNodeType(type);
    return {
      id: options.id || makeId("n"),
      type,
      title: typeof options.title === "string" && options.title.trim() ? options.title : def.title,
      position: normalizePosition(options.position),
      config: normalizeConfig(type, options.config),
      disabled: options.disabled === true
    };
  }
  function normalizePosition(position) {
    const x = Number(position?.x);
    const y = Number(position?.y);
    return {
      x: Number.isFinite(x) ? Math.round(x) : 0,
      y: Number.isFinite(y) ? Math.round(y) : 0
    };
  }
  function estimateNodeHeight(type, config) {
    const def = NODE_TYPES[type];
    if (!def) return 120;
    if (type === "note") return 140;
    const rows = Math.max(def.inputs.length, def.outputs.length);
    const hasPreview = type === "output" || type === "agent" || type === "skill" || type === "command" || type === "shell" || type === "template";
    return 36 + 12 + rows * 24 + (hasPreview ? 58 : 10);
  }
  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  // shared/graph.js
  function buildGraphIndex(workflow) {
    const nodes = Array.isArray(workflow?.nodes) ? workflow.nodes : [];
    const edges = Array.isArray(workflow?.edges) ? workflow.edges : [];
    const nodeById = /* @__PURE__ */ new Map();
    const edgeById = /* @__PURE__ */ new Map();
    const incoming = /* @__PURE__ */ new Map();
    const outgoing = /* @__PURE__ */ new Map();
    const incomingNodes = /* @__PURE__ */ new Map();
    const outgoingNodes = /* @__PURE__ */ new Map();
    for (const node of nodes) {
      nodeById.set(node.id, node);
      incoming.set(node.id, /* @__PURE__ */ new Map());
      outgoing.set(node.id, []);
      incomingNodes.set(node.id, /* @__PURE__ */ new Set());
      outgoingNodes.set(node.id, /* @__PURE__ */ new Set());
    }
    for (const edge of edges) {
      if (!edge || !edge.id) continue;
      edgeById.set(edge.id, edge);
      const fromId = edge.from?.node;
      const toId = edge.to?.node;
      if (nodeById.has(fromId)) {
        outgoing.get(fromId).push(edge);
        outgoingNodes.get(fromId)?.add(toId);
      }
      if (nodeById.has(toId)) {
        incoming.get(toId).set(edge.to?.port, edge);
        incomingNodes.get(toId)?.add(fromId);
      }
    }
    return { nodes, edges, nodeById, edgeById, incoming, outgoing, incomingNodes, outgoingNodes };
  }
  function compareNodes(a, b) {
    const ax = Number(a?.position?.x) || 0;
    const bx = Number(b?.position?.x) || 0;
    if (ax !== bx) return ax - bx;
    const ay = Number(a?.position?.y) || 0;
    const by = Number(b?.position?.y) || 0;
    if (ay !== by) return ay - by;
    return String(a?.id ?? "").localeCompare(String(b?.id ?? ""));
  }
  function topologicalOrder(workflow) {
    const index = buildGraphIndex(workflow);
    const indegree = /* @__PURE__ */ new Map();
    for (const node of index.nodes) {
      indegree.set(node.id, new Set(index.incomingNodes.get(node.id) ?? []).size);
    }
    const queue = index.nodes.filter((node) => indegree.get(node.id) === 0).sort(compareNodes);
    const order = [];
    while (queue.length) {
      const node = queue.shift();
      order.push(node);
      const targets = [...index.outgoingNodes.get(node.id) ?? []].map((id) => index.nodeById.get(id)).filter(Boolean).sort(compareNodes);
      for (const target of targets) {
        const next = indegree.get(target.id) - 1;
        indegree.set(target.id, next);
        if (next === 0) {
          queue.push(target);
          queue.sort(compareNodes);
        }
      }
    }
    if (order.length !== index.nodes.length) {
      const settled = new Set(order.map((node) => node.id));
      const cycle = findCycle(index, [...index.nodes.filter((n) => !settled.has(n.id)).map((n) => n.id)]);
      return { order, cycle: cycle.length ? cycle : index.nodes.filter((n) => !settled.has(n.id)).map((n) => n.id) };
    }
    return { order, cycle: [] };
  }
  function findCycle(index, candidates) {
    const state = /* @__PURE__ */ new Map();
    const stack = [];
    const allowed = new Set(candidates);
    function visit(id) {
      state.set(id, 1);
      stack.push(id);
      const next = [...index.outgoingNodes.get(id) ?? []].filter((target) => allowed.size === 0 || allowed.has(target)).sort();
      for (const target of next) {
        if (!index.nodeById.has(target)) continue;
        if (state.get(target) === 1) {
          const start = stack.indexOf(target);
          return [...stack.slice(start), target];
        }
        if (!state.has(target)) {
          const found = visit(target);
          if (found.length) return found;
        }
      }
      stack.pop();
      state.set(id, 2);
      return [];
    }
    for (const id of [...candidates].sort()) {
      if (!state.has(id)) {
        const found = visit(id);
        if (found.length) return found;
      }
    }
    return [];
  }
  function wouldCreateCycle(workflow, fromNodeId, toNodeId) {
    if (fromNodeId === toNodeId) return true;
    const index = buildGraphIndex(workflow);
    const seen = /* @__PURE__ */ new Set();
    const stack = [toNodeId];
    while (stack.length) {
      const id = stack.pop();
      if (id === fromNodeId) return true;
      if (seen.has(id)) continue;
      seen.add(id);
      for (const next of index.outgoingNodes.get(id) ?? []) {
        if (!seen.has(next)) stack.push(next);
      }
    }
    return false;
  }
  function typeCompatible(fromType, toType) {
    if (!PORT_TYPES.includes(fromType) || !PORT_TYPES.includes(toType)) return false;
    if (fromType === toType) return true;
    if (fromType === "any" || toType === "any") return true;
    const allowed = /* @__PURE__ */ new Set([
      "text->json",
      "json->text",
      "number->text",
      "boolean->text",
      "text->number",
      "text->boolean",
      "json->number",
      "json->boolean"
    ]);
    return allowed.has(`${fromType}->${toType}`);
  }
  function canConnect(workflow, from, to, options = {}) {
    const index = buildGraphIndex(workflow);
    const fromNode = index.nodeById.get(from?.node);
    const toNode = index.nodeById.get(to?.node);
    if (!fromNode || !toNode) return { ok: false, code: "NODE_MISSING", reason: "Node does not exist." };
    if (fromNode.id === toNode.id) return { ok: false, code: "SELF_LINK", reason: "A node cannot connect to itself." };
    const fromPort = findPort(fromNode.type, fromNode.config, from?.port, "out");
    const toPort = findPort(toNode.type, toNode.config, to?.port, "in");
    if (!fromPort) return { ok: false, code: "PORT_MISSING", reason: `Output port "${from?.port}" does not exist.` };
    if (!toPort) return { ok: false, code: "PORT_MISSING", reason: `Input port "${to?.port}" does not exist.` };
    if (!typeCompatible(fromPort.type, toPort.type)) {
      return {
        ok: false,
        code: "TYPE_MISMATCH",
        reason: `${fromPort.type} cannot connect to ${toPort.type}.`
      };
    }
    if (wouldCreateCycle(workflow, fromNode.id, toNode.id)) {
      return { ok: false, code: "CYCLE", reason: "That connection would create a cycle." };
    }
    const existing = index.incoming.get(toNode.id)?.get(toPort.id);
    if (existing && options.ignoreEdgeId && existing.id === options.ignoreEdgeId) {
      return { ok: true };
    }
    if (existing && !options.replace) {
      return {
        ok: false,
        code: "INPUT_OCCUPIED",
        reason: `Input "${toPort.label}" is already connected.`,
        replaceEdge: existing
      };
    }
    if (existing && options.replace) {
      return { ok: true, replaceEdge: existing };
    }
    return { ok: true };
  }
  function estimatePortPosition(node, portId, direction) {
    const ports = direction === "in" ? getInputs(node.type, node.config) : getOutputs(node.type, node.config);
    const index = Math.max(0, ports.findIndex((port) => port.id === portId));
    const height = estimateNodeHeight(node.type, node.config);
    return {
      x: normalizePosition(node.position).x + (direction === "in" ? 0 : 264),
      y: normalizePosition(node.position).y + 36 + 12 + index * 24,
      height
    };
  }

  // shared/values.js
  function isPlainObject2(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  // shared/validation.js
  function normalizeWorkflow(input, options = {}) {
    const now = options.now ?? Date.now();
    const raw = isPlainObject2(input) ? input : {};
    const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
    const rawEdges = Array.isArray(raw.edges) ? raw.edges : [];
    const nodes = rawNodes.map((node, index) => normalizeNode(node, index));
    const edges = rawEdges.map((edge, index) => normalizeEdgeInput(edge, index));
    const settings = isPlainObject2(raw.settings) ? raw.settings : {};
    return {
      ...raw,
      schemaVersion: SCHEMA_VERSION,
      id: typeof raw.id === "string" && raw.id ? raw.id : makeId("wf"),
      name: typeof raw.name === "string" && raw.name.trim() ? raw.name : "Untitled workflow",
      description: typeof raw.description === "string" ? raw.description : "",
      createdAt: Number.isFinite(raw.createdAt) ? raw.createdAt : now,
      updatedAt: now,
      nodes,
      edges,
      settings: {
        ...DEFAULT_WORKFLOW_SETTINGS,
        ...settings,
        concurrency: clampConcurrency(settings.concurrency, DEFAULT_WORKFLOW_SETTINGS.concurrency)
      }
    };
  }
  function normalizeNode(node, index) {
    const raw = isPlainObject2(node) ? node : {};
    const type = typeof raw.type === "string" ? raw.type : "";
    const known = hasNodeType(type);
    return {
      ...raw,
      id: typeof raw.id === "string" && raw.id ? raw.id : makeId("n", () => (index + 1) / 1e3),
      type,
      title: typeof raw.title === "string" && raw.title.trim() ? raw.title : known ? getNodeType(type).title : "Unknown node",
      position: normalizePosition(raw.position),
      config: known ? normalizeConfig(type, raw.config) : isPlainObject2(raw.config) ? raw.config : {},
      disabled: raw.disabled === true
    };
  }
  function normalizeEdgeInput(edge, index) {
    const raw = isPlainObject2(edge) ? edge : {};
    return {
      ...raw,
      id: typeof raw.id === "string" && raw.id ? raw.id : makeId("e", () => (index + 1) / 1e3),
      from: {
        node: String(raw.from?.node ?? ""),
        port: String(raw.from?.port ?? "")
      },
      to: {
        node: String(raw.to?.node ?? ""),
        port: String(raw.to?.port ?? "")
      }
    };
  }
  function validateWorkflow(workflow) {
    const issues = [];
    const error = (code, message, extra = {}) => issues.push({ severity: "error", code, message, ...extra });
    const warn = (code, message, extra = {}) => issues.push({ severity: "warning", code, message, ...extra });
    if (!isPlainObject2(workflow)) {
      error("WORKFLOW_INVALID", "Workflow must be a JSON object.");
      return result(issues);
    }
    if (workflow.schemaVersion !== SCHEMA_VERSION) {
      error("SCHEMA_VERSION", `Unsupported workflow schemaVersion ${String(workflow.schemaVersion)}; expected ${SCHEMA_VERSION}.`);
    }
    if (typeof workflow.id !== "string" || !workflow.id) error("WORKFLOW_ID", "Workflow id is required.");
    if (typeof workflow.name !== "string" || !workflow.name.trim()) error("WORKFLOW_NAME", "Workflow name is required.");
    if (workflow.description !== void 0 && typeof workflow.description !== "string") {
      error("WORKFLOW_DESCRIPTION", "Workflow description must be a string.");
    }
    const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : null;
    const edges = Array.isArray(workflow.edges) ? workflow.edges : null;
    if (!nodes) error("NODES_INVALID", "workflow.nodes must be an array.");
    if (!edges) error("EDGES_INVALID", "workflow.edges must be an array.");
    if (!nodes || !edges) return result(issues);
    if (nodes.length > LIMITS.maxNodes) error("NODE_LIMIT", `Workflow has ${nodes.length} nodes; the limit is ${LIMITS.maxNodes}.`);
    if (edges.length > LIMITS.maxEdges) error("EDGE_LIMIT", `Workflow has ${edges.length} edges; the limit is ${LIMITS.maxEdges}.`);
    const nodeById = /* @__PURE__ */ new Map();
    for (const [index, node] of nodes.entries()) {
      if (!isPlainObject2(node)) {
        error("NODE_INVALID", `nodes[${index}] must be an object.`);
        continue;
      }
      if (typeof node.id !== "string" || !node.id) {
        error("NODE_ID", `nodes[${index}] is missing an id.`);
      } else if (nodeById.has(node.id)) {
        error("NODE_ID_DUPLICATE", `Duplicate node id "${node.id}".`, { nodeId: node.id });
      } else {
        nodeById.set(node.id, node);
      }
      if (typeof node.type !== "string" || !hasNodeType(node.type)) {
        error("NODE_TYPE_UNKNOWN", `Node "${node.id}" has unknown type "${String(node.type)}".`, { nodeId: node.id });
        continue;
      }
      if (typeof node.title !== "string" || !node.title.trim()) {
        warn("NODE_TITLE", `Node "${node.id}" has no title.`, { nodeId: node.id });
      }
      if (!node.position || !Number.isFinite(node.position.x) || !Number.isFinite(node.position.y)) {
        warn("NODE_POSITION", `Node "${node.id}" has an invalid position.`, { nodeId: node.id });
      }
      if (!isPlainObject2(node.config)) {
        error("NODE_CONFIG", `Node "${node.id}" config must be an object.`, { nodeId: node.id });
      } else {
        const def = getNodeType(node.type);
        const known = new Set(def.fields.map((field2) => field2.key));
        for (const key of Object.keys(node.config)) {
          if (!known.has(key)) {
            warn("CONFIG_UNKNOWN_FIELD", `Node "${node.id}" has unknown config field "${key}".`, {
              nodeId: node.id,
              port: key
            });
          }
        }
      }
    }
    const edgeIds = /* @__PURE__ */ new Set();
    const occupiedInputs = /* @__PURE__ */ new Map();
    for (const [index, edge] of edges.entries()) {
      if (!isPlainObject2(edge)) {
        error("EDGE_INVALID", `edges[${index}] must be an object.`);
        continue;
      }
      if (typeof edge.id !== "string" || !edge.id) {
        error("EDGE_ID", `edges[${index}] is missing an id.`);
      } else if (edgeIds.has(edge.id)) {
        error("EDGE_ID_DUPLICATE", `Duplicate edge id "${edge.id}".`);
      } else {
        edgeIds.add(edge.id);
      }
      const fromNode = nodeById.get(edge.from?.node);
      const toNode = nodeById.get(edge.to?.node);
      if (!fromNode) {
        error("EDGE_FROM_NODE", `Edge "${edge.id}" references missing source node "${String(edge.from?.node)}".`);
        continue;
      }
      if (!toNode) {
        error("EDGE_TO_NODE", `Edge "${edge.id}" references missing target node "${String(edge.to?.node)}".`);
        continue;
      }
      if (!hasNodeType(fromNode.type) || !hasNodeType(toNode.type)) continue;
      const check = canConnect(workflow, edge.from, edge.to, { replace: false, ignoreEdgeId: edge.id });
      if (!check.ok && check.code !== "INPUT_OCCUPIED") {
        error(`EDGE_${check.code}`, `Edge "${edge.id}": ${check.reason}`, { nodeId: toNode.id, port: edge.to?.port });
        continue;
      }
      if (check.code === "INPUT_OCCUPIED") {
        error(
          "EDGE_INPUT_OCCUPIED",
          `Input "${edge.to.port}" on node "${toNode.id}" has more than one incoming edge.`,
          { nodeId: toNode.id, port: edge.to?.port }
        );
        continue;
      }
      occupiedInputs.set(`${toNode.id}:${edge.to.port}`, edge.id);
    }
    const topo = topologicalOrder(workflow);
    if (topo.cycle.length) {
      const cycle = topo.cycle.filter((id, i, arr) => i === 0 || id !== arr[i - 1]);
      error("CYCLE", `Workflow contains a cycle: ${cycle.join(" \u2192 ")}.`, { nodeIds: cycle });
    }
    for (const node of nodes) {
      if (!isPlainObject2(node) || !hasNodeType(node.type)) continue;
      if (node.disabled) {
        warn("NODE_DISABLED", `Node "${node.title || node.id}" is disabled.`, { nodeId: node.id });
        continue;
      }
      const inputs = getInputs(node.type, node.config);
      for (const port of inputs) {
        if (!port.required) continue;
        const hasEdge = occupiedInputs.has(`${node.id}:${port.id}`);
        const hasDefault = port.default !== void 0;
        if (!hasEdge && !hasDefault) {
          error(
            "REQUIRED_INPUT_UNCONNECTED",
            `Node "${node.title || node.id}" input "${port.label}" is required but not connected.`,
            { nodeId: node.id, port: port.id }
          );
        }
      }
    }
    if (!nodes.some((node) => node?.type !== "note")) {
      warn("EMPTY_WORKFLOW", "Workflow has no executable nodes yet.");
    }
    const sessionMode = workflow.settings?.sessionMode;
    if (sessionMode !== void 0 && sessionMode !== "isolated" && sessionMode !== "inherit") {
      error("SESSION_MODE", 'settings.sessionMode must be "isolated" or "inherit" in this build.');
    }
    const cancelPolicy = workflow.settings?.cancelPolicy;
    if (cancelPolicy !== void 0 && cancelPolicy !== "abort-all" && cancelPolicy !== "drain") {
      error("CANCEL_POLICY", 'settings.cancelPolicy must be "abort-all" or "drain".');
    }
    const concurrency = workflow.settings?.concurrency;
    if (concurrency !== void 0) {
      const n = Number(concurrency);
      if (!Number.isFinite(n) || n < MIN_CONCURRENCY || n > MAX_CONCURRENCY) {
        error("CONCURRENCY", `settings.concurrency must be between ${MIN_CONCURRENCY} and ${MAX_CONCURRENCY}.`);
      }
    }
    return result(issues);
  }
  function result(issues) {
    return { ok: !issues.some((issue) => issue.severity === "error"), issues };
  }

  // src/client/Icons.jsx
  function svg({ size = 16, className, children, viewBox = "0 0 24 24", fill = "none", ...rest }) {
    return /* @__PURE__ */ h(
      "svg",
      {
        width: size,
        height: size,
        viewBox,
        fill,
        className,
        "aria-hidden": "true",
        focusable: "false",
        ...rest
      },
      children
    );
  }
  function stroke(children, width = 1.6) {
    return /* @__PURE__ */ h("g", { stroke: "currentColor", strokeWidth: width, strokeLinecap: "round", strokeLinejoin: "round" }, children);
  }
  function CueFlowIcon({ size = 22, active = false }) {
    return /* @__PURE__ */ h("svg", { width: size, height: size, viewBox: "0 0 32 32", fill: "none", "aria-hidden": "true", focusable: "false" }, /* @__PURE__ */ h("rect", { x: "2.75", y: "3.75", width: "26.5", height: "24.5", rx: "5", fill: active ? "rgba(231,183,95,.14)" : "transparent", stroke: active ? "var(--cue-amber, #e7b75f)" : "currentColor", strokeWidth: "1.5" }), /* @__PURE__ */ h("path", { d: active ? "M9 12h6.5M9 20h6.5M9 16h4" : "M9 12h6.5M9 20h6.5M9 16h4", stroke: "var(--cue-amber, #e7b75f)", strokeWidth: "2", strokeLinecap: "round" }), /* @__PURE__ */ h("circle", { cx: "23", cy: "12", r: "2.4", fill: "var(--cue-cyan, #6fb7c8)" }), /* @__PURE__ */ h("circle", { cx: "23", cy: "20", r: "2.4", fill: "var(--cue-green, #6fbf8f)" }), /* @__PURE__ */ h("path", { d: "M15.5 12h5M15.5 20h5", stroke: "currentColor", strokeWidth: "1.2", opacity: ".55" }));
  }
  var Plus = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("path", { d: "M12 5v14M5 12h14" }))) });
  var Play = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("path", { d: "M8 5.5v13l10-6.5z", fill: "currentColor", stroke: "none" }))) });
  var Stop = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("rect", { x: "6.5", y: "6.5", width: "11", height: "11", rx: "1.5", fill: "currentColor", stroke: "none" }))) });
  var Save = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("path", { d: "M5 4.5h11l3 3V20H5z" }), /* @__PURE__ */ h("path", { d: "M8 4.5v5h7v-5M8 20v-6h8v6" }))) });
  var Check = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("path", { d: "M5 12.5l4.5 4.5L19 7.5" }))) });
  var Alert = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("path", { d: "M12 4l9 16H3z" }), /* @__PURE__ */ h("path", { d: "M12 9.5v4.5M12 17.2v.1" }))) });
  var Search = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("circle", { cx: "10.5", cy: "10.5", r: "5.5" }), /* @__PURE__ */ h("path", { d: "M15 15l4.5 4.5" }))) });
  var ZoomIn = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("circle", { cx: "10.5", cy: "10.5", r: "5.5" }), /* @__PURE__ */ h("path", { d: "M15 15l4.5 4.5M10.5 8v5M8 10.5h5" }))) });
  var ZoomOut = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("circle", { cx: "10.5", cy: "10.5", r: "5.5" }), /* @__PURE__ */ h("path", { d: "M15 15l4.5 4.5M8 10.5h5" }))) });
  var Fit = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("path", { d: "M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" }), /* @__PURE__ */ h("rect", { x: "8", y: "8", width: "8", height: "8", rx: "1" }))) });
  var Undo = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("path", { d: "M9 7L4 12l5 5" }), /* @__PURE__ */ h("path", { d: "M4 12h9a5 5 0 0 1 0 10h-1" }))) });
  var Redo = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("path", { d: "M15 7l5 5-5 5" }), /* @__PURE__ */ h("path", { d: "M20 12h-9a5 5 0 0 0 0 10h1" }))) });
  var Trash = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("path", { d: "M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5" }))) });
  var Close = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("path", { d: "M6 6l12 12M18 6L6 18" }))) });
  var Chevron = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("path", { d: "M7 10l5 5 5-5" }))) });
  var More = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("circle", { cx: "5", cy: "12", r: "1", fill: "currentColor" }), /* @__PURE__ */ h("circle", { cx: "12", cy: "12", r: "1", fill: "currentColor" }), /* @__PURE__ */ h("circle", { cx: "19", cy: "12", r: "1", fill: "currentColor" }))) });
  var Copy = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("rect", { x: "8", y: "8", width: "12", height: "12", rx: "2" }), /* @__PURE__ */ h("path", { d: "M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" }))) });
  var Download = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("path", { d: "M12 4v11M7 10l5 5 5-5M5 19h14" }))) });
  var Upload = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("path", { d: "M12 20V9M7 14l5-5 5 5M5 5h14" }))) });
  var Clock = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("circle", { cx: "12", cy: "12", r: "8" }), /* @__PURE__ */ h("path", { d: "M12 7.5V12l3 2" }))) });
  var InputIcon = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("rect", { x: "4", y: "6", width: "16", height: "12", rx: "2" }), /* @__PURE__ */ h("path", { d: "M8 12h8" }))) });
  var OutputIcon = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("rect", { x: "4", y: "6", width: "16", height: "12", rx: "2" }), /* @__PURE__ */ h("path", { d: "M9 12h6M12 9l3 3-3 3" }))) });
  var AgentIcon = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("circle", { cx: "12", cy: "8", r: "3" }), /* @__PURE__ */ h("path", { d: "M5.5 20a6.5 6.5 0 0 1 13 0M18 5l2 2M20 5l-2 2" }))) });
  var SkillIcon = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("path", { d: "M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z" }))) });
  var CommandIcon = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("path", { d: "M5 7h14M5 12h9M5 17h14" }), /* @__PURE__ */ h("circle", { cx: "18", cy: "12", r: "1.5" }))) });
  var ShellIcon = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("rect", { x: "3.5", y: "5", width: "17", height: "14", rx: "2" }), /* @__PURE__ */ h("path", { d: "M7 9l3 3-3 3M12 15h5" }))) });
  var FileIcon = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("path", { d: "M6 3.5h8l4 4V20H6z" }), /* @__PURE__ */ h("path", { d: "M14 3.5V8h4M9 12h6M9 16h6" }))) });
  var ConditionIcon = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("path", { d: "M12 4v6M12 14v6M7 9l5 2 5-2M7 15l5-2 5 2" }))) });
  var MergeIcon = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("path", { d: "M4 6h4l4 6 4-6h4M4 18h4l4-6 4 6h4" }))) });
  var NoteIcon = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("path", { d: "M5 4h14v11l-4 5H5z" }), /* @__PURE__ */ h("path", { d: "M15 20v-5h4M8 8h8M8 12h5" }))) });
  var LayoutIcon = (props) => svg({ ...props, children: stroke(/* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("rect", { x: "3.5", y: "4", width: "17", height: "16", rx: "2" }), /* @__PURE__ */ h("path", { d: "M3.5 9h17M9 9v11" }))) });
  var NODE_ICONS = {
    input: InputIcon,
    template: LayoutIcon,
    agent: AgentIcon,
    skill: SkillIcon,
    command: CommandIcon,
    shell: ShellIcon,
    "file-read": FileIcon,
    condition: ConditionIcon,
    merge: MergeIcon,
    output: OutputIcon,
    note: NoteIcon
  };
  function NodeIcon({ type, size = 15 }) {
    const Icon = NODE_ICONS[type] ?? LayoutIcon;
    return /* @__PURE__ */ h(Icon, { size });
  }

  // src/client/NodeLibrary.jsx
  var CATEGORY_ORDER = ["io", "transform", "agents", "dsh", "exec", "control", "note"];
  function NodeLibrary({ nodeTypes, categories, onAdd, t }) {
    const [query, setQuery] = React.useState("");
    const [collapsed, setCollapsed] = React.useState({});
    const filtered = React.useMemo(() => {
      const q = query.trim().toLowerCase();
      if (!q) return nodeTypes;
      return nodeTypes.filter(
        (type) => `${type.type} ${type.title} ${type.description}`.toLowerCase().includes(q)
      );
    }, [nodeTypes, query]);
    const groups = React.useMemo(() => {
      const map = /* @__PURE__ */ new Map();
      for (const type of filtered) {
        if (!map.has(type.category)) map.set(type.category, []);
        map.get(type.category).push(type);
      }
      return CATEGORY_ORDER.filter((category) => map.has(category)).map((category) => ({
        category,
        title: categories.find((item) => item.id === category)?.title ?? category,
        color: categories.find((item) => item.id === category)?.color ?? "var(--cue-amber)",
        items: map.get(category)
      }));
    }, [filtered, categories]);
    return /* @__PURE__ */ h("aside", { className: "cue-library", "aria-label": t("nodeLibrary") }, /* @__PURE__ */ h("div", { className: "cue-library-head" }, /* @__PURE__ */ h("div", { className: "cue-eyebrow" }, t("nodeLibrary")), /* @__PURE__ */ h("label", { className: "cue-inline", style: { position: "relative" } }, /* @__PURE__ */ h(
      "input",
      {
        className: "cue-search",
        value: query,
        placeholder: t("searchNodes"),
        onChange: (event) => setQuery(event.target.value),
        "aria-label": t("searchNodes"),
        style: { paddingLeft: 28 }
      }
    ), /* @__PURE__ */ h("span", { className: "cue-library-search-icon" }, /* @__PURE__ */ h(Search, { size: 13 })))), /* @__PURE__ */ h("div", { className: "cue-library-list" }, groups.map((group) => /* @__PURE__ */ h("div", { className: "cue-library-group", key: group.category }, /* @__PURE__ */ h(
      "button",
      {
        type: "button",
        className: "cue-library-group-title",
        onClick: () => setCollapsed((prev) => ({ ...prev, [group.category]: !prev[group.category] })),
        style: { width: "100%", border: 0, background: "transparent", textAlign: "left", cursor: "pointer" }
      },
      /* @__PURE__ */ h("span", null, group.title),
      /* @__PURE__ */ h("span", null, collapsed[group.category] ? "+" : "\u2212")
    ), !collapsed[group.category] && group.items.map((type) => /* @__PURE__ */ h(
      "button",
      {
        type: "button",
        className: "cue-library-item",
        key: type.type,
        title: type.description,
        draggable: true,
        onDragStart: (event) => {
          event.dataTransfer.setData("application/x-cueflow-node", type.type);
          event.dataTransfer.effectAllowed = "copy";
        },
        onClick: () => onAdd(type.type)
      },
      /* @__PURE__ */ h("span", { className: "cue-library-icon", style: { color: group.color } }, /* @__PURE__ */ h(NodeIcon, { type: type.type, size: 14 })),
      /* @__PURE__ */ h("span", { className: "cue-library-text" }, /* @__PURE__ */ h("span", { className: "cue-library-label" }, type.title), /* @__PURE__ */ h("span", { className: "cue-library-desc" }, type.description))
    )))), groups.length === 0 && /* @__PURE__ */ h("div", { className: "cue-empty-note", style: { padding: 12 } }, t("noResults"))), /* @__PURE__ */ h("div", { className: "cue-library-foot" }, /* @__PURE__ */ h("span", null, filtered.length, " ", t("nodes")), /* @__PURE__ */ h("span", null, "drag / click")));
  }

  // src/client/Canvas.jsx
  var MIN_ZOOM = 0.25;
  var MAX_ZOOM = 2;
  var NODE_WIDTH = 264;
  function Canvas({
    workflow,
    catalog,
    selectedNodeId,
    selectedEdgeId,
    viewport,
    setViewport,
    run,
    onSelectNode,
    onSelectEdge,
    onClearSelection,
    onAddNode,
    onConnect,
    onDeleteEdge,
    onMoveNode,
    onBeginNodeDrag,
    onDuplicateNode,
    onToggleDisabled,
    onDeleteNode,
    onFit,
    t
  }) {
    const containerRef = React.useRef(null);
    const nodeEls = React.useRef({});
    const [portPositions, setPortPositions] = React.useState({});
    const [palette, setPalette] = React.useState(null);
    const [menu, setMenu] = React.useState(null);
    const [panning, setPanning] = React.useState(false);
    const [linking, setLinking] = React.useState(null);
    const [dragNodeId, setDragNodeId] = React.useState(null);
    const propsRef = React.useRef(null);
    propsRef.current = {
      workflow,
      viewport,
      setViewport,
      onSelectNode,
      onSelectEdge,
      onClearSelection,
      onAddNode,
      onConnect,
      onMoveNode,
      onBeginNodeDrag
    };
    const interaction = React.useRef({ pan: null, drag: null, linking: null });
    const nodeById = React.useMemo(() => new Map((workflow.nodes ?? []).map((node) => [node.id, node])), [workflow.nodes]);
    const screenToWorld = React.useCallback((clientX, clientY) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (clientX - rect.left - viewport.x) / viewport.scale,
        y: (clientY - rect.top - viewport.y) / viewport.scale
      };
    }, [viewport]);
    const localScreen = React.useCallback((clientX, clientY) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return { x: clientX - rect.left, y: clientY - rect.top };
    }, []);
    const measurePorts = React.useCallback(() => {
      const map = {};
      const scale = propsRef.current.viewport.scale;
      for (const node of workflow.nodes ?? []) {
        const element = nodeEls.current[node.id];
        if (!element) continue;
        const nodeRect = element.getBoundingClientRect();
        for (const dot of element.querySelectorAll("[data-port-dot]")) {
          const dotRect = dot.getBoundingClientRect();
          const direction = dot.dataset.direction;
          const portId = dot.dataset.portId;
          map[`${node.id}:${direction}:${portId}`] = {
            x: node.position.x + (dotRect.left - nodeRect.left) / scale + dotRect.width / (2 * scale),
            y: node.position.y + (dotRect.top - nodeRect.top) / scale + dotRect.height / (2 * scale)
          };
        }
      }
      setPortPositions(map);
    }, [workflow.nodes]);
    React.useLayoutEffect(() => {
      measurePorts();
      const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => measurePorts()) : null;
      for (const element of Object.values(nodeEls.current)) observer?.observe(element);
      window.addEventListener("resize", measurePorts);
      return () => {
        observer?.disconnect();
        window.removeEventListener("resize", measurePorts);
      };
    }, [measurePorts, viewport.scale, workflow.nodes]);
    React.useEffect(() => {
      const onMove = (event) => {
        const state = interaction.current;
        if (state.pan) {
          const dx = event.clientX - state.pan.startX;
          const dy = event.clientY - state.pan.startY;
          if (Math.abs(dx) + Math.abs(dy) > 2) state.pan.moved = true;
          propsRef.current.setViewport({
            x: state.pan.origin.x + dx,
            y: state.pan.origin.y + dy,
            scale: state.pan.origin.scale
          });
        }
        if (state.drag) {
          const dx = event.clientX - state.drag.startX;
          const dy = event.clientY - state.drag.startY;
          if (Math.abs(dx) + Math.abs(dy) > 2) {
            state.drag.moved = true;
            if (!state.drag.recorded) {
              state.drag.recorded = true;
              propsRef.current.onBeginNodeDrag();
            }
          }
          const scale = propsRef.current.viewport.scale;
          propsRef.current.onMoveNode(state.drag.nodeId, {
            x: Math.round(state.drag.origin.x + dx / scale),
            y: Math.round(state.drag.origin.y + dy / scale)
          });
        }
        if (state.linking) {
          const world = screenToWorld(event.clientX, event.clientY);
          const next = { ...state.linking, current: world };
          state.linking = next;
          setLinking(next);
        }
      };
      const onUp = (event) => {
        const state = interaction.current;
        if (state.pan) {
          const pan = state.pan;
          state.pan = null;
          setPanning(false);
          if (!pan.moved) {
            propsRef.current.onClearSelection();
            setPalette(null);
            setMenu(null);
          }
        }
        if (state.drag) {
          state.drag = null;
          setDragNodeId(null);
        }
        if (state.linking) {
          const link = state.linking;
          state.linking = null;
          setLinking(null);
          const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.("[data-port-dot]");
          if (target) {
            const targetNode = target.dataset.nodeId;
            const targetPort = target.dataset.portId;
            const targetDirection = target.dataset.direction;
            if (targetNode && targetPort && targetDirection && targetDirection !== link.from.direction) {
              const from = link.from.direction === "out" ? { node: link.from.node, port: link.from.port } : { node: targetNode, port: targetPort };
              const to = link.from.direction === "in" ? { node: link.from.node, port: link.from.port } : { node: targetNode, port: targetPort };
              propsRef.current.onConnect(from, to);
            }
          }
        }
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      return () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
    }, [screenToWorld]);
    React.useEffect(() => {
      const element = containerRef.current;
      if (!element) return;
      const onWheel = (event) => {
        event.preventDefault();
        const rect = element.getBoundingClientRect();
        const current = propsRef.current.viewport;
        const nextScale = clamp(current.scale * Math.exp(-event.deltaY * 12e-4), MIN_ZOOM, MAX_ZOOM);
        if (Math.abs(nextScale - current.scale) < 1e-3) return;
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;
        const worldX = (px - current.x) / current.scale;
        const worldY = (py - current.y) / current.scale;
        propsRef.current.setViewport({
          x: px - worldX * nextScale,
          y: py - worldY * nextScale,
          scale: nextScale
        });
      };
      element.addEventListener("wheel", onWheel, { passive: false });
      return () => element.removeEventListener("wheel", onWheel);
    }, []);
    const zoomBy = (factor, anchor) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const px = anchor?.x ?? rect.width / 2;
      const py = anchor?.y ?? rect.height / 2;
      const nextScale = clamp(viewport.scale * factor, MIN_ZOOM, MAX_ZOOM);
      const worldX = (px - viewport.x) / viewport.scale;
      const worldY = (py - viewport.y) / viewport.scale;
      setViewport({ x: px - worldX * nextScale, y: py - worldY * nextScale, scale: nextScale });
    };
    const openPalette = (clientX, clientY) => {
      const screen = localScreen(clientX, clientY);
      setPalette({ ...screen, world: screenToWorld(clientX, clientY) });
      setMenu(null);
    };
    const onCanvasPointerDown = (event) => {
      if (event.button !== 0 && event.button !== 1) return;
      if (event.target.closest?.(".cue-node, .cue-palette, .cue-menu, .cue-canvas-controls")) return;
      setPalette(null);
      setMenu(null);
      interaction.current.pan = {
        startX: event.clientX,
        startY: event.clientY,
        origin: { ...viewport },
        moved: false
      };
      setPanning(true);
    };
    const onNodePointerDown = (event, node) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      propsRef.current.onSelectNode(node.id);
      interaction.current.drag = {
        nodeId: node.id,
        startX: event.clientX,
        startY: event.clientY,
        origin: { ...node.position },
        moved: false,
        recorded: false
      };
      setDragNodeId(node.id);
    };
    const onPortPointerDown = (event, node, port, direction) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      event.preventDefault();
      const key = `${node.id}:${direction}:${port.id}`;
      const start = portPositions[key] ?? estimatePortPosition(node, port.id, direction);
      const next = {
        from: { node: node.id, port: port.id, direction },
        start: { x: start.x, y: start.y },
        current: { x: start.x, y: start.y }
      };
      interaction.current.linking = next;
      setLinking(next);
      setPalette(null);
      setMenu(null);
    };
    const onNodeContextMenu = (event, node) => {
      event.preventDefault();
      event.stopPropagation();
      propsRef.current.onSelectNode(node.id);
      const screen = localScreen(event.clientX, event.clientY);
      setMenu({ ...screen, nodeId: node.id });
      setPalette(null);
    };
    const edgePath = (edge) => {
      const fromNode = nodeById.get(edge.from?.node);
      const toNode = nodeById.get(edge.to?.node);
      if (!fromNode || !toNode) return "";
      const from = portPositions[`${fromNode.id}:out:${edge.from.port}`] ?? estimatePortPosition(fromNode, edge.from.port, "out");
      const to = portPositions[`${toNode.id}:in:${edge.to.port}`] ?? estimatePortPosition(toNode, edge.to.port, "in");
      return pathFor(from, to);
    };
    const linkStart = linking?.start ?? { x: 0, y: 0 };
    const linkEnd = linking?.current ?? linkStart;
    const linkingDirection = linking?.from?.direction;
    const linkingPath = linking ? pathFor(linkingDirection === "out" ? linkStart : linkEnd, linkingDirection === "out" ? linkEnd : linkStart) : "";
    const empty = (workflow.nodes ?? []).length === 0;
    const runIsRunning = run?.status === "running" || run?.status === "queued";
    return /* @__PURE__ */ h(
      "section",
      {
        className: `cue-canvas ${panning ? "is-panning" : ""}`,
        ref: containerRef,
        style: {
          "--cue-zoom": viewport.scale,
          "--cue-pan-x": `${viewport.x}px`,
          "--cue-pan-y": `${viewport.y}px`
        },
        onPointerDown: onCanvasPointerDown,
        onDoubleClick: (event) => {
          if (event.target.closest?.(".cue-node, .cue-palette, .cue-menu")) return;
          openPalette(event.clientX, event.clientY);
        },
        onContextMenu: (event) => {
          if (event.target.closest?.(".cue-node, .cue-palette, .cue-menu")) return;
          event.preventDefault();
          openPalette(event.clientX, event.clientY);
        },
        onDragOver: (event) => {
          if (event.dataTransfer?.types?.includes("application/x-cueflow-node")) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }
        },
        onDrop: (event) => {
          const type = event.dataTransfer?.getData("application/x-cueflow-node");
          if (!type) return;
          event.preventDefault();
          const world = screenToWorld(event.clientX, event.clientY);
          onAddNode(type, { x: world.x - NODE_WIDTH / 2, y: world.y - 40 });
        },
        "aria-label": t("canvas")
      },
      /* @__PURE__ */ h(
        "div",
        {
          className: "cue-world",
          style: { transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }
        },
        /* @__PURE__ */ h("svg", { className: "cue-links", "aria-hidden": "true" }, (workflow.edges ?? []).map((edge) => {
          const source = nodeById.get(edge.from?.node);
          const sourcePort = source ? getOutputs(source.type, source.config).find((port) => port.id === edge.from.port) : null;
          const color = PORT_COLORS[sourcePort?.type] ?? PORT_COLORS.any;
          const selected = edge.id === selectedEdgeId;
          return /* @__PURE__ */ h("g", { key: edge.id }, /* @__PURE__ */ h(
            "path",
            {
              className: "cue-link-hit",
              d: edgePath(edge),
              onPointerDown: (event) => {
                event.stopPropagation();
                onSelectEdge(edge.id);
              }
            }
          ), /* @__PURE__ */ h(
            "path",
            {
              className: `cue-link${selected ? " selected" : ""}${runIsRunning ? " running" : ""}`,
              d: edgePath(edge),
              style: { stroke: color }
            }
          ));
        }), linking && /* @__PURE__ */ h(
          "path",
          {
            className: "cue-link",
            d: linkingPath,
            style: { stroke: "var(--cue-amber)", strokeDasharray: "5 5", opacity: 0.85 }
          }
        )),
        (workflow.nodes ?? []).map((node) => {
          const def = catalog.nodeTypes.find((type) => type.type === node.type);
          const state = run?.nodeStates?.[node.id];
          const inputs = def ? getInputs(node.type, node.config) : [];
          const outputs = def ? getOutputs(node.type, node.config) : [];
          const connectedIn = new Set((workflow.edges ?? []).filter((edge) => edge.to?.node === node.id).map((edge) => edge.to.port));
          const connectedOut = new Set((workflow.edges ?? []).filter((edge) => edge.from?.node === node.id).map((edge) => edge.from.port));
          return /* @__PURE__ */ h(
            NodeCard,
            {
              key: node.id,
              node,
              def,
              inputs,
              outputs,
              connectedIn,
              connectedOut,
              selected: node.id === selectedNodeId,
              status: state?.status ?? "idle",
              preview: state?.preview ?? "",
              error: state?.error ?? null,
              runStatus: run?.status,
              dragging: dragNodeId === node.id,
              nodeRef: (element) => {
                if (element) nodeEls.current[node.id] = element;
                else delete nodeEls.current[node.id];
              },
              onPointerDown: (event) => onNodePointerDown(event, node),
              onPortPointerDown,
              onContextMenu: (event) => onNodeContextMenu(event, node),
              onSelect: () => onSelectNode(node.id),
              onDelete: () => onDeleteNode(node.id),
              t
            }
          );
        })
      ),
      empty && /* @__PURE__ */ h("div", { className: "cue-empty-state" }, /* @__PURE__ */ h("div", { className: "cue-empty-title" }, t("emptyCanvas")), /* @__PURE__ */ h("div", { className: "cue-empty-desc" }, t("emptyCanvasHint")), /* @__PURE__ */ h("div", { className: "cue-empty-actions" }, /* @__PURE__ */ h("button", { className: "cue-btn primary sm", type: "button", onClick: () => onAddNode("input") }, t("addFirstNode")), /* @__PURE__ */ h("button", { className: "cue-btn outline sm", type: "button", onClick: () => openPalette(
        (containerRef.current?.getBoundingClientRect().left ?? 0) + 80,
        (containerRef.current?.getBoundingClientRect().top ?? 0) + 120
      ) }, t("addNode")))),
      /* @__PURE__ */ h("div", { className: "cue-canvas-hint" }, /* @__PURE__ */ h("span", { className: "dot" }), /* @__PURE__ */ h("span", null, t("canvas")), /* @__PURE__ */ h("span", null, "\xB7"), /* @__PURE__ */ h("span", null, (workflow.nodes ?? []).length, " ", t("nodes")), /* @__PURE__ */ h("span", null, "\xB7"), /* @__PURE__ */ h("span", null, (workflow.edges ?? []).length, " ", t("edges"))),
      /* @__PURE__ */ h("div", { className: "cue-canvas-controls" }, /* @__PURE__ */ h("button", { className: "cue-btn icon sm", type: "button", title: t("zoomOut"), onClick: () => zoomBy(1 / 1.15) }, /* @__PURE__ */ h(ZoomOut, { size: 14 })), /* @__PURE__ */ h("span", { className: "cue-zoom-label" }, Math.round(viewport.scale * 100), "%"), /* @__PURE__ */ h("button", { className: "cue-btn icon sm", type: "button", title: t("zoomIn"), onClick: () => zoomBy(1.15) }, /* @__PURE__ */ h(ZoomIn, { size: 14 })), /* @__PURE__ */ h("button", { className: "cue-btn icon sm", type: "button", title: t("fit"), onClick: onFit }, /* @__PURE__ */ h(Fit, { size: 14 }))),
      palette && /* @__PURE__ */ h(
        NodeSearch,
        {
          x: palette.x,
          y: palette.y,
          nodeTypes: catalog.nodeTypes,
          categories: catalog.categories,
          onPick: (type) => {
            onAddNode(type, { x: palette.world.x, y: palette.world.y });
            setPalette(null);
          },
          onClose: () => setPalette(null),
          t
        }
      ),
      menu && /* @__PURE__ */ h(
        NodeMenu,
        {
          x: menu.x,
          y: menu.y,
          nodeId: menu.nodeId,
          onClose: () => setMenu(null),
          onDuplicate: () => {
            onDuplicateNode(menu.nodeId);
            setMenu(null);
          },
          onToggleDisabled: () => {
            onToggleDisabled(menu.nodeId);
            setMenu(null);
          },
          onDelete: () => {
            onDeleteNode(menu.nodeId);
            setMenu(null);
          },
          t
        }
      )
    );
  }
  function NodeCard({
    node,
    def,
    inputs,
    outputs,
    connectedIn,
    connectedOut,
    selected,
    status,
    preview,
    error,
    runStatus,
    dragging,
    nodeRef,
    onPointerDown,
    onPortPointerDown,
    onContextMenu,
    onSelect,
    onDelete,
    t
  }) {
    const accent = categoryColor(def?.category);
    const disabled = node.disabled;
    const isNote = node.type === "note";
    const statusClass = disabled ? "skipped" : status;
    const title = node.title || def?.title || node.type;
    const summary = summarize(node, def, t);
    return /* @__PURE__ */ h(
      "div",
      {
        ref: nodeRef,
        className: [
          "cue-node",
          selected ? "selected" : "",
          statusClass === "error" ? "has-error" : "",
          statusClass === "running" ? "is-running" : "",
          statusClass === "waiting-approval" ? "is-waiting-approval" : "",
          disabled ? "is-disabled" : "",
          dragging ? "is-dragging" : ""
        ].filter(Boolean).join(" "),
        "data-type": node.type,
        style: { left: node.position.x, top: node.position.y, "--cue-node-accent": accent },
        onPointerDown: (event) => {
          if (event.target.closest?.(".cue-dot, .cue-node-head-btn")) return;
          event.stopPropagation();
          onSelect();
        },
        onContextMenu
      },
      /* @__PURE__ */ h("span", { className: "cue-node-rail" }),
      /* @__PURE__ */ h("div", { className: "cue-node-head", onPointerDown, title }, /* @__PURE__ */ h("span", { className: `cue-cue-light ${statusClass}`, title: t(`status${capitalize(statusClass)}`) }), /* @__PURE__ */ h("span", { className: "cue-node-head-icon", style: { color: accent } }, /* @__PURE__ */ h(NodeIcon, { type: node.type, size: 14 })), /* @__PURE__ */ h("span", { className: "cue-node-title" }, title), /* @__PURE__ */ h("span", { className: "cue-node-type" }, node.type), /* @__PURE__ */ h(
        "button",
        {
          type: "button",
          className: "cue-node-head-btn",
          "aria-label": t("closeMenu"),
          onClick: (event) => {
            event.stopPropagation();
            onContextMenu(event);
          }
        },
        /* @__PURE__ */ h(More, { size: 13 })
      )),
      /* @__PURE__ */ h("div", { className: "cue-node-body" }, isNote ? /* @__PURE__ */ h("div", { className: "cue-note-text" }, node.config?.text || "\u2026") : /* @__PURE__ */ h(Fragment, null, /* @__PURE__ */ h("div", { className: "cue-ports" }, /* @__PURE__ */ h("div", { className: "cue-port-list" }, inputs.map((port) => /* @__PURE__ */ h("div", { className: "cue-port in", key: port.id }, /* @__PURE__ */ h(
        "button",
        {
          type: "button",
          className: `cue-dot in ${connectedIn.has(port.id) ? "connected" : ""}`,
          "data-port-dot": true,
          "data-node-id": node.id,
          "data-port-id": port.id,
          "data-direction": "in",
          style: { "--cue-port-color": PORT_COLORS[port.type] ?? PORT_COLORS.any },
          title: `${port.label} \xB7 ${port.type}`,
          "aria-label": `${port.label} input`,
          onPointerDown: (event) => onPortPointerDown(event, node, port, "in")
        }
      ), /* @__PURE__ */ h("span", { className: "cue-port-label" }, port.label), port.required && /* @__PURE__ */ h("span", { className: "cue-port-required" }, "*"), /* @__PURE__ */ h("span", { className: "cue-port-type" }, port.type)))), /* @__PURE__ */ h("div", { className: "cue-port-list out" }, outputs.map((port) => /* @__PURE__ */ h("div", { className: "cue-port out", key: port.id }, /* @__PURE__ */ h("span", { className: "cue-port-type" }, port.type), /* @__PURE__ */ h("span", { className: "cue-port-label" }, port.label), /* @__PURE__ */ h(
        "button",
        {
          type: "button",
          className: `cue-dot out ${connectedOut.has(port.id) ? "connected" : ""}`,
          "data-port-dot": true,
          "data-node-id": node.id,
          "data-port-id": port.id,
          "data-direction": "out",
          style: { "--cue-port-color": PORT_COLORS[port.type] ?? PORT_COLORS.any },
          title: `${port.label} \xB7 ${port.type}`,
          "aria-label": `${port.label} output`,
          onPointerDown: (event) => onPortPointerDown(event, node, port, "out")
        }
      ))))), summary && /* @__PURE__ */ h("div", { className: "cue-node-summary" }, summary), error && /* @__PURE__ */ h("div", { className: "cue-node-error" }, error.message || String(error)), !error && preview && /* @__PURE__ */ h("div", { className: "cue-node-preview" }, preview), disabled && /* @__PURE__ */ h("div", { className: "cue-node-summary", style: { color: "var(--cue-faint)" } }, "disabled"), runStatus === "running" && status === "running" && /* @__PURE__ */ h("div", { className: "cue-node-summary", style: { color: "var(--cue-amber)" } }, "running\u2026"), status === "waiting-approval" && /* @__PURE__ */ h("div", { className: "cue-node-summary", style: { color: "var(--cue-orange)" } }, t("statusWaitingApproval"), "\u2026")))
    );
  }
  function NodeSearch({ x, y, nodeTypes, categories, onPick, onClose, t }) {
    const [query, setQuery] = React.useState("");
    const [active, setActive] = React.useState(0);
    const inputRef = React.useRef(null);
    const filtered = React.useMemo(() => {
      const q = query.trim().toLowerCase();
      return nodeTypes.filter((type) => !q || `${type.title} ${type.type} ${type.description}`.toLowerCase().includes(q));
    }, [nodeTypes, query]);
    React.useEffect(() => {
      inputRef.current?.focus();
    }, []);
    React.useEffect(() => {
      setActive(0);
    }, [query]);
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      } else if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((value) => Math.min(filtered.length - 1, value + 1));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((value) => Math.max(0, value - 1));
      } else if (event.key === "Enter") {
        event.preventDefault();
        const item = filtered[active];
        if (item) onPick(item.type);
      }
    };
    return /* @__PURE__ */ h(
      "div",
      {
        className: "cue-palette",
        style: { left: Math.max(8, x), top: Math.max(8, y) },
        onPointerDown: (event) => event.stopPropagation(),
        onContextMenu: (event) => event.stopPropagation(),
        role: "dialog",
        "aria-label": t("addNode")
      },
      /* @__PURE__ */ h("div", { className: "cue-palette-head" }, /* @__PURE__ */ h("div", { className: "cue-inline", style: { position: "relative" } }, /* @__PURE__ */ h("span", { style: { position: "absolute", left: 9, top: 7, color: "var(--cue-faint)", display: "flex" } }, /* @__PURE__ */ h(Search, { size: 13 })), /* @__PURE__ */ h(
        "input",
        {
          ref: inputRef,
          className: "cue-input",
          value: query,
          placeholder: t("searchNodes"),
          onChange: (event) => setQuery(event.target.value),
          onKeyDown,
          style: { paddingLeft: 28 },
          "aria-label": t("searchNodes")
        }
      ))),
      /* @__PURE__ */ h("div", { className: "cue-palette-list" }, filtered.length === 0 && /* @__PURE__ */ h("div", { className: "cue-palette-empty" }, t("noResults")), filtered.map((type, index) => {
        const category = categories.find((item) => item.id === type.category);
        return /* @__PURE__ */ h(
          "button",
          {
            type: "button",
            key: type.type,
            className: `cue-palette-item ${index === active ? "active" : ""}`,
            onMouseEnter: () => setActive(index),
            onClick: () => onPick(type.type)
          },
          /* @__PURE__ */ h("span", { className: "cue-library-icon", style: { color: category?.color ?? "var(--cue-amber)" } }, /* @__PURE__ */ h(NodeIcon, { type: type.type, size: 14 })),
          /* @__PURE__ */ h("span", { className: "cue-palette-item-text" }, /* @__PURE__ */ h("span", { className: "cue-palette-item-label" }, type.title, /* @__PURE__ */ h("span", { className: "cue-node-type", style: { marginLeft: 6 } }, type.type)), /* @__PURE__ */ h("span", { className: "cue-palette-item-desc" }, type.description))
        );
      }))
    );
  }
  function NodeMenu({ x, y, nodeId, onDuplicate, onToggleDisabled, onDelete, onClose, t }) {
    React.useEffect(() => {
      const close = (event) => {
        if (!event.target.closest?.(".cue-menu")) onClose();
      };
      window.addEventListener("pointerdown", close);
      return () => window.removeEventListener("pointerdown", close);
    }, [onClose]);
    return /* @__PURE__ */ h(
      "div",
      {
        className: "cue-menu",
        style: { left: Math.max(8, x), top: Math.max(8, y) },
        onPointerDown: (event) => event.stopPropagation(),
        role: "menu",
        "data-node-id": nodeId
      },
      /* @__PURE__ */ h("button", { type: "button", className: "cue-menu-item", onClick: onDuplicate }, /* @__PURE__ */ h(Copy, { size: 13 }), t("duplicate")),
      /* @__PURE__ */ h("button", { type: "button", className: "cue-menu-item", onClick: onToggleDisabled }, t("disable"), " / ", t("enable")),
      /* @__PURE__ */ h("div", { className: "cue-menu-sep" }),
      /* @__PURE__ */ h("button", { type: "button", className: "cue-menu-item danger", onClick: onDelete }, /* @__PURE__ */ h(Trash, { size: 13 }), t("delete"))
    );
  }
  function pathFor(from, to) {
    const dx = Math.max(40, Math.abs(to.x - from.x) * 0.5);
    return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
  }
  function summarize(node, def, t) {
    const config = node.config ?? {};
    switch (node.type) {
      case "input":
        return `${config.label || "Input"} \xB7 ${config.valueType || "text"}${config.required === false ? " \xB7 optional" : ""}`;
      case "template":
        return (config.template || "").split("\n")[0].slice(0, 80) || "no template";
      case "agent":
        return config.model ? `model: ${config.model}` : (config.prompt || "").split("\n")[0].slice(0, 80) || "prompt from input";
      case "skill":
        return config.skill ? `skill: ${config.skill}` : "no skill selected";
      case "command":
        return config.command ? `/${config.command}` : "no command selected";
      case "shell":
        return (config.command || "").split("\n")[0].slice(0, 90) || "no command";
      case "file-read":
        return config.path || "no path";
      case "condition":
        return `${config.operator || "truthy"}${config.compare ? ` \u2192 ${config.compare}` : ""}`;
      case "merge":
        return config.mode || "first";
      case "output":
        return `${config.name || "Output"} \xB7 ${config.format || "text"}`;
      default:
        return def?.description?.slice(0, 80) || "";
    }
  }
  function categoryColor(category) {
    return {
      io: "var(--cue-amber)",
      transform: "var(--cue-cyan)",
      agents: "var(--cue-violet)",
      dsh: "var(--cue-orange)",
      exec: "var(--cue-green)",
      control: "var(--cue-orange)",
      note: "var(--cue-faint)"
    }[category] ?? "var(--cue-amber)";
  }
  function capitalize(value) {
    return String(value || "").charAt(0).toUpperCase() + String(value || "").slice(1);
  }
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // src/client/Inspector.jsx
  function Inspector({
    workflow,
    catalog,
    selectedNodeId,
    selectedEdgeId,
    issues,
    run,
    events,
    runHistory,
    tab,
    onTabChange,
    onUpdateWorkflow,
    onUpdateNode,
    onUpdateConfig,
    onDeleteNode,
    onToggleDisabled,
    onDeleteEdge,
    onSelectNode,
    onOpenRun,
    onClearRun,
    onCancelRun,
    onRerun,
    onDeleteWorkflow,
    onListVersions,
    onRestoreVersion,
    onExport,
    onImport,
    onFit,
    t
  }) {
    const node = (workflow.nodes ?? []).find((item) => item.id === selectedNodeId) ?? null;
    const edge = (workflow.edges ?? []).find((item) => item.id === selectedEdgeId) ?? null;
    return /* @__PURE__ */ h("aside", { className: "cue-inspector", "aria-label": t("inspector") }, /* @__PURE__ */ h("div", { className: "cue-tabs", role: "tablist" }, [
      ["node", t("tabNode")],
      ["workflow", t("tabWorkflow")],
      ["run", t("tabRun")],
      ["issues", `${t("tabIssues")}${issues.length ? ` (${issues.length})` : ""}`]
    ].map(([value, label]) => /* @__PURE__ */ h(
      "button",
      {
        key: value,
        type: "button",
        role: "tab",
        "aria-selected": tab === value,
        className: `cue-tab ${tab === value ? "active" : ""}`,
        onClick: () => onTabChange(value)
      },
      label
    ))), /* @__PURE__ */ h("div", { className: "cue-tab-body" }, tab === "node" && (node ? /* @__PURE__ */ h(NodeForm, { node, catalog, workflow, issues, run, onUpdateNode, onUpdateConfig, onDeleteNode, onToggleDisabled, t }) : /* @__PURE__ */ h("div", { className: "cue-inspector-empty" }, /* @__PURE__ */ h("div", { className: "cue-empty-title", style: { fontSize: 13 } }, t("selectNode")), /* @__PURE__ */ h("div", null, t("selectNodeHint")), edge && /* @__PURE__ */ h("div", { style: { marginTop: 12 } }, /* @__PURE__ */ h("div", { className: "cue-badge" }, "link ", edge.from.node, ":", edge.from.port, " \u2192 ", edge.to.node, ":", edge.to.port), /* @__PURE__ */ h("button", { type: "button", className: "cue-btn danger sm", style: { marginTop: 8 }, onClick: () => onDeleteEdge(edge.id) }, /* @__PURE__ */ h(Trash, { size: 12 }), " ", t("delete"))))), tab === "workflow" && /* @__PURE__ */ h(
      WorkflowForm,
      {
        workflow,
        issues,
        runHistory,
        onUpdateWorkflow,
        onDeleteWorkflow,
        onListVersions,
        onRestoreVersion,
        onExport,
        onImport,
        onClearRun,
        onOpenRun,
        onFit,
        t
      }
    ), tab === "run" && /* @__PURE__ */ h(
      RunPanel,
      {
        workflow,
        run,
        events,
        runHistory,
        onSelectNode,
        onOpenRun,
        onCancelRun,
        onClearRun,
        onRerun,
        t
      }
    ), tab === "issues" && /* @__PURE__ */ h(IssuesList, { issues, onSelectNode, t })));
  }
  function NodeForm({ node, catalog, workflow, issues, run, onUpdateNode, onUpdateConfig, onDeleteNode, onToggleDisabled, t }) {
    const def = catalog.nodeTypes.find((type) => type.type === node.type);
    const [formatError, setFormatError] = React.useState("");
    if (!def) {
      return /* @__PURE__ */ h("div", { className: "cue-inspector-empty" }, /* @__PURE__ */ h("div", { className: "cue-empty-title", style: { fontSize: 13 } }, t("unknownType")), /* @__PURE__ */ h("div", null, node.type));
    }
    const nodeIssues = issues.filter((issue) => issue.nodeId === node.id);
    const inputs = getInputs(node.type, node.config);
    const outputs = getOutputs(node.type, node.config);
    const state = run?.nodeStates?.[node.id];
    return /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "cue-node-heading" }, /* @__PURE__ */ h("span", { className: "cue-library-icon", style: { color: categoryColor2(def.category) } }, /* @__PURE__ */ h(NodeIcon, { type: node.type, size: 16 })), /* @__PURE__ */ h("div", { className: "cue-node-heading-text" }, /* @__PURE__ */ h("div", { className: "cue-node-heading-title" }, node.title), /* @__PURE__ */ h("div", { className: "cue-node-heading-type" }, node.type, " \xB7 ", def.description)), /* @__PURE__ */ h("button", { type: "button", className: "cue-btn icon sm danger", title: t("delete"), onClick: () => onDeleteNode(node.id) }, /* @__PURE__ */ h(Trash, { size: 13 }))), /* @__PURE__ */ h("div", { className: "cue-section" }, /* @__PURE__ */ h("div", { className: "cue-field" }, /* @__PURE__ */ h("label", { className: "cue-field-label", htmlFor: "cue-node-title" }, t("nodeTitle")), /* @__PURE__ */ h(
      "input",
      {
        id: "cue-node-title",
        className: "cue-input",
        value: node.title,
        onChange: (event) => onUpdateNode(node.id, { title: event.target.value })
      }
    )), /* @__PURE__ */ h("div", { className: "cue-field", style: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ h("span", { className: "cue-field-label" }, t("enabled")), /* @__PURE__ */ h(
      "button",
      {
        type: "button",
        className: `cue-switch ${node.disabled ? "" : "on"}`,
        "aria-label": node.disabled ? t("enable") : t("disable"),
        onClick: () => onToggleDisabled(node.id)
      }
    ))), /* @__PURE__ */ h("div", { className: "cue-section" }, /* @__PURE__ */ h("div", { className: "cue-section-title" }, t("config")), def.fields.map((field2) => /* @__PURE__ */ h(
      FieldControl,
      {
        key: field2.key,
        field: field2,
        value: node.config?.[field2.key],
        node,
        catalog,
        onChange: (value) => onUpdateConfig(node.id, field2.key, value),
        onFormatError: setFormatError,
        t
      }
    )), formatError && /* @__PURE__ */ h("div", { className: "cue-field-hint", style: { color: "var(--cue-red)" } }, formatError)), /* @__PURE__ */ h("div", { className: "cue-section" }, /* @__PURE__ */ h("div", { className: "cue-section-title" }, t("ports")), /* @__PURE__ */ h("div", { className: "cue-port-status" }, inputs.map((port) => /* @__PURE__ */ h("div", { className: "cue-port-status-row", key: `in-${port.id}` }, /* @__PURE__ */ h("span", { className: "cue-port-status-dot", style: { "--cue-port-color": PORT_COLORS[port.type] ?? PORT_COLORS.any } }), /* @__PURE__ */ h("span", { className: "cue-port-status-name" }, port.label, " \xB7 ", port.type), /* @__PURE__ */ h("span", { className: "cue-port-status-state" }, connectedState(workflow, node.id, port.id, "in", t)))), outputs.map((port) => /* @__PURE__ */ h("div", { className: "cue-port-status-row", key: `out-${port.id}` }, /* @__PURE__ */ h("span", { className: "cue-port-status-dot", style: { "--cue-port-color": PORT_COLORS[port.type] ?? PORT_COLORS.any } }), /* @__PURE__ */ h("span", { className: "cue-port-status-name" }, port.label, " \xB7 ", port.type), /* @__PURE__ */ h("span", { className: "cue-port-status-state" }, connectedState(workflow, node.id, port.id, "out", t)))))), nodeIssues.length > 0 && /* @__PURE__ */ h("div", { className: "cue-section" }, /* @__PURE__ */ h("div", { className: "cue-section-title" }, t("issues")), /* @__PURE__ */ h(IssuesList, { issues: nodeIssues, t })), state && /* @__PURE__ */ h("div", { className: "cue-section" }, /* @__PURE__ */ h("div", { className: "cue-section-title" }, t("lastRun")), /* @__PURE__ */ h("div", { className: "cue-inline", style: { marginBottom: 6 } }, /* @__PURE__ */ h(StatusBadge, { status: state.status, t }), state.durationMs !== null && /* @__PURE__ */ h("span", { className: "cue-history-meta" }, formatDuration(state.durationMs))), state.error && /* @__PURE__ */ h("div", { className: "cue-node-error" }, state.error.message), state.preview && /* @__PURE__ */ h("pre", { className: "cue-output-pre", style: { maxHeight: 160, overflow: "auto" } }, state.preview)));
  }
  function FieldControl({ field: field2, value, node, catalog, onChange, onFormatError, t }) {
    const id = `cue-field-${field2.key}`;
    const [localError, setLocalError] = React.useState("");
    const hint = field2.hint ? /* @__PURE__ */ h("div", { className: "cue-field-hint" }, field2.hint) : null;
    if (field2.kind === "boolean") {
      return /* @__PURE__ */ h("div", { className: "cue-field", style: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" } }, /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "cue-field-label" }, field2.label), hint), /* @__PURE__ */ h(
        "button",
        {
          type: "button",
          id,
          className: `cue-switch ${value !== false ? "on" : ""}`,
          onClick: () => onChange(value === false),
          "aria-pressed": value !== false,
          "aria-label": field2.label
        }
      ));
    }
    if (field2.kind === "select") {
      const options = field2.options ?? [];
      return /* @__PURE__ */ h("div", { className: "cue-field" }, /* @__PURE__ */ h("label", { className: "cue-field-label", htmlFor: id }, field2.label), /* @__PURE__ */ h("select", { id, className: "cue-select", value: value ?? "", onChange: (event) => onChange(event.target.value) }, options.map((option) => /* @__PURE__ */ h("option", { key: option, value: option }, option))), hint);
    }
    if (field2.kind === "skill") {
      const skills = catalog.skills ?? [];
      const known = skills.some((skill) => skill.name === value);
      return /* @__PURE__ */ h("div", { className: "cue-field" }, /* @__PURE__ */ h("label", { className: "cue-field-label", htmlFor: id }, field2.label), /* @__PURE__ */ h("select", { id, className: "cue-select", value: value ?? "", onChange: (event) => onChange(event.target.value) }, /* @__PURE__ */ h("option", { value: "" }, "\u2014 ", t("noSelection"), " \u2014"), !known && value ? /* @__PURE__ */ h("option", { value }, value, " (", t("missingSkill"), ")") : null, skills.map((skill) => /* @__PURE__ */ h("option", { key: skill.name, value: skill.name }, skill.name, !skill.modelInvocable ? ` \xB7 ${t("skillUserOnly")}` : ""))), hint);
    }
    if (field2.kind === "command") {
      const commands = catalog.commands ?? [];
      const known = commands.some((command) => command.name === value);
      return /* @__PURE__ */ h("div", { className: "cue-field" }, /* @__PURE__ */ h("label", { className: "cue-field-label", htmlFor: id }, field2.label), /* @__PURE__ */ h("select", { id, className: "cue-select", value: value ?? "", onChange: (event) => onChange(event.target.value) }, /* @__PURE__ */ h("option", { value: "" }, "\u2014 ", t("noSelection"), " \u2014"), !known && value ? /* @__PURE__ */ h("option", { value }, value) : null, commands.map((command) => /* @__PURE__ */ h("option", { key: command.name, value: command.name }, command.name))), commands.length === 0 && /* @__PURE__ */ h("div", { className: "cue-field-hint" }, t("noCommands")), hint);
    }
    if (field2.kind === "json") {
      return /* @__PURE__ */ h("div", { className: "cue-field" }, /* @__PURE__ */ h("label", { className: "cue-field-label", htmlFor: id }, field2.label), /* @__PURE__ */ h(
        "textarea",
        {
          id,
          className: "cue-textarea json",
          rows: field2.rows ?? 5,
          value: value ?? "",
          placeholder: field2.placeholder ?? "",
          onChange: (event) => {
            setLocalError("");
            onFormatError?.("");
            onChange(event.target.value);
          },
          spellCheck: false
        }
      ), /* @__PURE__ */ h("div", { className: "cue-inline" }, /* @__PURE__ */ h(
        "button",
        {
          type: "button",
          className: "cue-btn ghost sm",
          onClick: () => {
            try {
              const parsed = JSON.parse(value || "{}");
              onChange(JSON.stringify(parsed, null, 2));
              setLocalError("");
              onFormatError?.("");
            } catch {
              setLocalError(t("invalidJson"));
              onFormatError?.(t("invalidJson"));
            }
          }
        },
        /* @__PURE__ */ h(Check, { size: 12 }),
        " ",
        t("format")
      )), localError && /* @__PURE__ */ h("div", { className: "cue-field-hint", style: { color: "var(--cue-red)" } }, localError), hint);
    }
    if (field2.kind === "textarea") {
      return /* @__PURE__ */ h("div", { className: "cue-field" }, /* @__PURE__ */ h("label", { className: "cue-field-label", htmlFor: id }, field2.label), /* @__PURE__ */ h(
        "textarea",
        {
          id,
          className: "cue-textarea",
          rows: field2.rows ?? 4,
          value: value ?? "",
          placeholder: field2.placeholder ?? "",
          onChange: (event) => onChange(event.target.value)
        }
      ), hint);
    }
    if (field2.kind === "number") {
      return /* @__PURE__ */ h("div", { className: "cue-field" }, /* @__PURE__ */ h("label", { className: "cue-field-label", htmlFor: id }, field2.label), /* @__PURE__ */ h(
        "input",
        {
          id,
          className: "cue-input",
          type: "number",
          min: field2.min,
          max: field2.max,
          step: field2.step,
          value: value ?? "",
          onChange: (event) => onChange(event.target.value === "" ? "" : Number(event.target.value))
        }
      ), hint);
    }
    return /* @__PURE__ */ h("div", { className: "cue-field" }, /* @__PURE__ */ h("label", { className: "cue-field-label", htmlFor: id }, field2.label), /* @__PURE__ */ h(
      "input",
      {
        id,
        className: "cue-input",
        value: value ?? "",
        placeholder: field2.placeholder ?? "",
        onChange: (event) => onChange(event.target.value)
      }
    ), hint);
  }
  function WorkflowForm({ workflow, issues, runHistory, onUpdateWorkflow, onDeleteWorkflow, onListVersions, onRestoreVersion, onExport, onImport, onClearRun, onOpenRun, onFit, t }) {
    const fileRef = React.useRef(null);
    const [versions, setVersions] = React.useState([]);
    const [versionsBusy, setVersionsBusy] = React.useState(false);
    const readFile = (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          onImport(parsed);
        } catch (error) {
          onImport(null, error);
        }
        event.target.value = "";
      };
      reader.readAsText(file);
    };
    return /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "cue-section" }, /* @__PURE__ */ h("div", { className: "cue-field" }, /* @__PURE__ */ h("label", { className: "cue-field-label", htmlFor: "cue-wf-name" }, t("workflowName")), /* @__PURE__ */ h("input", { id: "cue-wf-name", className: "cue-input", value: workflow.name, onChange: (event) => onUpdateWorkflow({ name: event.target.value }) })), /* @__PURE__ */ h("div", { className: "cue-field" }, /* @__PURE__ */ h("label", { className: "cue-field-label", htmlFor: "cue-wf-desc" }, t("workflowDescription")), /* @__PURE__ */ h("textarea", { id: "cue-wf-desc", className: "cue-textarea", rows: 3, value: workflow.description ?? "", onChange: (event) => onUpdateWorkflow({ description: event.target.value }) })), /* @__PURE__ */ h("div", { className: "cue-field" }, /* @__PURE__ */ h("label", { className: "cue-field-label", htmlFor: "cue-wf-concurrency" }, t("concurrency")), /* @__PURE__ */ h("select", { id: "cue-wf-concurrency", className: "cue-select", value: workflow.settings?.concurrency ?? 2, onChange: (event) => onUpdateWorkflow({ settings: { ...workflow.settings ?? {}, concurrency: Number(event.target.value) } }) }, [1, 2, 3, 4, 5, 6, 7, 8].map((value) => /* @__PURE__ */ h("option", { key: value, value }, value)))), /* @__PURE__ */ h("div", { className: "cue-field" }, /* @__PURE__ */ h("label", { className: "cue-field-label", htmlFor: "cue-wf-cwd" }, t("cwd")), /* @__PURE__ */ h("input", { id: "cue-wf-cwd", className: "cue-input", value: workflow.settings?.cwd ?? "", placeholder: "F:\\\\WorkSpace\\\\project", onChange: (event) => onUpdateWorkflow({ settings: { ...workflow.settings ?? {}, cwd: event.target.value } }) })), /* @__PURE__ */ h("div", { className: "cue-field" }, /* @__PURE__ */ h("label", { className: "cue-field-label", htmlFor: "cue-wf-session" }, t("sessionMode")), /* @__PURE__ */ h(
      "select",
      {
        id: "cue-wf-session",
        className: "cue-select",
        value: workflow.settings?.sessionMode ?? "isolated",
        onChange: (event) => onUpdateWorkflow({ settings: { ...workflow.settings ?? {}, sessionMode: event.target.value } })
      },
      /* @__PURE__ */ h("option", { value: "isolated" }, t("sessionModeIsolated")),
      /* @__PURE__ */ h("option", { value: "inherit" }, t("sessionModeInherit"))
    ), /* @__PURE__ */ h("div", { className: "cue-field-hint" }, t("sessionModeHint"))), /* @__PURE__ */ h("div", { className: "cue-field" }, /* @__PURE__ */ h("label", { className: "cue-field-label", htmlFor: "cue-wf-cancel" }, t("cancelPolicy")), /* @__PURE__ */ h(
      "select",
      {
        id: "cue-wf-cancel",
        className: "cue-select",
        value: workflow.settings?.cancelPolicy ?? "abort-all",
        onChange: (event) => onUpdateWorkflow({ settings: { ...workflow.settings ?? {}, cancelPolicy: event.target.value } })
      },
      /* @__PURE__ */ h("option", { value: "abort-all" }, t("cancelPolicyAbortAll")),
      /* @__PURE__ */ h("option", { value: "drain" }, t("cancelPolicyDrain"))
    ), /* @__PURE__ */ h("div", { className: "cue-field-hint" }, t("cancelPolicyHint")))), /* @__PURE__ */ h("div", { className: "cue-section" }, /* @__PURE__ */ h("div", { className: "cue-section-title" }, t("issues")), /* @__PURE__ */ h(IssuesList, { issues, t })), /* @__PURE__ */ h("div", { className: "cue-section" }, /* @__PURE__ */ h("div", { className: "cue-section-title" }, t("history")), runHistory.length === 0 ? /* @__PURE__ */ h("div", { className: "cue-empty-note" }, t("noHistory")) : /* @__PURE__ */ h("div", { className: "cue-history" }, runHistory.slice(0, 6).map((row) => /* @__PURE__ */ h("button", { type: "button", className: "cue-history-row", key: row.id, onClick: () => onOpenRun(row.id) }, /* @__PURE__ */ h(StatusDot, { status: row.status }), /* @__PURE__ */ h("span", { className: "cue-history-name" }, row.workflowName || row.id), /* @__PURE__ */ h("span", { className: "cue-history-meta" }, row.status, " \xB7 ", formatTime(row.endedAt || row.createdAt)))))), /* @__PURE__ */ h("div", { className: "cue-section" }, /* @__PURE__ */ h("div", { className: "cue-inline", style: { justifyContent: "space-between" } }, /* @__PURE__ */ h("div", { className: "cue-section-title" }, t("versions")), /* @__PURE__ */ h(
      "button",
      {
        type: "button",
        className: "cue-btn ghost sm",
        disabled: versionsBusy,
        onClick: async () => {
          setVersionsBusy(true);
          try {
            const data = await onListVersions(workflow.id);
            setVersions(data.versions ?? []);
          } finally {
            setVersionsBusy(false);
          }
        }
      },
      versionsBusy ? t("loading") : t("refresh")
    )), versions.length === 0 ? /* @__PURE__ */ h("div", { className: "cue-empty-note" }, t("noVersions")) : /* @__PURE__ */ h("div", { className: "cue-history" }, versions.slice(0, 8).map((row) => /* @__PURE__ */ h("div", { className: "cue-history-row", key: row.version }, /* @__PURE__ */ h("span", { className: "cue-history-name" }, formatTime(row.savedAt)), /* @__PURE__ */ h("span", { className: "cue-history-meta" }, row.nodeCount, " \xB7 ", row.edgeCount), /* @__PURE__ */ h(
      "button",
      {
        type: "button",
        className: "cue-btn ghost sm",
        onClick: () => onRestoreVersion(workflow.id, row.version)
      },
      t("restore")
    ))))), /* @__PURE__ */ h("div", { className: "cue-section" }, /* @__PURE__ */ h("div", { className: "cue-inline", style: { flexWrap: "wrap" } }, /* @__PURE__ */ h("button", { type: "button", className: "cue-btn outline sm", onClick: onExport }, /* @__PURE__ */ h(Download, { size: 12 }), " ", t("exportJson")), /* @__PURE__ */ h("button", { type: "button", className: "cue-btn outline sm", onClick: () => fileRef.current?.click() }, /* @__PURE__ */ h(Upload, { size: 12 }), " ", t("importJson")), /* @__PURE__ */ h("button", { type: "button", className: "cue-btn ghost sm", onClick: onFit }, /* @__PURE__ */ h(Clock, { size: 12 }), " ", t("fit")), /* @__PURE__ */ h("input", { ref: fileRef, type: "file", accept: "application/json,.json", style: { display: "none" }, onChange: readFile }))), /* @__PURE__ */ h("div", { className: "cue-section" }, /* @__PURE__ */ h("button", { type: "button", className: "cue-btn danger sm", onClick: onDeleteWorkflow }, /* @__PURE__ */ h(Trash, { size: 12 }), " ", t("delete")), onClearRun && /* @__PURE__ */ h("button", { type: "button", className: "cue-btn ghost sm", onClick: onClearRun }, t("clearResults"))));
  }
  function RunPanel({ workflow, run, events, runHistory, onSelectNode, onOpenRun, onCancelRun, onClearRun, onRerun, t }) {
    if (!run) {
      return /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "cue-inspector-empty" }, t("logEmpty")), /* @__PURE__ */ h("div", { className: "cue-section" }, /* @__PURE__ */ h("div", { className: "cue-section-title" }, t("history")), runHistory.length === 0 ? /* @__PURE__ */ h("div", { className: "cue-empty-note" }, t("noHistory")) : /* @__PURE__ */ h("div", { className: "cue-history" }, runHistory.slice(0, 10).map((row) => /* @__PURE__ */ h("button", { type: "button", className: "cue-history-row", key: row.id, onClick: () => onOpenRun(row.id) }, /* @__PURE__ */ h(StatusDot, { status: row.status }), /* @__PURE__ */ h("span", { className: "cue-history-name" }, row.workflowName || row.id), /* @__PURE__ */ h("span", { className: "cue-history-meta" }, row.status))))));
    }
    const running = run.status === "running" || run.status === "queued";
    const nodeTitle2 = (id) => workflow.nodes?.find((node) => node.id === id)?.title ?? id;
    return /* @__PURE__ */ h("div", null, /* @__PURE__ */ h("div", { className: "cue-section" }, /* @__PURE__ */ h("div", { className: "cue-inline", style: { justifyContent: "space-between" } }, /* @__PURE__ */ h(StatusBadge, { status: run.status, t }), /* @__PURE__ */ h("span", { className: "cue-history-meta" }, run.id)), /* @__PURE__ */ h("div", { className: "cue-field-hint", style: { marginTop: 6 } }, t("startedAt"), ": ", formatTime(run.startedAt), " \xB7 ", t("endedAt"), ": ", formatTime(run.endedAt)), run.status === "queued" && /* @__PURE__ */ h("div", { className: "cue-field-hint", style: { marginTop: 6 } }, t("queuePosition"), ": ", run.queuePosition ?? "\u2014", " \xB7 ", run.budget?.maxWallClockMs ? `${Math.round(run.budget.maxWallClockMs / 1e3)}s budget` : ""), run.error && /* @__PURE__ */ h("div", { className: "cue-warning", style: { marginTop: 8 } }, /* @__PURE__ */ h(Alert, { size: 13 }), /* @__PURE__ */ h("span", { className: "cue-warning-text" }, run.error.message)), /* @__PURE__ */ h("div", { className: "cue-inline", style: { marginTop: 8 } }, running && /* @__PURE__ */ h("button", { type: "button", className: "cue-btn danger sm", onClick: onCancelRun }, /* @__PURE__ */ h(Stop, { size: 12 }), " ", t("cancel")), !running && (run.status === "error" || Object.values(run.nodeStates ?? {}).some((state) => state.status === "error")) && /* @__PURE__ */ h("button", { type: "button", className: "cue-btn sm", onClick: onRerun }, /* @__PURE__ */ h(Play, { size: 12 }), " ", t("rerunFromFailure")), /* @__PURE__ */ h("button", { type: "button", className: "cue-btn ghost sm", onClick: onClearRun }, t("clearResults")))), /* @__PURE__ */ h("div", { className: "cue-section" }, /* @__PURE__ */ h("div", { className: "cue-section-title" }, t("nodeStatus")), /* @__PURE__ */ h("div", { className: "cue-history" }, (workflow.nodes ?? []).map((node) => {
      const state = run.nodeStates?.[node.id];
      if (!state) return null;
      return /* @__PURE__ */ h("button", { type: "button", className: "cue-history-row", key: node.id, onClick: () => onSelectNode(node.id) }, /* @__PURE__ */ h(StatusDot, { status: state.status }), /* @__PURE__ */ h("span", { className: "cue-history-name" }, node.title || node.type), /* @__PURE__ */ h("span", { className: "cue-history-meta" }, formatDuration(state.durationMs)));
    }))), /* @__PURE__ */ h("div", { className: "cue-section" }, /* @__PURE__ */ h("div", { className: "cue-section-title" }, t("output")), Object.keys(run.outputs ?? {}).length === 0 ? /* @__PURE__ */ h("div", { className: "cue-empty-note" }, t("noOutput")) : Object.entries(run.outputs).map(([id, output]) => /* @__PURE__ */ h("div", { className: "cue-output-item", key: id }, /* @__PURE__ */ h("div", { className: "cue-output-title" }, output.name || nodeTitle2(id)), /* @__PURE__ */ h("pre", { className: "cue-output-pre" }, output.value)))), /* @__PURE__ */ h("div", { className: "cue-section" }, /* @__PURE__ */ h("div", { className: "cue-section-title" }, t("tabLog")), /* @__PURE__ */ h("div", { className: "cue-log", style: { maxHeight: 220, padding: 0 } }, events.length === 0 && /* @__PURE__ */ h("div", { className: "cue-empty-note" }, t("logEmpty")), events.slice(-120).map((event) => /* @__PURE__ */ h("div", { className: `cue-log-row ${event.type === "node/error" ? "error" : event.type === "run/error" ? "error" : ""}`, key: event.seq }, /* @__PURE__ */ h("span", { className: "cue-log-time" }, formatTime(event.time)), /* @__PURE__ */ h("span", { className: "cue-log-node" }, event.nodeId ? nodeTitle2(event.nodeId) : ""), /* @__PURE__ */ h("span", { className: "cue-log-msg" }, event.message))))));
  }
  function IssuesList({ issues, onSelectNode, t }) {
    if (!issues.length) return /* @__PURE__ */ h("div", { className: "cue-empty-note" }, t("noIssues"));
    return /* @__PURE__ */ h("div", { className: "cue-issues" }, issues.map((issue, index) => /* @__PURE__ */ h(
      "button",
      {
        type: "button",
        className: `cue-issue ${issue.severity}`,
        key: `${issue.code}-${index}`,
        onClick: () => issue.nodeId && onSelectNode?.(issue.nodeId),
        style: { textAlign: "left" }
      },
      issue.severity === "error" ? /* @__PURE__ */ h(Alert, { size: 13 }) : /* @__PURE__ */ h(Alert, { size: 13 }),
      /* @__PURE__ */ h("span", { className: "cue-issue-text" }, /* @__PURE__ */ h("span", null, issue.message), /* @__PURE__ */ h("span", { className: "cue-issue-code" }, issue.code, issue.port ? ` \xB7 ${issue.port}` : ""))
    )));
  }
  function StatusBadge({ status, t }) {
    return /* @__PURE__ */ h("span", { className: `cue-badge ${statusTone(status)}` }, /* @__PURE__ */ h(StatusDot, { status }), statusLabel(status, t));
  }
  function StatusDot({ status }) {
    return /* @__PURE__ */ h("span", { className: `cue-status-dot ${status}` });
  }
  function statusTone(status) {
    if (status === "error") return "red";
    if (status === "success" || status === "completed") return "green";
    if (status === "running" || status === "waiting-approval") return "amber";
    if (status === "cancelled") return "amber";
    if (status === "skipped") return "";
    return "";
  }
  function statusLabel(status, t) {
    const key = `status${String(status || "unknown").charAt(0).toUpperCase()}${String(status || "unknown").slice(1)}`;
    return t(key);
  }
  function connectedState(workflow, nodeId, portId, direction, t) {
    const connected = direction === "in" ? (workflow.edges ?? []).some((edge) => edge.to?.node === nodeId && edge.to.port === portId) : (workflow.edges ?? []).some((edge) => edge.from?.node === nodeId && edge.from.port === portId);
    return connected ? t("connected") : t("notConnected");
  }
  function categoryColor2(category) {
    return {
      io: "var(--cue-amber)",
      transform: "var(--cue-cyan)",
      agents: "var(--cue-violet)",
      dsh: "var(--cue-orange)",
      exec: "var(--cue-green)",
      control: "var(--cue-orange)",
      note: "var(--cue-faint)"
    }[category] ?? "var(--cue-amber)";
  }
  function formatDuration(ms) {
    if (ms === null || ms === void 0) return "\u2014";
    if (ms < 1e3) return `${Math.round(ms)} ms`;
    return `${(ms / 1e3).toFixed(1)} s`;
  }
  function formatTime(value) {
    if (!value) return "\u2014";
    try {
      return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "\u2014";
    }
  }

  // src/client/RunDialog.jsx
  function RunDialog({ open, workflow, catalog, onClose, onRun, t }) {
    const inputs = React.useMemo(
      () => (workflow.nodes ?? []).filter((node) => node.type === "input"),
      [workflow.nodes]
    );
    const [values, setValues] = React.useState({});
    const [sessionId, setSessionId] = React.useState("");
    const [cwd, setCwd] = React.useState("");
    const [submitted, setSubmitted] = React.useState(false);
    const [busy, setBusy] = React.useState(false);
    React.useEffect(() => {
      if (!open) return;
      const next = {};
      for (const node of inputs) next[node.id] = String(node.config?.defaultValue ?? "");
      setValues(next);
      setSessionId(catalog?.defaultSessionId || catalog?.agents?.[0]?.id || "");
      setCwd(workflow.settings?.cwd || catalog?.cwd || "");
      setSubmitted(false);
      setBusy(false);
    }, [open, workflow.id, catalog?.defaultSessionId]);
    React.useEffect(() => {
      if (!open) return;
      const onKey = (event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);
    if (!open) return null;
    const agents = catalog?.agents ?? [];
    const hasLlm = (workflow.nodes ?? []).some((node) => ["agent", "skill", "command"].includes(node.type));
    const noAgent = hasLlm && agents.length === 0;
    const missing = inputs.filter((node) => {
      if (node.config?.required === false) return false;
      const value = values[node.id];
      return value === void 0 || String(value).trim() === "";
    });
    const submit = async () => {
      setSubmitted(true);
      if (noAgent || missing.length) return;
      setBusy(true);
      try {
        await onRun({ inputs: values, sessionId, cwd });
      } finally {
        setBusy(false);
      }
    };
    return /* @__PURE__ */ h(
      "div",
      {
        className: "cue-modal-backdrop",
        onPointerDown: (event) => {
          if (event.target === event.currentTarget) onClose();
        },
        role: "presentation"
      },
      /* @__PURE__ */ h("div", { className: "cue-modal", role: "dialog", "aria-modal": "true", "aria-label": t("runDialogTitle") }, /* @__PURE__ */ h("div", { className: "cue-modal-head" }, /* @__PURE__ */ h("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ h("h2", { className: "cue-modal-title" }, t("runDialogTitle")), /* @__PURE__ */ h("p", { className: "cue-modal-sub" }, workflow.name)), /* @__PURE__ */ h("button", { type: "button", className: "cue-btn icon ghost", onClick: onClose, "aria-label": t("close") }, /* @__PURE__ */ h(Close, { size: 15 }))), /* @__PURE__ */ h("div", { className: "cue-modal-body" }, noAgent && /* @__PURE__ */ h("div", { className: "cue-warning" }, /* @__PURE__ */ h(Alert, { size: 14 }), /* @__PURE__ */ h("span", { className: "cue-warning-text" }, t("noLiveAgent"))), (catalog?.warnings ?? []).length > 0 && !noAgent && /* @__PURE__ */ h("div", { className: "cue-warning" }, /* @__PURE__ */ h(Alert, { size: 14 }), /* @__PURE__ */ h("span", { className: "cue-warning-text" }, catalog.warnings[0])), /* @__PURE__ */ h("div", { className: "cue-field" }, /* @__PURE__ */ h("label", { className: "cue-field-label", htmlFor: "cue-run-session" }, t("targetSession")), /* @__PURE__ */ h(
        "select",
        {
          id: "cue-run-session",
          className: "cue-select",
          value: sessionId,
          onChange: (event) => setSessionId(event.target.value),
          disabled: agents.length === 0
        },
        agents.length === 0 && /* @__PURE__ */ h("option", { value: "" }, t("noAgents")),
        agents.map((agent) => /* @__PURE__ */ h("option", { key: agent.id, value: agent.id }, agent.title || agent.id, " \xB7 ", agent.model || agent.provider || agent.status))
      )), /* @__PURE__ */ h("div", { className: "cue-field" }, /* @__PURE__ */ h("label", { className: "cue-field-label", htmlFor: "cue-run-cwd" }, t("workingDir")), /* @__PURE__ */ h(
        "input",
        {
          id: "cue-run-cwd",
          className: "cue-input",
          value: cwd,
          onChange: (event) => setCwd(event.target.value),
          placeholder: catalog?.cwd ?? "",
          spellCheck: false
        }
      )), inputs.length === 0 && /* @__PURE__ */ h("div", { className: "cue-empty-note", style: { marginTop: 12 } }, t("noInputs")), inputs.map((node) => {
        const config = node.config ?? {};
        const options = String(config.options ?? "").split(",").map((option) => option.trim()).filter(Boolean);
        const value = values[node.id] ?? "";
        const label = config.label || node.title || t("inputPort");
        const required = config.required !== false;
        return /* @__PURE__ */ h("div", { className: "cue-field", key: node.id }, /* @__PURE__ */ h("label", { className: "cue-field-label", htmlFor: `cue-run-${node.id}` }, /* @__PURE__ */ h("span", null, label, " ", required ? /* @__PURE__ */ h("span", { style: { color: "var(--cue-red)" } }, "*") : /* @__PURE__ */ h("span", { className: "cue-field-hint" }, t("optional"))), /* @__PURE__ */ h("span", { className: "cue-badge" }, config.valueType || "text")), options.length > 0 ? /* @__PURE__ */ h(
          "select",
          {
            id: `cue-run-${node.id}`,
            className: "cue-select",
            value,
            onChange: (event) => setValues((prev) => ({ ...prev, [node.id]: event.target.value }))
          },
          /* @__PURE__ */ h("option", { value: "" }, "\u2014 ", t("noSelection"), " \u2014"),
          options.map((option) => /* @__PURE__ */ h("option", { key: option, value: option }, option))
        ) : config.valueType === "boolean" ? /* @__PURE__ */ h("label", { className: "cue-check" }, /* @__PURE__ */ h(
          "input",
          {
            id: `cue-run-${node.id}`,
            type: "checkbox",
            checked: value === "true" || value === true,
            onChange: (event) => setValues((prev) => ({ ...prev, [node.id]: event.target.checked ? "true" : "false" }))
          }
        ), /* @__PURE__ */ h("span", null, "true / false")) : config.valueType === "number" ? /* @__PURE__ */ h(
          "input",
          {
            id: `cue-run-${node.id}`,
            className: "cue-input",
            type: "number",
            value,
            onChange: (event) => setValues((prev) => ({ ...prev, [node.id]: event.target.value }))
          }
        ) : config.valueType === "json" ? /* @__PURE__ */ h(
          "textarea",
          {
            id: `cue-run-${node.id}`,
            className: "cue-textarea json",
            rows: 4,
            value,
            onChange: (event) => setValues((prev) => ({ ...prev, [node.id]: event.target.value })),
            spellCheck: false
          }
        ) : /* @__PURE__ */ h(
          "textarea",
          {
            id: `cue-run-${node.id}`,
            className: "cue-textarea",
            rows: 3,
            value,
            placeholder: config.placeholder || "",
            onChange: (event) => setValues((prev) => ({ ...prev, [node.id]: event.target.value }))
          }
        ), submitted && missing.includes(node) && /* @__PURE__ */ h("div", { className: "cue-field-hint", style: { color: "var(--cue-red)" } }, t("required")));
      }), /* @__PURE__ */ h("div", { className: "cue-field-hint", style: { marginTop: 10 } }, t("runHint"))), /* @__PURE__ */ h("div", { className: "cue-modal-foot" }, /* @__PURE__ */ h("span", { className: "cue-spacer" }), /* @__PURE__ */ h("button", { type: "button", className: "cue-btn ghost", onClick: onClose }, t("cancel")), /* @__PURE__ */ h("button", { type: "button", className: "cue-btn primary", "data-cue-action": "start-run", onClick: submit, disabled: busy || noAgent }, busy ? /* @__PURE__ */ h("span", { className: "cue-spinner" }) : /* @__PURE__ */ h(Play, { size: 13 }), busy ? t("running") : t("start"))))
    );
  }

  // src/client/ApprovalDialog.jsx
  function ApprovalDialog({ open, approval, nodeTitle: nodeTitle2, onDecision, onCancelRun, t }) {
    const [busy, setBusy] = React.useState(false);
    const [error, setError] = React.useState("");
    React.useEffect(() => {
      if (!open) return;
      setBusy(false);
      setError("");
    }, [open, approval?.id]);
    if (!open || !approval) return null;
    const decide = async (decision) => {
      setBusy(true);
      setError("");
      try {
        await onDecision(decision);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
        setBusy(false);
      }
    };
    const detail = approval.detail ?? {};
    return /* @__PURE__ */ h("div", { className: "cue-modal-backdrop", role: "presentation" }, /* @__PURE__ */ h("div", { className: "cue-modal cue-approval-modal", role: "dialog", "aria-modal": "true", "aria-label": t("approvalTitle") }, /* @__PURE__ */ h("div", { className: "cue-modal-head" }, /* @__PURE__ */ h("div", { style: { flex: 1, minWidth: 0 } }, /* @__PURE__ */ h("h2", { className: "cue-modal-title" }, t("approvalTitle")), /* @__PURE__ */ h("p", { className: "cue-modal-sub" }, t("approvalSub"))), /* @__PURE__ */ h("button", { type: "button", className: "cue-btn icon ghost", onClick: onCancelRun, "aria-label": t("cancel"), title: t("cancel") }, /* @__PURE__ */ h(Close, { size: 15 }))), /* @__PURE__ */ h("div", { className: "cue-modal-body" }, /* @__PURE__ */ h("div", { className: "cue-warning" }, /* @__PURE__ */ h(Alert, { size: 14 }), /* @__PURE__ */ h("span", { className: "cue-warning-text" }, t("approvalHint"))), /* @__PURE__ */ h("div", { className: "cue-approval-row" }, /* @__PURE__ */ h("span", { className: "cue-field-label" }, t("approvalNode")), /* @__PURE__ */ h("span", { className: "cue-badge" }, nodeTitle2 || approval.nodeTitle || approval.nodeId)), /* @__PURE__ */ h("div", { className: "cue-approval-row" }, /* @__PURE__ */ h("span", { className: "cue-field-label" }, t("approvalAction")), /* @__PURE__ */ h("span", { className: "cue-badge" }, approval.action || "action")), detail.command && /* @__PURE__ */ h("div", { className: "cue-field" }, /* @__PURE__ */ h("div", { className: "cue-field-label" }, t("approvalCommand")), /* @__PURE__ */ h("pre", { className: "cue-approval-command" }, detail.command)), detail.workdir && /* @__PURE__ */ h("div", { className: "cue-approval-row" }, /* @__PURE__ */ h("span", { className: "cue-field-label" }, t("approvalWorkdir")), /* @__PURE__ */ h("span", { className: "cue-approval-path" }, detail.workdir)), error && /* @__PURE__ */ h("div", { className: "cue-warning" }, /* @__PURE__ */ h(Alert, { size: 13 }), /* @__PURE__ */ h("span", { className: "cue-warning-text" }, error))), /* @__PURE__ */ h("div", { className: "cue-modal-foot" }, /* @__PURE__ */ h("button", { type: "button", className: "cue-btn ghost", onClick: onCancelRun, disabled: busy }, /* @__PURE__ */ h(Stop, { size: 12 }), " ", t("cancel")), /* @__PURE__ */ h("span", { className: "cue-spacer" }), /* @__PURE__ */ h("button", { type: "button", className: "cue-btn danger", onClick: () => void decide("reject"), disabled: busy }, t("approvalReject")), /* @__PURE__ */ h("button", { type: "button", className: "cue-btn primary", onClick: () => void decide("allow"), disabled: busy, "data-cue-action": "approve-once" }, busy ? /* @__PURE__ */ h("span", { className: "cue-spinner" }) : /* @__PURE__ */ h(Check, { size: 13 }), t("approvalAllow")))));
  }

  // src/client/App.jsx
  var EMPTY_SETTINGS = { ...DEFAULT_WORKFLOW_SETTINGS };
  var DRAFT_PREFIX = "cueflow:draft:";
  function CueFlowPanel({ t }) {
    const tr = React.useCallback((key, values) => typeof t === "function" ? t(key, values) : key, [t]);
    const [catalog, setCatalog] = React.useState(null);
    const [workflows, setWorkflows] = React.useState([]);
    const [workflow, setWorkflow] = React.useState(null);
    const workflowRef = React.useRef(null);
    const [dirty, setDirty] = React.useState(false);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const [issues, setIssues] = React.useState([]);
    const [selectedNodeId, setSelectedNodeId] = React.useState(null);
    const [selectedEdgeId, setSelectedEdgeId] = React.useState(null);
    const [inspectorTab, setInspectorTab] = React.useState("node");
    const [panelWidth, setPanelWidth] = React.useState(1200);
    const [inspectorPreference, setInspectorPreference] = React.useState(null);
    const rootRef = React.useRef(null);
    const compact = panelWidth < 1250;
    const narrow = panelWidth < 1e3;
    const inspectorOpen = inspectorPreference === null ? !narrow : inspectorPreference;
    const [viewport, setViewport] = React.useState({ x: 80, y: 80, scale: 1 });
    const [run, setRun] = React.useState(null);
    const [events, setEvents] = React.useState([]);
    const [runHistory, setRunHistory] = React.useState([]);
    const [runDialogOpen, setRunDialogOpen] = React.useState(false);
    const [templateOpen, setTemplateOpen] = React.useState(false);
    const [dockOpen, setDockOpen] = React.useState(false);
    const [dockTab, setDockTab] = React.useState("log");
    const [toast, setToast] = React.useState(null);
    const [saving, setSaving] = React.useState(false);
    const [historyVersion, setHistoryVersion] = React.useState(0);
    const history = React.useRef({ past: [], future: [] });
    const configEditRef = React.useRef({ nodeId: "", key: "", at: 0 });
    const lastSeqRef = React.useRef(-1);
    const canvasHostRef = React.useRef(null);
    const notify = React.useCallback((text, kind = "") => {
      setToast({ text, kind, id: Date.now() });
    }, []);
    React.useEffect(() => {
      if (!toast) return;
      const timer = setTimeout(() => setToast(null), 4200);
      return () => clearTimeout(timer);
    }, [toast]);
    const setCurrent = React.useCallback((next, { dirty: nextDirty = true, validate: shouldValidate = true } = {}) => {
      workflowRef.current = next;
      setWorkflow(next);
      setDirty(nextDirty);
      if (shouldValidate) setIssues(validateWorkflow(next).issues);
    }, []);
    const pushHistory = React.useCallback((snapshot) => {
      const past = history.current.past;
      past.push(clone(snapshot));
      if (past.length > 50) past.shift();
      history.current.future = [];
      setHistoryVersion((value) => value + 1);
    }, []);
    const fitToWorkflow = React.useCallback((target) => {
      const wf = target ?? workflowRef.current;
      const host = canvasHostRef.current;
      if (!wf) return;
      if (!host) return;
      const nodes = wf.nodes ?? [];
      if (nodes.length === 0) {
        setViewport({ x: 80, y: 80, scale: 1 });
        return;
      }
      const minX = Math.min(...nodes.map((node) => node.position.x));
      const minY = Math.min(...nodes.map((node) => node.position.y));
      const maxX = Math.max(...nodes.map((node) => node.position.x + 264));
      const maxY = Math.max(...nodes.map((node) => node.position.y + estimateNodeHeight(node.type, node.config)));
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);
      const pad = 64;
      const scale = Math.max(0.6, Math.min(1.15, Math.min((width - pad * 2) / Math.max(1, maxX - minX), (height - pad * 2) / Math.max(1, maxY - minY))));
      setViewport({
        x: (width - (maxX - minX) * scale) / 2 - minX * scale,
        y: (height - (maxY - minY) * scale) / 2 - minY * scale,
        scale
      });
    }, []);
    const centerOnNode = React.useCallback((nodeId) => {
      const node = workflowRef.current?.nodes?.find((item) => item.id === nodeId);
      const host = canvasHostRef.current;
      if (!node || !host) return;
      setViewport((current2) => ({
        x: host.clientWidth / 2 - (node.position.x + 132) * current2.scale,
        y: host.clientHeight / 2 - (node.position.y + 70) * current2.scale,
        scale: current2.scale
      }));
    }, []);
    const loadWorkflow = React.useCallback((wf, { dirty: nextDirty = false } = {}) => {
      const normalized = normalizeWorkflow(clone(wf));
      setWorkflows((previous) => ensureWorkflowSummary(previous, normalized));
      setCurrent(normalized, { dirty: nextDirty });
      setSelectedNodeId(normalized.nodes?.[0]?.id ?? null);
      setSelectedEdgeId(null);
      setRun(null);
      setEvents([]);
      setDockOpen(false);
      setInspectorTab("node");
      lastSeqRef.current = -1;
      history.current = { past: [], future: [] };
      setHistoryVersion((value) => value + 1);
      setTimeout(() => fitToWorkflow(normalized), 60);
    }, [setCurrent, fitToWorkflow]);
    const refreshHistory = React.useCallback(async () => {
      try {
        const data = await listRuns(20);
        setRunHistory(data.runs ?? []);
        return data;
      } catch {
        return null;
      }
    }, []);
    const bootstrap = React.useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const [cat, list] = await Promise.all([getCatalog(), listWorkflows()]);
        setCatalog(cat);
        setWorkflows(list.workflows ?? []);
        let initial = null;
        if (list.workflows?.length) {
          const first = await getWorkflow(list.workflows[0].id);
          initial = first.workflow;
        } else {
          const blank = cat.templates?.find((template) => template.id === "blank") ?? cat.templates?.[0];
          initial = blank?.workflow ?? emptyWorkflow();
        }
        loadWorkflow(initial);
        const history2 = await refreshHistory();
        const active = history2?.runs?.find((row) => row.status === "running" || row.status === "queued");
        if (active) {
          const data = await getRun(active.id, -1);
          if (data.run && (data.run.status === "running" || data.run.status === "queued")) {
            if (data.run.workflowSnapshot) loadWorkflow(data.run.workflowSnapshot);
            setRun(data.run);
            setEvents(data.events ?? []);
            lastSeqRef.current = (data.events ?? []).reduce((max, event) => Math.max(max, event.seq), -1);
            setDockOpen(true);
            setInspectorTab("run");
          }
        } else {
          const draft = readDraft(initial.id);
          if (draft && draft.workflow) {
            setCurrent(normalizeWorkflow(clone(draft.workflow)), { dirty: true });
            notify(tr("draftRestored"), "warn");
          }
        }
      } catch (cause) {
        setError(cause);
      } finally {
        setLoading(false);
      }
    }, [loadWorkflow, refreshHistory, notify, setCurrent, tr]);
    React.useEffect(() => {
      void bootstrap();
    }, [bootstrap]);
    React.useEffect(() => {
      if (!run || isTerminalRun(run.status)) return;
      let cancelled = false;
      let timer = null;
      const tick = async () => {
        if (cancelled) return;
        try {
          const data = await getRun(run.id, lastSeqRef.current);
          if (cancelled) return;
          setRun(data.run);
          if (data.events?.length) {
            setEvents((previous) => mergeEvents(previous, data.events));
            lastSeqRef.current = Math.max(lastSeqRef.current, ...data.events.map((event) => event.seq));
          }
          if (isTerminalRun(data.run.status)) {
            void refreshHistory();
            return;
          }
        } catch (cause) {
          notify(cause instanceof Error ? cause.message : String(cause), "error");
        }
        timer = setTimeout(tick, 600);
      };
      timer = setTimeout(tick, 600);
      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
    }, [run?.id, run?.status, notify, refreshHistory]);
    React.useEffect(() => {
      const element = rootRef.current;
      if (!element || typeof ResizeObserver !== "function") return;
      const observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect?.width;
        if (Number.isFinite(width) && width > 0) setPanelWidth(width);
      });
      observer.observe(element);
      return () => observer.disconnect();
    }, [loading]);
    React.useEffect(() => {
      if (!workflowRef.current) return;
      const timer = setTimeout(() => fitToWorkflow(), 160);
      return () => clearTimeout(timer);
    }, [panelWidth, fitToWorkflow]);
    React.useEffect(() => {
      if (!dirty) return;
      const handler = (event) => {
        event.preventDefault();
        event.returnValue = "";
      };
      window.addEventListener("beforeunload", handler);
      return () => window.removeEventListener("beforeunload", handler);
    }, [dirty]);
    React.useEffect(() => {
      if (!workflow || !dirty || saving) return;
      const timer = setTimeout(() => writeDraft(workflow), 700);
      return () => clearTimeout(timer);
    }, [workflow, dirty, saving]);
    const applyChange = React.useCallback((mutator, { record = true, validate: shouldValidate = true } = {}) => {
      const previous = workflowRef.current;
      if (!previous) return null;
      const next = mutator(clone(previous));
      if (record) pushHistory(previous);
      setCurrent(next, { dirty: true, validate: shouldValidate });
      return next;
    }, [pushHistory, setCurrent]);
    const undo = React.useCallback(() => {
      const entry = history.current.past.pop();
      if (!entry) return;
      history.current.future.push(clone(workflowRef.current));
      setCurrent(entry, { dirty: true });
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setHistoryVersion((value) => value + 1);
    }, [setCurrent]);
    const redo = React.useCallback(() => {
      const entry = history.current.future.pop();
      if (!entry) return;
      history.current.past.push(clone(workflowRef.current));
      setCurrent(entry, { dirty: true });
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setHistoryVersion((value) => value + 1);
    }, [setCurrent]);
    const selectNode = React.useCallback((nodeId, { center = false } = {}) => {
      setSelectedNodeId(nodeId);
      setSelectedEdgeId(null);
      setInspectorTab("node");
      if (center) centerOnNode(nodeId);
    }, [centerOnNode]);
    const addNode = React.useCallback((type, position) => {
      const host = canvasHostRef.current;
      let point = position;
      if (!point) {
        const rect = host?.getBoundingClientRect();
        point = {
          x: rect ? (rect.width / 2 - viewport.x) / viewport.scale - 132 : 120,
          y: rect ? (rect.height / 2 - viewport.y) / viewport.scale - 70 : 120
        };
      }
      let node;
      try {
        node = createNode(type, { position: point });
      } catch (cause) {
        notify(cause instanceof Error ? cause.message : String(cause), "error");
        return;
      }
      applyChange((current2) => ({ ...current2, nodes: [...current2.nodes, node] }));
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
      setInspectorTab("node");
    }, [applyChange, notify, viewport]);
    const updateNode = React.useCallback((nodeId, patch) => {
      applyChange((current2) => ({
        ...current2,
        nodes: current2.nodes.map((node) => node.id === nodeId ? { ...node, ...patch } : node)
      }));
    }, [applyChange]);
    const updateConfig = React.useCallback((nodeId, key, value) => {
      const now = Date.now();
      const last = configEditRef.current;
      const record = last.nodeId !== nodeId || last.key !== key || now - last.at > 800;
      configEditRef.current = { nodeId, key, at: now };
      applyChange((current2) => ({
        ...current2,
        nodes: current2.nodes.map((node) => node.id === nodeId ? { ...node, config: { ...node.config ?? {}, [key]: value } } : node)
      }), { record });
    }, [applyChange]);
    const toggleDisabled = React.useCallback((nodeId) => {
      applyChange((current2) => ({
        ...current2,
        nodes: current2.nodes.map((node) => node.id === nodeId ? { ...node, disabled: !node.disabled } : node)
      }));
    }, [applyChange]);
    const deleteNode = React.useCallback((nodeId) => {
      applyChange((current2) => ({
        ...current2,
        nodes: current2.nodes.filter((node) => node.id !== nodeId),
        edges: current2.edges.filter((edge) => edge.from.node !== nodeId && edge.to.node !== nodeId)
      }));
      setSelectedNodeId((value) => value === nodeId ? null : value);
      setSelectedEdgeId(null);
    }, [applyChange]);
    const duplicateNode = React.useCallback((nodeId) => {
      const source = workflowRef.current?.nodes?.find((node) => node.id === nodeId);
      if (!source) return;
      const copy = createNode(source.type, {
        title: `${source.title} copy`,
        position: { x: source.position.x + 28, y: source.position.y + 28 },
        config: clone(source.config)
      });
      applyChange((current2) => ({ ...current2, nodes: [...current2.nodes, copy] }));
      setSelectedNodeId(copy.id);
      setInspectorTab("node");
    }, [applyChange]);
    const deleteEdge = React.useCallback((edgeId) => {
      applyChange((current2) => ({ ...current2, edges: current2.edges.filter((edge) => edge.id !== edgeId) }));
      setSelectedEdgeId(null);
    }, [applyChange]);
    const connect = React.useCallback((from, to) => {
      const current2 = workflowRef.current;
      if (!current2) return;
      if (current2.edges.some((edge) => edge.from.node === from.node && edge.from.port === from.port && edge.to.node === to.node && edge.to.port === to.port)) {
        return;
      }
      const check = canConnect(current2, from, to, { replace: true });
      if (!check.ok) {
        notify(check.reason, "warn");
        return;
      }
      applyChange((wf) => {
        const edges = wf.edges.filter((edge) => !(edge.to.node === to.node && edge.to.port === to.port));
        edges.push({ id: makeId("e"), from: { ...from }, to: { ...to } });
        return { ...wf, edges };
      });
    }, [applyChange, notify]);
    const updateWorkflow = React.useCallback((patch) => {
      applyChange((current2) => ({ ...current2, ...patch }));
    }, [applyChange]);
    const save = React.useCallback(async () => {
      const current2 = workflowRef.current;
      if (!current2 || saving) return;
      const report = validateWorkflow(current2);
      setIssues(report.issues);
      if (!report.ok) {
        setInspectorTab("issues");
        notify(tr("validationFailed"), "error");
        return;
      }
      setSaving(true);
      try {
        const data = await saveWorkflow(current2);
        clearDraft(data.workflow.id);
        setCurrent(data.workflow, { dirty: false });
        setWorkflows((previous) => {
          const summary = {
            id: data.workflow.id,
            name: data.workflow.name,
            description: data.workflow.description,
            updatedAt: data.workflow.updatedAt,
            nodeCount: data.workflow.nodes.length,
            edgeCount: data.workflow.edges.length
          };
          return [summary, ...previous.filter((row) => row.id !== summary.id)];
        });
        notify(tr("saved"));
      } catch (cause) {
        handleApiError(cause, setIssues, notify, tr);
      } finally {
        setSaving(false);
      }
    }, [notify, saving, setCurrent, tr]);
    const beginRun = React.useCallback(() => {
      if (!workflowRef.current) return;
      const report = validateWorkflow(workflowRef.current);
      setIssues(report.issues);
      if (!report.ok) {
        setInspectorTab("issues");
        notify(tr("validationFailed"), "error");
        return;
      }
      setRunDialogOpen(true);
    }, [notify, tr]);
    const startWorkflowRun = React.useCallback(async ({ inputs, sessionId, cwd }) => {
      const current2 = workflowRef.current;
      if (!current2) return;
      try {
        const data = await startRun({
          workflow: current2,
          inputs,
          sessionId,
          cwd,
          concurrency: current2.settings?.concurrency ?? 2
        });
        setRun(data.run);
        setEvents(data.run.events ?? []);
        lastSeqRef.current = (data.run.events ?? []).reduce((max, event) => Math.max(max, event.seq), -1);
        setRunDialogOpen(false);
        setDockOpen(true);
        setDockTab("log");
        setInspectorTab("run");
        void refreshHistory();
      } catch (cause) {
        handleApiError(cause, setIssues, notify, tr);
      }
    }, [notify, refreshHistory, tr]);
    const cancelCurrentRun = React.useCallback(async () => {
      if (!run) return;
      try {
        const data = await cancelRun(run.id);
        if (data.run) setRun(data.run);
        notify(tr("cancel"));
      } catch (cause) {
        handleApiError(cause, setIssues, notify, tr);
      }
    }, [notify, run, tr]);
    const pendingApproval = run ? Object.values(run.approvals ?? {}).find((approval) => approval.status === "pending") ?? null : null;
    const decideCurrentApproval = React.useCallback(async (decision) => {
      if (!run || !pendingApproval) return;
      try {
        const data = await decideApproval(run.id, pendingApproval.id, decision);
        if (data.run) setRun(data.run);
        notify(decision === "allow" ? tr("approvalAllow") : tr("approvalReject"), decision === "allow" ? "success" : "warn");
      } catch (cause) {
        handleApiError(cause, setIssues, notify, tr);
        throw cause;
      }
    }, [notify, pendingApproval, run, tr]);
    const rerunCurrentRun = React.useCallback(async () => {
      if (!run) return;
      try {
        const data = await rerunRun(run.id);
        if (data.run) {
          if (data.run.workflowSnapshot) loadWorkflow(data.run.workflowSnapshot);
          setRun(data.run);
          setEvents([]);
          lastSeqRef.current = -1;
          setInspectorTab("run");
          setDockOpen(true);
          notify(tr("rerunStarted"), "success");
        }
      } catch (cause) {
        handleApiError(cause, setIssues, notify, tr);
      }
    }, [loadWorkflow, notify, run, tr]);
    const openRun = React.useCallback(async (runId) => {
      try {
        const data = await getRun(runId, -1);
        if (data.run?.workflowSnapshot) loadWorkflow(data.run.workflowSnapshot);
        setRun(data.run);
        setEvents(data.events ?? []);
        lastSeqRef.current = (data.events ?? []).reduce((max, event) => Math.max(max, event.seq), -1);
        setInspectorTab("run");
        setDockOpen(true);
      } catch (cause) {
        notify(cause instanceof Error ? cause.message : String(cause), "error");
      }
    }, [loadWorkflow, notify]);
    const switchWorkflow = React.useCallback(async (id) => {
      if (!id || id === workflowRef.current?.id) return;
      if (dirty && !window.confirm(tr("confirmDiscard"))) return;
      try {
        const data = await getWorkflow(id);
        loadWorkflow(data.workflow);
      } catch (cause) {
        notify(cause instanceof Error ? cause.message : String(cause), "error");
      }
    }, [dirty, loadWorkflow, notify, tr]);
    const chooseTemplate = React.useCallback((template) => {
      if (!template) return;
      if (dirty && !window.confirm(tr("confirmDiscard"))) return;
      setTemplateOpen(false);
      loadWorkflow(template.workflow, { dirty: true });
      notify(tr("imported"));
    }, [dirty, loadWorkflow, notify, tr]);
    const loadWorkflowVersions = React.useCallback(async (id) => {
      try {
        return await listWorkflowVersions(id);
      } catch (cause) {
        notify(cause instanceof Error ? cause.message : String(cause), "error");
        return { versions: [] };
      }
    }, [notify]);
    const restoreVersion = React.useCallback(async (id, version) => {
      try {
        const data = await restoreWorkflowVersion(id, version);
        if (data.workflow) loadWorkflow(data.workflow);
        notify(tr("versionRestored"), "success");
      } catch (cause) {
        handleApiError(cause, setIssues, notify, tr);
      }
    }, [loadWorkflow, notify, tr]);
    const exportWorkflow = React.useCallback(() => {
      const current2 = workflowRef.current;
      if (!current2) return;
      const blob = new Blob([`${JSON.stringify(current2, null, 2)}
`], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${safeFileName(current2.name || "cueflow-workflow")}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      notify(tr("exported"));
    }, [notify, tr]);
    const importWorkflow = React.useCallback((parsed, cause) => {
      if (!parsed) {
        notify(cause instanceof Error ? cause.message : tr("invalidJson"), "error");
        return;
      }
      if (dirty && !window.confirm(tr("confirmDiscard"))) return;
      loadWorkflow(parsed, { dirty: true });
      notify(tr("imported"));
    }, [dirty, loadWorkflow, notify, tr]);
    const removeWorkflow = React.useCallback(async () => {
      const current2 = workflowRef.current;
      if (!current2) return;
      if (!window.confirm(tr("confirmDeleteWorkflow"))) return;
      try {
        await deleteWorkflow(current2.id);
        setWorkflows((previous) => previous.filter((row) => row.id !== current2.id));
        const blank = catalog?.templates?.find((template) => template.id === "blank") ?? catalog?.templates?.[0];
        loadWorkflow(blank?.workflow ?? emptyWorkflow(), { dirty: true });
        notify(tr("delete"));
      } catch (cause) {
        notify(cause instanceof Error ? cause.message : String(cause), "error");
      }
    }, [catalog, loadWorkflow, notify, tr]);
    const clearRun = React.useCallback(() => {
      setRun(null);
      setEvents([]);
      lastSeqRef.current = -1;
    }, []);
    React.useEffect(() => {
      const onKeyDown = (event) => {
        const target = event.target;
        const typing = target?.closest?.('input, textarea, select, [contenteditable="true"]');
        const mod = event.ctrlKey || event.metaKey;
        if (mod && event.key.toLowerCase() === "s") {
          event.preventDefault();
          void save();
          return;
        }
        if (mod && event.key === "Enter") {
          event.preventDefault();
          beginRun();
          return;
        }
        if (typing) return;
        if (mod && event.key.toLowerCase() === "z") {
          event.preventDefault();
          if (event.shiftKey) redo();
          else undo();
          return;
        }
        if (mod && event.key.toLowerCase() === "y") {
          event.preventDefault();
          redo();
          return;
        }
        if (event.key === "Escape") {
          if (runDialogOpen) setRunDialogOpen(false);
          else if (templateOpen) setTemplateOpen(false);
          return;
        }
        if (event.key === "Delete" || event.key === "Backspace") {
          if (selectedNodeId) {
            event.preventDefault();
            deleteNode(selectedNodeId);
          } else if (selectedEdgeId) {
            event.preventDefault();
            deleteEdge(selectedEdgeId);
          }
        }
      };
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }, [beginRun, deleteEdge, deleteNode, redo, runDialogOpen, save, selectedEdgeId, selectedNodeId, templateOpen, undo]);
    if (loading) {
      return /* @__PURE__ */ h("div", { className: "cue-root", "data-theme": "dark" }, /* @__PURE__ */ h("style", null, CSS), /* @__PURE__ */ h("div", { style: { margin: "auto", display: "flex", alignItems: "center", gap: 10, color: "var(--cue-muted)" } }, /* @__PURE__ */ h("span", { className: "cue-spinner" }), /* @__PURE__ */ h("span", null, tr("loading"))));
    }
    if (error && !workflow) {
      return /* @__PURE__ */ h("div", { className: "cue-root", "data-theme": "dark" }, /* @__PURE__ */ h("style", null, CSS), /* @__PURE__ */ h("div", { className: "cue-empty-state", style: { pointerEvents: "auto" } }, /* @__PURE__ */ h("div", { className: "cue-empty-title" }, tr("hostUnavailable")), /* @__PURE__ */ h("div", { className: "cue-empty-desc" }, error.message || String(error)), /* @__PURE__ */ h("div", { className: "cue-empty-actions" }, /* @__PURE__ */ h("button", { className: "cue-btn primary sm", type: "button", onClick: () => void bootstrap() }, tr("retry")))));
    }
    const current = workflow;
    const selectedNode = current?.nodes?.find((node) => node.id === selectedNodeId) ?? null;
    const running = run ? !isTerminalRun(run.status) : false;
    const errorCount = issues.filter((issue) => issue.severity === "error").length;
    const historyState = history.current;
    return /* @__PURE__ */ h("div", { className: `cue-root ${compact ? "compact" : ""} ${narrow ? "narrow" : ""}`, ref: rootRef }, /* @__PURE__ */ h("style", null, CSS), /* @__PURE__ */ h("header", { className: "cue-top" }, /* @__PURE__ */ h("div", { className: "cue-brand" }, /* @__PURE__ */ h("span", { className: "cue-brand-mark" }, /* @__PURE__ */ h(CueFlowIcon, { size: 22, active: true })), /* @__PURE__ */ h("span", { className: "cue-brand-name" }, "CueFlow"), /* @__PURE__ */ h("span", { className: "cue-brand-sub" }, tr("subtitle"))), /* @__PURE__ */ h("div", { className: "cue-sep" }), /* @__PURE__ */ h("div", { className: "cue-workflow-picker" }, /* @__PURE__ */ h(
      "select",
      {
        className: "cue-workflow-select",
        value: current?.id ?? "",
        onChange: (event) => void switchWorkflow(event.target.value),
        "aria-label": tr("workflow")
      },
      workflows.length === 0 && /* @__PURE__ */ h("option", { value: current?.id ?? "" }, current?.name ?? tr("workflow")),
      workflows.map((row) => /* @__PURE__ */ h("option", { key: row.id, value: row.id }, row.name))
    ), /* @__PURE__ */ h("span", { className: `cue-dirty ${dirty ? "is-dirty" : ""}` }, dirty ? tr("unsaved") : tr("allSaved"))), /* @__PURE__ */ h("span", { className: "cue-top-spacer" }), /* @__PURE__ */ h("div", { className: "cue-top-actions" }, /* @__PURE__ */ h(
      "button",
      {
        className: "cue-btn icon ghost cue-inspector-toggle",
        type: "button",
        title: tr("inspector"),
        "aria-pressed": inspectorOpen,
        onClick: () => {
          setInspectorPreference(!inspectorOpen);
          setTimeout(() => fitToWorkflow(), 120);
        }
      },
      /* @__PURE__ */ h(LayoutIcon, { size: 14 })
    ), /* @__PURE__ */ h("button", { className: "cue-btn icon ghost", type: "button", title: tr("undo"), disabled: !historyState.past.length, onClick: undo }, /* @__PURE__ */ h(Undo, { size: 14 })), /* @__PURE__ */ h("button", { className: "cue-btn icon ghost", type: "button", title: tr("redo"), disabled: !historyState.future.length, onClick: redo }, /* @__PURE__ */ h(Redo, { size: 14 })), /* @__PURE__ */ h("button", { className: "cue-btn outline sm", type: "button", onClick: () => setTemplateOpen(true) }, /* @__PURE__ */ h(Plus, { size: 12 }), " ", tr("newWorkflow")), /* @__PURE__ */ h("button", { className: `cue-btn outline sm ${errorCount ? "danger" : ""}`, type: "button", onClick: () => {
      setInspectorTab("issues");
      setDockOpen(true);
    } }, /* @__PURE__ */ h(Alert, { size: 12 }), " ", tr("validate"), " ", errorCount ? `(${errorCount})` : ""), /* @__PURE__ */ h("button", { className: "cue-btn outline sm", type: "button", disabled: saving, onClick: () => void save() }, saving ? /* @__PURE__ */ h("span", { className: "cue-spinner" }) : /* @__PURE__ */ h(Save, { size: 12 }), " ", saving ? tr("saving") : tr("save")), running ? /* @__PURE__ */ h("button", { className: "cue-btn danger sm", type: "button", "data-cue-action": "cancel-run", onClick: () => void cancelCurrentRun() }, /* @__PURE__ */ h(Stop, { size: 12 }), " ", tr("cancel")) : /* @__PURE__ */ h("button", { className: "cue-btn primary sm", type: "button", "data-cue-action": "run", onClick: beginRun }, /* @__PURE__ */ h(Play, { size: 12 }), " ", tr("run")))), /* @__PURE__ */ h("div", { className: "cue-body" }, /* @__PURE__ */ h(NodeLibrary, { nodeTypes: catalog.nodeTypes, categories: catalog.categories, onAdd: addNode, t: tr }), /* @__PURE__ */ h("div", { className: "cue-canvas-wrap", ref: canvasHostRef }, /* @__PURE__ */ h(
      Canvas,
      {
        workflow: current,
        catalog,
        selectedNodeId,
        selectedEdgeId,
        viewport,
        setViewport,
        run,
        onSelectNode: selectNode,
        onSelectEdge: (id) => {
          setSelectedEdgeId(id);
          setSelectedNodeId(null);
          setInspectorTab("node");
        },
        onClearSelection: () => {
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
        },
        onAddNode: addNode,
        onConnect: connect,
        onDeleteEdge: deleteEdge,
        onMoveNode: (nodeId, position) => {
          const next = clone(workflowRef.current);
          next.nodes = next.nodes.map((node) => node.id === nodeId ? { ...node, position } : node);
          setCurrent(next, { dirty: true });
        },
        onBeginNodeDrag: () => pushHistory(workflowRef.current),
        onDuplicateNode: duplicateNode,
        onToggleDisabled: toggleDisabled,
        onDeleteNode: deleteNode,
        onFit: () => fitToWorkflow(),
        t: tr
      }
    )), inspectorOpen && /* @__PURE__ */ h(
      Inspector,
      {
        workflow: current,
        catalog,
        selectedNodeId,
        selectedEdgeId,
        issues,
        run,
        events,
        runHistory,
        tab: inspectorTab,
        onTabChange: setInspectorTab,
        onUpdateWorkflow: updateWorkflow,
        onUpdateNode: updateNode,
        onUpdateConfig: updateConfig,
        onDeleteNode: deleteNode,
        onToggleDisabled: toggleDisabled,
        onDeleteEdge: deleteEdge,
        onSelectNode: (nodeId) => selectNode(nodeId, { center: true }),
        onOpenRun: openRun,
        onClearRun: clearRun,
        onCancelRun: cancelCurrentRun,
        onRerun: rerunCurrentRun,
        onDeleteWorkflow: removeWorkflow,
        onListVersions: loadWorkflowVersions,
        onRestoreVersion: restoreVersion,
        onExport: exportWorkflow,
        onImport: importWorkflow,
        onFit: () => fitToWorkflow(),
        t: tr
      }
    )), /* @__PURE__ */ h("div", { className: `cue-dock ${dockOpen ? "open" : ""}` }, /* @__PURE__ */ h("div", { className: "cue-dock-head", onClick: () => setDockOpen((value) => !value) }, /* @__PURE__ */ h(Chevron, { size: 12, style: { transform: dockOpen ? "rotate(0deg)" : "rotate(-90deg)", transition: "transform .12s ease" } }), /* @__PURE__ */ h("span", { className: "cue-dock-title" }, tr("lastRun")), run ? /* @__PURE__ */ h(StatusBadge, { status: run.status, t: tr }) : /* @__PURE__ */ h("span", { className: "cue-dock-status" }, tr("statusIdle")), /* @__PURE__ */ h("span", { className: "cue-dock-status" }, events.length, " events"), /* @__PURE__ */ h("div", { className: "cue-dock-tabs", onClick: (event) => event.stopPropagation() }, /* @__PURE__ */ h("button", { type: "button", className: `cue-tab ${dockTab === "log" ? "active" : ""}`, onClick: () => {
      setDockTab("log");
      setDockOpen(true);
    } }, tr("tabLog")), /* @__PURE__ */ h("button", { type: "button", className: `cue-tab ${dockTab === "output" ? "active" : ""}`, onClick: () => {
      setDockTab("output");
      setDockOpen(true);
    } }, tr("tabOutput"))), running && /* @__PURE__ */ h("button", { type: "button", className: "cue-btn danger sm", style: { marginLeft: "auto" }, onClick: (event) => {
      event.stopPropagation();
      void cancelCurrentRun();
    } }, tr("cancel"))), dockOpen && /* @__PURE__ */ h("div", { className: "cue-dock-body" }, dockTab === "log" ? /* @__PURE__ */ h("div", { className: "cue-log" }, events.length === 0 && /* @__PURE__ */ h("div", { className: "cue-empty-note" }, tr("logEmpty")), events.slice(-300).map((event) => /* @__PURE__ */ h("div", { className: `cue-log-row ${event.type.includes("error") ? "error" : ""}`, key: event.seq }, /* @__PURE__ */ h("span", { className: "cue-log-time" }, formatTime2(event.time)), /* @__PURE__ */ h("span", { className: "cue-log-node" }, event.nodeId ? nodeTitle(current, event.nodeId) : ""), /* @__PURE__ */ h("span", { className: "cue-log-msg" }, event.message)))) : /* @__PURE__ */ h("div", { className: "cue-output-pane" }, !run || Object.keys(run.outputs ?? {}).length === 0 ? /* @__PURE__ */ h("div", { className: "cue-empty-note" }, tr("noOutput")) : Object.entries(run.outputs).map(([id, output]) => /* @__PURE__ */ h("div", { className: "cue-output-item", key: id }, /* @__PURE__ */ h("div", { className: "cue-output-title" }, output.name || nodeTitle(current, id)), /* @__PURE__ */ h("pre", { className: "cue-output-pre" }, output.value)))), dockTab === "log" && /* @__PURE__ */ h("div", { className: "cue-output-pane" }, /* @__PURE__ */ h("div", { className: "cue-output-title" }, tr("output")), !run || Object.keys(run.outputs ?? {}).length === 0 ? /* @__PURE__ */ h("div", { className: "cue-empty-note" }, tr("noOutput")) : Object.entries(run.outputs).map(([id, output]) => /* @__PURE__ */ h("div", { className: "cue-output-item", key: id }, /* @__PURE__ */ h("div", { className: "cue-output-title" }, output.name || nodeTitle(current, id)), /* @__PURE__ */ h("pre", { className: "cue-output-pre" }, output.value)))))), /* @__PURE__ */ h(
      RunDialog,
      {
        open: runDialogOpen,
        workflow: current,
        catalog,
        onClose: () => setRunDialogOpen(false),
        onRun: startWorkflowRun,
        t: tr
      }
    ), /* @__PURE__ */ h(
      ApprovalDialog,
      {
        open: Boolean(pendingApproval),
        approval: pendingApproval,
        nodeTitle: pendingApproval ? nodeTitle(current, pendingApproval.nodeId) : "",
        onDecision: decideCurrentApproval,
        onCancelRun: () => void cancelCurrentRun(),
        t: tr
      }
    ), templateOpen && /* @__PURE__ */ h(
      TemplateDialog,
      {
        templates: catalog.templates ?? [],
        onClose: () => setTemplateOpen(false),
        onChoose: chooseTemplate,
        t: tr
      }
    ), toast && /* @__PURE__ */ h("div", { className: `cue-toast ${toast.kind}`, role: "status" }, toast.text));
  }
  function TemplateDialog({ templates, onClose, onChoose, t }) {
    React.useEffect(() => {
      const onKey = (event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);
    return /* @__PURE__ */ h("div", { className: "cue-modal-backdrop", onPointerDown: (event) => {
      if (event.target === event.currentTarget) onClose();
    } }, /* @__PURE__ */ h("div", { className: "cue-modal", role: "dialog", "aria-modal": "true", "aria-label": t("newWorkflow") }, /* @__PURE__ */ h("div", { className: "cue-modal-head" }, /* @__PURE__ */ h("div", { style: { flex: 1 } }, /* @__PURE__ */ h("h2", { className: "cue-modal-title" }, t("newWorkflow")), /* @__PURE__ */ h("p", { className: "cue-modal-sub" }, t("useTemplate"))), /* @__PURE__ */ h("button", { type: "button", className: "cue-btn icon ghost", onClick: onClose, "aria-label": t("close") }, /* @__PURE__ */ h(Close, { size: 15 }))), /* @__PURE__ */ h("div", { className: "cue-modal-body" }, /* @__PURE__ */ h("div", { className: "cue-template-grid" }, templates.map((template) => /* @__PURE__ */ h("button", { type: "button", className: "cue-template-card", key: template.id, onClick: () => onChoose(template) }, /* @__PURE__ */ h("div", { className: "cue-template-name" }, template.name), /* @__PURE__ */ h("div", { className: "cue-template-desc" }, template.description)))))));
  }
  function handleApiError(cause, setIssues, notify, t) {
    if (cause instanceof ApiError && cause.details?.issues) {
      setIssues(cause.details.issues);
    }
    const message = cause instanceof Error ? cause.message : String(cause);
    notify(message || t("runFailed"), "error");
  }
  function mergeEvents(previous, incoming) {
    const map = new Map(previous.map((event) => [event.seq, event]));
    for (const event of incoming) map.set(event.seq, event);
    return [...map.values()].sort((a, b) => a.seq - b.seq);
  }
  function nodeTitle(workflow, nodeId) {
    return workflow?.nodes?.find((node) => node.id === nodeId)?.title ?? nodeId;
  }
  function formatTime2(value) {
    if (!value) return "\u2014";
    try {
      return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "\u2014";
    }
  }
  function safeFileName(name) {
    return String(name).replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "cueflow-workflow";
  }
  function clone(value) {
    return value === void 0 ? void 0 : JSON.parse(JSON.stringify(value));
  }
  function readDraft(id) {
    try {
      const raw = localStorage.getItem(`${DRAFT_PREFIX}${id}`);
      if (!raw) return null;
      const draft = JSON.parse(raw);
      return draft && draft.workflow ? draft : null;
    } catch {
      return null;
    }
  }
  function writeDraft(workflow) {
    try {
      localStorage.setItem(`${DRAFT_PREFIX}${workflow.id}`, JSON.stringify({
        workflow,
        savedAt: Date.now()
      }));
    } catch {
    }
  }
  function clearDraft(id) {
    try {
      localStorage.removeItem(`${DRAFT_PREFIX}${id}`);
    } catch {
    }
  }
  function ensureWorkflowSummary(previous, workflow) {
    const summary = {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description ?? "",
      updatedAt: workflow.updatedAt ?? 0,
      createdAt: workflow.createdAt ?? 0,
      nodeCount: workflow.nodes?.length ?? 0,
      edgeCount: workflow.edges?.length ?? 0
    };
    if (previous.some((row) => row.id === summary.id)) {
      return previous.map((row) => row.id === summary.id ? { ...row, ...summary } : row);
    }
    return [summary, ...previous];
  }
  function emptyWorkflow() {
    return {
      schemaVersion: 1,
      id: makeId("wf"),
      name: "Untitled workflow",
      description: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      nodes: [],
      edges: [],
      settings: { ...EMPTY_SETTINGS }
    };
  }

  // src/client/locale.js
  var zh = {
    nav: "CueFlow",
    title: "CueFlow",
    subtitle: "DSH \u8282\u70B9\u753B\u5E03",
    workflow: "\u5DE5\u4F5C\u6D41",
    newWorkflow: "\u65B0\u5EFA\u5DE5\u4F5C\u6D41",
    save: "\u4FDD\u5B58",
    saving: "\u4FDD\u5B58\u4E2D\u2026",
    saved: "\u5DF2\u4FDD\u5B58",
    run: "\u8FD0\u884C",
    running: "\u8FD0\u884C\u4E2D",
    cancel: "\u53D6\u6D88\u8FD0\u884C",
    validate: "\u6821\u9A8C",
    issues: "\u95EE\u9898",
    noIssues: "\u6CA1\u6709\u95EE\u9898",
    addNode: "\u6DFB\u52A0\u8282\u70B9",
    searchNodes: "\u641C\u7D22\u8282\u70B9\u2026",
    nodeLibrary: "\u8282\u70B9\u5E93",
    emptyCanvas: "\u53CC\u51FB\u753B\u5E03\u4EFB\u610F\u4F4D\u7F6E\u6DFB\u52A0\u8282\u70B9\u3002",
    emptyCanvasHint: "\u6216\u8005\u4ECE\u53F3\u4FA7\u6A21\u677F\u5F00\u59CB\u3002",
    browseTemplates: "\u6D4F\u89C8\u6A21\u677F",
    canvas: "\u753B\u5E03",
    fit: "\u9002\u5E94\u753B\u5E03",
    zoomIn: "\u653E\u5927",
    zoomOut: "\u7F29\u5C0F",
    delete: "\u5220\u9664",
    duplicate: "\u590D\u5236",
    disable: "\u7981\u7528",
    enable: "\u542F\u7528",
    rename: "\u91CD\u547D\u540D",
    close: "\u5173\u95ED",
    back: "\u8FD4\u56DE",
    inspector: "\u68C0\u67E5\u5668",
    tabNode: "\u8282\u70B9",
    tabWorkflow: "\u5DE5\u4F5C\u6D41",
    tabRun: "\u8FD0\u884C",
    tabIssues: "\u95EE\u9898",
    tabLog: "\u65E5\u5FD7",
    tabOutput: "\u8F93\u51FA",
    config: "\u914D\u7F6E",
    ports: "\u7AEF\u53E3",
    inputPort: "\u8F93\u5165",
    outputPort: "\u8F93\u51FA",
    connected: "\u5DF2\u8FDE\u63A5",
    notConnected: "\u672A\u8FDE\u63A5",
    runDialogTitle: "\u8FD0\u884C\u5DE5\u4F5C\u6D41",
    targetSession: "\u76EE\u6807\u4F1A\u8BDD",
    workingDir: "\u5DE5\u4F5C\u76EE\u5F55",
    noInputs: "\u8FD9\u4E2A\u5DE5\u4F5C\u6D41\u6CA1\u6709 Input \u8282\u70B9\u3002",
    noLiveAgent: "\u6CA1\u6709 live \u4F1A\u8BDD\u3002Agent / Skill / Command \u8282\u70B9\u9700\u8981\u5148\u6253\u5F00\u4E00\u4E2A\u4F1A\u8BDD\u3002",
    noLiveAgentShort: "\u9700\u8981\u5148\u6253\u5F00\u4E00\u4E2A DSH \u4F1A\u8BDD",
    optional: "\u53EF\u9009",
    required: "\u5FC5\u586B",
    start: "\u5F00\u59CB\u8FD0\u884C",
    cancelRun: "\u53D6\u6D88",
    runStatus: "\u8FD0\u884C\u72B6\u6001",
    duration: "\u8017\u65F6",
    startedAt: "\u5F00\u59CB",
    endedAt: "\u7ED3\u675F",
    output: "\u8F93\u51FA",
    noOutput: "\u8FD8\u6CA1\u6709\u8F93\u51FA\u3002",
    logEmpty: "\u8FD0\u884C\u65E5\u5FD7\u4F1A\u663E\u793A\u5728\u8FD9\u91CC\u3002",
    selectNode: "\u9009\u62E9\u4E00\u4E2A\u8282\u70B9\u67E5\u770B\u914D\u7F6E\u3002",
    selectNodeHint: "\u70B9\u51FB\u753B\u5E03\u4E0A\u7684\u8282\u70B9\uFF0C\u6216\u53CC\u51FB\u7A7A\u767D\u5904\u6DFB\u52A0\u8282\u70B9\u3002",
    workflowName: "\u540D\u79F0",
    nodeTitle: "\u6807\u9898",
    enabled: "\u542F\u7528",
    workflowDescription: "\u63CF\u8FF0",
    concurrency: "\u5E76\u53D1\u8282\u70B9\u6570",
    cwd: "\u9ED8\u8BA4\u5DE5\u4F5C\u76EE\u5F55",
    exportJson: "\u5BFC\u51FA JSON",
    importJson: "\u5BFC\u5165 JSON",
    clearResults: "\u6E05\u9664\u8FD0\u884C\u7ED3\u679C",
    history: "\u8FD0\u884C\u5386\u53F2",
    noHistory: "\u8FD8\u6CA1\u6709\u8FD0\u884C\u8BB0\u5F55\u3002",
    invalidJson: "JSON \u89E3\u6790\u5931\u8D25",
    imported: "\u5DF2\u5BFC\u5165\u5DE5\u4F5C\u6D41",
    exported: "\u5DF2\u5BFC\u51FA\u5DE5\u4F5C\u6D41",
    confirmDelete: "\u5220\u9664\u8FD9\u4E2A\u8282\u70B9\uFF1F",
    confirmDeleteWorkflow: "\u5220\u9664\u8FD9\u4E2A\u5DE5\u4F5C\u6D41\uFF1F\u5386\u53F2\u8FD0\u884C\u4E0D\u4F1A\u88AB\u5220\u9664\u3002",
    unsaved: "\u672A\u4FDD\u5B58",
    allSaved: "\u5DF2\u4FDD\u5B58",
    hostUnavailable: "Host API \u4E0D\u53EF\u7528",
    retry: "\u91CD\u8BD5",
    loading: "\u52A0\u8F7D\u4E2D\u2026",
    loadFailed: "\u52A0\u8F7D\u5931\u8D25",
    saveFailed: "\u4FDD\u5B58\u5931\u8D25",
    runFailed: "\u8FD0\u884C\u5931\u8D25",
    validationFailed: "\u6821\u9A8C\u672A\u901A\u8FC7",
    connectionRejected: "\u65E0\u6CD5\u8FDE\u63A5\u8FD9\u4E24\u4E2A\u7AEF\u53E3",
    cycleRejected: "\u8FD9\u6761\u8FDE\u7EBF\u4F1A\u5F62\u6210\u73AF",
    typeRejected: "\u7AEF\u53E3\u7C7B\u578B\u4E0D\u517C\u5BB9",
    search: "\u641C\u7D22",
    noResults: "\u6CA1\u6709\u5339\u914D\u7684\u8282\u70B9\u3002",
    closeMenu: "\u5173\u95ED\u83DC\u5355",
    cueLight: "\u72B6\u6001",
    lastRun: "\u6700\u8FD1\u8FD0\u884C",
    statusIdle: "\u672A\u8FD0\u884C",
    statusQueued: "\u6392\u961F",
    statusRunning: "\u8FD0\u884C\u4E2D",
    statusSuccess: "\u6210\u529F",
    statusError: "\u9519\u8BEF",
    statusSkipped: "\u8DF3\u8FC7",
    statusCancelled: "\u5DF2\u53D6\u6D88",
    statusCompleted: "\u5DF2\u5B8C\u6210",
    statusWaitingApproval: "\u5F85\u5BA1\u6279",
    "statusWaiting-approval": "\u5F85\u5BA1\u6279",
    queuePosition: "\u961F\u5217\u4F4D\u7F6E",
    sessionMode: "\u4F1A\u8BDD\u6A21\u5F0F",
    sessionModeIsolated: "\u9694\u79BB\uFF08\u9ED8\u8BA4\uFF09",
    sessionModeInherit: "\u7EE7\u627F\u7236\u4F1A\u8BDD\u5FEB\u7167\uFF08fork\uFF09",
    sessionModeHint: "Agent/Skill \u4ECD\u5728 child session\uFF1Bworkflow/parent \u6A21\u5F0F\u9700\u540E\u7EED\u5B9E\u73B0\u3002",
    cancelPolicy: "\u53D6\u6D88\u7B56\u7565",
    cancelPolicyAbortAll: "\u7ACB\u5373\u4E2D\u6B62\u6240\u6709\u8282\u70B9",
    cancelPolicyDrain: "\u7B49\u5F85\u8FD0\u884C\u4E2D\u8282\u70B9\u5B8C\u6210\uFF08drain\uFF09",
    cancelPolicyHint: "drain \u4F1A\u505C\u6B62\u542F\u52A8\u65B0\u8282\u70B9\uFF0C\u4F46\u8BA9\u5F53\u524D\u8282\u70B9\u81EA\u7136\u5B8C\u6210\u3002",
    statusUnknown: "\u672A\u77E5",
    approvalTitle: "\u9700\u8981\u5BA1\u6279",
    approvalSub: "\u5DE5\u4F5C\u6D41\u5728\u654F\u611F\u64CD\u4F5C\u524D\u6682\u505C\u3002",
    approvalNode: "\u8282\u70B9",
    approvalAction: "\u52A8\u4F5C",
    approvalCommand: "\u547D\u4EE4",
    approvalWorkdir: "\u5DE5\u4F5C\u76EE\u5F55",
    approvalHint: "\u6279\u51C6\u53EA\u5BF9\u672C\u6B21\u64CD\u4F5C\u751F\u6548\uFF1B\u62D2\u7EDD\u4F1A\u8BA9\u8BE5\u8282\u70B9\u5931\u8D25\u3002",
    approvalAllow: "\u6279\u51C6\u4E00\u6B21",
    approvalReject: "\u62D2\u7EDD",
    approvalPending: "\u7B49\u5F85\u5BA1\u6279\u2026",
    rerunFromFailure: "\u4ECE\u5931\u8D25\u8282\u70B9\u7EE7\u7EED",
    rerunStarted: "\u5DF2\u4ECE\u5931\u8D25\u8282\u70B9\u7EE7\u7EED",
    skillUserOnly: "\u4EC5\u7528\u6237",
    skillModel: "\u6A21\u578B\u53EF\u89C1",
    skillBoth: "\u6A21\u578B/\u7528\u6237",
    clear: "\u6E05\u9664",
    format: "\u683C\u5F0F\u5316",
    copy: "\u590D\u5236",
    copied: "\u5DF2\u590D\u5236",
    unknownType: "\u672A\u77E5\u8282\u70B9\u7C7B\u578B",
    missingSkill: "\u5F53\u524D catalog \u4E2D\u6CA1\u6709\u8FD9\u4E2A Skill",
    noCommands: "\u5F53\u524D\u6CA1\u6709\u53EF\u7528\u547D\u4EE4",
    noAgents: "\u6CA1\u6709 live \u4F1A\u8BDD",
    runHint: "\u8F93\u5165\u4F1A\u5728\u672C\u6B21\u8FD0\u884C\u4E2D\u4F7F\u7528\uFF0C\u4E0D\u4F1A\u5199\u56DE\u5DE5\u4F5C\u6D41\u3002",
    openSettings: "\u6253\u5F00\u8BBE\u7F6E",
    addFirstNode: "\u6DFB\u52A0\u7B2C\u4E00\u4E2A\u8282\u70B9",
    useTemplate: "\u4ECE\u6A21\u677F\u5F00\u59CB",
    confirmDiscard: "\u5F53\u524D\u6709\u672A\u4FDD\u5B58\u4FEE\u6539\uFF0C\u786E\u5B9A\u7EE7\u7EED\uFF1F",
    zoom: "\u7F29\u653E",
    nodes: "\u8282\u70B9",
    edges: "\u8FDE\u7EBF",
    runId: "\u8FD0\u884C ID",
    session: "\u4F1A\u8BDD",
    nodeStatus: "\u8282\u70B9\u72B6\u6001",
    noSelection: "\u672A\u9009\u62E9",
    template: "\u6A21\u677F",
    blank: "\u7A7A\u767D",
    generatedAt: "\u751F\u6210\u4E8E",
    versions: "\u7248\u672C\u5386\u53F2",
    refresh: "\u5237\u65B0",
    noVersions: "\u8FD8\u6CA1\u6709\u5386\u53F2\u7248\u672C\uFF08\u4E0B\u6B21\u4FDD\u5B58\u540E\u4EA7\u751F\uFF09\u3002",
    restore: "\u6062\u590D",
    versionRestored: "\u5DF2\u6062\u590D\u5386\u53F2\u7248\u672C",
    draftRestored: "\u5DF2\u6062\u590D\u672A\u4FDD\u5B58\u7684\u8349\u7A3F\uFF08\u8BF7\u786E\u8BA4\u540E\u4FDD\u5B58\uFF09"
  };
  var en = {
    nav: "CueFlow",
    title: "CueFlow",
    subtitle: "DSH node canvas",
    workflow: "Workflow",
    newWorkflow: "New workflow",
    save: "Save",
    saving: "Saving\u2026",
    saved: "Saved",
    run: "Run",
    running: "Running",
    cancel: "Cancel run",
    validate: "Validate",
    issues: "Issues",
    noIssues: "No issues",
    addNode: "Add node",
    searchNodes: "Search nodes\u2026",
    nodeLibrary: "Nodes",
    emptyCanvas: "Double-click anywhere to add a node.",
    emptyCanvasHint: "Or start from a template.",
    browseTemplates: "Browse templates",
    canvas: "Canvas",
    fit: "Fit canvas",
    zoomIn: "Zoom in",
    zoomOut: "Zoom out",
    delete: "Delete",
    duplicate: "Duplicate",
    disable: "Disable",
    enable: "Enable",
    rename: "Rename",
    close: "Close",
    back: "Back",
    inspector: "Inspector",
    tabNode: "Node",
    tabWorkflow: "Workflow",
    tabRun: "Run",
    tabIssues: "Issues",
    tabLog: "Log",
    tabOutput: "Output",
    config: "Configuration",
    ports: "Ports",
    inputPort: "Inputs",
    outputPort: "Outputs",
    connected: "connected",
    notConnected: "not connected",
    runDialogTitle: "Run workflow",
    targetSession: "Target session",
    workingDir: "Working directory",
    noInputs: "This workflow has no Input nodes.",
    noLiveAgent: "No live session. Agent, Skill and Command nodes need an open DSH session.",
    noLiveAgentShort: "Open a DSH session first",
    optional: "optional",
    required: "required",
    start: "Start run",
    cancelRun: "Cancel",
    runStatus: "Run status",
    duration: "Duration",
    startedAt: "Started",
    endedAt: "Ended",
    output: "Output",
    noOutput: "No output yet.",
    logEmpty: "Run events will appear here.",
    selectNode: "Select a node to inspect its configuration.",
    selectNodeHint: "Click a node, or double-click empty canvas to add one.",
    workflowName: "Name",
    nodeTitle: "Title",
    enabled: "Enabled",
    workflowDescription: "Description",
    concurrency: "Concurrent nodes",
    cwd: "Default working directory",
    exportJson: "Export JSON",
    importJson: "Import JSON",
    clearResults: "Clear run results",
    history: "Run history",
    noHistory: "No runs yet.",
    invalidJson: "Could not parse JSON",
    imported: "Workflow imported",
    exported: "Workflow exported",
    confirmDelete: "Delete this node?",
    confirmDeleteWorkflow: "Delete this workflow? Run history is kept.",
    unsaved: "Unsaved",
    allSaved: "Saved",
    hostUnavailable: "Host API unavailable",
    retry: "Retry",
    loading: "Loading\u2026",
    loadFailed: "Could not load",
    saveFailed: "Could not save",
    runFailed: "Run failed",
    validationFailed: "Validation failed",
    connectionRejected: "These ports cannot connect",
    cycleRejected: "That link would create a cycle",
    typeRejected: "Port types are incompatible",
    search: "Search",
    noResults: "No matching nodes.",
    closeMenu: "Close menu",
    cueLight: "Status",
    lastRun: "Last run",
    statusIdle: "Idle",
    statusQueued: "Queued",
    statusRunning: "Running",
    statusSuccess: "Success",
    statusError: "Error",
    statusSkipped: "Skipped",
    statusCancelled: "Cancelled",
    statusCompleted: "Completed",
    statusWaitingApproval: "Needs approval",
    "statusWaiting-approval": "Needs approval",
    queuePosition: "Queue position",
    sessionMode: "Session mode",
    sessionModeIsolated: "Isolated (default)",
    sessionModeInherit: "Inherit parent snapshot (fork)",
    sessionModeHint: "Agent/Skill still run in a child session; workflow/parent modes are not implemented yet.",
    cancelPolicy: "Cancel policy",
    cancelPolicyAbortAll: "Abort all running nodes",
    cancelPolicyDrain: "Drain running nodes first",
    cancelPolicyHint: "Drain stops new nodes but lets current ones finish.",
    statusUnknown: "Unknown",
    approvalTitle: "Approval required",
    approvalSub: "The workflow paused before a sensitive action.",
    approvalNode: "Node",
    approvalAction: "Action",
    approvalCommand: "Command",
    approvalWorkdir: "Working directory",
    approvalHint: "Approval applies once; rejecting fails this node.",
    approvalAllow: "Allow once",
    approvalReject: "Reject",
    approvalPending: "Waiting for approval\u2026",
    rerunFromFailure: "Resume from failed node",
    rerunStarted: "Resumed from failed node",
    skillUserOnly: "user only",
    skillModel: "model visible",
    skillBoth: "model + user",
    clear: "Clear",
    format: "Format",
    copy: "Copy",
    copied: "Copied",
    unknownType: "Unknown node type",
    missingSkill: "That skill is not in the current catalog",
    noCommands: "No commands available",
    noAgents: "No live session",
    runHint: "Inputs apply to this run only; they are not written back to the workflow.",
    openSettings: "Open settings",
    addFirstNode: "Add the first node",
    useTemplate: "Start from a template",
    confirmDiscard: "You have unsaved changes. Continue?",
    zoom: "Zoom",
    nodes: "nodes",
    edges: "links",
    runId: "Run ID",
    session: "Session",
    nodeStatus: "Node status",
    noSelection: "No selection",
    template: "Template",
    blank: "Blank",
    generatedAt: "Generated",
    versions: "Version history",
    refresh: "Refresh",
    noVersions: "No versions yet (created on the next save).",
    restore: "Restore",
    versionRestored: "Version restored",
    draftRestored: "Recovered an unsaved draft; review and save."
  };

  // src/client/plugin.js
  var NS = "dsh-plugin-cueflow";
  function createCueflowClient(require2) {
    setReact(require2("react"));
    const inject = ["slots", "locale"];
    function apply(ctx) {
      const t = ctx.locale.bind(NS);
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "cueflow: dictionaries");
      ctx.slots.inject("sidebar.panellist", () => ctx.slots.register({
        name: "sidebar.panellist",
        id: "cueflow",
        order: 60,
        label: () => t("nav")
      }, CueFlowIcon));
      ctx.slots.inject("main", () => ctx.slots.register({
        name: "main",
        key: "cueflow",
        locale: NS
      }, (props) => h(CueFlowPanel, { ...props, t: typeof props.t === "function" ? props.t : t })));
    }
    return { inject, apply };
  }

  // src/client/entry.js
  window.__ModuleLoader__.load({
    id: "dsh-plugin-cueflow",
    factory(require2) {
      return createCueflowClient(require2);
    }
  });
})();
//# sourceMappingURL=client.js.map
