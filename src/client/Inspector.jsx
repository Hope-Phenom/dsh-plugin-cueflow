import { React, h } from './react.js'
import { Alert, Check, Clock, Close, Copy, Download, FileIcon, NodeIcon, Play, Stop, Trash, Upload } from './Icons.jsx'
import { getInputs, getOutputs } from '../../shared/node-types.js'
import { PORT_COLORS } from '../../shared/constants.js'

export function Inspector({
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
  onDeleteWorkflow,
  onExport,
  onImport,
  onFit,
  t,
}) {
  const node = (workflow.nodes ?? []).find(item => item.id === selectedNodeId) ?? null
  const edge = (workflow.edges ?? []).find(item => item.id === selectedEdgeId) ?? null

  return (
    <aside className="cue-inspector" aria-label={t('inspector')}>
      <div className="cue-tabs" role="tablist">
        {[
          ['node', t('tabNode')],
          ['workflow', t('tabWorkflow')],
          ['run', t('tabRun')],
          ['issues', `${t('tabIssues')}${issues.length ? ` (${issues.length})` : ''}`],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            className={`cue-tab ${tab === value ? 'active' : ''}`}
            onClick={() => onTabChange(value)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="cue-tab-body">
        {tab === 'node' && (
          node
            ? <NodeForm node={node} catalog={catalog} workflow={workflow} issues={issues} run={run} onUpdateNode={onUpdateNode} onUpdateConfig={onUpdateConfig} onDeleteNode={onDeleteNode} onToggleDisabled={onToggleDisabled} t={t} />
            : <div className="cue-inspector-empty">
                <div className="cue-empty-title" style={{ fontSize: 13 }}>{t('selectNode')}</div>
                <div>{t('selectNodeHint')}</div>
                {edge && (
                  <div style={{ marginTop: 12 }}>
                    <div className="cue-badge">link {edge.from.node}:{edge.from.port} → {edge.to.node}:{edge.to.port}</div>
                    <button type="button" className="cue-btn danger sm" style={{ marginTop: 8 }} onClick={() => onDeleteEdge(edge.id)}>
                      <Trash size={12} /> {t('delete')}
                    </button>
                  </div>
                )}
              </div>
        )}

        {tab === 'workflow' && (
          <WorkflowForm
            workflow={workflow}
            issues={issues}
            runHistory={runHistory}
            onUpdateWorkflow={onUpdateWorkflow}
            onDeleteWorkflow={onDeleteWorkflow}
            onExport={onExport}
            onImport={onImport}
            onClearRun={onClearRun}
            onOpenRun={onOpenRun}
            onFit={onFit}
            t={t}
          />
        )}

        {tab === 'run' && (
          <RunPanel
            workflow={workflow}
            run={run}
            events={events}
            runHistory={runHistory}
            onSelectNode={onSelectNode}
            onOpenRun={onOpenRun}
            onCancelRun={onCancelRun}
            onClearRun={onClearRun}
            t={t}
          />
        )}

        {tab === 'issues' && (
          <IssuesList issues={issues} onSelectNode={onSelectNode} t={t} />
        )}
      </div>
    </aside>
  )
}

function NodeForm({ node, catalog, workflow, issues, run, onUpdateNode, onUpdateConfig, onDeleteNode, onToggleDisabled, t }) {
  const def = catalog.nodeTypes.find(type => type.type === node.type)
  const [formatError, setFormatError] = React.useState('')
  if (!def) {
    return (
      <div className="cue-inspector-empty">
        <div className="cue-empty-title" style={{ fontSize: 13 }}>{t('unknownType')}</div>
        <div>{node.type}</div>
      </div>
    )
  }
  const nodeIssues = issues.filter(issue => issue.nodeId === node.id)
  const inputs = getInputs(node.type, node.config)
  const outputs = getOutputs(node.type, node.config)
  const state = run?.nodeStates?.[node.id]
  return (
    <div>
      <div className="cue-node-heading">
        <span className="cue-library-icon" style={{ color: categoryColor(def.category) }}>
          <NodeIcon type={node.type} size={16} />
        </span>
        <div className="cue-node-heading-text">
          <div className="cue-node-heading-title">{node.title}</div>
          <div className="cue-node-heading-type">{node.type} · {def.description}</div>
        </div>
        <button type="button" className="cue-btn icon sm danger" title={t('delete')} onClick={() => onDeleteNode(node.id)}>
          <Trash size={13} />
        </button>
      </div>

      <div className="cue-section">
        <div className="cue-field">
          <label className="cue-field-label" htmlFor="cue-node-title">{t('nodeTitle')}</label>
          <input
            id="cue-node-title"
            className="cue-input"
            value={node.title}
            onChange={event => onUpdateNode(node.id, { title: event.target.value })}
          />
        </div>
        <div className="cue-field" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <span className="cue-field-label">{t('enabled')}</span>
          <button
            type="button"
            className={`cue-switch ${node.disabled ? '' : 'on'}`}
            aria-label={node.disabled ? t('enable') : t('disable')}
            onClick={() => onToggleDisabled(node.id)}
          />
        </div>
      </div>

      <div className="cue-section">
        <div className="cue-section-title">{t('config')}</div>
        {def.fields.map(field => (
          <FieldControl
            key={field.key}
            field={field}
            value={node.config?.[field.key]}
            node={node}
            catalog={catalog}
            onChange={value => onUpdateConfig(node.id, field.key, value)}
            onFormatError={setFormatError}
            t={t}
          />
        ))}
        {formatError && <div className="cue-field-hint" style={{ color: 'var(--cue-red)' }}>{formatError}</div>}
      </div>

      <div className="cue-section">
        <div className="cue-section-title">{t('ports')}</div>
        <div className="cue-port-status">
          {inputs.map(port => (
            <div className="cue-port-status-row" key={`in-${port.id}`}>
              <span className="cue-port-status-dot" style={{ '--cue-port-color': PORT_COLORS[port.type] ?? PORT_COLORS.any }} />
              <span className="cue-port-status-name">{port.label} · {port.type}</span>
              <span className="cue-port-status-state">{connectedState(workflow, node.id, port.id, 'in', t)}</span>
            </div>
          ))}
          {outputs.map(port => (
            <div className="cue-port-status-row" key={`out-${port.id}`}>
              <span className="cue-port-status-dot" style={{ '--cue-port-color': PORT_COLORS[port.type] ?? PORT_COLORS.any }} />
              <span className="cue-port-status-name">{port.label} · {port.type}</span>
              <span className="cue-port-status-state">{connectedState(workflow, node.id, port.id, 'out', t)}</span>
            </div>
          ))}
        </div>
      </div>

      {nodeIssues.length > 0 && (
        <div className="cue-section">
          <div className="cue-section-title">{t('issues')}</div>
          <IssuesList issues={nodeIssues} t={t} />
        </div>
      )}

      {state && (
        <div className="cue-section">
          <div className="cue-section-title">{t('lastRun')}</div>
          <div className="cue-inline" style={{ marginBottom: 6 }}>
            <StatusBadge status={state.status} t={t} />
            {state.durationMs !== null && <span className="cue-history-meta">{formatDuration(state.durationMs)}</span>}
          </div>
          {state.error && <div className="cue-node-error">{state.error.message}</div>}
          {state.preview && <pre className="cue-output-pre" style={{ maxHeight: 160, overflow: 'auto' }}>{state.preview}</pre>}
        </div>
      )}
    </div>
  )
}

function FieldControl({ field, value, node, catalog, onChange, onFormatError, t }) {
  const id = `cue-field-${field.key}`
  const [localError, setLocalError] = React.useState('')
  const hint = field.hint ? <div className="cue-field-hint">{field.hint}</div> : null

  if (field.kind === 'boolean') {
    return (
      <div className="cue-field" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div className="cue-field-label">{field.label}</div>
          {hint}
        </div>
        <button
          type="button"
          id={id}
          className={`cue-switch ${value !== false ? 'on' : ''}`}
          onClick={() => onChange(value === false)}
          aria-pressed={value !== false}
          aria-label={field.label}
        />
      </div>
    )
  }

  if (field.kind === 'select') {
    const options = field.options ?? []
    return (
      <div className="cue-field">
        <label className="cue-field-label" htmlFor={id}>{field.label}</label>
        <select id={id} className="cue-select" value={value ?? ''} onChange={event => onChange(event.target.value)}>
          {options.map(option => <option key={option} value={option}>{option}</option>)}
        </select>
        {hint}
      </div>
    )
  }

  if (field.kind === 'skill') {
    const skills = catalog.skills ?? []
    const known = skills.some(skill => skill.name === value)
    return (
      <div className="cue-field">
        <label className="cue-field-label" htmlFor={id}>{field.label}</label>
        <select id={id} className="cue-select" value={value ?? ''} onChange={event => onChange(event.target.value)}>
          <option value="">— {t('noSelection')} —</option>
          {!known && value ? <option value={value}>{value} ({t('missingSkill')})</option> : null}
          {skills.map(skill => (
            <option key={skill.name} value={skill.name}>
              {skill.name}{!skill.modelInvocable ? ` · ${t('skillUserOnly')}` : ''}
            </option>
          ))}
        </select>
        {hint}
      </div>
    )
  }

  if (field.kind === 'command') {
    const commands = catalog.commands ?? []
    const known = commands.some(command => command.name === value)
    return (
      <div className="cue-field">
        <label className="cue-field-label" htmlFor={id}>{field.label}</label>
        <select id={id} className="cue-select" value={value ?? ''} onChange={event => onChange(event.target.value)}>
          <option value="">— {t('noSelection')} —</option>
          {!known && value ? <option value={value}>{value}</option> : null}
          {commands.map(command => <option key={command.name} value={command.name}>{command.name}</option>)}
        </select>
        {commands.length === 0 && <div className="cue-field-hint">{t('noCommands')}</div>}
        {hint}
      </div>
    )
  }

  if (field.kind === 'json') {
    return (
      <div className="cue-field">
        <label className="cue-field-label" htmlFor={id}>{field.label}</label>
        <textarea
          id={id}
          className="cue-textarea json"
          rows={field.rows ?? 5}
          value={value ?? ''}
          placeholder={field.placeholder ?? ''}
          onChange={event => {
            setLocalError('')
            onFormatError?.('')
            onChange(event.target.value)
          }}
          spellCheck={false}
        />
        <div className="cue-inline">
          <button
            type="button"
            className="cue-btn ghost sm"
            onClick={() => {
              try {
                const parsed = JSON.parse(value || '{}')
                onChange(JSON.stringify(parsed, null, 2))
                setLocalError('')
                onFormatError?.('')
              } catch {
                setLocalError(t('invalidJson'))
                onFormatError?.(t('invalidJson'))
              }
            }}
          >
            <Check size={12} /> {t('format')}
          </button>
        </div>
        {localError && <div className="cue-field-hint" style={{ color: 'var(--cue-red)' }}>{localError}</div>}
        {hint}
      </div>
    )
  }

  if (field.kind === 'textarea') {
    return (
      <div className="cue-field">
        <label className="cue-field-label" htmlFor={id}>{field.label}</label>
        <textarea
          id={id}
          className="cue-textarea"
          rows={field.rows ?? 4}
          value={value ?? ''}
          placeholder={field.placeholder ?? ''}
          onChange={event => onChange(event.target.value)}
        />
        {hint}
      </div>
    )
  }

  if (field.kind === 'number') {
    return (
      <div className="cue-field">
        <label className="cue-field-label" htmlFor={id}>{field.label}</label>
        <input
          id={id}
          className="cue-input"
          type="number"
          min={field.min}
          max={field.max}
          step={field.step}
          value={value ?? ''}
          onChange={event => onChange(event.target.value === '' ? '' : Number(event.target.value))}
        />
        {hint}
      </div>
    )
  }

  return (
    <div className="cue-field">
      <label className="cue-field-label" htmlFor={id}>{field.label}</label>
      <input
        id={id}
        className="cue-input"
        value={value ?? ''}
        placeholder={field.placeholder ?? ''}
        onChange={event => onChange(event.target.value)}
      />
      {hint}
    </div>
  )
}

function WorkflowForm({ workflow, issues, runHistory, onUpdateWorkflow, onDeleteWorkflow, onExport, onImport, onClearRun, onOpenRun, onFit, t }) {
  const fileRef = React.useRef(null)
  const readFile = event => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        onImport(parsed)
      } catch (error) {
        onImport(null, error)
      }
      event.target.value = ''
    }
    reader.readAsText(file)
  }
  return (
    <div>
      <div className="cue-section">
        <div className="cue-field">
          <label className="cue-field-label" htmlFor="cue-wf-name">{t('workflowName')}</label>
          <input id="cue-wf-name" className="cue-input" value={workflow.name} onChange={event => onUpdateWorkflow({ name: event.target.value })} />
        </div>
        <div className="cue-field">
          <label className="cue-field-label" htmlFor="cue-wf-desc">{t('workflowDescription')}</label>
          <textarea id="cue-wf-desc" className="cue-textarea" rows={3} value={workflow.description ?? ''} onChange={event => onUpdateWorkflow({ description: event.target.value })} />
        </div>
        <div className="cue-field">
          <label className="cue-field-label" htmlFor="cue-wf-concurrency">{t('concurrency')}</label>
          <select id="cue-wf-concurrency" className="cue-select" value={workflow.settings?.concurrency ?? 2} onChange={event => onUpdateWorkflow({ settings: { ...(workflow.settings ?? {}), concurrency: Number(event.target.value) } })}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map(value => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
        <div className="cue-field">
          <label className="cue-field-label" htmlFor="cue-wf-cwd">{t('cwd')}</label>
          <input id="cue-wf-cwd" className="cue-input" value={workflow.settings?.cwd ?? ''} placeholder="F:\\WorkSpace\\project" onChange={event => onUpdateWorkflow({ settings: { ...(workflow.settings ?? {}), cwd: event.target.value } })} />
        </div>
      </div>

      <div className="cue-section">
        <div className="cue-section-title">{t('issues')}</div>
        <IssuesList issues={issues} t={t} />
      </div>

      <div className="cue-section">
        <div className="cue-section-title">{t('history')}</div>
        {runHistory.length === 0
          ? <div className="cue-empty-note">{t('noHistory')}</div>
          : <div className="cue-history">
              {runHistory.slice(0, 6).map(row => (
                <button type="button" className="cue-history-row" key={row.id} onClick={() => onOpenRun(row.id)}>
                  <StatusDot status={row.status} />
                  <span className="cue-history-name">{row.workflowName || row.id}</span>
                  <span className="cue-history-meta">{row.status} · {formatTime(row.endedAt || row.createdAt)}</span>
                </button>
              ))}
            </div>}
      </div>

      <div className="cue-section">
        <div className="cue-inline" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="cue-btn outline sm" onClick={onExport}><Download size={12} /> {t('exportJson')}</button>
          <button type="button" className="cue-btn outline sm" onClick={() => fileRef.current?.click()}><Upload size={12} /> {t('importJson')}</button>
          <button type="button" className="cue-btn ghost sm" onClick={onFit}><Clock size={12} /> {t('fit')}</button>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={readFile} />
        </div>
      </div>

      <div className="cue-section">
        <button type="button" className="cue-btn danger sm" onClick={onDeleteWorkflow}><Trash size={12} /> {t('delete')}</button>
        {onClearRun && <button type="button" className="cue-btn ghost sm" onClick={onClearRun}>{t('clearResults')}</button>}
      </div>
    </div>
  )
}

function RunPanel({ workflow, run, events, runHistory, onSelectNode, onOpenRun, onCancelRun, onClearRun, t }) {
  if (!run) {
    return (
      <div>
        <div className="cue-inspector-empty">{t('logEmpty')}</div>
        <div className="cue-section">
          <div className="cue-section-title">{t('history')}</div>
          {runHistory.length === 0
            ? <div className="cue-empty-note">{t('noHistory')}</div>
            : <div className="cue-history">
                {runHistory.slice(0, 10).map(row => (
                  <button type="button" className="cue-history-row" key={row.id} onClick={() => onOpenRun(row.id)}>
                    <StatusDot status={row.status} />
                    <span className="cue-history-name">{row.workflowName || row.id}</span>
                    <span className="cue-history-meta">{row.status}</span>
                  </button>
                ))}
              </div>}
        </div>
      </div>
    )
  }
  const running = run.status === 'running' || run.status === 'queued'
  const nodeTitle = id => workflow.nodes?.find(node => node.id === id)?.title ?? id
  return (
    <div>
      <div className="cue-section">
        <div className="cue-inline" style={{ justifyContent: 'space-between' }}>
          <StatusBadge status={run.status} t={t} />
          <span className="cue-history-meta">{run.id}</span>
        </div>
        <div className="cue-field-hint" style={{ marginTop: 6 }}>
          {t('startedAt')}: {formatTime(run.startedAt)} · {t('endedAt')}: {formatTime(run.endedAt)}
        </div>
        {run.error && <div className="cue-warning" style={{ marginTop: 8 }}><Alert size={13} /><span className="cue-warning-text">{run.error.message}</span></div>}
        <div className="cue-inline" style={{ marginTop: 8 }}>
          {running && <button type="button" className="cue-btn danger sm" onClick={onCancelRun}><Stop size={12} /> {t('cancel')}</button>}
          <button type="button" className="cue-btn ghost sm" onClick={onClearRun}>{t('clearResults')}</button>
        </div>
      </div>

      <div className="cue-section">
        <div className="cue-section-title">{t('nodeStatus')}</div>
        <div className="cue-history">
          {(workflow.nodes ?? []).map(node => {
            const state = run.nodeStates?.[node.id]
            if (!state) return null
            return (
              <button type="button" className="cue-history-row" key={node.id} onClick={() => onSelectNode(node.id)}>
                <StatusDot status={state.status} />
                <span className="cue-history-name">{node.title || node.type}</span>
                <span className="cue-history-meta">{formatDuration(state.durationMs)}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="cue-section">
        <div className="cue-section-title">{t('output')}</div>
        {Object.keys(run.outputs ?? {}).length === 0
          ? <div className="cue-empty-note">{t('noOutput')}</div>
          : Object.entries(run.outputs).map(([id, output]) => (
              <div className="cue-output-item" key={id}>
                <div className="cue-output-title">{output.name || nodeTitle(id)}</div>
                <pre className="cue-output-pre">{output.value}</pre>
              </div>
            ))}
      </div>

      <div className="cue-section">
        <div className="cue-section-title">{t('tabLog')}</div>
        <div className="cue-log" style={{ maxHeight: 220, padding: 0 }}>
          {events.length === 0 && <div className="cue-empty-note">{t('logEmpty')}</div>}
          {events.slice(-120).map(event => (
            <div className={`cue-log-row ${event.type === 'node/error' ? 'error' : event.type === 'run/error' ? 'error' : ''}`} key={event.seq}>
              <span className="cue-log-time">{formatTime(event.time)}</span>
              <span className="cue-log-node">{event.nodeId ? nodeTitle(event.nodeId) : ''}</span>
              <span className="cue-log-msg">{event.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function IssuesList({ issues, onSelectNode, t }) {
  if (!issues.length) return <div className="cue-empty-note">{t('noIssues')}</div>
  return (
    <div className="cue-issues">
      {issues.map((issue, index) => (
        <button
          type="button"
          className={`cue-issue ${issue.severity}`}
          key={`${issue.code}-${index}`}
          onClick={() => issue.nodeId && onSelectNode?.(issue.nodeId)}
          style={{ textAlign: 'left' }}
        >
          {issue.severity === 'error' ? <Alert size={13} /> : <Alert size={13} />}
          <span className="cue-issue-text">
            <span>{issue.message}</span>
            <span className="cue-issue-code">{issue.code}{issue.port ? ` · ${issue.port}` : ''}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

export function StatusBadge({ status, t }) {
  return (
    <span className={`cue-badge ${statusTone(status)}`}>
      <StatusDot status={status} />
      {statusLabel(status, t)}
    </span>
  )
}

export function StatusDot({ status }) {
  return <span className={`cue-status-dot ${status}`} />
}

function statusTone(status) {
  if (status === 'error') return 'red'
  if (status === 'success' || status === 'completed') return 'green'
  if (status === 'running' || status === 'waiting-approval') return 'amber'
  if (status === 'cancelled') return 'amber'
  if (status === 'skipped') return ''
  return ''
}

function statusLabel(status, t) {
  const key = `status${String(status || 'unknown').charAt(0).toUpperCase()}${String(status || 'unknown').slice(1)}`
  return t(key)
}

function connectedState(workflow, nodeId, portId, direction, t) {
  const connected = direction === 'in'
    ? (workflow.edges ?? []).some(edge => edge.to?.node === nodeId && edge.to.port === portId)
    : (workflow.edges ?? []).some(edge => edge.from?.node === nodeId && edge.from.port === portId)
  return connected ? t('connected') : t('notConnected')
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

function formatDuration(ms) {
  if (ms === null || ms === undefined) return '—'
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

function formatTime(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return '—'
  }
}
