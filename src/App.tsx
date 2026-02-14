// src/App.tsx
import { useState, useEffect, useRef } from 'react'
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
  avatarUrl?: string
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

interface VoteSettings {
  id: string
  endTime: number
  options: string[]
}

const ADMIN_EMAIL = 'admin@truthbtoldhub.com'

const DEFAULT_OPTIONS = [
  { name: 'The Stage', icon: '🎤' },
  { name: 'The Circle', icon: '💬' },
  { name: 'The Pool', icon: '⚱' },
  { name: 'The Gallery', icon: '🎨' },
  { name: 'The Library', icon: '📚' },
  { name: 'The Temple', icon: '🏛' },
  { name: 'The Council', icon: '🤝' },
  { name: 'The Archive', icon: '📜' }
]

function App() {
  const [view, setView] = useState<'signin' | 'signup' | 'dashboard'>('signin')
  const [tab, setTab] = useState<'home' | 'members' | 'activity' | 'profile' | 'suggestions' | 'admin' | 'avatar'>('home')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [voteSettings, setVoteSettings] = useState<VoteSettings | null>(null)
  const [error, setError] = useState('')
  const [hasVoted, setHasVoted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState('')
  const [showWelcome, setShowWelcome] = useState(false)
  const [toast, setToast] = useState('')
  
  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [editName, setEditName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [suggestionText, setSuggestionText] = useState('')
  
  // Admin states
  const [upgradeEmail, setUpgradeEmail] = useState('')
  const [upgradeTier, setUpgradeTier] = useState('Founding Ember')
  const [deleteEmail, setDeleteEmail] = useState('')
  const [customHours, setCustomHours] = useState('')
  
  const isAdmin = currentUser?.email === ADMIN_EMAIL

  // FIXED TIMER - Works across page reloads
  useEffect(() => {
    const updateTimer = async () => {
      try {
        const { data } = await supabase.from('vote_settings').select('*').limit(1)
        if (data && data.length > 0) {
          setVoteSettings(data[0])
        }
      } catch (error) {
        console.error('Timer error:', error)
      }
    }
    
    // Update immediately
    updateTimer()
    
    // Update every 5 seconds
    const interval = setInterval(updateTimer, 5000)
    
    return () => clearInterval(interval)
  }, [])

  // Display timer
  useEffect(() => {
    if (!voteSettings) {
      setTimeLeft('No active vote')
      return
    }
    
    const updateDisplay = () => {
      const remaining = voteSettings.endTime - Date.now()
      
      if (remaining <= 0) {
        setTimeLeft('ENDED')
      } else {
        const hours = Math.floor(remaining / 3600000)
        const mins = Math.floor((remaining % 3600000) / 60000)
        const secs = Math.floor((remaining % 60000) / 1000)
        setTimeLeft(`${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`)
      }
    }
    
    updateDisplay()
    const timer = setInterval(updateDisplay, 1000)
    
    return () => clearInterval(timer)
  }, [voteSettings])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    
    try {
      const [usersRes, votesRes, suggsRes] = await Promise.all([
        supabase.from('users').select('*').order('user_number', { ascending: true }),
        supabase.from('votes').select('*').order('timestamp', { ascending: false }),
        supabase.from('suggestions').select('*').order('timestamp', { ascending: false })
      ])
      
      if (usersRes.data) setUsers(usersRes.data)
      if (votesRes.data) setVotes(votesRes.data)
      if (suggsRes.data) setSuggestions(suggsRes.data)
      
      const stored = localStorage.getItem('tbt_currentUser')
      if (stored) {
        const user = JSON.parse(stored)
        setCurrentUser(user)
        setView('dashboard')
        
        const userVoted = votesRes.data?.find(v => v.user_id === user.id)
        if (userVoted) setHasVoted(true)
      }
    } catch (error) {
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTier = (userNumber: number) => {
    if (userNumber <= 13) return { name: 'Founding Ember', title: 'First Flame', class: 'tier-gold' }
    if (userNumber <= 33) return { name: 'Sacred Circle', title: 'Inner Flame', class: 'tier-silver' }
    if (userNumber <= 83) return { name: 'Ember Keeper', title: 'Keeper Flame', class: 'tier-bronze' }
    return { name: 'Member', title: 'Community', class: 'tier-basic' }
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // Admin Functions
  const startNewVote = async (hours: number) => {
    try {
      const endTime = Date.now() + (hours * 3600000)
      const options = DEFAULT_OPTIONS.map(o => o.name)
      
      await supabase.from('vote_settings').delete().neq('id', '')
      await supabase.from('votes').delete().neq('id', '')
      
      await supabase.from('vote_settings').insert([{
        id: '1',
        endTime: endTime,
        options: options
      }])
      
      setVoteSettings({ id: '1', endTime, options })
      setHasVoted(false)
      loadData()
      showToast('Vote initiated')
    } catch (error) {
      showToast('Failed to start')
    }
  }

  const endVoteNow = async () => {
    try {
      await supabase.from('vote_settings').delete().neq('id', '')
      setVoteSettings(null)
      showToast('Voting ended')
    } catch (error) {
      showToast('Failed to end')
    }
  }

  const handleSignUp = async () => {
    setError('')
    if (!name || !email || !password || !confirmPassword) {
      setError('Complete all fields')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords mismatch')
      return
    }
    if (password.length < 6) {
      setError('6+ characters needed')
      return
    }

    try {
      const { data: existing } = await supabase.from('users').select('email').eq('email', email.toLowerCase()).limit(1)
      if (existing && existing.length > 0) {
        setError('Email taken')
        return
      }

      const { data: allUsers } = await supabase.from('users').select('user_number')
      const userNumber = (allUsers?.length || 0) + 1
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

      await supabase.from('users').insert([newUser])

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
      setShowWelcome(true)
      loadData()
      
      setName('')
      setEmail('')
      setPassword('')
      setConfirmPassword('')
    } catch (error) {
      setError('Registration failed')
    }
  }

  const handleSignIn = async () => {
    setError('')
    if (!email || !password) {
      setError('Enter credentials')
      return
    }

    try {
      const { data, error } = await supabase.from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .eq('password', password)
        .limit(1)

      if (error) throw error

      if (!data || data.length === 0) {
        setError('Invalid login')
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
        joined: user.joined,
        avatarUrl: user.avatar_url
      }
      
      localStorage.setItem('tbt_currentUser', JSON.stringify(fullUser))
      setCurrentUser(fullUser)
      setView('dashboard')
      setEmail('')
      setPassword('')
    } catch (error) {
      setError('Login failed')
    }
  }

  const handleSignOut = () => {
    localStorage.removeItem('tbt_currentUser')
    setCurrentUser(null)
    setView('signin')
    setError('')
  }

  const handleVote = async (option: string) => {
    if (!currentUser || hasVoted || !voteSettings || voteSettings.endTime < Date.now()) return
    
    try {
      const newVote = {
        id: Date.now().toString(),
        user_id: currentUser.id,
        user_name: currentUser.name,
        option_name: option,
        timestamp: new Date().toISOString()
      }
      
      await supabase.from('votes').insert([newVote])
      setHasVoted(true)
      loadData()
      showToast('Vote recorded')
    } catch (error) {
      showToast('Vote failed')
    }
  }

  const getVoteCount = (option: string) => votes.filter(v => v.option_name === option).length
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  if (loading) {
    return (
      <div className="app">
        <div className="loading-screen">
          <div className="flame-loader"></div>
          <p>Entering Sanctuary...</p>
        </div>
      </div>
    )
  }

  if (showWelcome) {
    return (
      <div className="app">
        <div className="welcome-modal">
          <div className="welcome-content">
            <div className="welcome-flame">🔥</div>
            <h2>Welcome, {currentUser?.name}</h2>
            <div className={`welcome-tier ${currentUser?.tierClass}`}>
              {currentUser?.tierName} #{currentUser?.userNumber}
            </div>
            <p className="welcome-subtitle">{currentUser?.tierTitle}</p>
            <button onClick={() => setShowWelcome(false)}>Enter</button>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'signin') {
    return (
      <div className="app">
        {toast && <div className="toast">{toast}</div>}
        <div className="auth-container">
          <div className="auth-header">
            <div className="auth-logo">🔥</div>
            <h1>TRUTH BE TOLD</h1>
            <p className="auth-subtitle">Sanctuary Access</p>
          </div>
          
          <div className="auth-card">
            <h2>Sign In</h2>
            {error && <div className="error-msg">{error}</div>}
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            <button className="primary-btn" onClick={handleSignIn}>Enter Sanctuary</button>
            <p className="auth-switch">
              No account? <button onClick={() => { setError(''); setView('signup') }}>Sign Up</button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'signup') {
    return (
      <div className="app">
        {toast && <div className="toast">{toast}</div>}
        <div className="auth-container">
          <div className="auth-header">
            <div className="auth-logo">🔥</div>
            <h1>TRUTH BE TOLD</h1>
            <p className="auth-subtitle">Join the Community</p>
          </div>
          
          <div className="auth-card">
            <h2>Create Account</h2>
            {error && <div className="error-msg">{error}</div>}
            <input type="text" placeholder="Name" value={name} onChange={e => setName(e.target.value)} />
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            <button className="primary-btn" onClick={handleSignUp}>Forge Identity</button>
            <p className="auth-switch">
              Have an account? <button onClick={() => { setError(''); setView('signin') }}>Sign In</button>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {toast && <div className="toast">{toast}</div>}
      
      {/* Header */}
      <div className="app-header">
        <div className="user-profile">
          <div className="avatar-small">
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="Avatar" />
            ) : (
              <span>{getInitials(currentUser?.name || '')}</span>
            )}
          </div>
          <div className="user-info">
            <span className="user-name">{currentUser?.name}</span>
            <span className={`user-tier-badge ${currentUser?.tierClass}`}>
              {currentUser?.tierName} #{currentUser?.userNumber}
            </span>
          </div>
        </div>
        
        <div className="header-controls">
          {voteSettings && voteSettings.endTime > Date.now() && (
            <div className="vote-timer">
              <span className="timer-label">⏰</span>
              <span className="timer-value">{timeLeft}</span>
            </div>
          )}
          <button className="signout-btn" onClick={handleSignOut}>Exit</button>
        </div>
      </div>

      {/* Navigation */}
      <div className="nav-tabs">
        <button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>🏠</button>
        <button className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}>👥</button>
        <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>📜</button>
        <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>👤</button>
        <button className={tab === 'suggestions' ? 'active' : ''} onClick={() => setTab('suggestions')}>💡</button>
        {isAdmin && <button className={tab === 'admin' ? 'active admin-tab' : 'admin-tab'} onClick={() => setTab('admin')}>⚙️</button>}
      </div>

      {/* Content */}
      <div className="content-area">
        {tab === 'home' && (
          <div className="home-content">
            {voteSettings && voteSettings.endTime > Date.now() ? (
              <div className="vote-section">
                <h2>Community Vote</h2>
                <p className="vote-subtitle">Shape our next feature</p>
                
                {!hasVoted ? (
                  <div className="vote-options">
                    {DEFAULT_OPTIONS.map(opt => (
                      <button 
                        key={opt.name} 
                        className="vote-option"
                        onClick={() => handleVote(opt.name)}
                      >
                        <span className="vote-icon">{opt.icon}</span>
                        <span className="vote-name">{opt.name}</span>
                        <span className="vote-count">({getVoteCount(opt.name)})</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="vote-completed">
                    <div className="check-mark">✅</div>
                    <p>Your voice has been heard</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-vote">
                <div className="vote-icon-large">🗳️</div>
                <p>No active vote</p>
              </div>
            )}
          </div>
        )}

        {tab === 'admin' && isAdmin && (
          <div className="admin-content">
            <h2>Admin Panel</h2>
            
            <div className="admin-controls">
              <div className="control-group">
                <h3>Start Vote</h3>
                <div className="time-buttons">
                  {[12, 24, 48].map(h => (
                    <button key={h} onClick={() => startNewVote(h)}>{h}h</button>
                  ))}
                </div>
                <div className="custom-time">
                  <input 
                    type="number" 
                    placeholder="Hours" 
                    value={customHours}
                    onChange={e => setCustomHours(e.target.value)}
                  />
                  <button onClick={() => {
                    const hours = parseInt(customHours)
                    if (hours && hours > 0) startNewVote(hours)
                  }}>Start</button>
                </div>
                <button className="danger-btn" onClick={endVoteNow}>End Vote</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'members' && (
          <div className="members-content">
            <h2>Community ({users.length})</h2>
            <div className="members-list">
              {[...users].reverse().map(u => (
                <div key={u.id} className="member-item">
                  <div className="member-avatar">
                    {u.avatarUrl ? (
                      <img src={u.avatarUrl} alt="Avatar" />
                    ) : (
                      <span>{getInitials(u.name)}</span>
                    )}
                  </div>
                  <div className="member-info">
                    <span className="member-name">{u.name}</span>
                    <span className={`member-tier ${u.tier_class}`}>
                      {u.tier_name} #{u.user_number}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App