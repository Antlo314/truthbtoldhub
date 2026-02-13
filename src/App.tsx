import { useState, useEffect, useRef } from 'react'

// Tier system
interface Tier {
  name: string;
  icon: string;
  inscription: string;
  css: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  userNumber: number;
  tier: Tier;
  joined: string;
}

const getTier = (userNumber: number): Tier => {
  if (userNumber <= 13) return { name: 'Founding Ember', icon: '👑', inscription: 'In at the beginning', css: 'tier-founding' }
  if (userNumber <= 36) return { name: 'Sacred Circle', icon: '⚜', inscription: 'Among the first flames', css: 'tier-sacred' }
  if (userNumber <= 86) return { name: 'Ember Keeper', icon: '🔥', inscription: 'Kept the fire alive', css: 'tier-keeper' }
  return { name: 'Member', icon: '◈', inscription: 'Welcome to the sanctuary', css: 'tier-member' }
}

const getStoredUsers = (): User[] => {
  try {
    const users = localStorage.getItem('tbt_users')
    return users ? JSON.parse(users) : []
  } catch { return [] }
}

const saveUsers = (users: User[]) => {
  localStorage.setItem('tbt_users', JSON.stringify(users))
}

// Flame Canvas Component
function FlameBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let W = canvas.width = window.innerWidth
    let H = canvas.height = window.innerHeight
    let animId: number

    const handleResize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    class FlameParticle {
      x: number; y: number; vx: number; vy: number;
      radius: number; life: number; decay: number; hue: number;
      constructor() {
        this.x = Math.random() * W
        this.y = H + Math.random() * 100
        this.vx = (Math.random() - 0.5) * 1.5
        this.vy = -(Math.random() * 3 + 2)
        this.radius = Math.random() * 40 + 20
        this.life = 1
        this.decay = Math.random() * 0.008 + 0.005
        this.hue = Math.random() * 40 + 10
      }
      reset() {
        this.x = Math.random() * W
        this.y = H + Math.random() * 100
        this.vx = (Math.random() - 0.5) * 1.5
        this.vy = -(Math.random() * 3 + 2)
        this.radius = Math.random() * 40 + 20
        this.life = 1
        this.decay = Math.random() * 0.008 + 0.005
        this.hue = Math.random() * 40 + 10
      }
      update() {
        this.x += this.vx + Math.sin(this.y * 0.01) * 0.5
        this.y += this.vy
        this.life -= this.decay
        this.radius *= 0.997
        if (this.life <= 0 || this.y < -50) this.reset()
      }
      draw(c: CanvasRenderingContext2D) {
        const a = this.life * 0.4
        const g = c.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius)
        g.addColorStop(0, `hsla(${this.hue + 20}, 100%, 80%, ${a})`)
        g.addColorStop(0.3, `hsla(${this.hue}, 100%, 55%, ${a * 0.8})`)
        g.addColorStop(0.7, `hsla(${this.hue - 10}, 100%, 30%, ${a * 0.4})`)
        g.addColorStop(1, 'hsla(0, 100%, 10%, 0)')
        c.fillStyle = g
        c.fillRect(this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2)
      }
    }

    const flames: FlameParticle[] = []
    for (let i = 0; i < 120; i++) {
      const f = new FlameParticle()
      f.y = Math.random() * H
      f.life = Math.random()
      flames.push(f)
    }

    const animate = () => {
      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = 'rgba(10, 5, 3, 0.15)'
      ctx.fillRect(0, 0, W, H)
      ctx.globalCompositeOperation = 'lighter'

      // Base glow
      const glow = ctx.createLinearGradient(0, H, 0, H * 0.4)
      glow.addColorStop(0, 'rgba(180, 60, 10, 0.6)')
      glow.addColorStop(0.3, 'rgba(120, 30, 5, 0.3)')
      glow.addColorStop(0.6, 'rgba(60, 15, 2, 0.15)')
      glow.addColorStop(1, 'rgba(10, 5, 3, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, W, H)

      flames.forEach(f => { f.update(); f.draw(ctx) })
      animId = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} />
}

