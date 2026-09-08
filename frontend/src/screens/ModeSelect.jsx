import { Droplet, Brain, FileText, MapPin, ArrowRight, LogOut, HeartPulse, Sparkles } from 'lucide-react'
import Reveal from '../components/ui/Reveal'

const MODULES = [
  {
    id: 'v2',
    accent: 'sky',
    Icon: Droplet,
    iconColour: '#78d4c3',
    name: 'Diabetes Risk Predictor',
    version: 'v2 · SVM Model',
    description:
      "Predicts diabetes presence from 8 Pima biomarkers — glucose, BMI, age, insulin, "
      + 'blood pressure, skin thickness, pregnancies, and genetic predisposition.',
    tags: ['8 Biomarkers', 'SVM + SHAP', 'Pima Dataset', '~85% Accuracy'],
    action: 'Start assessment',
    badge: null,
  },
  {
    id: 'v3',
    accent: 'violet',
    Icon: Brain,
    iconColour: '#c9b36f',
    name: 'Complication Risk Predictor',
    version: 'v3 · XGB + LGBM + RF Ensemble',
    description:
      'Predicts early hospital readmission risk (a proxy for poor glycaemic control and '
      + 'complications) from 52 clinical features across 101,766 UCI hospital records.',
    tags: ['52 Features', 'XGB+LGBM+RF', 'UCI-130 Dataset', 'Readmission Risk'],
    action: 'Assess complications',
    badge: 'New',
  },
  {
    id: 'doc-intelligence',
    accent: 'emerald',
    Icon: FileText,
    iconColour: '#71d6bd',
    name: 'Document Intelligence',
    version: 'RAG · Gemini Vision + OCR',
    description:
      'Upload a medical PDF, doctor\'s report, or image and ask questions about '
      + 'its contents. Powered by Gemini Vision, OCR, and Multi-Agent RAG.',
    tags: ['PDF Upload', 'Image OCR', 'Multi-Agent RAG', 'Citation Tracking'],
    action: 'Open document workspace',
    badge: 'New',
  },
  {
    id: 'care-locator',
    accent: 'sky',
    Icon: MapPin,
    iconColour: '#78d4c3',
    name: 'Care & Supply Locator',
    version: 'Google Maps · Real-Time Network',
    description:
      'Interactive Google Map connecting patients to endocrinologists, diagnostic labs, '
      + 'and 24/7 pharmacies stocked with insulin, CGMs, and testing strips.',
    tags: ['Google Maps API', 'Endocrinology', '24/7 Pharmacies', 'Insulin Cold-Chain'],
    action: 'Explore care network',
    badge: 'Live',
  },
]

/** Four equally weighted routes into the connected clinical workspace. */
export default function ModeSelect({ onSelect, user, onSignOut }) {
  return (
    <div className="landing-screen ms-hub-screen ms-x-hub-screen">
      <header className="ms-hub-nav">
        <div className="ms-auth-brand ms-auth-brand--compact">
          <span className="ms-auth-brand__mark" aria-hidden="true"><HeartPulse size={19} /></span>
          <span><strong>MediStore AI</strong><small>Clinical intelligence workspace</small></span>
        </div>
        <nav className="ms-hub-links" aria-label="Workspace modules">
          <button type="button" onClick={() => onSelect('v2')}>Risk prediction</button>
          <button type="button" onClick={() => onSelect('v3')}>Complications</button>
          <button type="button" onClick={() => onSelect('doc-intelligence')}>Documents</button>
          <button type="button" onClick={() => onSelect('care-locator')}>Care network</button>
        </nav>
        <div className="ms-hub-user">
          <span className="ms-user-avatar" aria-hidden="true">
            {(user?.email || 'D').charAt(0).toUpperCase()}
          </span>
          <span className="ms-hub-user__copy"><small>Signed in as</small><strong>{user?.demo ? 'Demo clinician' : user?.email || 'Clinician'}</strong></span>
          <button type="button" className="ms-icon-btn" onClick={onSignOut} aria-label="Sign out"><LogOut size={17} /></button>
        </div>
      </header>

      <main className="landing-content ms-hub-content" id="main">

        <Reveal>
          <span className="ms-pill">
            <Sparkles size={13} color="var(--sky-400)" aria-hidden="true" />
            Your connected care workspace
          </span>
        </Reveal>

        <Reveal delay={80}>
          <h2 className="ms-hero__title" style={{ fontSize: 'clamp(2rem, 5vw, 2.9rem)', margin: 'var(--sp-4) 0 var(--sp-3)' }}>
            Where would you like to begin?
          </h2>
        </Reveal>

        <Reveal delay={150}>
          <p className="ms-hero__lede" style={{ marginBottom: 'var(--sp-6)' }}>
            Move from risk assessment to document insight and nearby care without
            losing the patient context along the way.
          </p>
        </Reveal>

        <div className="ms-mode-grid">
          {MODULES.map((mod, i) => (
            <Reveal delay={200 + i * 100} key={mod.id}>
              <button
                type="button"
                className={`mode-card mode-card--${mod.accent}`}
                onClick={() => onSelect(mod.id)}
                aria-label={`${mod.name}, ${mod.version}. Open predictor.`}
              >
                <span className="mode-card__orb" aria-hidden="true" />
                {mod.badge && <span className="mode-card__badge">{mod.badge}</span>}

                <span className="mode-card__icon">
                  <mod.Icon size={24} color={mod.iconColour} aria-hidden="true" />
                </span>

                <span className="mode-card__name" style={{ display: 'block' }}>{mod.name}</span>
                <span className="mode-card__version" style={{ display: 'block' }}>{mod.version}</span>

                <span className="mode-card__desc" style={{ display: 'block' }}>{mod.description}</span>
                <span className="mode-card__tags">
                  {mod.tags.map((tag) => (
                    <span className={`ms-tag ms-tag--${mod.accent}`} key={tag}>{tag}</span>
                  ))}
                </span>
                <span className="mode-card__cta">
                  {mod.action} <ArrowRight size={16} aria-hidden="true" />
                </span>
              </button>
            </Reveal>
          ))}
        </div>

        <Reveal delay={460}>
          <div className="ms-x-hub-status" aria-label="Workspace status">
            <span><i /> Clinical intelligence ready</span>
            <span>4 connected modules</span>
            <span>One continuous patient context</span>
          </div>
        </Reveal>

      </main>
    </div>
  )
}
