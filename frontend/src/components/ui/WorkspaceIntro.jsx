import { Activity, ShieldCheck, Sparkles } from 'lucide-react'

export default function WorkspaceIntro({ code, title, description, metrics = [], accent = 'sky' }) {
  return (
    <section className={`ms-x-workspace-intro ms-x-workspace-intro--${accent}`} aria-labelledby={`${code}-title`}>
      <div className="ms-x-workspace-intro__beam" aria-hidden="true" />
      <div className="ms-x-workspace-intro__copy">
        <span><Sparkles size={12} aria-hidden="true" /> {code}</span>
        <h1 id={`${code}-title`}>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="ms-x-workspace-intro__metrics" aria-label="Module details">
        {metrics.map(([value, label]) => (
          <span key={label}><strong>{value}</strong><small>{label}</small></span>
        ))}
      </div>
      <div className="ms-x-workspace-intro__trust">
        <span><Activity size={14} /> Ready</span>
        <span><ShieldCheck size={14} /> Review-led</span>
      </div>
    </section>
  )
}
