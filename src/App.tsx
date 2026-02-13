import { useState, useEffect } from 'react'
import './index.css'

// Types
interface User {
  id: string
  name: string
  email: string
  password: string
  userNumber: number
  tierName: string
  tierTitle: string
  tierClass: string
  joined: string
}

interface VoteOption {
  name: string
  votes: number
  percentage: number
}

// Constants
const ADMIN_EMAIL = 'info@truthbtoldhub.com'

const PAST_VOTES: VoteOption[] = [
  { name: 'Sacred Sign-In', votes: 3, percentage: 50 },
  { name: 'Teachings & Dialogues', votes: 2, percentage: 33.3 },
  { name: 'The Pool', votes: 1, percentage: 16.7 },
]

const FEATURES = [
  { name: 'Community Ballot', icon: '🗳️', desc: 'Vote on next features', locked: false },
  { name: 'The Pool', icon: '💰', desc: 'Community fund', locked: false },
  { name: 'Hymnal Music', icon: '🎵', desc: 'Tracks & instrumentals', locked: true },
  { name: 'TBT Chat', icon: '💬', desc: 'Real-time discussion', locked: true },
  { name: 'The Library', icon: '📚', desc: 'Writings & references', locked: true },
  { name: 'Creative Works', icon: '🎬', desc: 'Art, film, projects', locked: true },
  { name: 'Teachings', icon: '🎓', desc: 'Faith & dialogue', locked: true },
  { name: 'Action & Outreach', icon: '🤝', desc: 'Mutual aid & events', locked: true },
]

