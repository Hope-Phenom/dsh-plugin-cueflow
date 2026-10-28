import { Fragment, h } from './react.js'

function svg({ size = 16, className, children, viewBox = '0 0 24 24', fill = 'none', ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill={fill}
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

function stroke(children, width = 1.6) {
  return (
    <g stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {children}
    </g>
  )
}

export function CueFlowIcon({ size = 22, active = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" focusable="false">
      <rect x="2.75" y="3.75" width="26.5" height="24.5" rx="5" fill={active ? 'rgba(231,183,95,.14)' : 'transparent'} stroke={active ? 'var(--cue-amber, #e7b75f)' : 'currentColor'} strokeWidth="1.5" />
      <path d={active ? 'M9 12h6.5M9 20h6.5M9 16h4' : 'M9 12h6.5M9 20h6.5M9 16h4'} stroke="var(--cue-amber, #e7b75f)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="23" cy="12" r="2.4" fill="var(--cue-cyan, #6fb7c8)" />
      <circle cx="23" cy="20" r="2.4" fill="var(--cue-green, #6fbf8f)" />
      <path d="M15.5 12h5M15.5 20h5" stroke="currentColor" strokeWidth="1.2" opacity=".55" />
    </svg>
  )
}

export const Plus = props => svg({ ...props, children: stroke(<><path d="M12 5v14M5 12h14" /></>) })
export const Play = props => svg({ ...props, children: stroke(<><path d="M8 5.5v13l10-6.5z" fill="currentColor" stroke="none" /></>) })
export const Stop = props => svg({ ...props, children: stroke(<><rect x="6.5" y="6.5" width="11" height="11" rx="1.5" fill="currentColor" stroke="none" /></>) })
export const Save = props => svg({ ...props, children: stroke(<><path d="M5 4.5h11l3 3V20H5z" /><path d="M8 4.5v5h7v-5M8 20v-6h8v6" /></>) })
export const Check = props => svg({ ...props, children: stroke(<><path d="M5 12.5l4.5 4.5L19 7.5" /></>) })
export const Alert = props => svg({ ...props, children: stroke(<><path d="M12 4l9 16H3z" /><path d="M12 9.5v4.5M12 17.2v.1" /></>) })
export const Search = props => svg({ ...props, children: stroke(<><circle cx="10.5" cy="10.5" r="5.5" /><path d="M15 15l4.5 4.5" /></>) })
export const ZoomIn = props => svg({ ...props, children: stroke(<><circle cx="10.5" cy="10.5" r="5.5" /><path d="M15 15l4.5 4.5M10.5 8v5M8 10.5h5" /></>) })
export const ZoomOut = props => svg({ ...props, children: stroke(<><circle cx="10.5" cy="10.5" r="5.5" /><path d="M15 15l4.5 4.5M8 10.5h5" /></>) })
export const Fit = props => svg({ ...props, children: stroke(<><path d="M4 9V5h4M20 9V5h-4M4 15v4h4M20 15v4h-4" /><rect x="8" y="8" width="8" height="8" rx="1" /></>) })
export const Undo = props => svg({ ...props, children: stroke(<><path d="M9 7L4 12l5 5" /><path d="M4 12h9a5 5 0 0 1 0 10h-1" /></>) })
export const Redo = props => svg({ ...props, children: stroke(<><path d="M15 7l5 5-5 5" /><path d="M20 12h-9a5 5 0 0 0 0 10h1" /></>) })
export const Trash = props => svg({ ...props, children: stroke(<><path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5" /></>) })
export const Close = props => svg({ ...props, children: stroke(<><path d="M6 6l12 12M18 6L6 18" /></>) })
export const Chevron = props => svg({ ...props, children: stroke(<><path d="M7 10l5 5 5-5" /></>) })
export const More = props => svg({ ...props, children: stroke(<><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>) })
export const Copy = props => svg({ ...props, children: stroke(<><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>) })
export const Download = props => svg({ ...props, children: stroke(<><path d="M12 4v11M7 10l5 5 5-5M5 19h14" /></>) })
export const Upload = props => svg({ ...props, children: stroke(<><path d="M12 20V9M7 14l5-5 5 5M5 5h14" /></>) })
export const Clock = props => svg({ ...props, children: stroke(<><circle cx="12" cy="12" r="8" /><path d="M12 7.5V12l3 2" /></>) })
export const LinkIcon = props => svg({ ...props, children: stroke(<><path d="M10 14a4 4 0 0 1 0-6l2-2a4 4 0 0 1 6 6l-1.5 1.5" /><path d="M14 10a4 4 0 0 1 0 6l-2 2a4 4 0 0 1-6-6l1.5-1.5" /></>) })
export const InputIcon = props => svg({ ...props, children: stroke(<><rect x="4" y="6" width="16" height="12" rx="2" /><path d="M8 12h8" /></>) })
export const OutputIcon = props => svg({ ...props, children: stroke(<><rect x="4" y="6" width="16" height="12" rx="2" /><path d="M9 12h6M12 9l3 3-3 3" /></>) })
export const AgentIcon = props => svg({ ...props, children: stroke(<><circle cx="12" cy="8" r="3" /><path d="M5.5 20a6.5 6.5 0 0 1 13 0M18 5l2 2M20 5l-2 2" /></>) })
export const SkillIcon = props => svg({ ...props, children: stroke(<><path d="M12 3l2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z" /></>) })
export const CommandIcon = props => svg({ ...props, children: stroke(<><path d="M5 7h14M5 12h9M5 17h14" /><circle cx="18" cy="12" r="1.5" /></>) })
export const ShellIcon = props => svg({ ...props, children: stroke(<><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M7 9l3 3-3 3M12 15h5" /></>) })
export const FileIcon = props => svg({ ...props, children: stroke(<><path d="M6 3.5h8l4 4V20H6z" /><path d="M14 3.5V8h4M9 12h6M9 16h6" /></>) })
export const ConditionIcon = props => svg({ ...props, children: stroke(<><path d="M12 4v6M12 14v6M7 9l5 2 5-2M7 15l5-2 5 2" /></>) })
export const MergeIcon = props => svg({ ...props, children: stroke(<><path d="M4 6h4l4 6 4-6h4M4 18h4l4-6 4 6h4" /></>) })
export const NoteIcon = props => svg({ ...props, children: stroke(<><path d="M5 4h14v11l-4 5H5z" /><path d="M15 20v-5h4M8 8h8M8 12h5" /></>) })
export const LayoutIcon = props => svg({ ...props, children: stroke(<><rect x="3.5" y="4" width="17" height="16" rx="2" /><path d="M3.5 9h17M9 9v11" /></>) })

const NODE_ICONS = {
  input: InputIcon,
  template: LayoutIcon,
  agent: AgentIcon,
  skill: SkillIcon,
  command: CommandIcon,
  shell: ShellIcon,
  'file-read': FileIcon,
  condition: ConditionIcon,
  merge: MergeIcon,
  output: OutputIcon,
  note: NoteIcon,
}

export function NodeIcon({ type, size = 15 }) {
  const Icon = NODE_ICONS[type] ?? LayoutIcon
  return <Icon size={size} />
}

export const NODE_ICON_NAMES = NODE_ICONS
