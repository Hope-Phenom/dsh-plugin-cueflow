import { Fragment, React, h } from './react.js'
import { NodeIcon, Search, More, Trash, Copy, Fit, ZoomIn, ZoomOut } from './Icons.jsx'
import { estimateNodeHeight, getInputs, getOutputs } from '../../shared/node-types.js'
import { estimatePortPosition } from '../../shared/graph.js'
import { PORT_COLORS } from '../../shared/constants.js'

const MIN_ZOOM = 0.25
const MAX_ZOOM = 2
const NODE_WIDTH = 264

export function Canvas({
  workflow,
  catalog,
  selectedNodeId,
  selectedNodeIds = [],
  selectedEdgeId,
  viewport,
  setViewport,
  run,
  onSelectNode,
  onSelectEdge,
  onClearSelection,
  onAddNode,
  onConnect,
  onMoveNode,
  onBeginNodeDrag,
  onDuplicateNode,
  onToggleDisabled,
  onDeleteNode,
  onFit,
  onAlign,
  onGroup,
  onSelectNodes,
  t,
}) {
  const containerRef = React.useRef(null)
  const nodeEls = React.useRef({})
  const [portPositions, setPortPositions] = React.useState({})
  const [palette, setPalette] = React.useState(null)
  const [menu, setMenu] = React.useState(null)
  const [panning, setPanning] = React.useState(false)
  const [linking, setLinking] = React.useState(null)
  const [dragNodeId, setDragNodeId] = React.useState(null)
  const [boxSelect, setBoxSelect] = React.useState(null)

  const propsRef = React.useRef(null)
  propsRef.current = {
    workflow, viewport, setViewport, onSelectNode, onSelectEdge, onClearSelection,
    onAddNode, onConnect, onMoveNode, onBeginNodeDrag, onSelectNodes,
  }
  const interaction = React.useRef({ pan: null, drag: null, linking: null })

  const nodeById = React.useMemo(() => new Map((workflow.nodes ?? []).map(node => [node.id, node])), [workflow.nodes])

  const screenToWorld = React.useCallback((clientX, clientY) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: (clientX - rect.left - viewport.x) / viewport.scale,
      y: (clientY - rect.top - viewport.y) / viewport.scale,
    }
  }, [viewport])

  const localScreen = React.useCallback((clientX, clientY) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: clientX - rect.left, y: clientY - rect.top }
  }, [])

  const measurePorts = React.useCallback(() => {
    const map = {}
    const scale = propsRef.current.viewport.scale
    for (const node of workflow.nodes ?? []) {
      const element = nodeEls.current[node.id]
      if (!element) continue
      const nodeRect = element.getBoundingClientRect()
      for (const dot of element.querySelectorAll('[data-port-dot]')) {
        const dotRect = dot.getBoundingClientRect()
        const direction = dot.dataset.direction
        const portId = dot.dataset.portId
        map[`${node.id}:${direction}:${portId}`] = {
          x: node.position.x + (dotRect.left - nodeRect.left) / scale + dotRect.width / (2 * scale),
          y: node.position.y + (dotRect.top - nodeRect.top) / scale + dotRect.height / (2 * scale),
        }
      }
    }
    setPortPositions(map)
  }, [workflow.nodes])

  React.useLayoutEffect(() => {
    measurePorts()
    const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(() => measurePorts()) : null
    for (const element of Object.values(nodeEls.current)) observer?.observe(element)
    window.addEventListener('resize', measurePorts)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measurePorts)
    }
  }, [measurePorts, viewport.scale, workflow.nodes])

  React.useEffect(() => {
    const onMove = event => {
      const state = interaction.current
      if (state.box) {
        const current = localScreen(event.clientX, event.clientY)
        state.box.currentX = current.x
        state.box.currentY = current.y
        setBoxSelect({
          x: Math.min(state.box.startX, current.x),
          y: Math.min(state.box.startY, current.y),
          width: Math.abs(current.x - state.box.startX),
          height: Math.abs(current.y - state.box.startY),
        })
      }
      if (state.pan) {
        const dx = event.clientX - state.pan.startX
        const dy = event.clientY - state.pan.startY
        if (Math.abs(dx) + Math.abs(dy) > 2) state.pan.moved = true
        propsRef.current.setViewport({
          x: state.pan.origin.x + dx,
          y: state.pan.origin.y + dy,
          scale: state.pan.origin.scale,
        })
      }
      if (state.drag) {
        const dx = event.clientX - state.drag.startX
        const dy = event.clientY - state.drag.startY
        if (Math.abs(dx) + Math.abs(dy) > 2) {
          state.drag.moved = true
          if (!state.drag.recorded) {
            state.drag.recorded = true
            propsRef.current.onBeginNodeDrag()
          }
        }
        const scale = propsRef.current.viewport.scale
        propsRef.current.onMoveNode(state.drag.nodeId, {
          x: Math.round(state.drag.origin.x + dx / scale),
          y: Math.round(state.drag.origin.y + dy / scale),
        })
      }
      if (state.linking) {
        const world = screenToWorld(event.clientX, event.clientY)
        const next = { ...state.linking, current: world }
        state.linking = next
        setLinking(next)
      }
    }

    const onUp = event => {
      const state = interaction.current
      if (state.box) {
        const box = state.box
        const scale = propsRef.current.viewport.scale
        const x1 = (Math.min(box.startX, box.currentX) - propsRef.current.viewport.x) / scale
        const y1 = (Math.min(box.startY, box.currentY) - propsRef.current.viewport.y) / scale
        const x2 = (Math.max(box.startX, box.currentX) - propsRef.current.viewport.x) / scale
        const y2 = (Math.max(box.startY, box.currentY) - propsRef.current.viewport.y) / scale
        const ids = Math.abs(box.currentX - box.startX) > 4 || Math.abs(box.currentY - box.startY) > 4
          ? (propsRef.current.workflow.nodes ?? [])
              .filter(node => {
                const right = node.position.x + NODE_WIDTH
                const bottom = node.position.y + estimateNodeHeight(node.type, node.config)
                return node.position.x < x2 && right > x1 && node.position.y < y2 && bottom > y1
              })
              .map(node => node.id)
          : []
        state.box = null
        setBoxSelect(null)
        propsRef.current.onSelectNodes?.(ids)
        return
      }
      if (state.pan) {
        const pan = state.pan
        state.pan = null
        setPanning(false)
        if (!pan.moved) {
          propsRef.current.onClearSelection()
          setPalette(null)
          setMenu(null)
        }
      }
      if (state.drag) {
        state.drag = null
        setDragNodeId(null)
      }
      if (state.linking) {
        const link = state.linking
        state.linking = null
        setLinking(null)
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest?.('[data-port-dot]')
        if (target) {
          const targetNode = target.dataset.nodeId
          const targetPort = target.dataset.portId
          const targetDirection = target.dataset.direction
          if (targetNode && targetPort && targetDirection && targetDirection !== link.from.direction) {
            const from = link.from.direction === 'out'
              ? { node: link.from.node, port: link.from.port }
              : { node: targetNode, port: targetPort }
            const to = link.from.direction === 'in'
              ? { node: link.from.node, port: link.from.port }
              : { node: targetNode, port: targetPort }
            propsRef.current.onConnect(from, to)
          }
        }
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [screenToWorld])

  React.useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const onWheel = event => {
      event.preventDefault()
      const rect = element.getBoundingClientRect()
      const current = propsRef.current.viewport
      const nextScale = clamp(current.scale * Math.exp(-event.deltaY * 0.0012), MIN_ZOOM, MAX_ZOOM)
      if (Math.abs(nextScale - current.scale) < 0.001) return
      const px = event.clientX - rect.left
      const py = event.clientY - rect.top
      const worldX = (px - current.x) / current.scale
      const worldY = (py - current.y) / current.scale
      propsRef.current.setViewport({
        x: px - worldX * nextScale,
        y: py - worldY * nextScale,
        scale: nextScale,
      })
    }
    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [])

  const zoomBy = (factor, anchor) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const px = anchor?.x ?? rect.width / 2
    const py = anchor?.y ?? rect.height / 2
    const nextScale = clamp(viewport.scale * factor, MIN_ZOOM, MAX_ZOOM)
    const worldX = (px - viewport.x) / viewport.scale
    const worldY = (py - viewport.y) / viewport.scale
    setViewport({ x: px - worldX * nextScale, y: py - worldY * nextScale, scale: nextScale })
  }

  const openPalette = (clientX, clientY) => {
    const screen = localScreen(clientX, clientY)
    setPalette({ ...screen, world: screenToWorld(clientX, clientY) })
    setMenu(null)
  }

  const onCanvasPointerDown = event => {
    if (event.button !== 0 && event.button !== 1) return
    if (event.target.closest?.('.cue-node, .cue-palette, .cue-menu, .cue-canvas-controls, .cue-align-toolbar')) return
    setPalette(null)
    setMenu(null)
    if (event.shiftKey && event.button === 0) {
      const start = localScreen(event.clientX, event.clientY)
      interaction.current.box = { startX: start.x, startY: start.y, currentX: start.x, currentY: start.y }
      setBoxSelect({ x: start.x, y: start.y, width: 0, height: 0 })
      return
    }
    interaction.current.pan = {
      startX: event.clientX,
      startY: event.clientY,
      origin: { ...viewport },
      moved: false,
    }
    setPanning(true)
  }

  const onNodePointerDown = (event, node) => {
    if (event.button !== 0) return
    event.stopPropagation()
    propsRef.current.onSelectNode(node.id)
    interaction.current.drag = {
      nodeId: node.id,
      startX: event.clientX,
      startY: event.clientY,
      origin: { ...node.position },
      moved: false,
      recorded: false,
    }
    setDragNodeId(node.id)
  }

  const onPortPointerDown = (event, node, port, direction) => {
    if (event.button !== 0) return
    event.stopPropagation()
    event.preventDefault()
    const key = `${node.id}:${direction}:${port.id}`
    const start = portPositions[key] ?? estimatePortPosition(node, port.id, direction)
    const next = {
      from: { node: node.id, port: port.id, direction },
      start: { x: start.x, y: start.y },
      current: { x: start.x, y: start.y },
    }
    interaction.current.linking = next
    setLinking(next)
    setPalette(null)
    setMenu(null)
  }

  const onNodeContextMenu = (event, node) => {
    event.preventDefault()
    event.stopPropagation()
    propsRef.current.onSelectNode(node.id)
    const screen = localScreen(event.clientX, event.clientY)
    setMenu({ ...screen, nodeId: node.id })
    setPalette(null)
  }

  const edgePath = (edge) => {
    const fromNode = nodeById.get(edge.from?.node)
    const toNode = nodeById.get(edge.to?.node)
    if (!fromNode || !toNode) return ''
    const from = portPositions[`${fromNode.id}:out:${edge.from.port}`]
      ?? estimatePortPosition(fromNode, edge.from.port, 'out')
    const to = portPositions[`${toNode.id}:in:${edge.to.port}`]
      ?? estimatePortPosition(toNode, edge.to.port, 'in')
    return pathFor(from, to)
  }

  const linkStart = linking?.start ?? { x: 0, y: 0 }
  const linkEnd = linking?.current ?? linkStart
  const linkingDirection = linking?.from?.direction
  const linkingPath = linking
    ? pathFor(linkingDirection === 'out' ? linkStart : linkEnd, linkingDirection === 'out' ? linkEnd : linkStart)
    : ''

  const empty = (workflow.nodes ?? []).length === 0
  const runIsRunning = run?.status === 'running' || run?.status === 'queued'

  return (
    <section
      className={`cue-canvas ${panning ? 'is-panning' : ''}`}
      ref={containerRef}
      style={{
        '--cue-zoom': viewport.scale,
        '--cue-pan-x': `${viewport.x}px`,
        '--cue-pan-y': `${viewport.y}px`,
      }}
      onPointerDown={onCanvasPointerDown}
      onDoubleClick={event => {
        if (event.target.closest?.('.cue-node, .cue-palette, .cue-menu')) return
        openPalette(event.clientX, event.clientY)
      }}
      onContextMenu={event => {
        if (event.target.closest?.('.cue-node, .cue-palette, .cue-menu')) return
        event.preventDefault()
        openPalette(event.clientX, event.clientY)
      }}
      onDragOver={event => {
        if (event.dataTransfer?.types?.includes('application/x-cueflow-node')) {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
        }
      }}
      onDrop={event => {
        const type = event.dataTransfer?.getData('application/x-cueflow-node')
        if (!type) return
        event.preventDefault()
        const world = screenToWorld(event.clientX, event.clientY)
        onAddNode(type, { x: world.x - NODE_WIDTH / 2, y: world.y - 40 })
      }}
      aria-label={t('canvas')}
    >
      {boxSelect && (
        <div
          className="cue-box-select"
          style={{ left: boxSelect.x, top: boxSelect.y, width: boxSelect.width, height: boxSelect.height }}
        />
      )}
      {selectedNodeIds.length > 1 && (
        <div className="cue-align-toolbar" data-cue-action="align-toolbar">
          <span className="cue-align-label">{selectedNodeIds.length} selected</span>
          <button
            type="button"
            className="cue-btn ghost sm"
            data-cue-action="group-selection"
            onClick={event => {
              event.stopPropagation()
              onGroup?.()
            }}
          >
            {t('groupSelection')}
          </button>
          {[
            ['left', t('alignLeft')],
            ['top', t('alignTop')],
            ['right', t('alignRight')],
            ['bottom', t('alignBottom')],
          ].map(([mode, label]) => (
            <button
              type="button"
              className="cue-btn ghost sm"
              key={mode}
              data-cue-action={`align-${mode}`}
              onClick={event => {
                event.stopPropagation()
                onAlign?.(mode)
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div
        className="cue-world"
        style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})` }}
      >
        <svg className="cue-links" aria-hidden="true">
          {(workflow.edges ?? []).map(edge => {
            const source = nodeById.get(edge.from?.node)
            const sourcePort = source ? getOutputs(source.type, source.config).find(port => port.id === edge.from.port) : null
            const color = PORT_COLORS[sourcePort?.type] ?? PORT_COLORS.any
            const selected = edge.id === selectedEdgeId
            return (
              <g key={edge.id}>
                <path
                  className="cue-link-hit"
                  d={edgePath(edge)}
                  onPointerDown={event => {
                    event.stopPropagation()
                    onSelectEdge(edge.id)
                  }}
                />
                <path
                  className={`cue-link${selected ? ' selected' : ''}${runIsRunning ? ' running' : ''}`}
                  d={edgePath(edge)}
                  style={{ stroke: color }}
                />
              </g>
            )
          })}
          {linking && (
            <path
              className="cue-link"
              d={linkingPath}
              style={{ stroke: 'var(--cue-amber)', strokeDasharray: '5 5', opacity: .85 }}
            />
          )}
        </svg>

        {(workflow.nodes ?? []).map(node => {
          const def = catalog.nodeTypes.find(type => type.type === node.type)
          const state = run?.nodeStates?.[node.id]
          const inputs = def ? getInputs(node.type, node.config) : []
          const outputs = def ? getOutputs(node.type, node.config) : []
          const connectedIn = new Set((workflow.edges ?? []).filter(edge => edge.to?.node === node.id).map(edge => edge.to.port))
          const connectedOut = new Set((workflow.edges ?? []).filter(edge => edge.from?.node === node.id).map(edge => edge.from.port))
          return (
            <NodeCard
              key={node.id}
              node={node}
              def={def}
              inputs={inputs}
              outputs={outputs}
              connectedIn={connectedIn}
              connectedOut={connectedOut}
              selected={selectedNodeIds.length ? selectedNodeIds.includes(node.id) : node.id === selectedNodeId}
              status={state?.status ?? 'idle'}
              preview={state?.preview ?? ''}
              error={state?.error ?? null}
              runStatus={run?.status}
              dragging={dragNodeId === node.id}
              nodeRef={element => {
                if (element) nodeEls.current[node.id] = element
                else delete nodeEls.current[node.id]
              }}
              onPointerDown={event => onNodePointerDown(event, node)}
              onPortPointerDown={onPortPointerDown}
              onContextMenu={event => onNodeContextMenu(event, node)}
              onSelect={event => onSelectNode(node.id, { additive: event.shiftKey || event.ctrlKey || event.metaKey })}
              t={t}
            />
          )
        })}
      </div>

      {empty && (
        <div className="cue-empty-state">
          <div className="cue-empty-title">{t('emptyCanvas')}</div>
          <div className="cue-empty-desc">{t('emptyCanvasHint')}</div>
          <div className="cue-empty-actions">
            <button className="cue-btn primary sm" type="button" onClick={() => onAddNode('input')}>{t('addFirstNode')}</button>
            <button className="cue-btn outline sm" type="button" onClick={() => openPalette(
              (containerRef.current?.getBoundingClientRect().left ?? 0) + 80,
              (containerRef.current?.getBoundingClientRect().top ?? 0) + 120,
            )}>{t('addNode')}</button>
          </div>
        </div>
      )}

      <div className="cue-canvas-hint">
        <span className="dot" />
        <span>{t('canvas')}</span>
        <span>·</span>
        <span>{(workflow.nodes ?? []).length} {t('nodes')}</span>
        <span>·</span>
        <span>{(workflow.edges ?? []).length} {t('edges')}</span>
      </div>

      <div className="cue-canvas-controls">
        <button className="cue-btn icon sm" type="button" title={t('zoomOut')} aria-label={t('zoomOut')} onClick={() => zoomBy(1 / 1.15)}><ZoomOut size={14} /></button>
        <span className="cue-zoom-label">{Math.round(viewport.scale * 100)}%</span>
        <button className="cue-btn icon sm" type="button" title={t('zoomIn')} aria-label={t('zoomIn')} onClick={() => zoomBy(1.15)}><ZoomIn size={14} /></button>
        <button className="cue-btn icon sm" type="button" title={t('fit')} aria-label={t('fit')} onClick={onFit}><Fit size={14} /></button>
      </div>

      {palette && (
        <NodeSearch
          x={palette.x}
          y={palette.y}
          nodeTypes={catalog.nodeTypes}
          categories={catalog.categories}
          onPick={type => {
            onAddNode(type, { x: palette.world.x, y: palette.world.y })
            setPalette(null)
          }}
          onClose={() => setPalette(null)}
          t={t}
        />
      )}

      {menu && (
        <NodeMenu
          x={menu.x}
          y={menu.y}
          nodeId={menu.nodeId}
          onClose={() => setMenu(null)}
          onDuplicate={() => { onDuplicateNode(menu.nodeId); setMenu(null) }}
          onToggleDisabled={() => { onToggleDisabled(menu.nodeId); setMenu(null) }}
          onDelete={() => { onDeleteNode(menu.nodeId); setMenu(null) }}
          t={t}
        />
      )}
    </section>
  )
}

function NodeCard({
  node, def, inputs, outputs, connectedIn, connectedOut, selected, status, preview, error,
  runStatus, dragging, nodeRef, onPointerDown, onPortPointerDown, onContextMenu, onSelect, t,
}) {
  const accent = categoryColor(def?.category)
  const disabled = node.disabled
  const isNote = node.type === 'note'
  const isGroup = node.type === 'group'
  const statusClass = disabled ? 'skipped' : status
  const title = node.title || def?.title || node.type
  const summary = summarize(node, def)
  return (
    <div
      ref={nodeRef}
      className={[
        'cue-node',
        isGroup ? 'cue-group-node' : '',
        selected ? 'selected' : '',
        statusClass === 'error' ? 'has-error' : '',
        statusClass === 'running' ? 'is-running' : '',
        statusClass === 'waiting-approval' ? 'is-waiting-approval' : '',
        disabled ? 'is-disabled' : '',
        dragging ? 'is-dragging' : '',
      ].filter(Boolean).join(' ')}
      data-type={node.type}
      style={{
        left: node.position.x,
        top: node.position.y,
        '--cue-node-accent': accent,
        ...(isGroup ? {
          width: Math.max(240, Number(node.config?.width) || 640),
          height: Math.max(140, Number(node.config?.height) || 360),
          zIndex: 0,
        } : {}),
      }}
      onPointerDown={event => {
        if (event.target.closest?.('.cue-dot, .cue-node-head-btn')) return
        event.stopPropagation()
        onSelect(event)
      }}
      onContextMenu={onContextMenu}
    >
      <span className="cue-node-rail" />
      <div className="cue-node-head" onPointerDown={onPointerDown} title={title}>
        <span className={`cue-cue-light ${statusClass}`} title={t(`status${capitalize(statusClass)}`)} />
        <span className="cue-node-head-icon" style={{ color: accent }}>
          <NodeIcon type={node.type} size={14} />
        </span>
        <span className="cue-node-title">{title}</span>
        <span className="cue-node-type">{node.type}</span>
        <button
          type="button"
          className="cue-node-head-btn"
          aria-label={t('closeMenu')}
          onClick={event => {
            event.stopPropagation()
            onContextMenu(event)
          }}
        >
          <More size={13} />
        </button>
      </div>
      <div className="cue-node-body">
        {isGroup ? (
          <div className="cue-group-text">{node.config?.label || 'Group'}</div>
        ) : isNote ? (
          <div className="cue-note-text">{node.config?.text || '…'}</div>
        ) : (
          <>
            <div className="cue-ports">
              <div className="cue-port-list">
                {inputs.map(port => (
                  <div className="cue-port in" key={port.id}>
                    <button
                      type="button"
                      className={`cue-dot in ${connectedIn.has(port.id) ? 'connected' : ''}`}
                      data-port-dot
                      data-node-id={node.id}
                      data-port-id={port.id}
                      data-direction="in"
                      style={{ '--cue-port-color': PORT_COLORS[port.type] ?? PORT_COLORS.any }}
                      title={`${port.label} · ${port.type}`}
                      aria-label={`${port.label} input`}
                      onPointerDown={event => onPortPointerDown(event, node, port, 'in')}
                    />
                    <span className="cue-port-label">{port.label}</span>
                    {port.required && <span className="cue-port-required">*</span>}
                    <span className="cue-port-type">{port.type}</span>
                  </div>
                ))}
              </div>
              <div className="cue-port-list out">
                {outputs.map(port => (
                  <div className="cue-port out" key={port.id}>
                    <span className="cue-port-type">{port.type}</span>
                    <span className="cue-port-label">{port.label}</span>
                    <button
                      type="button"
                      className={`cue-dot out ${connectedOut.has(port.id) ? 'connected' : ''}`}
                      data-port-dot
                      data-node-id={node.id}
                      data-port-id={port.id}
                      data-direction="out"
                      style={{ '--cue-port-color': PORT_COLORS[port.type] ?? PORT_COLORS.any }}
                      title={`${port.label} · ${port.type}`}
                      aria-label={`${port.label} output`}
                      onPointerDown={event => onPortPointerDown(event, node, port, 'out')}
                    />
                  </div>
                ))}
              </div>
            </div>
            {summary && <div className="cue-node-summary">{summary}</div>}
            {error && <div className="cue-node-error">{error.message || String(error)}</div>}
            {!error && preview && <div className="cue-node-preview">{preview}</div>}
            {disabled && <div className="cue-node-summary" style={{ color: 'var(--cue-faint)' }}>disabled</div>}
            {runStatus === 'running' && status === 'running' && (
              <div className="cue-node-summary" style={{ color: 'var(--cue-amber)' }}>running…</div>
            )}
            {status === 'waiting-approval' && (
              <div className="cue-node-summary" style={{ color: 'var(--cue-orange)' }}>{t('statusWaitingApproval')}…</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function NodeSearch({ x, y, nodeTypes, categories, onPick, onClose, t }) {
  const [query, setQuery] = React.useState('')
  const [active, setActive] = React.useState(0)
  const inputRef = React.useRef(null)

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    return nodeTypes.filter(type => !q || `${type.title} ${type.type} ${type.description}`.toLowerCase().includes(q))
  }, [nodeTypes, query])

  React.useEffect(() => {
    inputRef.current?.focus()
  }, [])

  React.useEffect(() => {
    setActive(0)
  }, [query])

  const onKeyDown = event => {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive(value => Math.min(filtered.length - 1, value + 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(value => Math.max(0, value - 1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const item = filtered[active]
      if (item) onPick(item.type)
    }
  }

  return (
    <div
      className="cue-palette"
      style={{ left: Math.max(8, x), top: Math.max(8, y) }}
      onPointerDown={event => event.stopPropagation()}
      onContextMenu={event => event.stopPropagation()}
      role="dialog"
      aria-label={t('addNode')}
    >
      <div className="cue-palette-head">
        <div className="cue-inline" style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 9, top: 7, color: 'var(--cue-faint)', display: 'flex' }}><Search size={13} /></span>
          <input
            ref={inputRef}
            className="cue-input"
            value={query}
            placeholder={t('searchNodes')}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            style={{ paddingLeft: 28 }}
            aria-label={t('searchNodes')}
          />
        </div>
      </div>
      <div className="cue-palette-list">
        {filtered.length === 0 && <div className="cue-palette-empty">{t('noResults')}</div>}
        {filtered.map((type, index) => {
          const category = categories.find(item => item.id === type.category)
          return (
            <button
              type="button"
              key={type.type}
              className={`cue-palette-item ${index === active ? 'active' : ''}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => onPick(type.type)}
            >
              <span className="cue-library-icon" style={{ color: category?.color ?? 'var(--cue-amber)' }}>
                <NodeIcon type={type.type} size={14} />
              </span>
              <span className="cue-palette-item-text">
                <span className="cue-palette-item-label">{type.title}<span className="cue-node-type" style={{ marginLeft: 6 }}>{type.type}</span></span>
                <span className="cue-palette-item-desc">{type.description}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function NodeMenu({ x, y, nodeId, onDuplicate, onToggleDisabled, onDelete, onClose, t }) {
  React.useEffect(() => {
    const close = event => {
      if (!event.target.closest?.('.cue-menu')) onClose()
    }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [onClose])
  return (
    <div
      className="cue-menu"
      style={{ left: Math.max(8, x), top: Math.max(8, y) }}
      onPointerDown={event => event.stopPropagation()}
      role="menu"
      data-node-id={nodeId}
    >
      <button type="button" className="cue-menu-item" onClick={onDuplicate}><Copy size={13} />{t('duplicate')}</button>
      <button type="button" className="cue-menu-item" onClick={onToggleDisabled}>{t('disable')} / {t('enable')}</button>
      <div className="cue-menu-sep" />
      <button type="button" className="cue-menu-item danger" onClick={onDelete}><Trash size={13} />{t('delete')}</button>
    </div>
  )
}

function pathFor(from, to) {
  const dx = Math.max(40, Math.abs(to.x - from.x) * 0.5)
  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`
}

function summarize(node, def) {
  const config = node.config ?? {}
  switch (node.type) {
    case 'input':
      return `${config.label || 'Input'} · ${config.valueType || 'text'}${config.required === false ? ' · optional' : ''}`
    case 'template':
      return (config.template || '').split('\n')[0].slice(0, 80) || 'no template'
    case 'agent':
      return config.model ? `model: ${config.model}` : (config.prompt || '').split('\n')[0].slice(0, 80) || 'prompt from input'
    case 'skill':
      return config.skill ? `skill: ${config.skill}` : 'no skill selected'
    case 'command':
      return config.command ? `/${config.command}` : 'no command selected'
    case 'shell':
      return (config.command || '').split('\n')[0].slice(0, 90) || 'no command'
    case 'file-read':
      return config.path || 'no path'
    case 'condition':
      return `${config.operator || 'truthy'}${config.compare ? ` → ${config.compare}` : ''}`
    case 'merge':
      return config.mode || 'first'
    case 'output':
      return `${config.name || 'Output'} · ${config.format || 'text'}`
    default:
      return def?.description?.slice(0, 80) || ''
  }
}

function categoryColor(category) {
  return {
    io: 'var(--cue-amber)',
    transform: 'var(--cue-cyan)',
    agents: 'var(--cue-violet)',
    dsh: 'var(--cue-orange)',
    exec: 'var(--cue-green)',
    control: 'var(--cue-orange)',
    note: 'var(--cue-faint)',
  }[category] ?? 'var(--cue-amber)'
}

function capitalize(value) {
  return String(value || '').charAt(0).toUpperCase() + String(value || '').slice(1)
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