// Ember Particles
function EmberParticles() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const sizes = ['ember-small', 'ember-medium', 'ember-large']

    const createEmber = () => {
      const ember = document.createElement('div')
      ember.className = `ember ${sizes[Math.floor(Math.random() * sizes.length)]}`
      ember.style.left = `${Math.random() * 100}%`
      ember.style.bottom = '-10px'
      ember.style.animationDelay = `${Math.random() * 2}s`
      ember.style.animationDuration = `${Math.random() * 3 + 4}s`
      container.appendChild(ember)
      setTimeout(() => ember.remove(), 8000)
    }

    for (let i = 0; i < 25; i++) setTimeout(createEmber, i * 200)
    const interval = setInterval(createEmber, 400)
    return () => clearInterval(interval)
  }, [])

  return <div ref={containerRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }} />
}

// Dashboard Component
function Dashboard({ user, onSignOut }: { user: User; onSignOut: () => void }) {
  const users = getStoredUsers();
  const totalMembers = users.length;
  const totalVotes = 6; // from the scroll results

  const pastVoteResults = [
    { feature: 'Sacred Sign-In', percentage: 50, votes: 3 },
    { feature: 'The Pool', percentage: 16.7, votes: 1 },
    { feature: 'Teachings & Dialogues', percentage: 33.3, votes: 2 },
    { feature: 'Hymnal Music', percentage: 0, votes: 0 },
    { feature: 'The Library', percentage: 0, votes: 0 },
    { feature: 'TBT Chat', percentage: 0, votes: 0 },
    { feature: 'The Community', percentage: 0, votes: 0 },
    { feature: 'Creative Works', percentage: 0, votes: 0 },
    { feature: 'Action & Outreach', percentage: 0, votes: 0 },
    { feature: 'The Archive', percentage: 0, votes: 0 }
  ];

  const upcomingFeatures = [
    { name: 'Music Page', description: 'Tracks, instrumentals, spoken word' },
    { name: 'Chat Page', description: 'Real-time community discussion' },
    { name: 'Content Page', description: 'Videos, short films, creative works' },
    { name: 'Library', description: 'Curated writings and references' },
    { name: 'Teachings', description: 'Long-form dialogues on truth' },
    { name: 'Archive', description: 'Chronological record of moments' }
  ];

  const isAdmin = user.email === 'info@truthbtoldhub.com';

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="scroll-title">
          <h1>Welcome, {user.name}</h1>
          <p>Sanctuary Dashboard</p>
        </div>
        <div className="ornament">― ✦ ―</div>
        <div className="user-number">#{user.userNumber}</div>
        <div style={{ textAlign: 'center' }}>
          <span className={`tier-badge ${user.tier.css}`}>
            {user.tier.icon} {user.tier.name}
          </span>
        </div>
        <p className="tier-inscription">"{user.tier.inscription}"</p>
        {user.userNumber === 1 && (
          <p className="founder-note">🔥 You are the First Flame. The sanctuary begins with you.</p>
        )}
      </div>

      <div className="dashboard-grid">
        {/* Past Vote Results */}
        <div className="dashboard-card">
          <h3>🗳️ Past Vote Results</h3>
          <p className="card-subtitle">The Sacred Scroll has spoken</p>
          <div className="vote-results">
            {pastVoteResults.map((item, idx) => (
              <div key={idx} className="vote-item">
                <div className="vote-feature">{item.feature}</div>
                <div className="vote-bar">
                  <div className="vote-fill" style={{ width: `${item.percentage}%` }} />
                </div>
                <div className="vote-percentage">{item.percentage}% ({item.votes} marks)</div>
              </div>
            ))}
          </div>
          <p className="note">Sacred Sign-In won with 50% — now being forged</p>
        </div>

        {/* Next Feature Being Built */}
        <div className="dashboard-card">
          <h3>🔨 Next Feature Being Built</h3>
          <p className="card-subtitle">The Pool — Community Fund</p>
          <div className="progress-section">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: '16.7%' }} />
            </div>
            <div className="progress-label">16.7% complete</div>
          </div>
          <p className="progress-description">
            Transparent fund for disbursements, community activities, and voted initiatives.
          </p>
          <button className="btn-secondary">Follow Progress</button>
        </div>

        {/* Next Community Vote */}
        <div className="dashboard-card">
          <h3>🗳️ Next Community Vote</h3>
          <p className="card-subtitle">Help decide what we build next</p>
          <div className="vote-options">
            <p>Choose from 7 new suggestions:</p>
            <ul style={{ marginLeft: '20px', color: '#4a3020', fontSize: '0.9rem' }}>
              <li>Music Player with uploads</li>
              <li>Live community chat</li>
              <li>Video content hub</li>
              <li>Member spotlight features</li>
              <li>Mutual aid coordination</li>
              <li>Timeline of truth archive</li>
              <li>Community event calendar</li>
            </ul>
          </div>
          <button className="btn-secondary" onClick={() => alert('Vote will open soon!')}>View Suggestions</button>
          {isAdmin && (
            <button className="btn-admin" style={{ marginTop: '10px' }} onClick={() => alert('Admin: Launch vote')}>Launch Vote</button>
          )}
        </div>

        {/* User Stats */}
        <div className="dashboard-card">
          <h3>📜 Your Stats</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Tier</div>
              <div className="stat-value">{user.tier.name}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Member #</div>
              <div className="stat-value">#{user.userNumber}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Joined</div>
              <div className="stat-value">{new Date(user.joined).toLocaleDateString()}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Status</div>
              <div className="stat-value">Active</div>
            </div>
          </div>
        </div>

        {/* Community Stats */}
        <div className="dashboard-card">
          <h3>👥 Community Stats</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-label">Total Members</div>
              <div className="stat-value">{totalMembers}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Votes Cast</div>
              <div className="stat-value">{totalVotes}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Founding Embers</div>
              <div className="stat-value">{users.filter(u => u.userNumber <= 13).length}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Active Now</div>
              <div className="stat-value">{Math.floor(totalMembers * 0.3)}</div>
            </div>
          </div>
        </div>

        {/* Upcoming Features */}
        <div className="dashboard-card wide">
          <h3>🚀 Upcoming Features</h3>
          <div className="features-grid">
            {upcomingFeatures.map((feat, idx) => (
              <div key={idx} className="feature-preview">
                <div className="feature-icon">{['🎵', '💬', '🎬', '📚', '🎓', '📜'][idx]}</div>
                <div className="feature-details">
                  <h4>{feat.name}</h4>
                  <p>{feat.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Admin Controls */}
        {isAdmin && (
          <div className="dashboard-card admin">
            <h3>🔮 Admin Controls</h3>
            <p>Welcome, Founder. You hold the flame.</p>
            <div className="admin-actions">
              <button className="btn-admin">Manage Users</button>
              <button className="btn-admin">View Analytics</button>
              <button className="btn-admin">Launch Next Vote</button>
              <button className="btn-admin">Adjust Tiers</button>
            </div>
          </div>
        )}
      </div>

      <div className="dashboard-footer">
        <button className="btn-primary" onClick={onSignOut}>Depart from Sanctuary</button>
        <p className="footer-note">© 2026 Truth B Told — Unlearn Everything</p>
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<'signin' | 'signup' | 'dashboard'>('signin')
  const [user, setUser] = useState<User | null>(null)
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' } | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    const currentUser = localStorage.getItem('tbt_currentUser')
    if (currentUser) {
      try {
        const u = JSON.parse(currentUser)
        setUser(u)
        setView('dashboard')
      } catch { /* ignore */ }
    }
  }, [])

  const showMsg = (text: string, type: 'error' | 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 5000)
  }

  const handleSignUp = () => {
    if (!newName || !newEmail || !newPassword || !confirmPassword) {
      showMsg('All fields are required', 'error'); return
    }
    if (newPassword !== confirmPassword) {
      showMsg('Passwords do not match', 'error'); return
    }
    if (newPassword.length < 6) {
      showMsg('Password must be at least 6 characters', 'error'); return
    }

    const users = getStoredUsers()
    if (users.find(u => u.email === newEmail.toLowerCase())) {
      showMsg('This email is already inscribed', 'error'); return
    }

    const userNumber = users.length + 1
    const tier = getTier(userNumber)
    const newUser: User = {
      id: Date.now(), name: newName, email: newEmail.toLowerCase(),
      password: newPassword, userNumber, tier, joined: new Date().toISOString()
    }

    users.push(newUser)
    saveUsers(users)
    localStorage.setItem('tbt_currentUser', JSON.stringify(newUser))
    setUser(newUser)
    setView('dashboard')
  }

  const handleSignIn = () => {
    if (!email || !password) {
      showMsg('Enter thy Sacred Mark and Secret Word', 'error'); return
    }
    const users = getStoredUsers()
    const found = users.find(u => u.email === email.toLowerCase() && u.password === password)
    if (!found) {
      showMsg('Invalid Sacred Mark or Secret Word', 'error'); return
    }
    localStorage.setItem('tbt_currentUser', JSON.stringify(found))
    setUser(found)
    setView('dashboard')
  }

  const handleSignOut = () => {
    localStorage.removeItem('tbt_currentUser')
    setUser(null)
    setEmail(''); setPassword('')
    setNewName(''); setNewEmail(''); setNewPassword(''); setConfirmPassword('')
    setView('signin')
  }

  return (
    <>
      <FlameBackground />
      <EmberParticles />
      <div className="heat-shimmer" />

      <div className="scroll-page">
        <div className="scroll-wrapper">
          <div className="scroll-roll-top" />

          <div className="scroll-body">
            <div className="burnt-edge-top" />
            <div className="burnt-edge-bottom" />

            <div className="scroll-title">
              <h1>TRUTH BE TOLD HUB</h1>
              <p>The Sacred Scroll</p>
            </div>
            <div className="ornament">― ✦ ―</div>

            {message && (
              <div className={`message ${message.type}`}>{message.text}</div>
            )}

            {/* SIGN IN */}
            {view === 'signin' && (
              <div className="form-enter">
                <div className="form-group">
                  <label>Sacred Mark</label>
                  <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Secret Word</label>
                  <input type="password" placeholder="Enter thy password" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
                <button type="button" className="btn-primary" onClick={handleSignIn}>Enter the Sanctuary</button>
                <div className="switch-section">
                  <p>No mark yet?</p>
                  <button type="button" className="switch-btn" onClick={() => { setMessage(null); setView('signup') }}>Begin Your Inscription</button>
                </div>
              </div>
            )}

            {/* SIGN UP */}
            {view === 'signup' && (
              <div className="form-enter">
                <div className="form-group">
                  <label>Sacred Name</label>
                  <input type="text" placeholder="Thy chosen name" value={newName} onChange={e => setNewName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Sacred Mark</label>
                  <input type="email" placeholder="your@email.com" value={newEmail} onChange={e => setNewEmail(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Secret Word</label>
                  <input type="password" placeholder="Forge thy password (6+ chars)" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Confirm Secret Word</label>
                  <input type="password" placeholder="Confirm thy password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>
                <button type="button" className="btn-primary" onClick={handleSignUp}>Forge Your Mark</button>
                <div className="switch-section">
                  <p>Already inscribed?</p>
                  <button type="button" className="switch-btn" onClick={() => { setMessage(null); setView('signin') }}>Return to Sign In</button>
                </div>
              </div>
            )}

            {/* DASHBOARD */}
            {view === 'dashboard' && user && (
              <Dashboard user={user} onSignOut={handleSignOut} />
            )}

            <div className="scroll-footer">© 2026 Truth B Told — Unlearn Everything</div>
          </div>

          <div className="scroll-roll-bottom">
            <div className="wax-seal">
              <div className="wax-seal-outer">
                <div className="wax-seal-inner">
                  <span className="wax-seal-text">TBT</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
