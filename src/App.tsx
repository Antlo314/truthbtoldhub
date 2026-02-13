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

interface Vote {
  id: string
  userId: string
  userName: string
  option: string
  timestamp: string
}

interface Suggestion {
  id: string
  userId: string
  userName: string
  text: string
  votes: number
  timestamp: string
}

const ADMIN_EMAIL = 'admin@truthbtoldhub.com'

const VOTE_OPTIONS = [
  'The Stage',
  'The Circle', 
  'The Pool',
  'The Gallery',
  'The Library',
  'The Temple',
  'The Council',
  'The Archive'
]

const FEATURES = [
  { 
    name: 'The Stage', 
    icon: '🎵', 
    desc: 'Original music, podcasts, spoken word, and audio creations from the community.',
    coming: 'Coming Soon'
  },
  { 
    name: 'The Circle', 
    icon: '💬', 
    desc: 'Real-time discussion, debates, and connections without algorithmic noise.',
    coming: 'Coming Soon'
  },
  { 
    name: 'The Pool', 
    icon: '⚱', 
    desc: 'Community fund for mutual aid, projects, emergencies, and voted initiatives.',
    coming: 'Coming Soon'
  },
  { 
    name: 'The Gallery', 
    icon: '🎬', 
    desc: 'Videos, short films, visual art, and experimental creative projects.',
    coming: 'Coming Soon'
  },
  { 
    name: 'The Library', 
    icon: '📚', 
    desc: 'Curated writings, documents, videos, and references for study and discovery.',
    coming: 'Coming Soon'
  },
  { 
    name: 'The Temple', 
    icon: '🎓', 
    desc: 'Long-form teachings and guided dialogues on faith, society, power, and truth.',
    coming: 'Coming Soon'
  },
  { 
    name: 'The Council', 
    icon: '🏛', 
    desc: 'Member spotlights, collaborations, local projects, and community events.',
    coming: 'Coming Soon'
  },
  { 
    name: 'The Archive', 
    icon: '📜', 
    desc: 'A chronological record of moments the community preserves for posterity.',
    coming: 'Coming Soon'
  },
]

