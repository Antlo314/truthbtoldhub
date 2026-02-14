import { useState, useEffect } from 'react'
import './index.css'
import { supabase } from './supabase'

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
  'The Stage', 'The Circle', 'The Pool', 'The Gallery',
  'The Library', 'The Temple', 'The Council', 'The Archive'
]

const FEATURES = [
  { name: 'The Stage', icon: '🎵', desc: 'Original music, podcasts, spoken word, and audio creations from the community.', coming: 'Coming Soon' },
  { name: 'The Circle', icon: '💬', desc: 'Real-time discussion, debates, and connections without algorithmic noise.', coming: 'Coming Soon' },
  { name: 'The Pool', icon: '⚱', desc: 'Community fund for mutual aid, projects, emergencies, and voted initiatives.', coming: 'Coming Soon' },
  { name: 'The Gallery', icon: '🎬', desc: 'Videos, short films, visual art, and experimental creative projects.', coming: 'Coming Soon' },
  { name: 'The Library', icon: '📚', desc: 'Curated writings, documents, videos, and references for study and discovery.', coming: 'Coming Soon' },
  { name: 'The Temple', icon: '🎓', desc: 'Long-form teachings and guided dialogues on faith, society, power, and truth.', coming: 'Coming Soon' },
  { name: 'The Council', icon: '🏛', desc: 'Member spotlights, collaborations, local projects, and community events.', coming: 'Coming Soon' },
  { name: 'The Archive', icon: '📜', desc: 'A chronological record of moments the community preserves for posterity.', coming: 'Coming Soon' },
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
  const [hasVoted, setHasVoted] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [editName, setEditName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [suggestionText, setSuggestionText] = useState('')

  useEffect(() => {
    console.log('Loading data from Supabase...')
    loadUsers()
    loadVotes()
    loadSuggestions()
    checkCurrentUser()
  }, [])

  const loadUsers = async () => {
    console.log('Fetching users...')
    const { data, error } = await supabase.from('users').select('*').order('user_number', { ascending: true })
    if (error) {
      console.error('Error loading users:', error)
    } else {
      console.log('Users loaded:', data?.length || 0)
      setUsers(data || [])
    }
  }

  const loadVotes = async () => {
    const { data } = await supabase.from('votes').select('*').order('timestamp', { ascending: false })
    if (data) setVotes(data)
  }

  const loadSuggestions = async () => {
    const { data } = await supabase.from('suggestions').select('*').order('timestamp', { ascending: false })
    if (data) setSuggestions(data)
  }

  const checkCurrentUser = async () => {
    const stored = localStorage.getItem('tbt_currentUser')
    if (stored) {
      const user = JSON.parse(stored)
      console.log('User logged in:', user.name)
      setCurrentUser(user)
      setView('dashboard')
      
      const { data } = await supabase.from('votes').select('id').eq('user_id', user.id).limit(1)
      if (data && data.length > 0) setHasVoted(true)
    }
  }

  const getTier = (userNumber: number) => {
    if (userNumber <= 13) return { name: 'Founding Ember', title: 'In at the beginning', class: 'tier-gold' }
    if (userNumber <= 33) return { name: 'Sacred Circle', title: 'Among the first flames', class: 'tier-silver' }
    if (userNumber <= 83) return { name: 'Ember Keeper', title: 'Kept the fire alive', class: 'tier-bronze' }
    return { name: 'Member', title: 'Welcome', class: 'tier-basic' }
  }

  const handleSignUp = async () => {
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

    console.log('Checking for existing email...')
    const { data: existing, error: checkError } = await supabase.from('users').select('email').eq('email', email.toLowerCase()).limit(1)
    
    if (checkError) {
      console.error('Error checking email:', checkError)
      setError('Database error: ' + checkError.message)
      return
    }
    
    if (existing && existing.length > 0) {
      setError('Email already inscribed')
      return
    }

    console.log('Getting user count...')
    const { data: allUsers } = await supabase.from('users').select('user_number')
    const userNumber = (allUsers?.length || 0) + 1
    console.log('New user number:', userNumber)
    
    const tier = getTier(userNumber)

    const newUser = {
      id: Date.now().toString(),
      email: email.toLowerCase(),
      name,
      password,
      user_number: userNumber,
      tier_name: tier.name,
      tier_title: tier.title,
      tier_class: tier.class,
      joined: new Date().toISOString()
    }

    console.log('Saving user to Supabase:', newUser)
    const { data, error } = await supabase.from('users').insert([newUser]).select()

    if (error) {
      console.error('Error saving user:', error)
      setError('Error saving: ' + error.message)
      return
    }

    console.log('User saved successfully:', data)
    
    const fullUser: User = {
      ...newUser,
      userNumber: newUser.user_number,
      tierName: newUser.tier_name,
      tierTitle: newUser.tier_title,
      tierClass: newUser.tier_class
    }
    
    localStorage.setItem('tbt_currentUser', JSON.stringify(fullUser))
    setCurrentUser(fullUser)
    setView('dashboard')
    setSuccess('Welcome to the Sanctuary!')
    
    loadUsers()
    
    setName('')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
  }

  const handleSignIn = async () => {
    setError('')
    if (!email || !password) {
      setError('Enter email and password')
      return
    }

    console.log('Signing in...')
    const { data, error } = await supabase.from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('password', password)
      .limit(1)

    if (error) {
      console.error('Sign in error:', error)
      setError('Error: ' + error.message)
      return
    }

    if (!data || data.length === 0) {
      setError('Invalid credentials')
      return
    }

    const user = data[0]
    const fullUser: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      password: user.password,
      userNumber: user.user_number,
      tierName: user.tier_name,
      tierTitle: user.tier_title,
      tierClass: user.tier_class,
      joined: user.joined
    }
    
    localStorage.setItem('tbt_currentUser', JSON.stringify(fullUser))
    setCurrentUser(fullUser)
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

  const handleVote = async (option: string) => {
    if (!currentUser || hasVoted) return
    
    const newVote = {
      id: Date.now().toString(),
      user_id: currentUser.id,
      user_name: currentUser.name,
      option_name: option,
      timestamp: new Date().toISOString()
    }
    
    await supabase.from('votes').insert([newVote])
    loadVotes()
    setHasVoted(true)
  }

  const handleSuggestion = async () => {
    if (!currentUser || !suggestionText.trim()) return
    
    const newSuggestion = {
      id: Date.now().toString(),
      user_id: currentUser.id,
      user_name: currentUser.name,
      text: suggestionText.trim(),
      votes: 0,
      timestamp: new Date().toISOString()
    }
    
    await supabase.from('suggestions').insert([newSuggestion])
    loadSuggestions()
    setSuggestionText('')
    setSuccess('Suggestion submitted!')
  }

  const updateProfile = async () => {
    if (!currentUser) return
    
    if (newPassword && newPassword !== confirmNewPassword) {
      setError('Passwords dont match')
      return
    }

    const updates = {
      name: editName || currentUser.name,
      password: newPassword || currentUser.password
    }

    await supabase.from('users').update(updates).eq('id', currentUser.id)
    loadUsers()
    
    const updatedUser = { ...currentUser, ...updates }
    localStorage.setItem('tbt_currentUser', JSON.stringify(updatedUser))
    setCurrentUser(updatedUser)
    
    setEditName('')
    setNewPassword('')
    setConfirmNewPassword('')
    setSuccess('Profile updated!')
  }

  const resetVotes = async () => {
    await supabase.from('votes').delete().neq('id', '')
    setVotes([])
    setHasVoted(false)
  }

  const getVoteCount = (option: string) => votes.filter(v => v.option_name === option).length

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
                    <span className="num">№{u.user_number}</span>
                    <span className="name">{u.name}</span>
                    <span className={`tier ${u.tier_class}`}>{u.tier_name}</span>
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
                {votes.slice(0, 10).map(v => (
                  <div key={v.id} className="activity-row">
                    <span className="user">{v.user_name}</span>
                    <span className="action">voted for</span>
                    <span className="target">{v.option_name}</span>
                  </div>
                ))}
                {users.slice(0, 5).map(u => (
                  <div key={u.id} className="activity-row">
                    <span className="user">{u.name}</span>
                    <span className="action">joined as</span>
                    <span className="target">{u.tier_name}</span>
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
                    <span className="by">— {s.user_name}</span>
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