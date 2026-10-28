import { React, h } from './react.js'
import { NodeIcon, Search } from './Icons.jsx'

const CATEGORY_ORDER = ['io', 'transform', 'agents', 'dsh', 'exec', 'control', 'note']

export function NodeLibrary({ nodeTypes, categories, onAdd, t }) {
  const [query, setQuery] = React.useState('')
  const [collapsed, setCollapsed] = React.useState({})

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return nodeTypes
    return nodeTypes.filter(type =>
      `${type.type} ${type.title} ${type.description}`.toLowerCase().includes(q),
    )
  }, [nodeTypes, query])

  const groups = React.useMemo(() => {
    const map = new Map()
    for (const type of filtered) {
      if (!map.has(type.category)) map.set(type.category, [])
      map.get(type.category).push(type)
    }
    return CATEGORY_ORDER
      .filter(category => map.has(category))
      .map(category => ({
        category,
        title: categories.find(item => item.id === category)?.title ?? category,
        color: categories.find(item => item.id === category)?.color ?? 'var(--cue-amber)',
        items: map.get(category),
      }))
  }, [filtered, categories])

  return (
    <aside className="cue-library" aria-label={t('nodeLibrary')}>
      <div className="cue-library-head">
        <div className="cue-eyebrow">{t('nodeLibrary')}</div>
        <label className="cue-inline" style={{ position: 'relative' }}>
          <input
            className="cue-search"
            value={query}
            placeholder={t('searchNodes')}
            onChange={event => setQuery(event.target.value)}
            aria-label={t('searchNodes')}
            style={{ paddingLeft: 28 }}
          />
          <span className="cue-library-search-icon">
            <Search size={13} />
          </span>
        </label>
      </div>
      <div className="cue-library-list">
        {groups.map(group => (
          <div className="cue-library-group" key={group.category}>
            <button
              type="button"
              className="cue-library-group-title"
              onClick={() => setCollapsed(prev => ({ ...prev, [group.category]: !prev[group.category] }))}
              style={{ width: '100%', border: 0, background: 'transparent', textAlign: 'left', cursor: 'pointer' }}
            >
              <span>{group.title}</span>
              <span>{collapsed[group.category] ? '+' : '−'}</span>
            </button>
            {!collapsed[group.category] && group.items.map(type => (
              <button
                type="button"
                className="cue-library-item"
                key={type.type}
                title={type.description}
                draggable
                onDragStart={event => {
                  event.dataTransfer.setData('application/x-cueflow-node', type.type)
                  event.dataTransfer.effectAllowed = 'copy'
                }}
                onClick={() => onAdd(type.type)}
              >
                <span className="cue-library-icon" style={{ color: group.color }}>
                  <NodeIcon type={type.type} size={14} />
                </span>
                <span className="cue-library-text">
                  <span className="cue-library-label">{type.title}</span>
                  <span className="cue-library-desc">{type.description}</span>
                </span>
              </button>
            ))}
          </div>
        ))}
        {groups.length === 0 && <div className="cue-empty-note" style={{ padding: 12 }}>{t('noResults')}</div>}
      </div>
      <div className="cue-library-foot">
        <span>{filtered.length} {t('nodes')}</span>
        <span>drag / click</span>
      </div>
    </aside>
  )
}
