import { Suspense, lazy, useCallback, useState } from 'react'
import AuroraField from './components/background/AuroraField'
import ScreenTransition from './components/ui/ScreenTransition'
import Landing from './screens/Landing'
import PublicHome from './screens/PublicHome'
import ModeSelect from './screens/ModeSelect'
import DiabetesPredictor from './screens/DiabetesPredictor'
import './App.css'
import './styles/experience.css'
import './styles/calm.css'
import './styles/landing-v2.css'
import './styles/feature-backgrounds.css'

// The v3 module is the heavier of the two (52 fields, a large option map), and
// most sessions never open it — so it is split out and fetched on demand.
const ComplicationPredictor = lazy(() => import('./screens/ComplicationPredictor'))
const DocIntelligence = lazy(() => import('./screens/DocIntelligence'))
const CareLocator = lazy(() => import('./screens/CareLocator'))

function ScreenFallback() {
  return (
    <div className="landing-screen">
      <div className="landing-content">
        <span className="spinner" aria-hidden="true" />
        <p style={{ marginTop: 'var(--sp-4)', color: 'var(--text-dim)', fontSize: '0.9rem' }}>
          Loading module…
        </p>
      </div>
    </div>
  )
}

function readStoredSession() {
  try {
    const account = window.localStorage.getItem('medistore-session')
    return account ? JSON.parse(account) : null
  } catch {
    return null
  }
}

/**
 * Screen router. The app has five screens and no URL routing, so navigation is
 * plain state — wrapped in ScreenTransition to give each change a real
 * enter/exit rather than an instant swap.
 */
export default function App() {
  // 'landing' | 'mode-select' | 'v2' | 'v3' | 'doc-intelligence' | 'care-locator'
  const [screen, setScreen] = useState(() => readStoredSession() ? 'mode-select' : 'home')
  const [user, setUser] = useState(readStoredSession)
  const [careMapContext, setCareMapContext] = useState({ riskLevel: 'all', category: 'all' })

  const goSelect = useCallback(() => setScreen('mode-select'), [])
  const handleAuthenticate = useCallback((account) => {
    setUser(account)
    if (account.remember) {
      window.localStorage.setItem('medistore-session', JSON.stringify({ email: account.email, name: account.name }))
    } else {
      window.localStorage.removeItem('medistore-session')
    }
    setScreen('mode-select')
  }, [])

  const handleSignOut = useCallback(() => {
    window.localStorage.removeItem('medistore-session')
    setUser(null)
    setScreen('home')
  }, [])

  const handleOpenCareMap = useCallback(({ riskLevel = 'all', category = 'all' } = {}) => {
    setCareMapContext({ riskLevel, category })
    setScreen('care-locator')
  }, [])

  let view
  if (screen === 'home') {
    view = <PublicHome onNavigate={setScreen} />
  } else if (screen === 'signin' || screen === 'signup') {
    view = <Landing mode={screen} onNavigate={setScreen} onAuthenticate={handleAuthenticate} />
  } else if (screen === 'mode-select') {
    view = <ModeSelect onSelect={setScreen} user={user} onSignOut={handleSignOut} />
  } else if (screen === 'v2') {
    view = <DiabetesPredictor onBack={goSelect} onNavigate={setScreen} onOpenCareMap={handleOpenCareMap} />
  } else if (screen === 'doc-intelligence') {
    view = (
      <Suspense fallback={<ScreenFallback />}>
        <DocIntelligence onBack={goSelect} onNavigate={setScreen} />
      </Suspense>
    )
  } else if (screen === 'care-locator') {
    view = (
      <Suspense fallback={<ScreenFallback />}>
        <CareLocator
          onBack={goSelect}
          onNavigate={setScreen}
          riskLevel={careMapContext.riskLevel}
          preselectedCategory={careMapContext.category}
        />
      </Suspense>
    )
  } else {
    view = (
      <Suspense fallback={<ScreenFallback />}>
        <ComplicationPredictor onBack={goSelect} onNavigate={setScreen} onOpenCareMap={handleOpenCareMap} />
      </Suspense>
    )
  }

  return (
    <>
      <a className="ms-skip-link" href="#main">Skip to main content</a>
      <AuroraField />
      <ScreenTransition screenKey={screen}>{view}</ScreenTransition>
    </>
  )
}
