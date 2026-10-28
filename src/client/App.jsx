import { React, h } from './react.js'
import { CSS } from './styles.js'
import {
  ApiError, cancelRun, decideApproval, deleteWorkflow, getCatalog, getRun, getWorkflow,
  listRuns, listWorkflows, rerunRun, saveWorkflow, startRun,
} from './api.js'
import { createNode, estimateNodeHeight } from '../../shared/node-types.js'
import { canConnect } from '../../shared/graph.js'
import { normalizeWorkflow, validateWorkflow } from '../../shared/validation.js'
import { DEFAULT_WORKFLOW_SETTINGS, isTerminalRun, makeId } from '../../shared/constants.js'
import { NodeLibrary } from './NodeLibrary.jsx'
import { Canvas } from './Canvas.jsx'
import { Inspector, StatusBadge } from './Inspector.jsx'
import { RunDialog } from './RunDialog.jsx'
import { ApprovalDialog } from './ApprovalDialog.jsx'
import { CueFlowIcon, Alert, Check, Chevron, Close, Copy, Download, Fit, LayoutIcon, Play, Plus, Redo, Save, Stop, Trash, Undo } from './Icons.jsx'

const EMPTY_SETTINGS = { ...DEFAULT_WORKFLOW_SETTINGS }

export function CueFlowPanel({ t }) {
  const tr = React.useCallback((key, values) => (typeof t === 'function' ? t(key, values) : key), [t])
  const [catalog, setCatalog] = React.useState(null)
  const [workflows, setWorkflows] = React.useState([])
  const [workflow, setWorkflow] = React.useState(null)
  const workflowRef = React.useRef(null)
  const [dirty, setDirty] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState(null)
  const [issues, setIssues] = React.useState([])
  const [selectedNodeId, setSelectedNodeId] = React.useState(null)
  const [selectedEdgeId, setSelectedEdgeId] = React.useState(null)
  const [inspectorTab, setInspectorTab] = React.useState('node')
  const [panelWidth, setPanelWidth] = React.useState(1200)
  const [inspectorPreference, setInspectorPreference] = React.useState(null)
  const rootRef = React.useRef(null)
  const compact = panelWidth < 1250
  const narrow = panelWidth < 1000
  const inspectorOpen = inspectorPreference === null ? !narrow : inspectorPreference
  const [viewport, setViewport] = React.useState({ x: 80, y: 80, scale: 1 })
  const [run, setRun] = React.useState(null)
  const [events, setEvents] = React.useState([])
  const [runHistory, setRunHistory] = React.useState([])
  const [runDialogOpen, setRunDialogOpen] = React.useState(false)
  const [templateOpen, setTemplateOpen] = React.useState(false)
  const [dockOpen, setDockOpen] = React.useState(false)
  const [dockTab, setDockTab] = React.useState('log')
  const [toast, setToast] = React.useState(null)
  const [saving, setSaving] = React.useState(false)
  const [historyVersion, setHistoryVersion] = React.useState(0)
  const history = React.useRef({ past: [], future: [] })
  const configEditRef = React.useRef({ nodeId: '', key: '', at: 0 })
  const lastSeqRef = React.useRef(-1)
  const canvasHostRef = React.useRef(null)

  const notify = React.useCallback((text, kind = '') => {
    setToast({ text, kind, id: Date.now() })
  }, [])

  React.useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 4200)
    return () => clearTimeout(timer)
  }, [toast])

  const setCurrent = React.useCallback((next, { dirty: nextDirty = true, validate: shouldValidate = true } = {}) => {
    workflowRef.current = next
    setWorkflow(next)
    setDirty(nextDirty)
    if (shouldValidate) setIssues(validateWorkflow(next).issues)
  }, [])

  const pushHistory = React.useCallback(snapshot => {
    const past = history.current.past
    past.push(clone(snapshot))
    if (past.length > 50) past.shift()
    history.current.future = []
    setHistoryVersion(value => value + 1)
  }, [])

  const fitToWorkflow = React.useCallback(target => {
    const wf = target ?? workflowRef.current
    const host = canvasHostRef.current
    if (!wf) return
    if (!host) return
    const nodes = wf.nodes ?? []
    if (nodes.length === 0) {
      setViewport({ x: 80, y: 80, scale: 1 })
      return
    }
    const minX = Math.min(...nodes.map(node => node.position.x))
    const minY = Math.min(...nodes.map(node => node.position.y))
    const maxX = Math.max(...nodes.map(node => node.position.x + 264))
    const maxY = Math.max(...nodes.map(node => node.position.y + estimateNodeHeight(node.type, node.config)))
    const width = Math.max(1, host.clientWidth)
    const height = Math.max(1, host.clientHeight)
    const pad = 64
    const scale = Math.max(0.6, Math.min(1.15, Math.min((width - pad * 2) / Math.max(1, maxX - minX), (height - pad * 2) / Math.max(1, maxY - minY))))
    setViewport({
      x: (width - (maxX - minX) * scale) / 2 - minX * scale,
      y: (height - (maxY - minY) * scale) / 2 - minY * scale,
      scale,
    })
  }, [])

  const centerOnNode = React.useCallback(nodeId => {
    const node = workflowRef.current?.nodes?.find(item => item.id === nodeId)
    const host = canvasHostRef.current
    if (!node || !host) return
    setViewport(current => ({
      x: host.clientWidth / 2 - (node.position.x + 132) * current.scale,
      y: host.clientHeight / 2 - (node.position.y + 70) * current.scale,
      scale: current.scale,
    }))
  }, [])

  const loadWorkflow = React.useCallback((wf, { dirty: nextDirty = false } = {}) => {
    const normalized = normalizeWorkflow(clone(wf))
    setWorkflows(previous => ensureWorkflowSummary(previous, normalized))
    setCurrent(normalized, { dirty: nextDirty })
    setSelectedNodeId(normalized.nodes?.[0]?.id ?? null)
    setSelectedEdgeId(null)
    setRun(null)
    setEvents([])
    setDockOpen(false)
    setInspectorTab('node')
    lastSeqRef.current = -1
    history.current = { past: [], future: [] }
    setHistoryVersion(value => value + 1)
    setTimeout(() => fitToWorkflow(normalized), 60)
  }, [setCurrent, fitToWorkflow])

  const refreshHistory = React.useCallback(async () => {
    try {
      const data = await listRuns(20)
      setRunHistory(data.runs ?? [])
      return data
    } catch {
      /* history is non-critical */
      return null
    }
  }, [])

  const bootstrap = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cat, list] = await Promise.all([getCatalog(), listWorkflows()])
      setCatalog(cat)
      setWorkflows(list.workflows ?? [])
      let initial = null
      if (list.workflows?.length) {
        const first = await getWorkflow(list.workflows[0].id)
        initial = first.workflow
      } else {
        const blank = cat.templates?.find(template => template.id === 'blank') ?? cat.templates?.[0]
        initial = blank?.workflow ?? emptyWorkflow()
      }
      loadWorkflow(initial)
      const history = await refreshHistory()
      const active = history?.runs?.find(row => row.status === 'running' || row.status === 'queued')
      if (active) {
        const data = await getRun(active.id, -1)
        if (data.run && (data.run.status === 'running' || data.run.status === 'queued')) {
          if (data.run.workflowSnapshot) loadWorkflow(data.run.workflowSnapshot)
          setRun(data.run)
          setEvents(data.events ?? [])
          lastSeqRef.current = (data.events ?? []).reduce((max, event) => Math.max(max, event.seq), -1)
          setDockOpen(true)
          setInspectorTab('run')
        }
      }
    } catch (cause) {
      setError(cause)
    } finally {
      setLoading(false)
    }
  }, [loadWorkflow, refreshHistory])

  React.useEffect(() => {
    void bootstrap()
  }, [bootstrap])

  React.useEffect(() => {
    if (!run || isTerminalRun(run.status)) return
    let cancelled = false
    let timer = null
    const tick = async () => {
      if (cancelled) return
      try {
        const data = await getRun(run.id, lastSeqRef.current)
        if (cancelled) return
        setRun(data.run)
        if (data.events?.length) {
          setEvents(previous => mergeEvents(previous, data.events))
          lastSeqRef.current = Math.max(lastSeqRef.current, ...data.events.map(event => event.seq))
        }
        if (isTerminalRun(data.run.status)) {
          void refreshHistory()
          return
        }
      } catch (cause) {
        notify(cause instanceof Error ? cause.message : String(cause), 'error')
      }
      timer = setTimeout(tick, 600)
    }
    timer = setTimeout(tick, 600)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [run?.id, run?.status, notify, refreshHistory])

  React.useEffect(() => {
    const element = rootRef.current
    if (!element || typeof ResizeObserver !== 'function') return
    const observer = new ResizeObserver(entries => {
      const width = entries[0]?.contentRect?.width
      if (Number.isFinite(width) && width > 0) setPanelWidth(width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [loading])

  React.useEffect(() => {
    if (!workflowRef.current) return
    const timer = setTimeout(() => fitToWorkflow(), 160)
    return () => clearTimeout(timer)
  }, [panelWidth, fitToWorkflow])

  React.useEffect(() => {
    if (!dirty) return
    const handler = event => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const applyChange = React.useCallback((mutator, { record = true, validate: shouldValidate = true } = {}) => {
    const previous = workflowRef.current
    if (!previous) return null
    const next = mutator(clone(previous))
    if (record) pushHistory(previous)
    setCurrent(next, { dirty: true, validate: shouldValidate })
    return next
  }, [pushHistory, setCurrent])

  const undo = React.useCallback(() => {
    const entry = history.current.past.pop()
    if (!entry) return
    history.current.future.push(clone(workflowRef.current))
    setCurrent(entry, { dirty: true })
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setHistoryVersion(value => value + 1)
  }, [setCurrent])

  const redo = React.useCallback(() => {
    const entry = history.current.future.pop()
    if (!entry) return
    history.current.past.push(clone(workflowRef.current))
    setCurrent(entry, { dirty: true })
    setSelectedNodeId(null)
    setSelectedEdgeId(null)
    setHistoryVersion(value => value + 1)
  }, [setCurrent])

  const selectNode = React.useCallback((nodeId, { center = false } = {}) => {
    setSelectedNodeId(nodeId)
    setSelectedEdgeId(null)
    setInspectorTab('node')
    if (center) centerOnNode(nodeId)
  }, [centerOnNode])

  const addNode = React.useCallback((type, position) => {
    const host = canvasHostRef.current
    let point = position
    if (!point) {
      const rect = host?.getBoundingClientRect()
      point = {
        x: rect ? (rect.width / 2 - viewport.x) / viewport.scale - 132 : 120,
        y: rect ? (rect.height / 2 - viewport.y) / viewport.scale - 70 : 120,
      }
    }
    let node
    try {
      node = createNode(type, { position: point })
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : String(cause), 'error')
      return
    }
    applyChange(current => ({ ...current, nodes: [...current.nodes, node] }))
    setSelectedNodeId(node.id)
    setSelectedEdgeId(null)
    setInspectorTab('node')
  }, [applyChange, notify, viewport])

  const updateNode = React.useCallback((nodeId, patch) => {
    applyChange(current => ({
      ...current,
      nodes: current.nodes.map(node => (node.id === nodeId ? { ...node, ...patch } : node)),
    }))
  }, [applyChange])

  const updateConfig = React.useCallback((nodeId, key, value) => {
    const now = Date.now()
    const last = configEditRef.current
    const record = last.nodeId !== nodeId || last.key !== key || now - last.at > 800
    configEditRef.current = { nodeId, key, at: now }
    applyChange(current => ({
      ...current,
      nodes: current.nodes.map(node => (
        node.id === nodeId ? { ...node, config: { ...(node.config ?? {}), [key]: value } } : node
      )),
    }), { record })
  }, [applyChange])

  const toggleDisabled = React.useCallback(nodeId => {
    applyChange(current => ({
      ...current,
      nodes: current.nodes.map(node => (node.id === nodeId ? { ...node, disabled: !node.disabled } : node)),
    }))
  }, [applyChange])

  const deleteNode = React.useCallback(nodeId => {
    applyChange(current => ({
      ...current,
      nodes: current.nodes.filter(node => node.id !== nodeId),
      edges: current.edges.filter(edge => edge.from.node !== nodeId && edge.to.node !== nodeId),
    }))
    setSelectedNodeId(value => (value === nodeId ? null : value))
    setSelectedEdgeId(null)
  }, [applyChange])

  const duplicateNode = React.useCallback(nodeId => {
    const source = workflowRef.current?.nodes?.find(node => node.id === nodeId)
    if (!source) return
    const copy = createNode(source.type, {
      title: `${source.title} copy`,
      position: { x: source.position.x + 28, y: source.position.y + 28 },
      config: clone(source.config),
    })
    applyChange(current => ({ ...current, nodes: [...current.nodes, copy] }))
    setSelectedNodeId(copy.id)
    setInspectorTab('node')
  }, [applyChange])

  const deleteEdge = React.useCallback(edgeId => {
    applyChange(current => ({ ...current, edges: current.edges.filter(edge => edge.id !== edgeId) }))
    setSelectedEdgeId(null)
  }, [applyChange])

  const connect = React.useCallback((from, to) => {
    const current = workflowRef.current
    if (!current) return
    if (current.edges.some(edge => edge.from.node === from.node && edge.from.port === from.port && edge.to.node === to.node && edge.to.port === to.port)) {
      return
    }
    const check = canConnect(current, from, to, { replace: true })
    if (!check.ok) {
      notify(check.reason, 'warn')
      return
    }
    applyChange(wf => {
      const edges = wf.edges.filter(edge => !(edge.to.node === to.node && edge.to.port === to.port))
      edges.push({ id: makeId('e'), from: { ...from }, to: { ...to } })
      return { ...wf, edges }
    })
  }, [applyChange, notify])

  const updateWorkflow = React.useCallback(patch => {
    applyChange(current => ({ ...current, ...patch }))
  }, [applyChange])

  const save = React.useCallback(async () => {
    const current = workflowRef.current
    if (!current || saving) return
    const report = validateWorkflow(current)
    setIssues(report.issues)
    if (!report.ok) {
      setInspectorTab('issues')
      notify(tr('validationFailed'), 'error')
      return
    }
    setSaving(true)
    try {
      const data = await saveWorkflow(current)
      setCurrent(data.workflow, { dirty: false })
      setWorkflows(previous => {
        const summary = {
          id: data.workflow.id,
          name: data.workflow.name,
          description: data.workflow.description,
          updatedAt: data.workflow.updatedAt,
          nodeCount: data.workflow.nodes.length,
          edgeCount: data.workflow.edges.length,
        }
        return [summary, ...previous.filter(row => row.id !== summary.id)]
      })
      notify(tr('saved'))
    } catch (cause) {
      handleApiError(cause, setIssues, notify, tr)
    } finally {
      setSaving(false)
    }
  }, [notify, saving, setCurrent, tr])

  const beginRun = React.useCallback(() => {
    if (!workflowRef.current) return
    const report = validateWorkflow(workflowRef.current)
    setIssues(report.issues)
    if (!report.ok) {
      setInspectorTab('issues')
      notify(tr('validationFailed'), 'error')
      return
    }
    setRunDialogOpen(true)
  }, [notify, tr])

  const startWorkflowRun = React.useCallback(async ({ inputs, sessionId, cwd }) => {
    const current = workflowRef.current
    if (!current) return
    try {
      const data = await startRun({
        workflow: current,
        inputs,
        sessionId,
        cwd,
        concurrency: current.settings?.concurrency ?? 2,
      })
      setRun(data.run)
      setEvents(data.run.events ?? [])
      lastSeqRef.current = (data.run.events ?? []).reduce((max, event) => Math.max(max, event.seq), -1)
      setRunDialogOpen(false)
      setDockOpen(true)
      setDockTab('log')
      setInspectorTab('run')
      void refreshHistory()
    } catch (cause) {
      handleApiError(cause, setIssues, notify, tr)
    }
  }, [notify, refreshHistory, tr])

  const cancelCurrentRun = React.useCallback(async () => {
    if (!run) return
    try {
      const data = await cancelRun(run.id)
      if (data.run) setRun(data.run)
      notify(tr('cancel'))
    } catch (cause) {
      handleApiError(cause, setIssues, notify, tr)
    }
  }, [notify, run, tr])

  const pendingApproval = run
    ? Object.values(run.approvals ?? {}).find(approval => approval.status === 'pending') ?? null
    : null

  const decideCurrentApproval = React.useCallback(async decision => {
    if (!run || !pendingApproval) return
    try {
      const data = await decideApproval(run.id, pendingApproval.id, decision)
      if (data.run) setRun(data.run)
      notify(decision === 'allow' ? tr('approvalAllow') : tr('approvalReject'), decision === 'allow' ? 'success' : 'warn')
    } catch (cause) {
      handleApiError(cause, setIssues, notify, tr)
      throw cause
    }
  }, [notify, pendingApproval, run, tr])

  const rerunCurrentRun = React.useCallback(async () => {
    if (!run) return
    try {
      const data = await rerunRun(run.id)
      if (data.run) {
        if (data.run.workflowSnapshot) loadWorkflow(data.run.workflowSnapshot)
        setRun(data.run)
        setEvents([])
        lastSeqRef.current = -1
        setInspectorTab('run')
        setDockOpen(true)
        notify(tr('rerunStarted'), 'success')
      }
    } catch (cause) {
      handleApiError(cause, setIssues, notify, tr)
    }
  }, [loadWorkflow, notify, run, tr])

  const openRun = React.useCallback(async runId => {
    try {
      const data = await getRun(runId, -1)
      if (data.run?.workflowSnapshot) loadWorkflow(data.run.workflowSnapshot)
      setRun(data.run)
      setEvents(data.events ?? [])
      lastSeqRef.current = (data.events ?? []).reduce((max, event) => Math.max(max, event.seq), -1)
      setInspectorTab('run')
      setDockOpen(true)
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : String(cause), 'error')
    }
  }, [loadWorkflow, notify])

  const switchWorkflow = React.useCallback(async id => {
    if (!id || id === workflowRef.current?.id) return
    if (dirty && !window.confirm(tr('confirmDiscard'))) return
    try {
      const data = await getWorkflow(id)
      loadWorkflow(data.workflow)
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : String(cause), 'error')
    }
  }, [dirty, loadWorkflow, notify, tr])

  const chooseTemplate = React.useCallback(template => {
    if (!template) return
    if (dirty && !window.confirm(tr('confirmDiscard'))) return
    setTemplateOpen(false)
    loadWorkflow(template.workflow, { dirty: true })
    notify(tr('imported'))
  }, [dirty, loadWorkflow, notify, tr])

  const exportWorkflow = React.useCallback(() => {
    const current = workflowRef.current
    if (!current) return
    const blob = new Blob([`${JSON.stringify(current, null, 2)}\n`], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${safeFileName(current.name || 'cueflow-workflow')}.json`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
    notify(tr('exported'))
  }, [notify, tr])

  const importWorkflow = React.useCallback((parsed, cause) => {
    if (!parsed) {
      notify(cause instanceof Error ? cause.message : tr('invalidJson'), 'error')
      return
    }
    if (dirty && !window.confirm(tr('confirmDiscard'))) return
    loadWorkflow(parsed, { dirty: true })
    notify(tr('imported'))
  }, [dirty, loadWorkflow, notify, tr])

  const removeWorkflow = React.useCallback(async () => {
    const current = workflowRef.current
    if (!current) return
    if (!window.confirm(tr('confirmDeleteWorkflow'))) return
    try {
      await deleteWorkflow(current.id)
      setWorkflows(previous => previous.filter(row => row.id !== current.id))
      const blank = catalog?.templates?.find(template => template.id === 'blank') ?? catalog?.templates?.[0]
      loadWorkflow(blank?.workflow ?? emptyWorkflow(), { dirty: true })
      notify(tr('delete'))
    } catch (cause) {
      notify(cause instanceof Error ? cause.message : String(cause), 'error')
    }
  }, [catalog, loadWorkflow, notify, tr])

  const clearRun = React.useCallback(() => {
    setRun(null)
    setEvents([])
    lastSeqRef.current = -1
  }, [])

  React.useEffect(() => {
    const onKeyDown = event => {
      const target = event.target
      const typing = target?.closest?.('input, textarea, select, [contenteditable="true"]')
      const mod = event.ctrlKey || event.metaKey
      if (mod && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void save()
        return
      }
      if (mod && event.key === 'Enter') {
        event.preventDefault()
        beginRun()
        return
      }
      if (typing) return
      if (mod && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
        return
      }
      if (mod && event.key.toLowerCase() === 'y') {
        event.preventDefault()
        redo()
        return
      }
      if (event.key === 'Escape') {
        if (runDialogOpen) setRunDialogOpen(false)
        else if (templateOpen) setTemplateOpen(false)
        return
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedNodeId) {
          event.preventDefault()
          deleteNode(selectedNodeId)
        } else if (selectedEdgeId) {
          event.preventDefault()
          deleteEdge(selectedEdgeId)
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [beginRun, deleteEdge, deleteNode, redo, runDialogOpen, save, selectedEdgeId, selectedNodeId, templateOpen, undo])

  if (loading) {
    return (
      <div className="cue-root" data-theme="dark">
        <style>{CSS}</style>
        <div style={{ margin: 'auto', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--cue-muted)' }}>
          <span className="cue-spinner" />
          <span>{tr('loading')}</span>
        </div>
      </div>
    )
  }

  if (error && !workflow) {
    return (
      <div className="cue-root" data-theme="dark">
        <style>{CSS}</style>
        <div className="cue-empty-state" style={{ pointerEvents: 'auto' }}>
          <div className="cue-empty-title">{tr('hostUnavailable')}</div>
          <div className="cue-empty-desc">{error.message || String(error)}</div>
          <div className="cue-empty-actions">
            <button className="cue-btn primary sm" type="button" onClick={() => void bootstrap()}>{tr('retry')}</button>
          </div>
        </div>
      </div>
    )
  }

  const current = workflow
  const selectedNode = current?.nodes?.find(node => node.id === selectedNodeId) ?? null
  const running = run ? !isTerminalRun(run.status) : false
  const errorCount = issues.filter(issue => issue.severity === 'error').length
  const historyState = history.current

  return (
    <div className={`cue-root ${compact ? 'compact' : ''} ${narrow ? 'narrow' : ''}`} ref={rootRef}>
      <style>{CSS}</style>
      <header className="cue-top">
        <div className="cue-brand">
          <span className="cue-brand-mark"><CueFlowIcon size={22} active /></span>
          <span className="cue-brand-name">CueFlow</span>
          <span className="cue-brand-sub">{tr('subtitle')}</span>
        </div>
        <div className="cue-sep" />
        <div className="cue-workflow-picker">
          <select
            className="cue-workflow-select"
            value={current?.id ?? ''}
            onChange={event => void switchWorkflow(event.target.value)}
            aria-label={tr('workflow')}
          >
            {workflows.length === 0 && <option value={current?.id ?? ''}>{current?.name ?? tr('workflow')}</option>}
            {workflows.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select>
          <span className={`cue-dirty ${dirty ? 'is-dirty' : ''}`}>{dirty ? tr('unsaved') : tr('allSaved')}</span>
        </div>

        <span className="cue-top-spacer" />

        <div className="cue-top-actions">
          <button
            className="cue-btn icon ghost cue-inspector-toggle"
            type="button"
            title={tr('inspector')}
            aria-pressed={inspectorOpen}
            onClick={() => {
              setInspectorPreference(!inspectorOpen)
              setTimeout(() => fitToWorkflow(), 120)
            }}
          >
            <LayoutIcon size={14} />
          </button>
          <button className="cue-btn icon ghost" type="button" title={tr('undo')} disabled={!historyState.past.length} onClick={undo}><Undo size={14} /></button>
          <button className="cue-btn icon ghost" type="button" title={tr('redo')} disabled={!historyState.future.length} onClick={redo}><Redo size={14} /></button>
          <button className="cue-btn outline sm" type="button" onClick={() => setTemplateOpen(true)}><Plus size={12} /> {tr('newWorkflow')}</button>
          <button className={`cue-btn outline sm ${errorCount ? 'danger' : ''}`} type="button" onClick={() => { setInspectorTab('issues'); setDockOpen(true); }}>
            <Alert size={12} /> {tr('validate')} {errorCount ? `(${errorCount})` : ''}
          </button>
          <button className="cue-btn outline sm" type="button" disabled={saving} onClick={() => void save()}>
            {saving ? <span className="cue-spinner" /> : <Save size={12} />} {saving ? tr('saving') : tr('save')}
          </button>
          {running ? (
            <button className="cue-btn danger sm" type="button" data-cue-action="cancel-run" onClick={() => void cancelCurrentRun()}><Stop size={12} /> {tr('cancel')}</button>
          ) : (
            <button className="cue-btn primary sm" type="button" data-cue-action="run" onClick={beginRun}><Play size={12} /> {tr('run')}</button>
          )}
        </div>
      </header>

      <div className="cue-body">
        <NodeLibrary nodeTypes={catalog.nodeTypes} categories={catalog.categories} onAdd={addNode} t={tr} />
        <div className="cue-canvas-wrap" ref={canvasHostRef}>
          <Canvas
            workflow={current}
            catalog={catalog}
            selectedNodeId={selectedNodeId}
            selectedEdgeId={selectedEdgeId}
            viewport={viewport}
            setViewport={setViewport}
            run={run}
            onSelectNode={selectNode}
            onSelectEdge={id => { setSelectedEdgeId(id); setSelectedNodeId(null); setInspectorTab('node') }}
            onClearSelection={() => { setSelectedNodeId(null); setSelectedEdgeId(null) }}
            onAddNode={addNode}
            onConnect={connect}
            onDeleteEdge={deleteEdge}
            onMoveNode={(nodeId, position) => {
              const next = clone(workflowRef.current)
              next.nodes = next.nodes.map(node => (node.id === nodeId ? { ...node, position } : node))
              setCurrent(next, { dirty: true })
            }}
            onBeginNodeDrag={() => pushHistory(workflowRef.current)}
            onDuplicateNode={duplicateNode}
            onToggleDisabled={toggleDisabled}
            onDeleteNode={deleteNode}
            onFit={() => fitToWorkflow()}
            t={tr}
          />
        </div>
        {inspectorOpen && <Inspector
          workflow={current}
          catalog={catalog}
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          issues={issues}
          run={run}
          events={events}
          runHistory={runHistory}
          tab={inspectorTab}
          onTabChange={setInspectorTab}
          onUpdateWorkflow={updateWorkflow}
          onUpdateNode={updateNode}
          onUpdateConfig={updateConfig}
          onDeleteNode={deleteNode}
          onToggleDisabled={toggleDisabled}
          onDeleteEdge={deleteEdge}
          onSelectNode={nodeId => selectNode(nodeId, { center: true })}
          onOpenRun={openRun}
          onClearRun={clearRun}
          onCancelRun={cancelCurrentRun}
          onRerun={rerunCurrentRun}
          onDeleteWorkflow={removeWorkflow}
          onExport={exportWorkflow}
          onImport={importWorkflow}
          onFit={() => fitToWorkflow()}
          t={tr}
        />}
      </div>

      <div className={`cue-dock ${dockOpen ? 'open' : ''}`}>
        <div className="cue-dock-head" onClick={() => setDockOpen(value => !value)}>
          <Chevron size={12} style={{ transform: dockOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform .12s ease' }} />
          <span className="cue-dock-title">{tr('lastRun')}</span>
          {run ? <StatusBadge status={run.status} t={tr} /> : <span className="cue-dock-status">{tr('statusIdle')}</span>}
          <span className="cue-dock-status">{events.length} events</span>
          <div className="cue-dock-tabs" onClick={event => event.stopPropagation()}>
            <button type="button" className={`cue-tab ${dockTab === 'log' ? 'active' : ''}`} onClick={() => { setDockTab('log'); setDockOpen(true) }}>{tr('tabLog')}</button>
            <button type="button" className={`cue-tab ${dockTab === 'output' ? 'active' : ''}`} onClick={() => { setDockTab('output'); setDockOpen(true) }}>{tr('tabOutput')}</button>
          </div>
          {running && <button type="button" className="cue-btn danger sm" style={{ marginLeft: 'auto' }} onClick={event => { event.stopPropagation(); void cancelCurrentRun() }}>{tr('cancel')}</button>}
        </div>
        {dockOpen && (
          <div className="cue-dock-body">
            {dockTab === 'log' ? (
              <div className="cue-log">
                {events.length === 0 && <div className="cue-empty-note">{tr('logEmpty')}</div>}
                {events.slice(-300).map(event => (
                  <div className={`cue-log-row ${event.type.includes('error') ? 'error' : ''}`} key={event.seq}>
                    <span className="cue-log-time">{formatTime(event.time)}</span>
                    <span className="cue-log-node">{event.nodeId ? nodeTitle(current, event.nodeId) : ''}</span>
                    <span className="cue-log-msg">{event.message}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="cue-output-pane">
                {!run || Object.keys(run.outputs ?? {}).length === 0
                  ? <div className="cue-empty-note">{tr('noOutput')}</div>
                  : Object.entries(run.outputs).map(([id, output]) => (
                      <div className="cue-output-item" key={id}>
                        <div className="cue-output-title">{output.name || nodeTitle(current, id)}</div>
                        <pre className="cue-output-pre">{output.value}</pre>
                      </div>
                    ))}
              </div>
            )}
            {dockTab === 'log' && (
              <div className="cue-output-pane">
                <div className="cue-output-title">{tr('output')}</div>
                {!run || Object.keys(run.outputs ?? {}).length === 0
                  ? <div className="cue-empty-note">{tr('noOutput')}</div>
                  : Object.entries(run.outputs).map(([id, output]) => (
                      <div className="cue-output-item" key={id}>
                        <div className="cue-output-title">{output.name || nodeTitle(current, id)}</div>
                        <pre className="cue-output-pre">{output.value}</pre>
                      </div>
                    ))}
              </div>
            )}
          </div>
        )}
      </div>

      <RunDialog
        open={runDialogOpen}
        workflow={current}
        catalog={catalog}
        onClose={() => setRunDialogOpen(false)}
        onRun={startWorkflowRun}
        t={tr}
      />

      <ApprovalDialog
        open={Boolean(pendingApproval)}
        approval={pendingApproval}
        nodeTitle={pendingApproval ? nodeTitle(current, pendingApproval.nodeId) : ''}
        onDecision={decideCurrentApproval}
        onCancelRun={() => void cancelCurrentRun()}
        t={tr}
      />

      {templateOpen && (
        <TemplateDialog
          templates={catalog.templates ?? []}
          onClose={() => setTemplateOpen(false)}
          onChoose={chooseTemplate}
          t={tr}
        />
      )}

      {toast && <div className={`cue-toast ${toast.kind}`} role="status">{toast.text}</div>}
    </div>
  )
}

function TemplateDialog({ templates, onClose, onChoose, t }) {
  React.useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="cue-modal-backdrop" onPointerDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="cue-modal" role="dialog" aria-modal="true" aria-label={t('newWorkflow')}>
        <div className="cue-modal-head">
          <div style={{ flex: 1 }}>
            <h2 className="cue-modal-title">{t('newWorkflow')}</h2>
            <p className="cue-modal-sub">{t('useTemplate')}</p>
          </div>
          <button type="button" className="cue-btn icon ghost" onClick={onClose} aria-label={t('close')}><Close size={15} /></button>
        </div>
        <div className="cue-modal-body">
          <div className="cue-template-grid">
            {templates.map(template => (
              <button type="button" className="cue-template-card" key={template.id} onClick={() => onChoose(template)}>
                <div className="cue-template-name">{template.name}</div>
                <div className="cue-template-desc">{template.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function handleApiError(cause, setIssues, notify, t) {
  if (cause instanceof ApiError && cause.details?.issues) {
    setIssues(cause.details.issues)
  }
  const message = cause instanceof Error ? cause.message : String(cause)
  notify(message || t('runFailed'), 'error')
}

function mergeEvents(previous, incoming) {
  const map = new Map(previous.map(event => [event.seq, event]))
  for (const event of incoming) map.set(event.seq, event)
  return [...map.values()].sort((a, b) => a.seq - b.seq)
}

function nodeTitle(workflow, nodeId) {
  return workflow?.nodes?.find(node => node.id === nodeId)?.title ?? nodeId
}

function formatTime(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return '—'
  }
}

function safeFileName(name) {
  return String(name).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'cueflow-workflow'
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function ensureWorkflowSummary(previous, workflow) {
  const summary = {
    id: workflow.id,
    name: workflow.name,
    description: workflow.description ?? '',
    updatedAt: workflow.updatedAt ?? 0,
    createdAt: workflow.createdAt ?? 0,
    nodeCount: workflow.nodes?.length ?? 0,
    edgeCount: workflow.edges?.length ?? 0,
  }
  if (previous.some(row => row.id === summary.id)) {
    return previous.map(row => (row.id === summary.id ? { ...row, ...summary } : row))
  }
  return [summary, ...previous]
}

function emptyWorkflow() {
  return {
    schemaVersion: 1,
    id: makeId('wf'),
    name: 'Untitled workflow',
    description: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [],
    edges: [],
    settings: { ...EMPTY_SETTINGS },
  }
}
