import { React, h } from './react.js'
import { Alert, Close, Play } from './Icons.jsx'

export function RunDialog({ open, workflow, catalog, onClose, onRun, t }) {
  const inputs = React.useMemo(
    () => (workflow.nodes ?? []).filter(node => node.type === 'input'),
    [workflow.nodes],
  )
  const [values, setValues] = React.useState({})
  const [sessionId, setSessionId] = React.useState('')
  const [cwd, setCwd] = React.useState('')
  const [submitted, setSubmitted] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    const next = {}
    for (const node of inputs) next[node.id] = String(node.config?.defaultValue ?? '')
    setValues(next)
    setSessionId(catalog?.defaultSessionId || catalog?.agents?.[0]?.id || '')
    setCwd(workflow.settings?.cwd || catalog?.cwd || '')
    setSubmitted(false)
    setBusy(false)
  }, [open, workflow.id, catalog?.defaultSessionId])

  React.useEffect(() => {
    if (!open) return
    const onKey = event => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const agents = catalog?.agents ?? []
  const hasLlm = (workflow.nodes ?? []).some(node => ['agent', 'skill', 'command'].includes(node.type))
  const noAgent = hasLlm && agents.length === 0
  const missing = inputs.filter(node => {
    if (node.config?.required === false) return false
    const value = values[node.id]
    return value === undefined || String(value).trim() === ''
  })

  const submit = async () => {
    setSubmitted(true)
    if (noAgent || missing.length) return
    setBusy(true)
    try {
      await onRun({ inputs: values, sessionId, cwd })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="cue-modal-backdrop"
      onPointerDown={event => {
        if (event.target === event.currentTarget) onClose()
      }}
      role="presentation"
    >
      <div className="cue-modal" role="dialog" aria-modal="true" aria-label={t('runDialogTitle')}>
        <div className="cue-modal-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="cue-modal-title">{t('runDialogTitle')}</h2>
            <p className="cue-modal-sub">{workflow.name}</p>
          </div>
          <button type="button" className="cue-btn icon ghost" onClick={onClose} aria-label={t('close')}>
            <Close size={15} />
          </button>
        </div>

        <div className="cue-modal-body">
          {noAgent && (
            <div className="cue-warning">
              <Alert size={14} />
              <span className="cue-warning-text">{t('noLiveAgent')}</span>
            </div>
          )}
          {(catalog?.warnings ?? []).length > 0 && !noAgent && (
            <div className="cue-warning">
              <Alert size={14} />
              <span className="cue-warning-text">{catalog.warnings[0]}</span>
            </div>
          )}

          <div className="cue-field">
            <label className="cue-field-label" htmlFor="cue-run-session">{t('targetSession')}</label>
            <select
              id="cue-run-session"
              className="cue-select"
              value={sessionId}
              onChange={event => setSessionId(event.target.value)}
              disabled={agents.length === 0}
            >
              {agents.length === 0 && <option value="">{t('noAgents')}</option>}
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.title || agent.id} · {agent.model || agent.provider || agent.status}
                </option>
              ))}
            </select>
          </div>

          <div className="cue-field">
            <label className="cue-field-label" htmlFor="cue-run-cwd">{t('workingDir')}</label>
            <input
              id="cue-run-cwd"
              className="cue-input"
              value={cwd}
              onChange={event => setCwd(event.target.value)}
              placeholder={catalog?.cwd ?? ''}
              spellCheck={false}
            />
          </div>

          {inputs.length === 0 && <div className="cue-empty-note" style={{ marginTop: 12 }}>{t('noInputs')}</div>}

          {inputs.map(node => {
            const config = node.config ?? {}
            const options = String(config.options ?? '').split(',').map(option => option.trim()).filter(Boolean)
            const value = values[node.id] ?? ''
            const label = config.label || node.title || t('inputPort')
            const required = config.required !== false
            return (
              <div className="cue-field" key={node.id}>
                <label className="cue-field-label" htmlFor={`cue-run-${node.id}`}>
                  <span>{label} {required ? <span style={{ color: 'var(--cue-red)' }}>*</span> : <span className="cue-field-hint">{t('optional')}</span>}</span>
                  <span className="cue-badge">{config.valueType || 'text'}</span>
                </label>
                {options.length > 0 ? (
                  <select
                    id={`cue-run-${node.id}`}
                    className="cue-select"
                    value={value}
                    onChange={event => setValues(prev => ({ ...prev, [node.id]: event.target.value }))}
                  >
                    <option value="">— {t('noSelection')} —</option>
                    {options.map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : config.valueType === 'boolean' ? (
                  <label className="cue-check">
                    <input
                      id={`cue-run-${node.id}`}
                      type="checkbox"
                      checked={value === 'true' || value === true}
                      onChange={event => setValues(prev => ({ ...prev, [node.id]: event.target.checked ? 'true' : 'false' }))}
                    />
                    <span>true / false</span>
                  </label>
                ) : config.valueType === 'number' ? (
                  <input
                    id={`cue-run-${node.id}`}
                    className="cue-input"
                    type="number"
                    value={value}
                    onChange={event => setValues(prev => ({ ...prev, [node.id]: event.target.value }))}
                  />
                ) : config.valueType === 'json' ? (
                  <textarea
                    id={`cue-run-${node.id}`}
                    className="cue-textarea json"
                    rows={4}
                    value={value}
                    onChange={event => setValues(prev => ({ ...prev, [node.id]: event.target.value }))}
                    spellCheck={false}
                  />
                ) : (
                  <textarea
                    id={`cue-run-${node.id}`}
                    className="cue-textarea"
                    rows={3}
                    value={value}
                    placeholder={config.placeholder || ''}
                    onChange={event => setValues(prev => ({ ...prev, [node.id]: event.target.value }))}
                  />
                )}
                {submitted && missing.includes(node) && (
                  <div className="cue-field-hint" style={{ color: 'var(--cue-red)' }}>{t('required')}</div>
                )}
              </div>
            )
          })}

          <div className="cue-field-hint" style={{ marginTop: 10 }}>{t('runHint')}</div>
        </div>

        <div className="cue-modal-foot">
          <span className="cue-spacer" />
          <button type="button" className="cue-btn ghost" onClick={onClose}>{t('cancel')}</button>
          <button type="button" className="cue-btn primary" data-cue-action="start-run" onClick={submit} disabled={busy || noAgent}>
            {busy ? <span className="cue-spinner" /> : <Play size={13} />}
            {busy ? t('running') : t('start')}
          </button>
        </div>
      </div>
    </div>
  )
}
