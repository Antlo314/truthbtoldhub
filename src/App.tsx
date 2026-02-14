import { useState, useEffect } from 'react';
import { signUpUser, signInUser, signOutUser, getCurrentUser, getVoteOptions, castVote, getCommunityStats, getAllUsers } from './firebase';

// ============ STYLES ============
const styles = {
  container: {
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
  },
  flameCanvas: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  content: {
    position: 'relative',
    zIndex: 1,
    padding: '20px',
    maxWidth: '600px',
    margin: '0 auto',
  },
  scrollContainer: {
    width: '100%',
    position: 'relative',
  },
  scrollTop: {
    height: '25px',
    background: 'linear-gradient(180deg, #4a2c17 0%, #6b3d1f 50%, #4a2c17 100%)',
    borderRadius: '15px 15px 0 0',
    boxShadow: 'inset 0 -3px 8px rgba(0,0,0,0.4), 0 3px 10px rgba(0,0,0,0.4)',
  },
  scrollPaper: {
    background: 'linear-gradient(180deg, #d4c4a8 0%, #c9b896 15%, #bea882 85%, #b8956a 100%)',
    padding: '35px 25px',
    position: 'relative',
    boxShadow: 'inset 0 0 40px rgba(139, 69, 19, 0.15)',
  },
  scrollBottom: {
    height: '25px',
    background: 'linear-gradient(180deg, #4a2c17 0%, #6b3d1f 50%, #4a2c17 100%)',
    borderRadius: '0 0 15px 15px',
    boxShadow: 'inset 0 3px 8px rgba(0,0,0,0.4), 0 -3px 10px rgba(0,0,0,0.4)',
  },
  title: {
    textAlign: 'center',
    marginBottom: '25px',
  },
  titleH1: {
    fontFamily: '"Cinzel Decorative", serif',
    fontSize: '1.6rem',
    color: '#2d1810',
    textShadow: '1px 1px 0 #8b7355',
    marginBottom: '5px',
  },
  titleP: {
    fontFamily: '"IM Fell English", serif',
    color: '#5c4433',
    fontSize: '0.9rem',
    fontStyle: 'italic',
  },
  formGroup: {
    marginBottom: '18px',
  },
  label: {
    display: 'block',
    fontFamily: '"Cinzel", serif',
    color: '#3d2817',
    fontWeight: 'bold',
    marginBottom: '6px',
    fontSize: '0.85rem',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(255, 248, 235, 0.7)',
    border: '2px solid #8b7355',
    borderRadius: '5px',
    color: '#2d1810',
    fontSize: '1rem',
    fontFamily: '"IM Fell English", serif',
    transition: 'all 0.3s',
  },
  button: {
    width: '100%',
    padding: '14px',
    background: 'linear-gradient(180deg, #5c3d24 0%, #3d2817 100%)',
    border: '2px solid #2d1810',
    borderRadius: '5px',
    color: '#d4c4a8',
    fontSize: '1rem',
    fontFamily: '"Cinzel", serif',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginBottom: '12px',
  },
  divider: {
    textAlign: 'center',
    color: '#8b7355',
    margin: '18px 0',
    position: 'relative',
  },
  signupLink: {
    textAlign: 'center',
    color: '#5c4433',
  },
  message: {
    padding: '10px',
    borderRadius: '5px',
    marginBottom: '15px',
    textAlign: 'center',
    fontSize: '0.85rem',
  },
  hidden: {
    display: 'none',
  },
  // Dashboard styles
  dashboard: {
    padding: '10px 0',
  },
  welcomeBanner: {
    background: 'linear-gradient(135deg, #3d2817 0%, #5c3d24 100%)',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '20px',
    textAlign: 'center',
    border: '2px solid #d4af37',
  },
  userName: {
    fontFamily: '"Cinzel Decorative", serif',
    fontSize: '1.4rem',
    color: '#d4c4a8',
    marginBottom: '5px',
  },
  tierBadge: {
    display: 'inline-block',
    padding: '5px 15px',
    borderRadius: '20px',
    fontSize: '0.85rem',
    fontWeight: 'bold',
    marginTop: '8px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
    marginBottom: '20px',
  },
  statCard: {
    background: 'rgba(45, 24, 16, 0.1)',
    border: '1px solid #8b7355',
    borderRadius: '8px',
    padding: '12px',
    textAlign: 'center',
  },
  statValue: {
    fontFamily: '"Cinzel Decorative", serif',
    fontSize: '1.3rem',
    color: '#3d2817',
  },
  statLabel: {
    fontSize: '0.75rem',
    color: '#5c4433',
  },
  sectionTitle: {
    fontFamily: '"Cinzel", serif',
    fontSize: '1.1rem',
    color: '#3d2817',
    marginBottom: '12px',
    borderBottom: '1px solid #8b7355',
    paddingBottom: '8px',
  },
  voteCard: {
    background: 'rgba(255, 248, 235, 0.5)',
    border: '1px solid #8b7355',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s',
  },
  voteCardSelected: {
    background: 'rgba(212, 175, 55, 0.3)',
    border: '2px solid #5c3d24',
  },
  voteProgress: {
    height: '8px',
    background: '#d4c4a8',
    borderRadius: '4px',
    marginTop: '8px',
    overflow: 'hidden',
  },
  voteProgressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #8b4513, #d4af37)',
    borderRadius: '4px',
    transition: 'width 0.5s',
  },
  waxSeal: {
    width: '80px',
    height: '80px',
    background: 'radial-gradient(circle at 30% 30%, #c41e3a, #8b0000, #5c0000)',
    borderRadius: '50%',
    margin: '20px auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 15px rgba(0,0,0,0.4), inset 0 -3px 10px rgba(0,0,0,0.3)',
    fontFamily: '"Cinzel Decorative", serif',
    color: '#d4c4a8',
    fontSize: '1.2rem',
    fontWeight: 'bold',
    border: '3px solid #5c0000',
  },
  adminPanel: {
    background: 'rgba(139, 69, 19, 0.2)',
    border: '2px solid #5c3d24',
    borderRadius: '10px',
    padding: '15px',
    marginTop: '20px',
  },
  adminTitle: {
    fontFamily: '"Cinzel", serif',
    color: '#3d2817',
    marginBottom: '10px',
  },
};

