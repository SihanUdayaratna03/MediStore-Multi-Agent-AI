import {
  Activity, ArrowRight, Box, Building2, Check, CircleUserRound,
  Database, Droplets, FileChartColumn, HeartPulse, MapPin, ShieldCheck,
  Sparkles, Stethoscope, TrendingUp, UsersRound,
} from 'lucide-react'
import PublicNav from '../components/ui/PublicNav'
import Reveal from '../components/ui/Reveal'

const RISK_FACTORS = [
  { label: 'Normal BMI', value: '+0.18', width: '88%', kind: 'protective' },
  { label: 'Active lifestyle', value: '+0.14', width: '72%', kind: 'protective' },
  { label: 'Healthy diet', value: '+0.09', width: '54%', kind: 'protective' },
  { label: 'Family history', value: '-0.10', width: '62%', kind: 'risk' },
  { label: 'Sedentary behavior', value: '-0.08', width: '51%', kind: 'risk' },
  { label: 'Age', value: '-0.05', width: '38%', kind: 'risk' },
]

const MODULES = [
  {
    Icon: Droplets,
    title: 'Diabetes Risk',
    description: 'Assess individual risk with explainable AI and key biomarkers.',
    accent: 'cyan',
    destination: 'signup',
  },
  {
    Icon: TrendingUp,
    title: 'Complication Forecasting',
    description: 'Anticipate complications early and support proactive care.',
    accent: 'violet',
    destination: 'signup',
  },
  {
    Icon: FileChartColumn,
    title: 'Document Intelligence',
    description: 'Extract cited insights from clinical documents in moments.',
    accent: 'green',
    destination: 'signup',
  },
  {
    Icon: MapPin,
    title: 'Care & Supply Locator',
    description: 'Find nearby care, pharmacies and diabetes supplies in real time.',
    accent: 'blue',
    destination: 'signup',
  },
]

function RiskGauge() {
  return (
    <div className="ms-landing-gauge" aria-label="24 percent, low diabetes risk">
      <div className="ms-landing-gauge__inner">
        <strong>24<span>%</span></strong>
        <small><Check size={13} /> Low risk</small>
      </div>
    </div>
  )
}

function TrendChart() {
  return (
    <svg className="ms-trend-chart" viewBox="0 0 340 118" role="img" aria-label="HbA1c trend decreased from 7.4 to 5.3 over six months">
      <defs>
        <linearGradient id="trend-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#26a98e" stopOpacity=".28" />
          <stop offset="1" stopColor="#26a98e" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g className="ms-trend-grid">
        <path d="M34 12V96M86 12V96M138 12V96M190 12V96M242 12V96M294 12V96" />
        <path d="M22 22H318M22 58H318M22 94H318" />
      </g>
      <path className="ms-trend-area" d="M34 28 L86 35 L138 39 L190 48 L242 69 L294 88 L294 96 L34 96 Z" />
      <path className="ms-trend-line" d="M34 28 L86 35 L138 39 L190 48 L242 69 L294 88" />
      {[['34','28'], ['86','35'], ['138','39'], ['190','48'], ['242','69'], ['294','88']].map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="4.5" />
      ))}
      <g className="ms-trend-labels">
        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((month, index) => <text key={month} x={34 + index * 52} y="114">{month}</text>)}
      </g>
    </svg>
  )
}

function CareMap() {
  return (
    <div className="ms-care-preview" aria-label="Nearby care map showing a pharmacy 1.2 kilometers away">
      <svg viewBox="0 0 360 124" aria-hidden="true">
        <g className="ms-care-roads">
          <path d="M-10 23L84 71L153 39L226 96L370 35" />
          <path d="M22 -10L88 132M113 -12L139 50L102 130M225 -10L204 57L254 132M319 -8L297 45L370 82" />
          <path d="M-10 103L60 87L126 104L205 72L277 77L370 116" />
        </g>
        <circle className="ms-care-radius" cx="205" cy="61" r="48" />
        <circle className="ms-care-user" cx="102" cy="55" r="7" />
      </svg>
      <span className="ms-care-pin"><HeartPulse size={18} /></span>
      <span className="ms-care-pulse" />
    </div>
  )
}