function App() {
  const [view, setView] = useState<'signin' | 'signup' | 'dashboard'>('signin')
  const [tab, setTab] = useState<'home' | 'members' | 'activity' | 'profile' | 'suggestions'>('home')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  const [editName, setEditName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  
  const [hasVoted, setHasVoted] = useState(false)
  const [suggestionText, setSuggestionText] = useState('')

  useEffect(() => {
    const storedUsers = localStorage.getItem('tbt_users')
    if (storedUsers) setUsers(JSON.parse(storedUsers))
    
    const storedVotes = localStorage.getItem('tbt_votes')
    if (storedVotes) setVotes(JSON.parse(storedVotes))
    
    const storedSuggestions = localStorage.getItem('tbt_suggestions')
    if (storedSuggestions) setSuggestions(JSON.parse(storedSuggestions))
    
    const storedUser = localStorage.getItem('tbt_currentUser')
    if (storedUser) {
      const user = JSON.parse(storedUser)
      setCurrentUser(user)
      setView('dashboard')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('tbt_users', JSON.stringify(users))
  }, [users])

  useEffect(() => {
    localStorage.setItem('tbt_votes', JSON.stringify(votes))
  }, [votes])

  useEffect(() => {
    localStorage.setItem('tbt_suggestions', JSON.stringify(suggestions))
  }, [suggestions])

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

    setUsers([...users, newUser])
    localStorage.setItem('tbt_currentUser', JSON.stringify(newUser))
    setCurrentUser(newUser)
    setView('dashboard')
    setSuccess('Welcome to the Sanctuary!')
    
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
    setSuccess('')
  }

  const handleVote = (option: string) => {
    if (!currentUser || hasVoted) return
    
    const newVote: Vote = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      option,
      timestamp: new Date().toISOString()
    }
    
    setVotes([...votes, newVote])
    setHasVoted(true)
  }

  const handleSuggestion = () => {
    if (!currentUser || !suggestionText.trim()) return
    
    const newSuggestion: Suggestion = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      text: suggestionText.trim(),
      votes: 0,
      timestamp: new Date().toISOString()
    }
    
    setSuggestions([...suggestions, newSuggestion])
    setSuggestionText('')
    setSuccess('Suggestion submitted!')
  }

  const updateProfile = () => {
    if (!currentUser) return
    
    if (newPassword && newPassword !== confirmNewPassword) {
      setError('Passwords dont match')
      return
    }

    const updatedUsers = users.map(u => {
      if (u.id === currentUser.id) {
        return {
          ...u,
          name: editName || currentUser.name,
          password: newPassword || currentUser.password
        }
      }
      return u
    })
    
    setUsers(updatedUsers)
    const updatedUser = { ...currentUser, name: editName || currentUser.name, password: newPassword || currentUser.password }
    localStorage.setItem('tbt_currentUser', JSON.stringify(updatedUser))
    setCurrentUser(updatedUser)
    
    setEditName('')
    setNewPassword('')
    setConfirmNewPassword('')
    setSuccess('Profile updated!')
  }

  const resetVotes = () => {
    setVotes([])
    setHasVoted(false)
    localStorage.setItem('tbt_votes', JSON.stringify([]))
  }

  const getVoteCount = (option: string) => votes.filter(v => v.option === option).length

  if (view === 'signin') {
    return (
      <div className="app">
        <div className="container">
          <header className="header">
            <div className="logo">🔥</div>
            <h1>TRUTH BE TOLD</h1>
            <p className="tagline">Revelations of Knowledge</p>
          </header>
          
          <div className="card">
            <h2>Enter the Sanctuary</h2>
            {error && <div className="error">{error}</div>}
            {success && <div className="success">{success}</div>}
            <input type="email" placeholder="Sacred Mark (Email)" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Secret Word" value={password} onChange={e => setPassword(e.target.value)} />
            <button onClick={handleSignIn}>Enter</button>
            <p className="switch">No mark? <button onClick={() => { setError(''); setSuccess(''); setView('signup') }}>Begin inscription</button></p>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'signup') {
    return (
      <div className="app">
        <div className="container">
          <header className="header">
            <div className="logo">🔥</div>
            <h1>TRUTH BE TOLD</h1>
            <p className="tagline">Revelations of Knowledge</p>
          </header>
          
          <div className="card">
            <h2>Forge Your Mark</h2>
            {error && <div className="error">{error}</div>}
            <input type="text" placeholder="Sacred Name" value={name} onChange={e => setName(e.target.value)} />
            <input type="email" placeholder="Sacred Mark (Email)" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Secret Word" value={password} onChange={e => setPassword(e.target.value)} />
            <input type="password" placeholder="Confirm Secret Word" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            <button onClick={handleSignUp}>Inscribe</button>
            <p className="switch">Already inscribed? <button onClick={() => { setError(''); setSuccess(''); setView('signin') }}>Sign in</button></p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div className="logo">🔥</div>
          <h1>TRUTH BE TOLD</h1>
        </header>

        <div className="user-banner">
          <div className="user-info">
            <span className="user-name">{currentUser?.name}</span>
            <span className={`user-tier ${currentUser?.tierClass}`}>{currentUser?.tierName}</span>
          </div>
          <span className="user-num">№{currentUser?.userNumber}</span>
        </div>

        <div className="tabs">
          <button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>Home</button>
          <button className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}>Members</button>
          <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>Activity</button>
          <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>Profile</button>
          <button className={tab === 'suggestions' ? 'active' : ''} onClick={() => setTab('suggestions')}>Ideas</button>
        </div>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        {tab === 'home' && (
          <div className="content">
            <div className="card">
              <h3>📜 Current Vote</h3>
              <p className="desc">Vote for the next sanctuary feature</p>
              
              {!hasVoted ? (
                <div className="vote-options">
                  {VOTE_OPTIONS.map(opt => (
                    <button key={opt} className="vote-btn" onClick={() => handleVote(opt)}>
                      {opt} <span className="count">({getVoteCount(opt)})</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="voted">
                  <p>Your vote has been cast</p>
                  <div className="vote-results">
                    {VOTE_OPTIONS.map(opt => {
                      const count = getVoteCount(opt)
                      const total = votes.length || 1
                      const pct = Math.round((count / total) * 100)
                      return (
                        <div key={opt} className="vote-row">
                          <span>{opt}</span>
                          <span>{pct}% ({count})</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <h3>🏛 The Sanctuary</h3>
              <div className="features-list">
                {FEATURES.map(f => (
                  <div key={f.name} className="feature-item">
                    <div className="feature-header">
                      <span className="feature-icon">{f.icon}</span>
                      <span className="feature-name">{f.name}</span>
                      <span className="feature-lock">🔒</span>
                    </div>
                    <p className="feature-desc">{f.desc}</p>
                    <span className="feature-coming">{f.coming}</span>
                  </div>
                ))}
              </div>
            </div>

            <button className="signout" onClick={handleSignOut}>Depart from Sanctuary</button>
          </div>
        )}

        {tab === 'members' && (
          <div className="content">
            <div className="card">
              <h3>👥 Members ({users.length})</h3>
              <div className="members-list">
                {[...users].reverse().map(u => (
                  <div key={u.id} className="member-row">
                    <span className="num">№{u.userNumber}</span>
                    <span className="name">{u.name}</span>
                    <span className={`tier ${u.tierClass}`}>{u.tierName}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {currentUser?.email === ADMIN_EMAIL && (
              <div className="card admin">
                <h3>👁 Admin Controls</h3>
                <button onClick={resetVotes}>Reset All Votes</button>
              </div>
            )}
          </div>
        )}

        {tab === 'activity' && (
          <div className="content">
            <div className="card">
              <h3>📜 Recent Activity</h3>
              <div className="activity-list">
                {[...votes].reverse().map(v => (
                  <div key={v.id} className="activity-row">
                    <span className="user">{v.userName}</span>
                    <span className="action">voted for</span>
                    <span className="target">{v.option}</span>
                  </div>
                ))}
                {[...users].reverse().slice(0, 5).map(u => (
                  <div key={u.id} className="activity-row">
                    <span className="user">{u.name}</span>
                    <span className="action">joined as</span>
                    <span className="target">{u.tierName}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'profile' && (
          <div className="content">
            <div className="card">
              <h3>✏️ Edit Profile</h3>
              <input type="text" placeholder="New Name" value={editName} onChange={e => setEditName(e.target.value)} />
              <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
              <input type="password" placeholder="Confirm Password" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} />
              <button onClick={updateProfile}>Save Changes</button>
            </div>
            
            <div className="card">
              <h3>ℹ️ Your Info</h3>
              <p><strong>Name:</strong> {currentUser?.name}</p>
              <p><strong>Email:</strong> {currentUser?.email}</p>
              <p><strong>Tier:</strong> {currentUser?.tierName}</p>
              <p><strong>Member #:</strong> {currentUser?.userNumber}</p>
              <p><strong>Joined:</strong> {new Date(currentUser?.joined || '').toLocaleDateString()}</p>
            </div>
            
            <button className="signout" onClick={handleSignOut}>Depart</button>
          </div>
        )}

        {tab === 'suggestions' && (
          <div className="content">
            <div className="card">
              <h3>💡 Suggest a Feature</h3>
              <textarea placeholder="What should the community build next?" value={suggestionText} onChange={e => setSuggestionText(e.target.value)} />
              <button onClick={handleSuggestion}>Submit Idea</button>
            </div>
            
            <div className="card">
              <h3>🌟 Community Ideas ({suggestions.length})</h3>
              <div className="suggestions-list">
                {suggestions.map(s => (
                  <div key={s.id} className="suggestion-row">
                    <p>{s.text}</p>
                    <span className="by">— {s.userName}</span>
                  </div>
                ))}
                {suggestions.length === 0 && <p className="empty">No suggestions yet. Be the first!</p>}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App