/**
 * All CueFlow CSS. Injected once by the panel. Colors prefer DSH tokens and
 * fall back to CueFlow's own drafting-table palette.
 */

export const CSS = String.raw`
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
.cue-align-toolbar {
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 5px 8px;
  border: 1px solid var(--cue-border);
  border-radius: 8px;
  background: color-mix(in srgb, var(--cue-panel) 92%, transparent);
  box-shadow: var(--cue-shadow);
  backdrop-filter: blur(8px);
}
.cue-align-label { font-size: 10px; color: var(--cue-faint); margin-right: 4px; white-space: nowrap; }
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
`
