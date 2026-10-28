import { React, h } from './react.js'
import { Alert, Check, Close, Stop } from './Icons.jsx'

export function ApprovalDialog({ open, approval, nodeTitle, onDecision, onCancelRun, t }) {
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (!open) return
    setBusy(false)
    setError('')
  }, [open, approval?.id])

  if (!open || !approval) return null

  const decide = async decision => {
    setBusy(true)
    setError('')
    try {
      await onDecision(decision)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      setBusy(false)
    }
  }

  const detail = approval.detail ?? {}
  return (
    <div className="cue-modal-backdrop" role="presentation">
      <div className="cue-modal cue-approval-modal" role="dialog" aria-modal="true" aria-label={t('approvalTitle')}>
        <div className="cue-modal-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="cue-modal-title">{t('approvalTitle')}</h2>
            <p className="cue-modal-sub">{t('approvalSub')}</p>
          </div>
          <button type="button" className="cue-btn icon ghost" onClick={onCancelRun} aria-label={t('cancel')} title={t('cancel')}>
            <Close size={15} />
          </button>
        </div>

        <div className="cue-modal-body">
          <div className="cue-warning">
            <Alert size={14} />
            <span className="cue-warning-text">{t('approvalHint')}</span>
          </div>

          <div className="cue-approval-row">
            <span className="cue-field-label">{t('approvalNode')}</span>
            <span className="cue-badge">{nodeTitle || approval.nodeTitle || approval.nodeId}</span>
          </div>
          <div className="cue-approval-row">
            <span className="cue-field-label">{t('approvalAction')}</span>
            <span className="cue-badge">{approval.action || 'action'}</span>
          </div>
          {detail.command && (
            <div className="cue-field">
              <div className="cue-field-label">{t('approvalCommand')}</div>
              <pre className="cue-approval-command">{detail.command}</pre>
            </div>
          )}
          {detail.workdir && (
            <div className="cue-approval-row">
              <span className="cue-field-label">{t('approvalWorkdir')}</span>
              <span className="cue-approval-path">{detail.workdir}</span>
            </div>
          )}
          {error && <div className="cue-warning"><Alert size={13} /><span className="cue-warning-text">{error}</span></div>}
        </div>

        <div className="cue-modal-foot">
          <button type="button" className="cue-btn ghost" onClick={onCancelRun} disabled={busy}>
            <Stop size={12} /> {t('cancel')}
          </button>
          <span className="cue-spacer" />
          <button type="button" className="cue-btn danger" onClick={() => void decide('reject')} disabled={busy}>
            {t('approvalReject')}
          </button>
          <button type="button" className="cue-btn primary" onClick={() => void decide('allow')} disabled={busy} data-cue-action="approve-once">
            {busy ? <span className="cue-spinner" /> : <Check size={13} />}
            {t('approvalAllow')}
          </button>
        </div>
      </div>
    </div>
  )
}
