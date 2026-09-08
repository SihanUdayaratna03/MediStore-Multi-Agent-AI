import { HeartPulse, Menu, UserRound, X } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function PublicNav({ onNavigate, active = 'home' }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  const navigate = (destination) => {
    setOpen(false)
    onNavigate(destination)
  }

  const navigateSection = (sectionId) => {
    setOpen(false)
    if (active !== 'home') onNavigate('home')
    window.setTimeout(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' }), active === 'home' ? 0 : 80)
  }

  return (
    <header className="ms-public-nav-wrap">
      <nav className="ms-public-nav" aria-label="Primary navigation">
        <button className="ms-public-brand" type="button" onClick={() => navigate('home')}>
          <span className="ms-public-brand__mark" aria-hidden="true"><HeartPulse size={19} /></span>
          <span>MediStore <strong>AI</strong></span>
        </button>

        <div id="public-navigation-links" className={`ms-public-nav__links${open ? ' is-open' : ''}`}>
          <button type="button" onClick={() => navigate('home')} aria-current={active === 'home' ? 'page' : undefined}>Platform</button>
          <button type="button" onClick={() => navigateSection('modules')}>Clinical AI</button>
          <button type="button" onClick={() => navigateSection('modules')}>Document Intelligence</button>
          <button type="button" onClick={() => navigateSection('modules')}>Care Network</button>
        </div>

        <div className="ms-public-nav__actions">
          <button className="ms-public-signin" type="button" onClick={() => navigate('signin')}>Sign in</button>
          <button className="ms-public-primary ms-public-primary--sm" type="button" onClick={() => navigate('signin')}><UserRound size={16} /> Clinical portal</button>
          <button
            className="ms-public-menu"
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={open}
            aria-controls="public-navigation-links"
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </nav>
    </header>
  )
}
