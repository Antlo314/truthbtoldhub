import { useState, useEffect } from "react";

// User types
interface User {
  email: string;
  name: string;
  createdAt: string;
}

// Stored user with password hash (simulated)
interface StoredUser extends User {
  password: string;
}

// Tier configuration
interface Tier {
  name: string;
  min: number;
  max: number;
  badge: string;
  tagline: string;
  color: string;
}

const TIERS: Tier[] = [
  { name: "Founding Ember", min: 1, max: 10, badge: "👑", tagline: "In at the beginning", color: "from-yellow-500 to-amber-600" },
  { name: "Sacred Circle", min: 11, max: 30, badge: "⚜", tagline: "Among the first flames", color: "from-gray-300 to-slate-400" },
  { name: "Ember Keeper", min: 31, max: 80, badge: "🔥", tagline: "Kept the fire alive", color: "from-orange-700 to-red-800" },
  { name: "Member", min: 81, max: 999999, badge: "◈", tagline: "Welcome to the sanctuary", color: "from-amber-800 to-amber-900" },
];

// Admin email
const ADMIN_EMAIL = "info@truthbtoldhub.com";

// Get stored users
const getStoredUsers = (): StoredUser[] => {
  const users = localStorage.getItem("tbt_users");
  return users ? JSON.parse(users) : [];
};

function getTier(userNumber: number): Tier {
  return TIERS.find(tier => userNumber >= tier.min && userNumber <= tier.max) || TIERS[TIERS.length - 1];
}

function getUserNumber(email: string): number {
  const users = getStoredUsers();
  const index = users.findIndex(u => u.email.toLowerCase() === email.toLowerCase());
  return index >= 0 ? index + 1 : users.length + 1;
}

