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

const FEATURES = [
  { name: 'The Stage', icon: '🎤', desc: 'Original music, podcasts, spoken word, and audio creations from the community.', coming: 'Coming Soon' },
  { name: 'The Circle', icon: '💬', desc: 'Real-time discussion, debates, and connections without algorithmic noise.', coming: 'Coming Soon' },
  { name: 'The Pool', icon: '⚱', desc: 'Community fund for mutual aid, projects, emergencies, and voted initiatives.', coming: 'Coming Soon' },
  { name: 'The Gallery', icon: '🎨', desc: 'Videos, short films, visual art, and experimental creative projects.', coming: 'Coming Soon' },
  { name: 'The Library', icon: '📚', desc: 'Curated writings, documents, videos, and references for study and discovery.', coming: 'Coming Soon' },
  { name: 'The Temple', icon: '🏛', desc: 'Long-form teachings and guided dialogues on faith, society, power, and truth.', coming: 'Coming Soon' },
  { name: 'The Council', icon: '🤝', desc: 'Member spotlights, collaborations, local projects, and community events.', coming: 'Coming Soon' },
  { name: 'The Archive', icon: '📜', desc: 'A chronological record of moments the community preserves for posterity.', coming: 'Coming Soon' },
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
  const [success, setSuccess] = useState('')
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
  const [newVoteHours, setNewVoteHours] = useState(24)
  const [customHours, setCustomHours] = useState('')
  
  // Avatar states
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const isAdmin = currentUser?.email === ADMIN_EMAIL

  // Timer
  useEffect(() => {
    const timer = setInterval(async () => {
      if (!voteSettings) {
        setTimeLeft('No active vote')
        return
      }
      
      const remaining = voteSettings.endTime - Date.now()
      
      if (remaining <= 0) {
        setTimeLeft('Voting Closed')
      } else {
        const hours = Math.floor(remaining / 3600000)
        const mins = Math.floor((remaining % 3600000) / 60000)
        const secs = Math.floor((remaining % 60000) / 1000)
        setTimeLeft(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [voteSettings])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    
    // Load vote settings
    const { data: settingsData } = await supabase.from('vote_settings').select('*').limit(1)
    if (settingsData && settingsData.length > 0) {
      setVoteSettings(settingsData[0])
    }
    
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
    setLoading(false)
  }

  const getTier = (userNumber: number) => {
    if (userNumber <= 13) return { name: 'Founding Ember', title: 'In at the beginning', class: 'tier-gold' }
    if (userNumber <= 33) return { name: 'Sacred Circle', title: 'Among the first flames', class: 'tier-silver' }
    if (userNumber <= 83) return { name: 'Ember Keeper', title: 'Kept the fire alive', class: 'tier-bronze' }
    return { name: 'Member', title: 'Welcome', class: 'tier-basic' }
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  // Admin Functions
  const startNewVote = async (hours: number) => {
    const endTime = Date.now() + (hours * 3600000)
    const options = DEFAULT_OPTIONS.map(o => o.name)
    
    await supabase.from('vote_settings').delete().neq('id', '')
    await supabase.from('vote_settings').insert([{ id: '1', endTime, options }])
    await supabase.from('votes').delete().neq('id', '')
    
    setVoteSettings({ id: '1', endTime, options })
    setHasVoted(false)
    loadData()
    showToast('✅ Vote started!')
  }

  const endVoteNow = async () => {
    await supabase.from('vote_settings').delete().neq('id', '')
    setVoteSettings(null)
    showToast('✅ Vote ended')
  }

  const upgradeMemberTier = async () => {
    if (!upgradeEmail) return
    
    let tierNum = 1
    if (upgradeTier === 'Sacred Circle') tierNum = 14
    else if (upgradeTier === 'Ember Keeper') tierNum = 34
    else tierNum = 84
    
    const tier = getTier(tierNum)
    
    await supabase.from('users').update({ 
      tier_name: tier.name, 
      tier_title: tier.title, 
      tier_class: tier.class 
    }).eq('email', upgradeEmail.toLowerCase())
    
    loadData()
    setUpgradeEmail('')
    showToast('✅ Member upgraded!')
  }

  const deleteMemberByEmail = async () => {
    if (!deleteEmail) return
    if (!confirm(`Delete ${deleteEmail}?`)) return
    
    const userToDelete = users.find(u => u.email === deleteEmail.toLowerCase())
    if (userToDelete) {
      await supabase.from('users').delete().eq('id', userToDelete.id)
      await supabase.from('votes').delete().eq('user_id', userToDelete.id)
      await supabase.from('suggestions').delete().eq('user_id', userToDelete.id)
    }
    
    loadData()
    setDeleteEmail('')
    showToast('✅ Member deleted')
  }

  // Avatar Functions
  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const uploadAvatar = async () => {
    if (!avatarFile || !currentUser) return
    
    setIsUploading(true)
    
    try {
      const fileExt = avatarFile.name.split('.').pop()
      const fileName = `${currentUser.id}.${fileExt}`
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile, {
          upsert: true
        })
      
      if (uploadError) throw uploadError
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)
      
      await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', currentUser.id)
      
      setCurrentUser({ ...currentUser, avatarUrl: publicUrl })
      localStorage.setItem('tbt_currentUser', JSON.stringify({ ...currentUser, avatarUrl: publicUrl }))
      
      showToast('✅ Avatar uploaded!')
      setAvatarPreview(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      console.error('Error uploading avatar:', error)
      showToast('❌ Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const generateAI = async () => {
    showToast('🤖 AI avatar coming soon!')
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

    const { data: existing } = await supabase.from('users').select('email').eq('email', email.toLowerCase()).limit(1)
    if (existing && existing.length > 0) {
      setError('Email already inscribed')
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

    const { error } = await supabase.from('users').insert([newUser])
    if (error) {
      setError('Error: ' + error.message)
      return
    }

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
  }

  const handleSignIn = async () => {
    setError('')
    if (!email || !password) {
      setError('Enter email and password')
      return
    }

    const { data, error } = await supabase.from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('password', password)
      .limit(1)

    if (error) {
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
      joined: user.joined,
      avatarUrl: user.avatar_url
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
    if (!currentUser || hasVoted || !voteSettings || voteSettings.endTime < Date.now()) return
    
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
    showToast('✅ Vote cast!')
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
    loadData()
    setSuggestionText('')
    showToast('💡 Suggestion submitted!')
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
    loadData()
    
    const updatedUser = { ...currentUser, ...updates }
    localStorage.setItem('tbt_currentUser', JSON.stringify(updatedUser))
    setCurrentUser(updatedUser)
    
    setEditName('')
    setNewPassword('')
    setConfirmNewPassword('')
    showToast('✅ Profile updated!')
  }

  const deleteMember = async (userId: string) => {
    if (!confirm('Remove this member?')) return
    
    await supabase.from('users').delete().eq('id', userId)
    await supabase.from('votes').delete().eq('user_id', userId)
    await supabase.from('suggestions').delete().eq('user_id', userId)
    loadData()
    showToast('✅ Member removed')
  }

  const resetVotes = async () => {
    await supabase.from('votes').delete().neq('id', '')
    setHasVoted(false)
    loadData()
    showToast('✅ Votes reset')
  }

  const getVoteCount = (option: string) => votes.filter(v => v.option_name === option).length
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  const winningFeature = () => {
    if (votes.length === 0) return null
    const counts = DEFAULT_OPTIONS.map(o => ({ ...o, count: getVoteCount(o.name) }))
    return counts.sort((a, b) => b.count - a.count)[0]
  }

  const winner = winningFeature()

  if (loading) {
    return (
      <div className="app loading">
        <div className="loader">🔥</div>
        <p>Loading Sanctuary...</p>
      </div>
    )
  }

  if (showWelcome) {
    return (
      <div className="app">
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-icon">🎉</div>
            <h2>Welcome, {currentUser?.name}!</h2>
            <p className="tier-badge-lg" data-tier={currentUser?.tierClass}>
              {currentUser?.tierName} #{currentUser?.userNumber}
            </p>
            <p className="modal-desc">{currentUser?.tierTitle}</p>
            <button onClick={() => setShowWelcome(false)}>Enter the Sanctuary</button>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'signin') {
    return (
      <div className="app">
        {toast && <div className="toast">{toast}</div>}
        <div className="container">
          <header className="header">
            <div className="logo">🔥</div>
            <h1>TRUTH BE TOLD</h1>
            <p className="tagline">Revelations of Knowledge</p>
          </header>
          
          <div className="card">
            <h2>Enter the Sanctuary</h2>
            {error && <div className="error">{error}</div>}
            <input type="email" placeholder="Sacred Mark (Email)" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Secret Word" value={password} onChange={e => setPassword(e.target.value)} />
            <button onClick={handleSignIn}>Enter</button>
            <p className="switch">No mark? <button onClick={() => { setError(''); setView('signup') }}>Begin inscription</button></p>
          </div>
        </div>
      </div>
    )
  }

  if (view === 'signup') {
    return (
      <div className="app">
        {toast && <div className="toast">{toast}</div>}
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
            <p className="switch">Already inscribed? <button onClick={() => { setError(''); setView('signin') }}>Sign in</button></p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      {toast && <div className="toast">{toast}</div>}
      <div className="container">
        <header className="header">
          <div className="logo">🔥</div>
          <h1>TRUTH BE TOLD</h1>
        </header>

        <div className="user-banner">
          <div className="avatar-container">
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} alt="Avatar" className="avatar-img" />
            ) : (
              <div className="avatar">{getInitials(currentUser?.name || '')}</div>
            )}
          </div>
          <div className="user-info">
            <span className="user-name">{currentUser?.name}</span>
            <span className={`user-tier ${currentUser?.tierClass}`}>{currentUser?.tierName}</span>
          </div>
          <span className="user-num">#{currentUser?.userNumber}</span>
        </div>

        <div className="tabs">
          <button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>Home</button>
          <button className={tab === 'members' ? 'active' : ''} onClick={() => setTab('members')}>Members</button>
          <button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}>Activity</button>
          <button className={tab === 'profile' ? 'active' : ''} onClick={() => setTab('profile')}>Profile</button>
          <button className={tab === 'suggestions' ? 'active' : ''} onClick={() => setTab('suggestions')}>Ideas</button>
          <button className={tab === 'avatar' ? 'active' : ''} onClick={() => setTab('avatar')}>📷</button>
          {isAdmin && <button className={tab === 'admin' ? 'active admin-tab' : 'admin-tab'} onClick={() => setTab('admin')}>⚙️</button>}
        </div>

        {error && <div className="error">{error}</div>}

        {tab === 'avatar' && (
          <div className="content">
            <div className="card">
              <h3>🖼️ Avatar</h3>
              <div className="avatar-upload">
                <div className="avatar-preview">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Preview" className="preview-img" />
                  ) : currentUser?.avatarUrl ? (
                    <img src={currentUser.avatarUrl} alt="Current" className="preview-img" />
                  ) : (
                    <div className="avatar-placeholder">👤</div>
                  )}
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarChange}
                  ref={fileInputRef}
                  className="file-input"
                />
                <div className="avatar-actions">
                  <button onClick={uploadAvatar} disabled={isUploading || !avatarFile}>
                    {isUploading ? 'Uploading...' : 'Upload Photo'}
                  </button>
                  <button onClick={generateAI} className="secondary">
                    🤖 Generate AI
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'admin' && isAdmin && (
          <div className="content">
            <div className="card admin-panel">
              <h3>👁 Admin Dashboard</h3>
              
              <div className="admin-stats">
                <div className="stat-card">
                  <span className="stat-value">{users.length}</span>
                  <span className="stat-label">Members</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{votes.length}</span>
                  <span className="stat-label">Votes</span>
                </div>
                <div className="stat-card">
                  <span className="stat-value">{suggestions.length}</span>
                  <span className="stat-label">Ideas</span>
                </div>
              </div>

              <div className="admin-section">
                <h4>🗳️ Vote Control</h4>
                <div className="vote-controls">
                  <div className="vote-hours">
                    {[12, 24, 48, 72].map(h => (
                      <button key={h} onClick={() => startNewVote(h)}>{h}h</button>
                    ))}
                  </div>
                  <div className="custom-vote">
                    <input 
                      type="number" 
                      placeholder="Hours" 
                      value={customHours}
                      onChange={e => setCustomHours(e.target.value)}
                      min="1"
                      max="168"
                    />
                    <button onClick={() => {
                      const hours = parseInt(customHours)
                      if (hours && hours > 0) startNewVote(hours)
                    }}>Start Custom</button>
                  </div>
                  <button className="danger" onClick={endVoteNow}>End Vote Now</button>
                </div>
              </div>

              <div className="admin-section">
                <h4>⬆️ Member Management</h4>
                <div className="admin-form">
                  <input type="email" placeholder="Member email" value={upgradeEmail} onChange={e => setUpgradeEmail(e.target.value)} />
                  <select value={upgradeTier} onChange={e => setUpgradeTier(e.target.value)}>
                    <option value="Founding Ember">Founding Ember</option>
                    <option value="Sacred Circle">Sacred Circle</option>
                    <option value="Ember Keeper">Ember Keeper</option>
                    <option value="Member">Member</option>
                  </select>
                  <button onClick={upgradeMemberTier}>Upgrade</button>
                </div>
                
                <div className="admin-form">
                  <input type="email" placeholder="Member email" value={deleteEmail} onChange={e => setDeleteEmail(e.target.value)} />
                  <button className="danger" onClick={deleteMemberByEmail}>Delete</button>
                </div>
                
                <button className="danger" onClick={resetVotes}>Reset All Votes</button>
              </div>
            </div>
          </div>
        )}

        {tab === 'home' && (
          <div className="content">
            <div className="card timer-card">
              <div className="timer">
                <span className="timer-label">⏱️ Time Remaining</span>
                <span className="timer-value">{timeLeft}</span>
              </div>
              {winner && voteSettings && voteSettings.endTime > Date.now() && (
                <div className="winning-badge">
                  🏆 {winner.name} ({getVoteCount(winner.name)} votes)
                  <div className="progress-bar">
                    <div className="progress-fill" style={{width: `${(getVoteCount(winner.name) / (votes.length || 1)) * 100}%`}}></div>
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <h3>📜 Current Vote</h3>
              
              {!hasVoted && voteSettings && voteSettings.endTime > Date.now() ? (
                <div className="vote-options">
                  {DEFAULT_OPTIONS.map(opt => (
                    <button key={opt.name} className="vote-btn" onClick={() => handleVote(opt.name)}>
                      <span>{opt.icon} {opt.name}</span>
                      <span className="count">({getVoteCount(opt.name)})</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="voted">
                  <p>{!voteSettings || voteSettings.endTime < Date.now() ? '⛔ No active vote' : '✅ Voted'}</p>
                  <div className="vote-results">
                    {DEFAULT_OPTIONS.map(opt => {
                      const count = getVoteCount(opt.name)
                      const total = votes.length || 1
                      const pct = Math.round((count / total) * 100)
                      return (
                        <div key={opt.name} className="vote-row">
                          <span>{opt.icon} {opt.name}</span>
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
                    </div>
                    <p className="feature-desc">{f.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <button className="signout" onClick={handleSignOut}>Depart</button>
          </div>
        )}

        {tab === 'members' && (
          <div className="content">
            <div className="card">
              <h3>👥 Members ({users.length})</h3>
              <div className="members-list">
                {[...users].reverse().map(u => (
                  <div key={u.id} className="member-row">
                    <div className="avatar-container-sm">
                      {u.avatarUrl ? (
                        <img src={u.avatarUrl} alt="Avatar" className="avatar-img-sm" />
                      ) : (
                        <div className="avatar-sm">{getInitials(u.name)}</div>
                      )}
                    </div>
                    <span className="num">#{u.user_number}</span>
                    <span className="name">{u.name}</span>
                    <span className={`tier ${u.tier_class}`}>{u.tier_name}</span>
                    {isAdmin && u.email !== ADMIN_EMAIL && (
                      <button className="delete-btn" onClick={() => deleteMember(u.id)}>✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
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
                    <span className="action">voted</span>
                    <span className="target">{v.option_name}</span>
                  </div>
                ))}
                {users.slice(0, 5).map(u => (
                  <div key={u.id} className="activity-row">
                    <span className="user">{u.name}</span>
                    <span className="action">joined</span>
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
              <input type="password" placeholder="Confirm" value={confirmNewPassword} onChange={e => setConfirmNewPassword(e.target.value)} />
              <button onClick={updateProfile}>Save</button>
            </div>
            
            <div className="card">
              <h3>ℹ️ Your Info</h3>
              <p><strong>Name:</strong> {currentUser?.name}</p>
              <p><strong>Email:</strong> {currentUser?.email}</p>
              <p><strong>Tier:</strong> {currentUser?.tierName}</p>
              <p><strong>#:</strong> {currentUser?.userNumber}</p>
              <p><strong>Joined:</strong> {new Date(currentUser?.joined || '').toLocaleDateString()}</p>
            </div>
            
            <button className="signout" onClick={handleSignOut}>Depart</button>
          </div>
        )}

        {tab === 'suggestions' && (
          <div className="content">
            <div className="card">
              <h3>💡 Suggest</h3>
              <textarea placeholder="Your idea..." value={suggestionText} onChange={e => setSuggestionText(e.target.value)} />
              <button onClick={handleSuggestion}>Submit</button>
            </div>
            
            <div className="card">
              <h3>🌟 Ideas ({suggestions.length})</h3>
              <div className="suggestions-list">
                {suggestions.map(s => (
                  <div key={s.id} className="suggestion-row">
                    <p>{s.text}</p>
                    <span className="by">— {s.user_name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App