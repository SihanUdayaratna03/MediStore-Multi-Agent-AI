import {
  Activity, ArrowLeft, BrainCircuit, CircleCheck, FileSearch,
  HeartPulse, LayoutGrid, MapPinned, ShieldCheck,
} from 'lucide-react'

const MODULES = [
  { id: 'mode-select', label: 'Overview', Icon: LayoutGrid },
  { id: 'v2', label: 'Diabetes risk', Icon: Activity },
  { id: 'v3', label: 'Complications', Icon: BrainCircuit },
  { id: 'doc-intelligence', label: 'Documents', Icon: FileSearch },
  { id: 'care-locator', label: 'Care network', Icon: MapPinned },
]

/**
 * Persistent brand bar across the two predictor dashboards. Gives the app a
 * fixed identity anchor and a consistent place for the back action, instead of
 * a lone floating button.
 */
export default function TopBar({
  moduleName,
  accent = 'sky',
  activeModule,
  onNavigate,
  onBack,
  backLabel = 'Workspace',
  status = 'Decision support workspace',
}) {
  const colour = accent === 'violet' ? 'var(--violet-300)' : 'var(--sky-300)'

  return (
    <header className="ms-topbar">
      <div className="ms-brand ms-brand--workspace">
        <span className="ms-brand__mark" aria-hidden="true">
          <HeartPulse size={18} color="#e8fff9" />
        </span>
        <span className="ms-brand__copy">
          <span className="ms-brand__product">MediStore AI</span>
          <span className="ms-brand__module" style={{ color: colour }}>{moduleName}</span>
        </span>
      </div>

      {onNavigate && (
        <nav className="ms-workspace-nav" aria-label="Clinical workspace">
          {MODULES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className="ms-workspace-nav__item"
              data-active={activeModule === id}
              aria-current={activeModule === id ? 'page' : undefined}
              onClick={() => onNavigate(id)}
            >
              <Icon size={15} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
      )}

      <div className="ms-topbar__actions">
        <span className="ms-system-status" title="The current workspace session is available">
          <CircleCheck size={14} aria-hidden="true" />
          <span>{status}</span>
        </span>
        <span className="ms-secure-session" aria-label="Secure session"><ShieldCheck size={16} /></span>
        {onBack && (
          <button type="button" className="ms-btn ms-btn--workspace" onClick={onBack}>
            <ArrowLeft size={16} aria-hidden="true" /> <span>{backLabel}</span>
          </button>
        )}
      </div>
    </header>
  )
}