function ClinicalDashboard() {
  return (
    <div className="ms-clinical-dashboard">
      <section className="ms-dashboard-card ms-dashboard-card--risk">
        <header className="ms-dashboard-heading">
          <div>
            <span>Today’s assessment</span>
            <h2>Diabetes Risk Overview</h2>
          </div>
          <span className="ms-dashboard-heading__icon"><Activity size={19} /></span>
        </header>

        <div className="ms-risk-overview">
          <RiskGauge />
          <div className="ms-biomarkers">
            <div><span className="is-cyan"><Droplets size={16} /></span><p>Glucose<small>Normal range</small></p><strong>112 <small>mg/dL</small></strong><i /></div>
            <div><span className="is-violet"><CircleUserRound size={16} /></span><p>BMI<small>Healthy range</small></p><strong>22.1</strong><i /></div>
            <div><span className="is-green"><HeartPulse size={16} /></span><p>Blood pressure<small>Within target</small></p><strong>118/76 <small>mmHg</small></strong><i /></div>
          </div>
        </div>

        <div className="ms-explanation">
          <div className="ms-explanation__head"><strong>Why this result</strong><span><Sparkles size={13} /> Feature contribution</span></div>
          <div className="ms-factor-grid">
            {RISK_FACTORS.map((factor) => (
              <div className={`ms-factor ms-factor--${factor.kind}`} key={factor.label}>
                <span>{factor.label}</span><i><b style={{ width: factor.width }} /></i><strong>{factor.value}</strong>
              </div>
            ))}
          </div>
          <footer><span><ShieldCheck size={13} /> Protective factors</span><span>Risk factors</span></footer>
        </div>
      </section>

      <div className="ms-dashboard-stack">
        <section className="ms-dashboard-card ms-dashboard-card--trend">
          <header className="ms-mini-card-head">
            <span className="is-green"><FileChartColumn size={17} /></span>
            <div><strong>HbA1c trend detected</strong><small>Last 6 months</small></div>
            <span className="ms-status-check"><Check size={13} /></span>
          </header>
          <TrendChart />
        </section>

        <section className="ms-dashboard-card ms-dashboard-card--care">
          <header className="ms-mini-card-head">
            <span className="is-blue"><MapPin size={17} /></span>
            <div><strong>Nearby Care</strong><small>Based on your location</small></div>
            <span className="ms-live-label"><i /> Live</span>
          </header>
          <CareMap />
          <footer className="ms-care-result">
            <span><Building2 size={18} /></span>
            <div><strong>24/7 MediCare Pharmacy</strong><small>1.2 km away · Open now</small></div>
            <ArrowRight size={15} />
          </footer>
        </section>
      </div>
    </div>
  )
}

export default function PublicHome({ onNavigate }) {
  return (
    <div className="ms-public-page ms-x-page ms-new-home">
      <PublicNav onNavigate={onNavigate} active="home" />

      <main id="main" className="ms-landing-main">
        <section className="ms-landing-hero">
          <div className="ms-landing-hero__copy">
            <Reveal>
              <span className="ms-landing-kicker"><Sparkles size={14} /> Clinical diabetic intelligence</span>
            </Reveal>
            <Reveal delay={60}>
              <h1>Smarter diabetes care, powered by <em>explainable AI.</em></h1>
            </Reveal>
            <Reveal delay={120}>
              <p>Predict risk. Understand clinical documents.<br />Find trusted care and diabetic supplies nearby.</p>
            </Reveal>
            <Reveal delay={180}>
              <div className="ms-landing-actions">
                <button className="ms-landing-button ms-landing-button--primary" type="button" onClick={() => onNavigate('signup')}>
                  Get started <ArrowRight size={18} />
                </button>
                <a className="ms-landing-button ms-landing-button--secondary" href="#modules">
                  Explore modules <ArrowRight size={18} />
                </a>
              </div>
            </Reveal>
            <Reveal delay={230}>
              <span className="ms-landing-audience"><UsersRound size={17} /> Built for healthcare professionals, pharmacists, and patients</span>
            </Reveal>
          </div>

          <Reveal delay={100} className="ms-landing-hero__visual">
            <ClinicalDashboard />
          </Reveal>
        </section>

        <Reveal className="ms-proof-bar">
          <div><span className="is-cyan"><Database size={25} /></span><strong>101,766<small>Training records</small></strong></div>
          <div><span className="is-violet"><Activity size={25} /></span><strong>60+<small>Clinical features</small></strong></div>
          <div><span className="is-green"><ShieldCheck size={25} /></span><strong>2<small>Validated models</small></strong></div>
          <div><span className="is-blue"><Box size={25} /></span><strong>4<small>Integrated modules</small></strong></div>
        </Reveal>

        <section className="ms-module-grid" id="modules" aria-label="MediStore modules">
          {MODULES.map(({ Icon, title, description, accent, destination }, index) => (
            <Reveal delay={60 + index * 55} key={title}>
              <article className={`ms-module-card ms-module-card--${accent}`}>
                <span className="ms-module-card__icon"><Icon size={27} /></span>
                <div><h2>{title}</h2><p>{description}</p></div>
                <button type="button" onClick={() => onNavigate(destination)} aria-label={`Open ${title}`}><ArrowRight size={18} /></button>
              </article>
            </Reveal>
          ))}
        </section>
      </main>

      <footer className="ms-landing-footer">
        <span><HeartPulse size={17} /> MediStore AI</span>
        <small>Clinical decision support · Professional review remains essential</small>
        <span><Stethoscope size={16} /> Explainable by design</span>
      </footer>
    </div>
  )
}