function App() {
  const [view, setView] = useState<'signin' | 'signup' | 'dashboard'>('signin')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState('')

  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    const storedUsers = localStorage.getItem('tbt_users')
    if (storedUsers) {
      setUsers(JSON.parse(storedUsers))
    }
    
    const storedUser = localStorage.getItem('tbt_currentUser')
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser))
      setView('dashboard')
    }
  }, [])

  const getTier = (userNumber: number): { name: string; title: string; class: string } => {
    if (userNumber <= 13) return { name: 'Founding Ember', title: '👑 In at the beginning', class: 'tier-founding' }
    if (userNumber <= 33) return { name: 'Sacred Circle', title: '⚜ Among the first flames', class: 'tier-sacred' }
    if (userNumber <= 83) return { name: 'Ember Keeper', title: '🔥 Kept the fire alive', class: 'tier-keeper' }
    return { name: 'Member', title: '◈ Welcome', class: 'tier-member' }
  }

  const handleSignUp = () => {
    setError('')
    
    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields')
      return
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (existingUser) {
      setError('This email is already inscribed')
      return
    }

    const userNumber = users.length + 1
    const tier = getTier(userNumber)

    const newUser: User = {
      id: Date.now().toString(),
      name,
      email: email.toLowerCase(),
      password,
      userNumber,
      tierName: tier.name,
      tierTitle: tier.title,
      tierClass: tier.class,
      joined: new Date().toISOString(),
    }

    const updatedUsers = [...users, newUser]
    setUsers(updatedUsers)
    localStorage.setItem('tbt_users', JSON.stringify(updatedUsers))
    
    localStorage.setItem('tbt_currentUser', JSON.stringify(newUser))
    setCurrentUser(newUser)
    setView('dashboard')
    
    // Clear form
    setName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
  }

  const handleSignIn = () => {
    setError('')
    
    if (!email || !password) {
      setError('Please enter your email and password')
      return
    }

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
    
    if (!user) {
      setError('Invalid Sacred Mark or Secret Word')
      return
    }

    localStorage.setItem('tbt_currentUser', JSON.stringify(user))
    setCurrentUser(user)
    setView('dashboard')
    
    setEmail('')
    setPassword('')
  }

  const handleSignOut = () => {
    localStorage.removeItem('tbt_currentUser')
    setCurrentUser(null)
    setView('signin')
    setError('')
  }

  return (
    <div className="app">
      <canvas id="flameCanvas" className="flame-canvas" />
      
      <div className="container">
        {/* Header */}
        <header className="header">
          <h1 className="logo">TRUTH BE TOLD HUB</h1>
          <p className="tagline">The Sacred Scroll</p>
          <div className="ornament">❧</div>
        </header>

        {/* Sign In Form */}
        {view === 'signin' && (
          <div className="scroll-card">
            <h2>Enter the Sanctuary</h2>
            
            {error && <div className="message error">{error}</div>}
            
            <div className="form-group">
              <label>Sacred Mark (Email)</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            
            <div className="form-group">
              <label>Secret Word (Password)</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            
            <button className="btn-primary" onClick={handleSignIn}>
              Enter the Fire
            </button>
            
            <p className="switch-text">
              No mark yet?{' '}
              <button className="switch-btn" onClick={() => { setError(''); setView('signup') }}>
                Begin your inscription
              </button>
            </p>
          </div>
        )}

        {/* Sign Up Form */}
        {view === 'signup' && (
          <div className="scroll-card">
            <h2>Forge Your Mark</h2>
            
            {error && <div className="message error">{error}</div>}
            
            <div className="form-group">
              <label>Sacred Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your chosen name"
              />
            </div>
            
            <div className="form-group">
              <label>Sacred Mark (Email)</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
              />
            </div>
            
            <div className="form-group">
              <label>Secret Word (Password)</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="6+ characters"
              />
            </div>
            
            <div className="form-group">
              <label>Confirm Secret Word</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
              />
            </div>
            
            <button className="btn-primary" onClick={handleSignUp}>
              Inscribe Your Mark
            </button>
            
            <p className="switch-text">
              Already inscribed?{' '}
              <button className="switch-btn" onClick={() => { setError(''); setView('signin') }}>
                Return to sign in
              </button>
            </p>
          </div>
        )}

        {/* Dashboard */}
        {view === 'dashboard' && currentUser && (
          <div className="dashboard">
            <div className="dashboard-card">
              <h2>Welcome, {currentUser.name}</h2>
              
              <div className="user-number">#{currentUser.userNumber}</div>
              
              <div className={`tier-badge ${currentUser.tierClass}`}>
                {currentUser.tierName}
              </div>
              
              <p className="tier-inscription">{currentUser.tierTitle}</p>
              
              {currentUser.email === ADMIN_EMAIL && (
                <div className="admin-badge">🔮 Admin</div>
              )}
              
              <button className="btn-signout" onClick={handleSignOut}>
                Depart from Sanctuary
              </button>
            </div>

            {/* Past Votes */}
            <div className="dashboard-card">
              <h3>📜 Past Votes</h3>
              <div className="vote-results">
                {PAST_VOTES.map((v, i) => (
                  <div key={i} className="vote-item">
                    <span className="vote-name">{v.name}</span>
                    <div className="vote-bar">
                      <div className="vote-fill" style={{ width: `${v.percentage}%` }}></div>
                    </div>
                    <span className="vote-pct">{v.percentage}% ({v.votes})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Features */}
            <div className="dashboard-card">
              <h3>🔥 Sanctuary Features</h3>
              <div className="features-grid">
                {FEATURES.map((f, i) => (
                  <div key={i} className={`feature-tile ${f.locked ? 'locked' : ''}`}>
                    <span className="feature-icon">{f.icon}</span>
                    <span className="feature-name">{f.name}</span>
                    <span className="feature-desc">{f.desc}</span>
                    {f.locked && <span className="lock">🔒</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="dashboard-card stats">
              <div className="stat">
                <span className="stat-num">{users.length}</span>
                <span className="stat-label">Members</span>
              </div>
              <div className="stat">
                <span className="stat-num">{PAST_VOTES.reduce((a, b) => a + b.votes, 0)}</span>
                <span className="stat-label">Votes Cast</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App