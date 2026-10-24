import { useEffect, useState } from 'react'
import { supabase, supabaseConfigured } from './supabaseClient'
import {
  ShieldCheck, Mail, LockKeyhole, Eye, EyeOff, LogOut, MessageSquareText,
  ScanSearch, CheckCircle2, AlertTriangle, LoaderCircle, Sparkles
} from 'lucide-react'

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')

export default function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [authBusy, setAuthBusy] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [authError, setAuthError] = useState('')
  const [message, setMessage] = useState('')
  const [prediction, setPrediction] = useState(null)
  const threatAnalysis = prediction
  ? analyzeThreats(message)
  : null
  const [predictBusy, setPredictBusy] = useState(false)
  const [predictError, setPredictError] = useState('')

  useEffect(() => {
    if (!supabaseConfigured || !supabase) {
      setAuthReady(true)
      return
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setAuthReady(true)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthMessage('')
    setAuthError('')
    setAuthBusy(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password
        })
        if (error) throw error
        if (!data.session) {
          setAuthMessage('Account created. Check your email for a confirmation link, then sign in.')
        } else {
          setAuthMessage('Account created successfully.')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        })
        if (error) throw error
      }
    } catch (error) {
      setAuthError(error.message || 'Authentication failed. Please try again.')
    } finally {
      setAuthBusy(false)
    }
  }

  async function handleGoogleSignIn() {
    setAuthError('')
    setAuthMessage('')
    setAuthBusy(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      })
      if (error) throw error
    } catch (error) {
      setAuthError(error.message || 'Google sign-in failed.')
      setAuthBusy(false)
    }
  }

  async function handleSignOut() {
  setAuthError('')
  setAuthMessage('')

  const { error } = await supabase.auth.signOut()

  if (error) {
    setAuthError(error.message)
    return
  }

  setSession(null)
  setPrediction(null)
  setMessage('')
  setMode('signin')
}

  async function handlePredict(event) {
    event.preventDefault()
    setPrediction(null)
    setPredictError('')
    if (!message.trim()) {
      setPredictError('Enter an SMS message first.')
      return
    }
    if (!API_BASE) {
      setPredictError('The API URL is not configured. Set VITE_API_BASE_URL in Vercel.')
      return
    }
    setPredictBusy(true)
    try {
      const response = await fetch(`${API_BASE}/api/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || `API error (${response.status})`)
      setPrediction(data)
    } catch (error) {
      setPredictError(`${error.message}. Check that the Render API is deployed and its URL is correct.`)
    } finally {
      setPredictBusy(false)
    }
  }
  

  if (!supabaseConfigured) {
    return <SetupNotice />
  }

  if (!authReady) {
    return <main className="loading-screen"><LoaderCircle className="spin" /> Loading SpamShield…</main>
  }

  if (!session) {
    return (
      <main className="auth-layout">
        <section className="auth-story">
          <div className="brand"><span className="brand-icon"><ShieldCheck /></span><span>SpamShield</span></div>
          <div className="story-copy">
            <span className="eyebrow"><Sparkles size={15} /> AI-POWERED SMS CHECKING</span>
            <h1>Spot suspicious messages before you trust them.</h1>
            <p>Sign in to try a machine-learning demo that classifies SMS messages as spam or not spam.</p>
            <div className="feature-line"><CheckCircle2 /> A model trained on labeled SMS examples</div>
            <div className="feature-line"><CheckCircle2 /> Simple, quick message checks</div>
            <div className="feature-line"><CheckCircle2 /> Your own secure sign-in session</div>
          </div>
          <p className="story-foot">A learning project. Predictions can be wrong.</p>
        </section>
        <section className="auth-panel">
          <div className="auth-card">
            <div className="mobile-brand brand"><span className="brand-icon"><ShieldCheck /></span><span>SpamShield</span></div>
            <h2>{mode === 'signin' ? 'Welcome back' : 'Create your account'}</h2>
            <p className="muted">{mode === 'signin' ? 'Sign in to open your dashboard.' : 'Create an account to start checking messages.'}</p>
            <button className="google-button" onClick={handleGoogleSignIn} disabled={authBusy}>
              <GoogleMark /> Continue with Google
            </button>
            <div className="separator"><span>or continue with email</span></div>
            <form onSubmit={handleAuthSubmit} className="auth-form">
              <label htmlFor="email">Email address</label>
              <div className="field"><Mail size={18} /><input id="email" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
              <label htmlFor="password">Password</label>
              <div className="field"><LockKeyhole size={18} /><input id="password" type={showPassword ? 'text' : 'password'} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} placeholder="At least 6 characters" value={password} onChange={e => setPassword(e.target.value)} minLength={6} required /><button type="button" className="eye-button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
              <button className="primary-button" type="submit" disabled={authBusy}>{authBusy ? <LoaderCircle className="spin" size={18} /> : null}{mode === 'signin' ? 'Sign in' : 'Create account'}</button>
            </form>
            {authError && <p className="alert error"><AlertTriangle size={17} /> {authError}</p>}
            {authMessage && <p className="alert success"><CheckCircle2 size={17} /> {authMessage}</p>}
            <p className="switch-mode">{mode === 'signin' ? "Don't have an account?" : 'Already registered?'} <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setAuthError(''); setAuthMessage('') }}>{mode === 'signin' ? 'Sign up' : 'Sign in'}</button></p>
            <p className="privacy-note">Never share your password with anyone. Sign-in is handled by Supabase.</p>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-icon"><ShieldCheck /></span><span>SpamShield</span></div>
        <div className="user-actions"><span className="user-email">{session.user.email || 'Signed-in user'}</span><button className="signout-button" onClick={handleSignOut}><LogOut size={16} /> Sign out</button></div>
      </header>
      <section className="dashboard">
        <div className="welcome"><span className="eyebrow"><Sparkles size={15} /> YOUR AI MESSAGE CHECKER</span><h1>Check a message.</h1><p>Paste an SMS below to estimate whether it resembles spam in the training dataset.</p></div>
        <div className="checker-card">
          <div className="card-heading"><span className="heading-icon"><MessageSquareText /></span><div><h2>SMS checker</h2><p className="muted">Don't include passwords, verification codes, or private information.</p></div></div>
          <form onSubmit={handlePredict}>
            <label htmlFor="sms-message">Message text</label>
            <textarea id="sms-message" rows="6" maxLength={5000} placeholder="Paste the SMS message here…" value={message} onChange={e => { setMessage(e.target.value); setPrediction(null); setPredictError('') }} />
            <div className="textarea-meta"><span>Keep sensitive information out of the demo.</span><span>{message.length}/5000</span></div>
            <button className="primary-button check-button" type="submit" disabled={predictBusy}>{predictBusy ? <LoaderCircle className="spin" size={18} /> : <ScanSearch size={18} />}{predictBusy ? 'Checking message…' : 'Check message'}</button>
          </form>
          {predictError && <p className="alert error"><AlertTriangle size={17} /> {predictError}</p>}
          {prediction && (
            <div className={`result-card ${prediction.label === 'spam' ? 'spam-result' : 'ham-result'}`}>
              <div className="result-icon">{prediction.label === 'spam' ? <AlertTriangle /> : <CheckCircle2 />}</div>
              <div className="result-copy"><span className="result-kicker">MODEL PREDICTION</span><h3>{prediction.display_label}</h3><p>{prediction.label === 'spam' ? 'This message resembles spam examples the model learned from.' : 'This message resembles legitimate examples the model learned from.'}</p>{prediction.spam_probability !== null && prediction.spam_probability !== undefined && <p className="score">Estimated spam probability: <strong>{prediction.spam_probability}%</strong></p>}</div>
            </div>
          )}
        </div>
        <div className="disclaimer">{threatAnalysis && (
            <div className="threat-card">
              <div className="threat-header">
                <div>
                  <span className="threat-kicker">SECURITY SCAN</span>
                  <h3>Spam Threat Analysis</h3>
                  <p>Rule-based checks for common suspicious patterns.</p>
                </div>
                <span className={`risk-badge risk-${threatAnalysis.risk.toLowerCase()}`}>
                  {threatAnalysis.risk} Risk
                </span>
              </div>

              <div className="threat-score-row">
                <div className="threat-score">
                  <strong>{threatAnalysis.score}</strong>
                  <span>/100</span>
                </div>
                <div>
                  <strong>Threat indicator</strong>
                  <p>This is a rule-based score, not a probability of fraud.</p>
                </div>
              </div>

              <div className="threat-progress">
                <div
                  className={`threat-progress-fill risk-${threatAnalysis.risk.toLowerCase()}`}
                  style={{ width: `${threatAnalysis.score}%` }}
                />
              </div>

              <h4 className="threat-section-title">Warning signs</h4>

              {threatAnalysis.threats.length === 0 ? (
                <div className="threat-empty">
                  <CheckCircle2 size={20} />
                  <div>
                    <strong>No common warning patterns detected</strong>
                    <p>This does not guarantee that the message is safe.</p>
                  </div>
                </div>
              ) : (
                <div className="threat-list">
                  {threatAnalysis.threats.map((threat, index) => (
                    <div className="threat-item" key={index}>
                      <span className={`threat-warning-icon risk-${threat.level}`}>
                        <AlertTriangle size={19} />
                      </span>
                      <div>
                        <strong>{threat.name}</strong>
                        <p>{threat.description}</p>
                      </div>
                      <span className={`threat-level risk-${threat.level}`}>
                        {threat.level}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}<AlertTriangle size={17} /><p><strong>Important:</strong> This is an educational classifier, not a security guarantee. It can misclassify messages. Verify links and requests independently.</p></div>
      </section>
      <footer className="footer">SpamShield · Student learning project · AI predictions are not guarantees</footer>
    </main>
  )
}

function SetupNotice() {
  return <main className="setup-screen"><div className="setup-card"><span className="brand-icon"><ShieldCheck /></span><h1>Finish SpamShield setup</h1><p>Authentication settings are missing. Add the following environment variables in your frontend hosting settings, then redeploy.</p><pre>VITE_SUPABASE_URL{'\n'}VITE_SUPABASE_ANON_KEY{'\n'}VITE_API_BASE_URL</pre><p>See the PDF guide and <code>frontend/.env.example</code>. Never use the Supabase service-role key in the browser.</p></div></main>
}

function GoogleMark() {
  return <svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.95 46.98 31.86 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.95 23.95 0 0 0 0 21.56l7.98-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.44-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
}
function analyzeThreats(message) {
  const text = message.toLowerCase()
  const threats = []

  const checks = [
    {
      name: 'Suspicious link',
      description: 'Contains a web link. Verify the website before opening it.',
      test: /https?:\/\/|www\./i,
      level: 'medium',
    },
    {
      name: 'Link shortener',
      description: 'Shortened links can hide the destination website.',
      test: /bit\.ly|tinyurl\.com|t\.co|is\.gd|cutt\.ly/i,
      level: 'high',
    },
    {
      name: 'Urgent or threatening language',
      description: 'Uses pressure or urgency to encourage a quick response.',
      test: /\b(urgent|immediately|act now|account suspended|account blocked|expires today|verify now)\b/i,
      level: 'medium',
    },
    {
      name: 'Prize or reward claim',
      description: 'Promises a prize, lottery win, gift, or reward.',
      test: /\b(you have won|you won|winner|lottery|claim your prize|free gift|cash reward)\b/i,
      level: 'medium',
    },
    {
      name: 'Sensitive information request',
      description: 'May ask for passwords, OTPs, PINs, or banking details.',
      test: /\b(share your otp|send your otp|enter your pin|password required|bank details|verify your password)\b/i,
      level: 'high',
    },
    {
      name: 'Unusual payment request',
      description: 'Mentions a payment or fee that should be independently verified.',
      test: /\b(pay a fee|send money|transfer money|processing fee|claim fee|payment required)\b/i,
      level: 'medium',
    },
  ]

  for (const check of checks) {
    if (check.test.test(text)) {
      threats.push({
        name: check.name,
        description: check.description,
        level: check.level,
      })
    }
  }

  const highCount = threats.filter(item => item.level === 'high').length
  const score = Math.min(
    100,
    threats.reduce((total, item) => total + (item.level === 'high' ? 35 : 18), 0)
  )

  let risk = 'Low'
  if (highCount > 0 || score >= 50) risk = 'High'
  else if (score >= 18) risk = 'Medium'

  return { threats, score, risk }
}