function App() {
  const [mode, setMode] = useState<"signin" | "signup" | "dashboard">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [userNumber, setUserNumber] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  // Save user to storage
  const saveUser = (user: StoredUser) => {
    const users = getStoredUsers();
    users.push(user);
    localStorage.setItem("tbt_users", JSON.stringify(users));
  };

  // Find user by email
  const findUser = (email: string): StoredUser | undefined => {
    return getStoredUsers().find((u) => u.email.toLowerCase() === email.toLowerCase());
  };

  // Check for existing session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("tbt_currentUser");
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setCurrentUser(parsed);
        setUserNumber(getUserNumber(parsed.email));
        setIsAdmin(parsed.email.toLowerCase() === ADMIN_EMAIL);
        setMode("dashboard");
      } catch (e) {
        console.error("Failed to parse saved user:", e);
      }
    }
  }, []);

  // Handle sign in
  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    setTimeout(() => {
      const user = findUser(email);

      if (!user) {
        setError("No sacred mark found. Begin your inscription first.");
        setIsLoading(false);
        return;
      }

      if (user.password !== password) {
        setError("The secret word does not match our records.");
        setIsLoading(false);
        return;
      }

      // Success
      const userData: User = {
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      };

      if (rememberMe) {
        localStorage.setItem("tbt_currentUser", JSON.stringify(userData));
      }
      sessionStorage.setItem("tbt_currentUser", JSON.stringify(userData));

      setCurrentUser(userData);
      setUserNumber(getUserNumber(user.email));
      setIsAdmin(user.email.toLowerCase() === ADMIN_EMAIL);
      setMode("dashboard");
      setIsLoading(false);
    }, 1000);
  };

  // Handle sign up
  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("The secret words do not align. Try again.");
      return;
    }

    if (password.length < 6) {
      setError("The secret word must be at least 6 marks.");
      return;
    }

    if (!name.trim()) {
      setError("We need your sacred name.");
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      if (findUser(email)) {
        setError("This sacred mark is already inscribed.");
        setIsLoading(false);
        return;
      }

      const newUser: StoredUser = {
        email: email.toLowerCase(),
        name: name.trim(),
        password: password,
        createdAt: new Date().toISOString(),
      };

      saveUser(newUser);

      // Auto sign in
      const userData: User = {
        email: newUser.email,
        name: newUser.name,
        createdAt: newUser.createdAt,
      };

      if (rememberMe) {
        localStorage.setItem("tbt_currentUser", JSON.stringify(userData));
      }
      sessionStorage.setItem("tbt_currentUser", JSON.stringify(userData));

      setCurrentUser(userData);
      setUserNumber(getUserNumber(newUser.email));
      setIsAdmin(newUser.email.toLowerCase() === ADMIN_EMAIL);
      setMode("dashboard");
      setIsLoading(false);
    }, 1000);
  };

  // Handle sign out
  const handleSignOut = () => {
    localStorage.removeItem("tbt_currentUser");
    sessionStorage.removeItem("tbt_currentUser");
    setCurrentUser(null);
    setMode("signin");
    setEmail("");
    setPassword("");
    setName("");
    setConfirmPassword("");
    setUserNumber(0);
    setIsAdmin(false);
  };

  const goToSignUp = (e: React.MouseEvent) => {
    e.preventDefault();
    console.log("Sign up button clicked");
    setMode("signup");
    setError("");
  };

  const goToSignIn = () => {
    setMode("signin");
    setError("");
  };

  const currentTier = userNumber > 0 ? getTier(userNumber) : null;

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-[#1a1512] via-[#1a1512] to-[#151210]">
      {/* Animated ember/fire background - LIGHTER GOLDEN AMBER */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#2a2018] via-[#1f1a14] to-[#181410]" />

        {/* Ember particles - lighter orange/amber */}
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-ember"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: `-${Math.random() * 20}px`,
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              background: `rgba(255, ${Math.floor(Math.random() * 60) + 180}, 80, ${Math.random() * 0.5 + 0.3})`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${Math.random() * 6 + 6}s`,
            }}
          />
        ))}

        {/* Large floating embers - golden/amber glow */}
        {[...Array(5)].map((_, i) => (
          <div
            key={`large-${i}`}
            className="absolute rounded-full animate-ember-slow"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: `-50px`,
              width: `${Math.random() * 20 + 10}px`,
              height: `${Math.random() * 20 + 10}px`,
              background: `radial-gradient(circle, rgba(255, 220, 150, 0.6) 0%, rgba(255, 180, 80, 0.3) 40%, transparent 70%)`,
              animationDelay: `${Math.random() * 10}s`,
              animationDuration: `${Math.random() * 10 + 10}s`,
            }}
          />
        ))}

        {/* Flame glow effects - lighter, more golden */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-600/8 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-orange-500/6 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md">
          {/* Decorative top flourish */}
          <div className="text-center mb-3">
            <div className="inline-block text-amber-500/40 text-3xl">❧</div>
          </div>

          {/* The Sacred Scroll */}
          <div className="relative">
            {/* Scroll edges - lighter brown/tan */}
            <div className="absolute -top-3 left-0 right-0 h-6 bg-gradient-to-b from-[#5a4538] to-[#4a382d] rounded-t-full" />
            <div className="absolute -bottom-3 left-0 right-0 h-6 bg-gradient-to-t from-[#5a4538] to-[#4a382d] rounded-b-full" />

            {/* Main scroll body - lighter interior */}
            <div className="bg-gradient-to-b from-[#4a382d] via-[#3d2f25] to-[#352820] border border-amber-800/20 rounded-lg shadow-2xl shadow-black/30 overflow-hidden">
              {/* Inner glow border */}
              <div className="absolute inset-0 border border-amber-700/10 rounded-lg" />

              {/* Header */}
              <div className="p-8 pb-6 text-center border-b border-amber-900/15">
                <div className="mb-4">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 shadow-lg shadow-amber-900/20 border border-amber-500/20">
                    <svg className="w-8 h-8 text-amber-100" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 2L12 6" />
                      <path d="M12 18L12 22" />
                      <path d="M4.93 4.93L7.76 7.76" />
                      <path d="M16.24 16.24L19.07 19.07" />
                      <path d="M2 12L6 12" />
                      <path d="M18 12L22 12" />
                      <path d="M4.93 19.07L7.76 16.24" />
                      <path d="M16.24 7.76L19.07 4.93" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-amber-100 tracking-wide">
                  {mode === "dashboard" ? "Welcome, Seeker" : mode === "signup" ? "Inscribe Yourself" : "Sacred Sign-In"}
                </h1>
                <p className="mt-2 text-amber-400/70 text-sm">
                  {mode === "dashboard"
                    ? "You have entered the sanctuary"
                    : mode === "signup"
                    ? "Join the community of truth-seekers"
                    : "Enter the sanctuary • Unlock member features"}
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="mx-8 mt-6 p-3 bg-red-900/20 border border-red-700/30 rounded-lg">
                  <p className="text-red-400 text-sm text-center">{error}</p>
                </div>
              )}

              {/* Dashboard view */}
              {mode === "dashboard" && currentUser ? (
                <div className="p-8 space-y-6">
                  {/* User info with tier badge */}
                  <div className="text-center space-y-3">
                    {/* Tier Badge */}
                    {currentTier && (
                      <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${currentTier.color} shadow-lg`}>
                        <span className="text-xl">{currentTier.badge}</span>
                        <div className="text-left">
                          <div className="text-xs text-amber-100/80 uppercase tracking-wider">Member #{userNumber}</div>
                          <div className="text-sm font-bold text-white">{currentTier.name}</div>
                        </div>
                      </div>
                    )}

                    {/* Avatar */}
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-500 to-orange-700 border-2 border-amber-400/30">
                      <span className="text-3xl font-serif text-amber-100">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    <h2 className="text-xl font-serif text-amber-100">{currentUser.name}</h2>
                    <p className="text-amber-500/60 text-sm">{currentUser.email}</p>
                    <p className="text-amber-600/50 text-xs">
                      Inscribed: {new Date(currentUser.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>

                    {/* Admin badge */}
                    {isAdmin && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-900/40 border border-purple-600/40 rounded-full">
                        <span>👑</span>
                        <span className="text-sm text-purple-300">Admin</span>
                      </div>
                    )}

                    {/* Tier tagline */}
                    {currentTier && (
                      <p className="text-amber-500/60 text-sm italic">"{currentTier.tagline}"</p>
                    )}
                  </div>

                  {/* Quick stats */}
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-amber-900/15">
                    <div className="text-center p-3 bg-amber-900/10 rounded-lg">
                      <div className="text-2xl font-bold text-amber-400">0</div>
                      <div className="text-xs text-amber-500/60">Votes Cast</div>
                    </div>
                    <div className="text-center p-3 bg-amber-900/10 rounded-lg">
                      <div className="text-2xl font-bold text-amber-400">0</div>
                      <div className="text-xs text-amber-500/60">Contributions</div>
                    </div>
                    <div className="text-center p-3 bg-amber-900/10 rounded-lg">
                      <div className="text-2xl font-bold text-amber-400">{getStoredUsers().length}</div>
                      <div className="text-xs text-amber-500/60">Total Members</div>
                    </div>
                  </div>

                  {/* Member features preview */}
                  <div className="pt-4 space-y-3">
                    <h3 className="text-sm font-medium text-amber-400/80 text-center">Coming Soon</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-amber-500/60">
                        <span className="w-2 h-2 rounded-full bg-amber-500/50" />
                        Sacred Sign-In (you are here)
                      </div>
                      <div className="flex items-center gap-2 text-amber-500/40">
                        <span className="w-2 h-2 rounded-full bg-amber-700/30" />
                        Hymnal Music
                      </div>
                      <div className="flex items-center gap-2 text-amber-500/40">
                        <span className="w-2 h-2 rounded-full bg-amber-700/30" />
                        The Library
                      </div>
                      <div className="flex items-center gap-2 text-amber-500/40">
                        <span className="w-2 h-2 rounded-full bg-amber-700/30" />
                        TBT Chat
                      </div>
                    </div>
                  </div>

                  {/* Sign out button */}
                  <button
                    onClick={handleSignOut}
                    className="w-full py-3 px-6 border border-amber-800/40 rounded-lg text-amber-400/80 hover:text-amber-300 hover:border-amber-600/50 transition-all duration-300"
                  >
                    Depart from Sanctuary
                  </button>
                </div>
              ) : (
                /* Sign In / Sign Up Form */
                <form
                  onSubmit={mode === "signup" ? handleSignUp : handleSignIn}
                  className="p-8 pt-6 space-y-5"
                >
                  {/* Name field (sign up only) */}
                  {mode === "signup" && (
                    <div className="space-y-2">
                      <label htmlFor="name" className="block text-sm font-medium text-amber-500/70">
                        Sacred Name
                      </label>
                      <div className="relative">
                        <div
                          className={`absolute inset-0 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 rounded-lg blur-md transition-opacity duration-300 ${
                            focusedField === "name" ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <input
                          id="name"
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          onFocus={() => setFocusedField("name")}
                          onBlur={() => setFocusedField(null)}
                          className="relative w-full px-4 py-3 bg-[#1a1512] border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-600/30 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all duration-300 font-light"
                          placeholder="Your chosen name"
                        />
                      </div>
                    </div>
                  )}

                  {/* Email field */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="block text-sm font-medium text-amber-500/70">
                      Sacred Mark (Email)
                    </label>
                    <div className="relative">
                      <div
                        className={`absolute inset-0 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 rounded-lg blur-md transition-opacity duration-300 ${
                          focusedField === "email" ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField("email")}
                        onBlur={() => setFocusedField(null)}
                        className="relative w-full px-4 py-3 bg-[#1a1512] border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-600/30 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all duration-300 font-light"
                        placeholder="your.mark@email.com"
                        required
                      />
                    </div>
                  </div>

                  {/* Password field */}
                  <div className="space-y-2">
                    <label htmlFor="password" className="block text-sm font-medium text-amber-500/70">
                      Secret Word (Password)
                    </label>
                    <div className="relative">
                      <div
                        className={`absolute inset-0 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 rounded-lg blur-md transition-opacity duration-300 ${
                          focusedField === "password" ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField(null)}
                        className="relative w-full px-4 py-3 bg-[#1a1512] border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-600/30 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all duration-300 font-light"
                        placeholder="••••••••••••"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>

                  {/* Confirm password (sign up only) */}
                  {mode === "signup" && (
                    <div className="space-y-2">
                      <label htmlFor="confirmPassword" className="block text-sm font-medium text-amber-500/70">
                        Confirm Secret Word
                      </label>
                      <div className="relative">
                        <div
                          className={`absolute inset-0 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 rounded-lg blur-md transition-opacity duration-300 ${
                            focusedField === "confirmPassword" ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onFocus={() => setFocusedField("confirmPassword")}
                          onBlur={() => setFocusedField(null)}
                          className="relative w-full px-4 py-3 bg-[#1a1512] border border-amber-900/30 rounded-lg text-amber-100 placeholder-amber-600/30 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/20 transition-all duration-300 font-light"
                          placeholder="••••••••••••"
                          required={mode === "signup"}
                        />
                      </div>
                    </div>
                  )}

                  {/* Remember & Forgot (sign in only) */}
                  {mode === "signin" && (
                    <div className="flex items-center justify-between text-sm">
                      <label className="flex items-center gap-2 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                          />
                          <div className="w-5 h-5 border border-amber-800 rounded bg-[#1a1512] peer-checked:bg-amber-600 peer-checked:border-amber-400 transition-all duration-300">
                            <svg className="w-5 h-5 text-amber-100 opacity-0 peer-checked:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          </div>
                        </div>
                        <span className="text-amber-500/70 group-hover:text-amber-400 transition-colors">Remember my mark</span>
                      </label>
                      <a href="mailto:info@truthbtoldhub.com" className="text-amber-500/70 hover:text-amber-400 transition-colors">
                        Forgotten word?
                      </a>
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="group relative w-full py-3 px-6 bg-gradient-to-r from-amber-700 via-orange-700 to-amber-700 border border-amber-500/30 rounded-lg text-amber-100 font-medium overflow-hidden transition-all duration-300 hover:border-amber-400/50 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/15 to-amber-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    <div className="relative flex items-center justify-center gap-2">
                      {isLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <span>{mode === "signup" ? "Inscribing..." : "Entering sanctuary..."}</span>
                        </>
                      ) : (
                        <>
                          <span>{mode === "signup" ? "Seal My Mark" : "Enter the Fire"}</span>
                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </>
                      )}
                    </div>
                  </button>
                </form>
              )}

              {/* Divider */}
              {mode !== "dashboard" && (
                <div className="px-8 py-4 flex items-center gap-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-900/30 to-transparent" />
                  <span className="text-amber-600/40 text-xs uppercase tracking-widest">Or</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-900/30 to-transparent" />
                </div>
              )}

              {/* Sign up / Sign in link */}
              {mode !== "dashboard" && (
                <div className="px-8 pb-8 text-center">
                  {mode === "signup" ? (
                    <p className="text-amber-500/70">
                      Already marked by the fire?{" "}
                      <button
                        type="button"
                        onClick={goToSignIn}
                        className="text-amber-400 hover:text-amber-300 transition-colors underline underline-offset-4 decoration-amber-600/50 hover:decoration-amber-400 font-medium"
                      >
                        Enter the sanctuary
                      </button>
                    </p>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-amber-500/70">Not yet marked by the fire?</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          console.log("Begin inscription clicked");
                          goToSignUp(e);
                        }}
                        className="inline-flex items-center gap-2 px-6 py-2 bg-amber-800/30 hover:bg-amber-700/40 border border-amber-700/30 hover:border-amber-500/50 rounded-lg text-amber-300 hover:text-amber-200 transition-all duration-300 cursor-pointer"
                      >
                        <span>Begin your inscription</span>
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Decorative bottom flourish */}
          <div className="text-center mt-3">
            <div className="inline-block text-amber-500/40 text-3xl">❧</div>
          </div>

          {/* Footer info */}
          <div className="mt-8 text-center space-y-2">
            <p className="text-amber-600/40 text-xs">© 2026 Truth B Told — Unlearn Everything</p>
            <p className="text-amber-700/30 text-xs">
              Member access to save progress, vote once per round, and unlock community features.
            </p>
          </div>
        </div>
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes ember {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) scale(0);
            opacity: 0;
          }
        }

        @keyframes ember-slow {
          0% {
            transform: translateY(0) scale(1);
            opacity: 0;
          }
          20% {
            opacity: 0.6;
          }
          80% {
            opacity: 0.4;
          }
          100% {
            transform: translateY(-120vh) scale(0.3);
            opacity: 0;
          }
        }

        @keyframes pulse-slow {
          0%,
          100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.1);
          }
        }

        .animate-ember {
          animation: ember linear infinite;
        }

        .animate-ember-slow {
          animation: ember-slow linear infinite;
        }

        .animate-pulse-slow {
          animation: pulse-slow ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default App;