// ============ FLAME BACKGROUND COMPONENT ============
function FlameBackground() {
  useEffect(() => {
    const canvas = document.getElementById('flameCanvas');
    const ctx = canvas.getContext('2d');
    let animationId;
    let flames = [];
    let embers = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    class Flame {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height + Math.random() * 50;
        this.size = Math.random() * 30 + 20;
        this.speedY = Math.random() * 2 + 1;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.opacity = Math.random() * 0.5 + 0.3;
        this.hue = Math.random() * 40 + 10;
      }
      update() {
        this.y -= this.speedY;
        this.x += this.speedX;
        this.size *= 0.99;
        this.opacity *= 0.995;
        if (this.y < canvas.height * 0.3 || this.opacity < 0.05) {
          this.reset();
        }
      }
      draw() {
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
        gradient.addColorStop(0, `hsla(${this.hue + 20}, 100%, 70%, ${this.opacity})`);
        gradient.addColorStop(0.4, `hsla(${this.hue}, 100%, 50%, ${this.opacity * 0.6})`);
        gradient.addColorStop(1, `hsla(${this.hue - 10}, 100%, 30%, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    class Ember {
      constructor() {
        this.reset();
      }
      reset() {
        this.x = Math.random() * canvas.width;
        this.y = canvas.height;
        this.size = Math.random() * 3 + 1;
        this.speedY = Math.random() * 3 + 1;
        this.speedX = (Math.random() - 0.5) * 2;
        this.opacity = Math.random() * 0.8 + 0.2;
        this.hue = Math.random() * 30 + 20;
      }
      update() {
        this.y -= this.speedY;
        this.x += this.speedX + Math.sin(this.y * 0.01) * 0.5;
        this.opacity -= 0.003;
        if (this.opacity <= 0) {
          this.reset();
        }
      }
      draw() {
        ctx.fillStyle = `hsla(${this.hue}, 100%, 60%, ${this.opacity})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < 80; i++) {
      flames.push(new Flame());
    }
    for (let i = 0; i < 30; i++) {
      embers.push(new Ember());
    }

    function animate() {
      ctx.fillStyle = 'rgba(26, 15, 15, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      flames.forEach(f => { f.update(); f.draw(); });
      embers.forEach(e => { e.update(); e.draw(); });
      
      animationId = requestAnimationFrame(animate);
    }
    animate();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return <canvas id="flameCanvas" style={styles.flameCanvas} />;
}

// ============ MAIN APP ============
export default function App() {
  const [view, setView] = useState('signin');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [voteOptions, setVoteOptions] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedVote, setSelectedVote] = useState(null);
  const [stats, setStats] = useState({ totalMembers: 0, totalVotes: 0 });
  const [allUsers, setAllUsers] = useState([]);
  const [showSignUp, setShowSignUp] = useState(false);

  // Initialize
  useEffect(() => {
    checkAuth();
  }, []);

  // Check authentication
  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setView('dashboard');
        loadDashboardData();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load dashboard data
  const loadDashboardData = async () => {
    try {
      const options = await getVoteOptions();
      setVoteOptions(options);
      
      const communityStats = await getCommunityStats();
      setStats(communityStats);
      
      if (user?.email === 'info@truthbtoldhub.com') {
        const users = await getAllUsers();
        setAllUsers(users);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  // Show message
  const showMessage = (text, type = 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: '', type: '' }), 5000);
  };

  // Handle sign up
  const handleSignUp = async (e) => {
    e.preventDefault();
    const name = document.getElementById('newName').value.trim();
    const email = document.getElementById('newEmail').value.trim().toLowerCase();
    const password = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!name || !email || !password || !confirmPassword) {
      showMessage('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      showMessage('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      showMessage('Password must be at least 6 characters');
      return;
    }

    const result = await signUpUser(name, email, password);
    if (result.success) {
      setUser(result.user);
      setView('dashboard');
      loadDashboardData();
      showMessage('Welcome to the sanctuary!', 'success');
    } else {
      showMessage(result.error);
    }
  };

  // Handle sign in
  const handleSignIn = async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;

    if (!email || !password) {
      showMessage('Please enter your email and password');
      return;
    }

    const result = await signInUser(email, password);
    if (result.success) {
      setUser(result.user);
      setView('dashboard');
      loadDashboardData();
    } else {
      showMessage(result.error);
    }
  };

  // Handle sign out
  const handleSignOut = async () => {
    await signOutUser();
    setUser(null);
    setView('signin');
    setHasVoted(false);
    setSelectedVote(null);
  };

  // Handle vote
  const handleVote = async (optionId) => {
    if (!user) {
      showMessage('Please sign in to vote');
      return;
    }
    if (hasVoted) {
      showMessage('You have already voted this round');
      return;
    }

    const result = await castVote(user.uid, optionId);
    if (result.success) {
      setHasVoted(true);
      setSelectedVote(optionId);
      loadDashboardData();
      showMessage('Your vote has been cast!', 'success');
    } else {
      showMessage(result.error);
    }
  };

  // Get tier badge style
  const getTierStyle = (tierName) => {
    switch (tierName) {
      case 'Founding Ember':
        return { background: 'linear-gradient(135deg, #ffd700, #ffed4e)', color: '#2d1810' };
      case 'Sacred Circle':
        return { background: 'linear-gradient(135deg, #c0c0c0, #e8e8e8)', color: '#2d1810' };
      case 'Ember Keeper':
        return { background: 'linear-gradient(135deg, #cd7f32, #daa520)', color: '#2d1810' };
      default:
        return { background: 'linear-gradient(135deg, #8b7355, #a09080)', color: '#f4e4c1' };
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <FlameBackground />
        <div style={{...styles.content, textAlign: 'center', paddingTop: '100px'}}>
          <div style={styles.waxSeal}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <FlameBackground />
      
      <div style={styles.content}>
        <div style={styles.scrollContainer}>
          <div style={styles.scrollTop}></div>
          
          <div style={styles.scrollPaper}>
            {/* Sign In Form */}
            {view === 'signin' && !showSignUp && (
              <>
                <div style={styles.title}>
                  <h1 style={styles.titleH1}>TRUTH BE TOLD HUB</h1>
                  <p style={styles.titleP}>The Sacred Scroll</p>
                </div>

                {message.text && (
                  <div style={{...styles.message, background: message.type === 'success' ? 'rgba(34,85,34,0.2)' : 'rgba(139,0,0,0.2)', color: message.type === 'success' ? '#225522' : '#8b0000', border: `1px solid ${message.type === 'success' ? '#225522' : '#8b0000'}`}}>
                    {message.text}
                  </div>
                )}

                <form onSubmit={handleSignIn}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Sacred Mark (Email)</label>
                    <input type="email" id="email" placeholder="your@email.com" style={styles.input} />
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Secret Word (Password)</label>
                    <input type="password" id="password" placeholder="Enter your password" style={styles.input} />
                  </div>
                  
                  <button type="submit" style={styles.button}>Enter the Sanctuary</button>
                </form>
                
                <div style={styles.divider}>❧</div>
                
                <div style={styles.signupLink}>
                  <p>No mark yet?</p>
                  <button onClick={() => setShowSignUp(true)} style={{background: 'none', border: 'none', color: '#5c3d24', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', fontSize: '1rem'}}>
                    Begin your inscription
                  </button>
                </div>
              </>
            )}

            {/* Sign Up Form */}
            {view === 'signin' && showSignUp && (
              <>
                <div style={styles.title}>
                  <h1 style={styles.titleH1}>FORGE YOUR MARK</h1>
                  <p style={styles.titleP}>Join the Sacred Circle</p>
                </div>

                {message.text && (
                  <div style={{...styles.message, background: message.type === 'success' ? 'rgba(34,85,34,0.2)' : 'rgba(139,0,0,0.2)', color: message.type === 'success' ? '#225522' : '#8b0000', border: `1px solid ${message.type === 'success' ? '#225522' : '#8b0000'}`}}>
                    {message.text}
                  </div>
                )}

                <form onSubmit={handleSignUp}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Sacred Name</label>
                    <input type="text" id="newName" placeholder="Your chosen name" style={styles.input} />
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Sacred Mark (Email)</label>
                    <input type="email" id="newEmail" placeholder="your@email.com" style={styles.input} />
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Secret Word (Password)</label>
                    <input type="password" id="newPassword" placeholder="Create a password" style={styles.input} />
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Confirm Secret Word</label>
                    <input type="password" id="confirmPassword" placeholder="Confirm your password" style={styles.input} />
                  </div>
                  
                  <button type="submit" style={styles.button}>Forge Your Mark</button>
                </form>
                
                <div style={styles.divider}>❧</div>
                
                <div style={styles.signupLink}>
                  <p>Already inscribed?</p>
                  <button onClick={() => setShowSignUp(false)} style={{background: 'none', border: 'none', color: '#5c3d24', fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline', fontSize: '1rem'}}>
                    Return to sign in
                  </button>
                </div>
              </>
            )}

            {/* Dashboard */}
            {view === 'dashboard' && user && (
              <div style={styles.dashboard}>
                {/* Welcome Banner */}
                <div style={styles.welcomeBanner}>
                  <div style={styles.userName}>Welcome, {user.name}</div>
                  <div style={{...styles.tierBadge, ...getTierStyle(user.tier?.name)}}>
                    {user.tier?.name} #{user.userNumber}
                  </div>
                  <div style={{color: '#c9b896', fontSize: '0.85rem', marginTop: '5px'}}>
                    {user.tier?.title}
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={styles.statsGrid}>
                  <div style={styles.statCard}>
                    <div style={styles.statValue}>{stats.totalMembers}</div>
                    <div style={styles.statLabel}>Total Members</div>
                  </div>
                  <div style={styles.statCard}>
                    <div style={styles.statValue}>{stats.totalVotes}</div>
                    <div style={styles.statLabel}>Votes Cast</div>
                  </div>
                </div>

                {/* Past Vote Results */}
                <div style={styles.sectionTitle}>Past Vote Results</div>
                {voteOptions.slice(0, 1).map((option) => (
                  <div key={option.id} style={{...styles.voteCard, opacity: 1, cursor: 'default'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                      <span style={{fontWeight: 'bold', color: '#3d2817'}}>Sacred Sign-In</span>
                      <span style={{color: '#5c4433'}}>50% (3 marks)</span>
                    </div>
                    <div style={styles.voteProgress}>
                      <div style={{...styles.voteProgressFill, width: '50%'}}></div>
                    </div>
                  </div>
                ))}

                {/* Next Feature Being Built */}
                <div style={styles.sectionTitle}>Next Feature Being Built</div>
                <div style={{...styles.voteCard, opacity: 1, cursor: 'default', background: 'rgba(212, 175, 55, 0.2)'}}>
                  <div style={{fontWeight: 'bold', color: '#3d2817'}}>The Pool</div>
                  <div style={{fontSize: '0.8rem', color: '#5c4433', marginBottom: '8px'}}>Community fund for disbursements</div>
                  <div style={styles.voteProgress}>
                    <div style={{...styles.voteProgressFill, width: '16.7%'}}></div>
                  </div>
                  <div style={{fontSize: '0.75rem', color: '#5c4433', marginTop: '5px'}}>16.7% (1 mark) - In Progress</div>
                </div>

                {/* Current Vote */}
                <div style={styles.sectionTitle}>Cast Your Vote</div>
                {voteOptions.map((option) => {
                  const totalVotes = voteOptions.reduce((sum, o) => sum + (o.votes || 0), 0);
                  const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
                  const isSelected = selectedVote === option.id || (option.name === 'The Pool' && !hasVoted && !selectedVote);
                  
                  return (
                    <div 
                      key={option.id}
                      onClick={() => handleVote(option.id)}
                      style={{
                        ...styles.voteCard,
                        ...(isSelected ? styles.voteCardSelected : {}),
                        ...(hasVoted ? { cursor: 'default', opacity: 0.7 } : {})
                      }}
                    >
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                        <span style={{fontWeight: 'bold', color: '#3d2817'}}>{option.name}</span>
                        <span style={{color: '#5c4433'}}>{percentage}% ({option.votes} marks)</span>
                      </div>
                      <div style={{fontSize: '0.75rem', color: '#5c4433', marginBottom: '5px'}}>{option.description}</div>
                      <div style={styles.voteProgress}>
                        <div style={{...styles.voteProgressFill, width: `${percentage}%`}}></div>
                      </div>
                    </div>
                  );
                })}

                {hasVoted && (
                  <div style={{textAlign: 'center', color: '#5c4433', fontSize: '0.85rem', marginTop: '10px'}}>
                    ✓ You have cast your mark this round
                  </div>
                )}

                {/* Admin Panel */}
                {user.email === 'info@truthbtoldhub.com' && (
                  <div style={styles.adminPanel}>
                    <div style={styles.adminTitle}>🔮 Admin Controls</div>
                    <div style={{fontSize: '0.85rem', color: '#5c4433', marginBottom: '10px'}}>
                      Total Members: {stats.totalMembers}
                    </div>
                    <div style={{maxHeight: '150px', overflowY: 'auto'}}>
                      {allUsers.map((u, i) => (
                        <div key={i} style={{padding: '5px 0', borderBottom: '1px solid #8b7355', fontSize: '0.8rem'}}>
                          {u.name} - {u.tier?.name} #{u.userNumber}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sign Out */}
                <button onClick={handleSignOut} style={{...styles.button, marginTop: '20px', background: 'linear-gradient(180deg, #5c0000 0%, #3d0000 100%)'}}>
                  Depart from Sanctuary
                </button>

                <div style={styles.waxSeal}>TBT</div>
              </div>
            )}
          </div>
          
          <div style={styles.scrollBottom}></div>
        </div>
      </div>
    </div>
  );
}
