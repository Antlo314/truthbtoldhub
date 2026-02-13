import { useState, useEffect } from 'react'
import './index.css'

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

const ADMIN_EMAIL = 'info@truthbtoldhub.com'

const PAST_VOTES = [
  { name: 'Sacred Sign-In', votes: 3, percentage: 50 },
  { name: 'Teachings & Dialogues', votes: 2, percentage: 33.3 },
  { name: 'The Pool', votes: 1, percentage: 16.7 },
]

const FEATURES = [
  { name: 'Community Ballot', icon: '📜', desc: 'Vote on next features' },
  { name: 'The Pool', icon: '⚱', desc: 'Community fund' },
  { name: 'Hymnal Music', icon: '🎵', desc: 'Tracks & instrumentals' },
  { name: 'TBT Chat', icon: '💬', desc: 'Real-time discussion' },
  { name: 'The Library', icon: '📚', desc: 'Writings & references' },
  { name: 'Creative Works', icon: '🎬', desc: 'Art, film, projects' },
]

function App() {
  const [view, setView] = useState<'signin' | 'signup' | 'dashboard'>('signin')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState('')

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

  const getTier = (userNumber: number) => {
    if (userNumber <= 13) return { name: 'Founding Ember', title: 'In at the beginning', class: 'tier-gold' }
    if (userNumber <= 33) return { name: 'Sacred Circle', title: 'Among the first flames', class: 'tier-silver' }
    if (userNumber <= 83) return { name: 'Ember Keeper', title: 'Kept the fire alive', class: 'tier-bronze' }
    return { name: 'Member', title: 'Welcome', class: 'tier-basic' }
  }

  const handleSignUp = () => {
    setError('')
    if (!name || !email || !password || !confirmPassword) {
      setError('Fill all fields')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords dont match')
      return
    }
    if (password.length < 6) {
      setError('Password must be 6+ characters')
      return
    }

    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase())
    if (existingUser) {
      setError('Email already inscribed')
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
    
    setName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
  }

  const handleSignIn = () => {
    setError('')
    if (!email || !password) {
      setError('Enter email and password')
      return
    }

    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password)
    if (!user) {
      setError('Invalid credentials')
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
      <div className="container">
        <header className="header">
          <div className="logo">🔥</div>
          <h1>TRUTH BE TOLD</h1>
          <p className="tagline">Revelations of Knowledge</p>
        </header>

        {view === 'signin' && (
          <div className="card">
            <h2>Enter the Sanctuary</h2>
            {error && <div className="error">{error}</div>}
            <input type="email" placeholder="Sacred Mark (Email)" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Secret Word" value={password} onChange={e => setPassword(e.target.value)} />
            <button onClick={handleSignIn}>Enter</button>
            <p className="switch">No mark? <button onClick={() => { setError(''); setView('signup') }}>Begin inscription</button></p>
          </div>
        )}

        {view === 'signup' && (
          <div className="card">
            <h2>Forge Your Mark</h2>
            {error && <div className="error">{error}</div>}
            <input type="text" placeholder="Sacred Name" value={name} onChange={e => setName(e.target.value)} />
            <input type="email" placeholder="Sacred Mark (Email)" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Secret Word" value={password} onChange={e => setPassword(e.target.value)} />
            <input type="password" placeholder="Confirm Secret Word" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            <button onClick={handleSignUp}>Inscribe</button>
            <p className="switch">Already inscribed? <button onClick={() => { setError(''); setView('signin') }}>Sign in</button></p>
          </div>
        )}

        {view === 'dashboard' && currentUser && (
          <div className="dashboard">
            <div className="card welcome">
              <h2>Welcome, {currentUser.name}</h2>
              <div className="user-num">№ {currentUser.userNumber}</div>
              <div className={`tier ${currentUser.tierClass}`}>{currentUser.tierName}</div>
              <p className="tier-title">{currentUser.tierTitle}</p>
              {currentUser.email === ADMIN_EMAIL && <div className="admin">👁 Admin</div>}
              <button className="signout" onClick={handleSignOut}>Depart</button>
            </div>

            <div className="card">
              <h3>📜 Past Votes</h3>
              {PAST_VOTES.map((v, i) => (
                <div key={i} className="vote-row">
                  <span>{v.name}</span>
                  <span>{v.percentage}%</span>
                </div>
              ))}
            </div>

            <div className="card">
              <h3>🔥 Sanctuary</h3>
              <div className="features">
                {FEATURES.map((f, i) => (
                  <div key={i} className="feature">
                    <span>{f.icon}</span>
                    <span>{f.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="stats">
              <div><span>{users.length}</span>Members</div>
              <div><span>{PAST_VOTES.reduce((a,b) => a + b.votes, 0)}</span>Votes</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App