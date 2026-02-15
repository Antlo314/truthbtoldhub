// src/App.tsx
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

interface VoteSettings {
  id: string
  endTime: number
  options: string[]
}

const ADMIN_EMAIL = 'admin@truthbtoldhub.com'

const VOTE_OPTIONS = [
  { name: 'The Stage', icon: '🎤', desc: 'Music, podcasts, and audio creations' },
  { name: 'The Circle', icon: '💬', desc: 'Live chat and discussions' },
  { name: 'The Pool', icon: '⚱', desc: 'Community fund and mutual aid' },
  { name: 'The Gallery', icon: '🎨', desc: 'Videos, films, and visual art' },
  { name: 'The Library', icon: '📚', desc: 'Writings and reference materials' },
  { name: 'The Temple', icon: '🏛', desc: 'Teachings and guided dialogues' },
  { name: 'The Council', icon: '🤝', desc: 'Community events and projects' },
  { name: 'The Archive', icon: '📜', desc: 'Historical community records' }
]

function App() {
  const [view, setView] = useState<'signin' | 'signup' | 'dashboard'>('signin')
  const [tab, setTab] = useState<'home' | 'members' | 'activity' | 'profile' | 'admin'>('home')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [votes, setVotes] = useState<Vote[]>([])
  const [voteSettings, setVoteSettings] = useState<VoteSettings | null>(null)
  const [error, setError] = useState('')
  const [hasVoted, setHasVoted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [timeLeft, setTimeLeft] = useState('')
  const [customHours, setCustomHours] = useState('')
  
  // Form states
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // DEBUG: Timer that shows exactly what's happening
  useEffect(() => {
    console.log('=== TIMER EFFECT START ===')
    
    const debugTimer = async () => {
      try {
        console.log('Fetching vote settings...')
        const { data, error } = await supabase.from('vote_settings').select('*').limit(1)
        console.log('Supabase response:', { data, error })
        
        if (error) {
          console.error('Supabase error:', error)
          return
        }
        
        if (data && data.length > 0) {
          console.log('Setting vote settings:', data[0])
          setVoteSettings(data[0])
        } else {
          console.log('No vote settings found')
          setVoteSettings(null)
        }
      } catch (err) {
        console.error('Timer error:', err)
      }
    }
    
    // Run immediately
    debugTimer()
    
    // Run every 3 seconds
    const interval = setInterval(debugTimer, 3000)
    
    return () => {
      console.log('=== CLEANING UP TIMER ===')
      clearInterval(interval)
    }
  }, [])

  // DEBUG: Display timer with detailed logging
  useEffect(() => {
    console.log('=== DISPLAY TIMER EFFECT ===')
    console.log('voteSettings changed:', voteSettings)
    
    if (!voteSettings) {
      console.log('No vote settings, showing default')
      setTimeLeft('No active vote')
      return
    }
    
    const updateDisplay = () => {
      const now = Date.now()
      const remaining = voteSettings.endTime - now
      
      console.log('Timer calculation:', {
        now: new Date(now),
        endTime: new Date(voteSettings.endTime),
        remainingMs: remaining
      })
      
      if (remaining <= 0) {
        setTimeLeft('Voting Closed')
        console.log('Vote ended')
      } else {
        const hours = Math.floor(remaining / 3600000)
        const mins = Math.floor((remaining % 3600000) / 60000)
        const secs = Math.floor((remaining % 60000) / 1000)
        const timeString = `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
        setTimeLeft(timeString)
        console.log('Time left:', timeString)
      }
    }
    
    // Run immediately
    updateDisplay()
    
    // Update every second
    const timer = setInterval(updateDisplay, 1000)
    
    return () => {
      console.log('=== CLEANING UP DISPLAY TIMER ===')
      clearInterval(timer)
    }
  }, [voteSettings])

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    console.log('=== LOADING DATA ===')
    
    try {
      const [usersRes, votesRes] = await Promise.all([
        supabase.from('users').select('*').order('user_number', { ascending: true }),
        supabase.from('votes').select('*').order('timestamp', { ascending: false })
      ])
      
      console.log('Users response:', usersRes)
      console.log('Votes response:', votesRes)
      
      if (usersRes.data) setUsers(usersRes.data)
      if (votesRes.data) setVotes(votesRes.data)
      
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

  // Admin Functions
  const startNewVote = async (hours: number) => {
    try {
      console.log('=== STARTING NEW VOTE ===')
      const endTime = Date.now() + (hours * 3600000)
      const options = VOTE_OPTIONS.map(o => o.name)
      
      console.log('Creating vote with:', { endTime, options })
      
      // Clear existing votes
      await supabase.from('votes').delete().neq('id', '')
      
      // Clear and set new vote settings
      await supabase.from('vote_settings').delete().neq('id', '')
      const { error } = await supabase.from('vote_settings').insert([{
        id: '1',
        endTime: endTime,
        options: options
      }])
      
      if (error) throw error
      
      setVoteSettings({ id: '1', endTime, options })
      setHasVoted(false)
      loadData()
      alert(`Vote started for ${hours} hours`)
    } catch (error) {
      console.error('Start vote error:', error)
      alert('Failed to start vote')
    }
  }

  const endVoteNow = async () => {
    try {
      console.log('=== ENDING VOTE ===')
      await supabase.from('vote_settings').delete().neq('id', '')
      setVoteSettings(null)
      alert('Vote ended')
    } catch (error) {
      console.error('End vote error:', error)
      alert('Failed to end vote')
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
        joined: user.joined
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
      alert('Vote recorded!')
    } catch (error) {
      alert('Vote failed')
    }
  }

  const getVoteCount = (option: string) => votes.filter(v => v.option_name === option).length
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  // DEBUG VIEW - Shows raw data
  if (view === 'debug') {
    return (
      <div style={{ padding: '20px', background: '#000', color: '#fff' }}>
        <h1>DEBUG MODE</h1>
        <button onClick={() => setView('signin')}>Back to App</button>
        <div style={{ marginTop: '20px' }}>
          <h2>Vote Settings:</h2>
          <pre>{JSON.stringify(voteSettings, null, 2)}</pre>
          <h2>Current Time:</h2>
          <p>{new Date().toString()}</p>
          <h2>Users:</h2>
          <pre>{JSON.stringify(users, null, 2)}</pre>
          <h2>Votes:</h2>
          <pre>{JSON.stringify(votes, null, 2)}</pre>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        background: '#000',
        color: '#fff'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🔥</div>
        <p>Loading...</p>
      </div>
    )
  }

  if (view === 'signin') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        color: '#f1faee',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🔥</div>
          <h1 style={{ fontSize: '2rem', color: '#ffd700', marginBottom: '10px' }}>TRUTH BE TOLD</h1>
          <p style={{ color: '#a8dadc' }}>Sanctuary Access</p>
        </div>
        
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,215,0,0.3)',
          borderRadius: '16px',
          padding: '30px',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h2 style={{ textAlign: 'center', color: '#ffd700', marginBottom: '25px' }}>Sign In</h2>
          
          {error && (
            <div style={{
              background: 'rgba(230,57,70,0.2)',
              border: '1px solid #e63946',
              color: '#ff6b6b',
              padding: '12px',
              borderRadius: '12px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '15px',
              marginBottom: '15px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,215,0,0.3)',
              borderRadius: '12px',
              color: '#f1faee'
            }}
          />
          
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '15px',
              marginBottom: '20px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,215,0,0.3)',
              borderRadius: '12px',
              color: '#f1faee'
            }}
          />
          
          <button 
            onClick={handleSignIn}
            style={{
              width: '100%',
              padding: '15px',
              background: 'linear-gradient(135deg, #ffd700 0%, #b8860b 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#000',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '20px'
            }}
          >
            Enter Sanctuary
          </button>
          
          <p style={{ textAlign: 'center', color: '#a8dadc', fontSize: '0.9rem' }}>
            No account? <button 
              onClick={() => { setError(''); setView('signup') }}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffd700',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    )
  }

  if (view === 'signup') {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        color: '#f1faee',
        padding: '20px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🔥</div>
          <h1 style={{ fontSize: '2rem', color: '#ffd700', marginBottom: '10px' }}>TRUTH BE TOLD</h1>
          <p style={{ color: '#a8dadc' }}>Join the Community</p>
        </div>
        
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,215,0,0.3)',
          borderRadius: '16px',
          padding: '30px',
          width: '100%',
          maxWidth: '400px'
        }}>
          <h2 style={{ textAlign: 'center', color: '#ffd700', marginBottom: '25px' }}>Create Account</h2>
          
          {error && (
            <div style={{
              background: 'rgba(230,57,70,0.2)',
              border: '1px solid #e63946',
              color: '#ff6b6b',
              padding: '12px',
              borderRadius: '12px',
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              {error}
            </div>
          )}
          
          <input 
            type="text" 
            placeholder="Name" 
            value={name} 
            onChange={e => setName(e.target.value)}
            style={{
              width: '100%',
              padding: '15px',
              marginBottom: '15px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,215,0,0.3)',
              borderRadius: '12px',
              color: '#f1faee'
            }}
          />
          
          <input 
            type="email" 
            placeholder="Email" 
            value={email} 
            onChange={e => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '15px',
              marginBottom: '15px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,215,0,0.3)',
              borderRadius: '12px',
              color: '#f1faee'
            }}
          />
          
          <input 
            type="password" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '15px',
              marginBottom: '15px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,215,0,0.3)',
              borderRadius: '12px',
              color: '#f1faee'
            }}
          />
          
          <input 
            type="password" 
            placeholder="Confirm Password" 
            value={confirmPassword} 
            onChange={e => setConfirmPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '15px',
              marginBottom: '20px',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(255,215,0,0.3)',
              borderRadius: '12px',
              color: '#f1faee'
            }}
          />
          
          <button 
            onClick={handleSignUp}
            style={{
              width: '100%',
              padding: '15px',
              background: 'linear-gradient(135deg, #ffd700 0%, #b8860b 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#000',
              fontWeight: '600',
              cursor: 'pointer',
              marginBottom: '20px'
            }}
          >
            Forge Identity
          </button>
          
          <p style={{ textAlign: 'center', color: '#a8dadc', fontSize: '0.9rem' }}>
            Have an account? <button 
              onClick={() => { setError(''); setView('signin') }}
              style={{
                background: 'none',
                border: 'none',
                color: '#ffd700',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    )
  }

  // Main Dashboard
  const isAdmin = currentUser?.email === ADMIN_EMAIL
  
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      color: '#f1faee'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        borderBottom: '1px solid rgba(255,215,0,0.3)',
        background: 'rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #ffd700 0%, #b8860b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            color: '#000'
          }}>
            {getInitials(currentUser?.name || '')}
          </div>
          <div>
            <div style={{ fontWeight: '600' }}>{currentUser?.name}</div>
            <div style={{ fontSize: '0.8rem', color: '#a8dadc' }}>
              {currentUser?.tierName} #{currentUser?.userNumber}
            </div>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {voteSettings && voteSettings.endTime > Date.now() && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: 'rgba(255,215,0,0.1)',
              padding: '8px 15px',
              borderRadius: '20px',
              border: '1px solid rgba(255,215,0,0.3)'
            }}>
              <span style={{ fontSize: '1.2rem' }}>⏰</span>
              <span style={{ fontWeight: '600', color: '#ffd700' }}>{timeLeft}</span>
            </div>
          )}
          <button 
            onClick={() => setView('debug')}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#a8dadc',
              padding: '8px 15px',
              borderRadius: '20px',
              cursor: 'pointer'
            }}
          >
            Debug
          </button>
          <button 
            onClick={handleSignOut}
            style={{
              background: 'rgba(230,57,70,0.2)',
              border: '1px solid #e63946',
              color: '#ff6b6b',
              padding: '8px 15px',
              borderRadius: '20px',
              cursor: 'pointer'
            }}
          >
            Exit
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255,215,0,0.3)',
        background: 'rgba(0,0,0,0.2)'
      }}>
        <button 
          onClick={() => setTab('home')}
          style={{
            flex: 1,
            padding: '15px',
            background: 'none',
            border: 'none',
            color: tab === 'home' ? '#ffd700' : '#a8dadc',
            fontSize: '1.2rem',
            cursor: 'pointer',
            position: 'relative'
          }}
        >
          🏠
          {tab === 'home' && (
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              height: '3px',
              background: '#ffd700'
            }}></div>
          )}
        </button>
        <button 
          onClick={() => setTab('members')}
          style={{
            flex: 1,
            padding: '15px',
            background: 'none',
            border: 'none',
            color: tab === 'members' ? '#ffd700' : '#a8dadc',
            fontSize: '1.2rem',
            cursor: 'pointer',
            position: 'relative'
          }}
        >
          👥
          {tab === 'members' && (
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              right: '0',
              height: '3px',
              background: '#ffd700'
            }}></div>
          )}
        </button>
        {isAdmin && (
          <button 
            onClick={() => setTab('admin')}
            style={{
              flex: 1,
              padding: '15px',
              background: 'none',
              border: 'none',
              color: tab === 'admin' ? '#ff6b6b' : '#a8dadc',
              fontSize: '1.2rem',
              cursor: 'pointer',
              position: 'relative'
            }}
          >
            ⚙️
            {tab === 'admin' && (
              <div style={{
                position: 'absolute',
                bottom: '0',
                left: '0',
                right: '0',
                height: '3px',
                background: '#ff6b6b'
              }}></div>
            )}
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: '20px' }}>
        {tab === 'home' && (
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            {voteSettings && voteSettings.endTime > Date.now() ? (
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,215,0,0.3)',
                borderRadius: '16px',
                padding: '25px',
                marginBottom: '20px'
              }}>
                <h2 style={{ textAlign: 'center', color: '#ffd700', marginBottom: '5px' }}>Community Vote</h2>
                <p style={{ textAlign: 'center', color: '#a8dadc', marginBottom: '25px' }}>
                  Shape our next feature
                </p>
                
                {!hasVoted ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {VOTE_OPTIONS.map(opt => (
                      <button
                        key={opt.name}
                        onClick={() => handleVote(opt.name)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '15px',
                          padding: '15px',
                          background: 'rgba(0,0,0,0.3)',
                          border: '1px solid rgba(255,215,0,0.3)',
                          borderRadius: '12px',
                          color: '#f1faee',
                          cursor: 'pointer',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseOver={e => e.currentTarget.style.background = 'rgba(255,215,0,0.1)'}
                        onMouseOut={e => e.currentTarget.style.background = 'rgba(0,0,0,0.3)'}
                      >
                        <span style={{ fontSize: '1.5rem' }}>{opt.icon}</span>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontWeight: '500' }}>{opt.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#a8dadc' }}>{opt.desc}</div>
                        </div>
                        <span style={{ color: '#ffd700', fontWeight: '600' }}>
                          ({getVoteCount(opt.name)})
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>✅</div>
                    <p style={{ color: '#ffd700', fontWeight: '600' }}>
                      Your voice has been heard
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '16px',
                border: '1px solid rgba(255,215,0,0.3)'
              }}>
                <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🗳️</div>
                <p style={{ fontSize: '1.2rem', color: '#a8dadc' }}>
                  No active vote
                </p>
              </div>
            )}
          </div>
        )}

        {tab === 'admin' && isAdmin && (
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,215,0,0.3)',
              borderRadius: '16px',
              padding: '25px'
            }}>
              <h2 style={{ textAlign: 'center', color: '#ffd700', marginBottom: '25px' }}>Admin Panel</h2>
              
              <div style={{ marginBottom: '25px' }}>
                <h3 style={{ color: '#ffd700', marginBottom: '15px' }}>Start Vote</h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '10px',
                  marginBottom: '15px'
                }}>
                  {[12, 24, 48].map(h => (
                    <button
                      key={h}
                      onClick={() => startNewVote(h)}
                      style={{
                        padding: '12px',
                        background: 'rgba(255,215,0,0.1)',
                        border: '1px solid rgba(255,215,0,0.3)',
                        borderRadius: '12px',
                        color: '#ffd700',
                        cursor: 'pointer'
                      }}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                  <input 
                    type="number" 
                    placeholder="Hours" 
                    value={customHours}
                    onChange={e => setCustomHours(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,215,0,0.3)',
                      borderRadius: '12px',
                      color: '#f1faee'
                    }}
                  />
                  <button
                    onClick={() => {
                      const hours = parseInt(customHours)
                      if (hours && hours > 0) startNewVote(hours)
                    }}
                    style={{
                      padding: '12px',
                      background: 'rgba(255,215,0,0.1)',
                      border: '1px solid rgba(255,215,0,0.3)',
                      borderRadius: '12px',
                      color: '#ffd700',
                      cursor: 'pointer'
                    }}
                  >
                    Start
                  </button>
                </div>
                <button
                  onClick={endVoteNow}
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(230,57,70,0.2)',
                    border: '1px solid #e63946',
                    borderRadius: '12px',
                    color: '#ff6b6b',
                    cursor: 'pointer'
                  }}
                >
                  End Vote Now
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'members' && (
          <div style={{ maxWidth: '500px', margin: '0 auto' }}>
            <h2 style={{ textAlign: 'center', color: '#ffd700', marginBottom: '25px' }}>
              Community ({users.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {[...users].reverse().map(u => (
                <div 
                  key={u.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '15px',
                    padding: '15px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,215,0,0.3)'
                  }}
                >
                  <div style={{
                    width: '45px',
                    height: '45px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ffd700 0%, #b8860b 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    color: '#000'
                  }}>
                    {getInitials(u.name)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500' }}>{u.name}</div>
                    <div style={{ fontSize: '0.8rem', color: '#a8dadc' }}>
                      {u.tier_name} #{u.user_number}
                    </div>
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