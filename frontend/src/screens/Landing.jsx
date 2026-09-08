import { useState } from 'react'
import {
  ArrowRight, Check, Eye, EyeOff, LockKeyhole, Mail,
  ShieldCheck, UserRound,
} from 'lucide-react'
import PublicNav from '../components/ui/PublicNav'

export default function Landing({ mode = 'signin', onNavigate, onAuthenticate }) {
  const isSignup = mode === 'signup'
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const submit = (event) => {
    event.preventDefault()
    if (isSignup && name.trim().length < 2) {
      setError('Enter your full name to create an account.')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 4) {
      setError('Password must contain at least 4 characters.')
      return
    }
    if (isSignup && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    onAuthenticate({ email: email.trim(), name: name.trim(), remember })
  }

  const enterDemo = () => {
    setError('')
    onAuthenticate({ email: 'demo@medistore.ai', remember: false, demo: true })
  }

  return (
    <div className="ms-public-page ms-public-auth-page ms-x-page ms-x-auth-page">
      <PublicNav onNavigate={onNavigate} active={mode} />

      <main className="ms-public-auth" id="main">
        <section className="ms-public-auth__story" aria-label="MediStore clinical intelligence">
          <img src="/medistore-lake-hero-v2.png" alt="A calm forest lake representing clear, connected care" />
          <div className="ms-public-auth__story-copy">
            <span className="ms-public-eyebrow ms-public-eyebrow--light"><span /> Connected clinical intelligence</span>
            <h1>{isSignup ? 'Begin with a clearer care picture.' : 'Welcome back to clearer care.'}</h1>
            <p>One secure workspace for explainable risk insights, document analysis and nearby clinical support.</p>
            <div className="ms-public-auth__assurances">
              <span><Check size={15} /> Explainable clinical outputs</span>
              <span><Check size={15} /> Evidence-linked document answers</span>
              <span><Check size={15} /> Professional review stays central</span>
            </div>
          </div>
        </section>

        <section className="ms-public-auth__panel" aria-labelledby="auth-title">
          <div className="ms-public-auth__panel-inner">
            <span className="ms-public-auth__kicker"><ShieldCheck size={15} /> Clinical workspace access</span>
            <h2 id="auth-title">{isSignup ? 'Create your account' : 'Sign in to MediStore'}</h2>
            <p>{isSignup ? 'Set up your workspace in a few simple steps.' : 'Continue to your connected diabetes care workspace.'}</p>

            <form className="ms-public-auth__form" onSubmit={submit} noValidate>
              {isSignup && (
                <label className="ms-public-auth__field">
                  <span>Full name</span>
                  <span className="ms-public-auth__control">
                    <UserRound size={17} aria-hidden="true" />
                    <input type="text" autoComplete="name" placeholder="Dr. Alex Morgan" value={name} onChange={(event) => setName(event.target.value)} />
                  </span>
                </label>
              )}

              <label className="ms-public-auth__field">
                <span>Email address</span>
                <span className="ms-public-auth__control">
                  <Mail size={17} aria-hidden="true" />
                  <input type="email" autoComplete="email" placeholder="clinician@hospital.com" value={email} onChange={(event) => setEmail(event.target.value)} />
                </span>
              </label>

              <label className="ms-public-auth__field">
                <span>Password</span>
                <span className="ms-public-auth__control">
                  <LockKeyhole size={17} aria-hidden="true" />
                  <input type={showPassword ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'} placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)} />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </span>
              </label>

              {isSignup && (
                <label className="ms-public-auth__field">
                  <span>Confirm password</span>
                  <span className="ms-public-auth__control">
                    <LockKeyhole size={17} aria-hidden="true" />
                    <input type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Repeat your password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
                  </span>
                </label>
              )}

              <label className="ms-public-auth__remember">
                <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
                <span aria-hidden="true"><Check size={12} /></span>
                {isSignup ? 'Keep me signed in on this device' : 'Remember this device'}
              </label>

              {error && <p className="ms-public-auth__error" role="alert">{error}</p>}

              <button className="ms-public-primary ms-public-auth__submit" type="submit">
                {isSignup ? 'Create account' : 'Enter workspace'} <ArrowRight size={17} aria-hidden="true" />
              </button>
            </form>

            <div className="ms-public-auth__divider"><span>or</span></div>
            <button className="ms-public-auth__demo" type="button" onClick={enterDemo}>Explore the demo workspace</button>

            <p className="ms-public-auth__switch">
              {isSignup ? 'Already have an account?' : 'New to MediStore?'}{' '}
              <button type="button" onClick={() => onNavigate(isSignup ? 'signin' : 'signup')}>
                {isSignup ? 'Sign in' : 'Create an account'}
              </button>
            </p>

            <small className="ms-public-auth__note">Research decision-support platform. Not a substitute for professional diagnosis.</small>
          </div>
        </section>
      </main>
    </div>
  )
}
