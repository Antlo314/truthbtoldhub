'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useSoulStore } from '@/lib/store/useSoulStore';
import SentinelGuide, { GuideStep } from '@/components/guide/SentinelGuide';
import { ArrowLeft, User, ShieldAlert, Key, Settings, Zap, Database, CheckSquare, Layers, Clapperboard, LogOut, Upload, Share2, Link, Trophy, History, ArrowUpRight, ArrowDownLeft, Search, X, Loader2 } from 'lucide-react';
import { Howl } from 'howler';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
// --- AUDIO ASSETS ---
let uiHoverSfx: any = null;
let uiClickSfx: any = null;
let ambientDrone: any = null;

if (typeof window !== 'undefined') {
    uiHoverSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/hover_tech_01.mp3'], volume: 0.1 });
    uiClickSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/confirm_deep.mp3'], volume: 0.2 });
}

export default function PowerSelf() {
    const router = useRouter();
    const { user, profile, fetchIdentity, updateProfile, signOut: storeSignOut } = useSoulStore();

    const handleSignOut = async () => {
        await storeSignOut();
        router.push('/');
    };

    const [activeTab, setActiveTab] = useState('profile'); // profile | admin
    const [uploading, setUploading] = useState(false);
    const [isRecovery, setIsRecovery] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [globalRank, setGlobalRank] = useState<number | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);

    // Admin Command Center States
    const [adminUsers, setAdminUsers] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        tier: '',
        soulPower: 0,
        isBanned: false,
        customTitle: '',
        bio: '',
        displayName: '',
        auraColor: ''
    });
    const [adminLoading, setAdminLoading] = useState(false);
    const [stats, setStats] = useState({
        totalUsers: 0,
        totalSP: 0,
        activePetitions: 0
    });

    const fetchAdminData = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const res = await fetch('/api/admin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ action: 'getUsers' })
            });
            const data = await res.json();
            if (data.success) {
                setAdminUsers(data.users);
                
                // Calculate stats
                const totalSP = data.users.reduce((acc: number, u: any) => acc + (parseInt(u.soul_power, 10) || 0), 0);
                
                // Fetch petitions count
                const { count: petCount } = await supabase.from('petitions').select('id', { count: 'exact', head: true });
                
                setStats({
                    totalUsers: data.users.length,
                    totalSP,
                    activePetitions: petCount || 0
                });
            }
        } catch (err) {
            console.error('Failed to fetch admin users:', err);
        }
    };

    const uploadAvatar = async (event: any) => {
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }

            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const filePath = `${user?.id}-${Math.random()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            await updateProfile({ avatar_url: publicUrl });
            playClick();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setUploading(false);
        }
    };

    const SELF_PROTOCOL_STEPS: GuideStep[] = [
        {
            title: "Identity Synchronization",
            description: "Your sovereign record is mirrored across the void. Every achievement and contribution is etched into this identifier.",
            selector: "#self-profile-card"
        },
        {
            title: "Security Ciphers",
            description: "Manage your access protocols. Keep your identity name and cipher link secure to maintain your position in the hierarchy.",
            selector: "#self-security-form"
        },
        {
            title: "The Referral Network",
            description: "Expand the mission. Distributing your Cipher Link synchronizes new souls with the Ledger, granting you instant Soul Power bonuses.",
            selector: "#self-referral-link"
        },
        {
            title: "Transaction Ledger",
            description: "Observe the flow of power. Every burn and gain is tracked chronologically to ensure total transparency in the movement.",
            selector: "#self-transaction-ledger"
        }
    ];
    const fileInputRef = useRef<HTMLInputElement>(null);

    const bgRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const idCardRef = useRef<HTMLDivElement>(null);

    const playHover = () => uiHoverSfx?.play();
    const playClick = () => uiClickSfx?.play();

    const handleGuideComplete = () => {
        setIsGuideOpen(false);
        localStorage.setItem('self_guide_complete', 'true');
    };

    // GSAP Parallax Background
    useGSAP(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!bgRef.current) return;
            const x = (e.clientX / window.innerWidth - 0.5) * 30;
            const y = (e.clientY / window.innerHeight - 0.5) * 30;
            gsap.to(bgRef.current, { x, y, duration: 1.5, ease: "power2.out" });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    // Ambient Drone
    useEffect(() => {
        if (typeof window !== 'undefined') {
            ambientDrone = new Howl({
                src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/monolith_drone.mp3'],
                loop: true,
                volume: 0.1,
            });
            ambientDrone.play();

            // Auto-trigger guide if first time
            if (!localStorage.getItem('self_guide_complete')) {
                setTimeout(() => setIsGuideOpen(true), 2000);
            }
        }
        return () => {
            if (ambientDrone) ambientDrone.stop();
        };
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.location.hash.includes('recovery=true')) {
            setIsRecovery(true);
            window.history.replaceState(null, '', window.location.pathname);
        }

        async function initSelf() {
            await fetchIdentity();
            const currentProfile = useSoulStore.getState().profile;
            const currentSession = await supabase.auth.getSession();
            const email = currentSession.data.session?.user?.email;
            
            if (email && (email === 'iamwhoiambook@gmail.com' || email === 'admin@truthbtoldhub.com')) {
                // Fetch admin-specific list
                fetchAdminData();
                
                // Auto-elevate in database if not already Architect
                if (currentProfile && currentProfile.tier !== 'Architect') {
                    await updateProfile({ tier: 'Architect' });
                }
            }

            if (currentProfile && currentProfile.soul_power > 0) {
                const { count } = await supabase
                    .from('profiles')
                    .select('id', { count: 'exact', head: true })
                    .gt('soul_power', currentProfile.soul_power);
                setGlobalRank((count || 0) + 1);

                // Fetch transactions
                const { data: txs } = await supabase
                    .from('transactions')
                    .select('*')
                    .eq('profile_id', currentProfile.id)
                    .order('created_at', { ascending: false })
                    .limit(5);
                if (txs) setTransactions(txs);
            }
        }
        initSelf();
    }, [fetchIdentity]);

    // GSAP Magnetic Button Effect
    const handleMagneticMove = (e: React.MouseEvent<HTMLElement>) => {
        const btn = e.currentTarget;
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        
        gsap.to(btn, {
            x: x * 0.3,
            y: y * 0.3,
            duration: 0.5,
            ease: "power2.out"
        });
    };

    const handleMagneticLeave = (e: React.MouseEvent<HTMLElement>) => {
        gsap.to(e.currentTarget, {
            x: 0,
            y: 0,
            duration: 1,
            ease: "elastic.out(1, 0.3)"
        });
    };

    const userEmail = user?.email || 'guest@obsidianvoid.net';
    const isAdmin = user && (user.email === 'iamwhoiambook@gmail.com' || user.email === 'admin@truthbtoldhub.com');
    const displayName = profile?.display_name || profile?.username || 'Guest Soul';
    const currentTier = profile?.tier || 'Initiate';
    const currentPower = profile?.soul_power || 100;
    const avatarUrl = profile?.avatar_url || "https://api.dicebear.com/7.x/identicon/svg?seed=soul";

    return (
        <div className="relative min-h-screen bg-void text-white selection:bg-aether-gold/30 font-sans flex flex-col overflow-x-hidden">
            {/* Global Navigation Header - Aetheric */}
            <header className="sticky top-0 z-50 glass-panel border-b border-white/5 px-4 md:px-6 py-4 flex justify-between items-center w-full">
                <div className="flex items-center gap-4 md:gap-6">
                    <button 
                        onClick={() => router.push('/sanctum')} 
                        onMouseMove={handleMagneticMove}
                        onMouseLeave={handleMagneticLeave}
                        className="p-2 md:p-3 bg-white/5 rounded-full border border-white/5 text-zinc-500 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex flex-col">
                        <span className="font-ritual text-lg md:text-xl font-bold tracking-[0.2em] leading-none text-white gold-shimmer uppercase">
                            Identity Core
                        </span>
                        <div className="flex items-center gap-2 mt-1">
                            <div className="hidden sm:flex items-center h-2 gap-[1px]">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="waveform-bar" style={{ animationDelay: `${i * 0.1}s`, width: '1.5px' }} />
                                ))}
                            </div>
                            <span className="text-[6px] md:text-[7px] font-mono text-zinc-500 uppercase tracking-widest">Aetheric Signature: Verified</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 md:gap-4">
                    <div className="px-3 md:px-4 py-1 md:py-1.5 bg-black/40 border border-aether-gold/20 rounded-full flex items-center gap-2">
                        <Zap className="w-2.5 h-2.5 md:w-3 h-3 text-aether-gold" />
                        <span className="text-[8px] md:text-[9px] font-black text-aether-gold uppercase tracking-[0.2em]">
                            {currentPower} SP
                        </span>
                    </div>

                    <button 
                        onClick={handleSignOut} 
                        onMouseMove={handleMagneticMove}
                        onMouseLeave={handleMagneticLeave}
                        className="text-zinc-500 hover:text-red-500 transition-colors p-2 md:p-3 bg-white/5 rounded-full border border-white/5"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </header>

            <main className="flex-1 relative z-10 p-4 md:p-8 pb-32 max-w-4xl mx-auto w-full animate-fade-in space-y-8">

                {isRecovery && (
                    <div className="glass bg-green-950/40 border border-green-500/30 p-6 rounded-2xl relative overflow-hidden animate-fade-in">
                        <div className="absolute top-0 left-0 w-2 h-full bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>
                        <h2 className="text-green-400 font-bold tracking-widest uppercase text-sm mb-1 flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4" /> Identity Recovery Verified
                        </h2>
                        <p className="text-[10px] text-green-500/70 font-mono tracking-widest uppercase mt-2">
                            Your secure link was accepted. Please navigate to "Update Cipher" in your Identity Core below to assign a new password immediately.
                        </p>
                    </div>
                )}

                {/* Profile Identity Card */}
                <div
                    ref={idCardRef}
                    id="self-profile-card"
                    className="glass-panel rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 relative overflow-hidden border-white/5 transition-all cursor-default group"
                >
                    <div className="absolute top-0 right-0 w-64 md:w-80 h-64 md:h-80 bg-aether-gold/5 rounded-full blur-[100px] pointer-events-none group-hover:bg-aether-gold/10 transition-colors duration-1000"></div>

                    <div className="flex flex-col lg:flex-row items-center gap-8 md:gap-12 relative z-10">
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={uploadAvatar} />
                        <div onClick={() => !uploading && fileInputRef.current?.click()} className="w-24 md:w-32 h-24 md:h-32 rounded-[1.5rem] md:rounded-[2rem] bg-zinc-900 border border-white/10 flex items-center justify-center relative group cursor-pointer overflow-hidden p-1 shrink-0">
                            <img src={avatarUrl} alt="Avatar" className={`w-full h-full object-cover rounded-[1.3rem] md:rounded-[1.8rem] ${uploading ? 'opacity-50 grayscale' : ''}`} />
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {uploading ? (
                                    <div className="w-5 h-5 border-2 border-aether-gold border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <div className="flex flex-col items-center gap-1">
                                        <Upload className="w-4 h-4 md:w-5 md:h-5 text-white" />
                                        <span className="text-[8px] md:text-[9px] font-black text-white uppercase tracking-widest">Update</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 text-center lg:text-left space-y-4">
                            <div className="flex flex-col lg:flex-row items-center gap-3 md:gap-4">
                                <h1 className="font-ritual text-3xl md:text-4xl font-black tracking-widest text-white uppercase gold-shimmer">{displayName}</h1>
                                <div className="flex items-center gap-2">
                                    <span className={`px-3 md:px-4 py-1 rounded-full text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] border ${isAdmin ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-aether-gold/10 text-aether-gold border-aether-gold/20'}`}>
                                        {currentTier}
                                    </span>
                                </div>
                            </div>
                            <p className="text-[10px] md:text-xs text-zinc-500 font-mono tracking-[0.2em] leading-relaxed uppercase opacity-80 max-w-lg">
                                {profile?.custom_title && <span className="block text-aether-gold font-black mb-1">{profile.custom_title}</span>}
                                {profile?.bio || userEmail}
                            </p>

                            <div className="flex flex-wrap justify-center lg:justify-start gap-4 md:gap-6 mt-6 md:mt-8 pt-6 md:pt-8 border-t border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-aether-gold/10 flex items-center justify-center border border-aether-gold/20">
                                        <Zap className="w-4 h-4 text-aether-gold" />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <span className="text-[6px] md:text-[7px] font-black text-zinc-500 uppercase tracking-widest">Soul Power</span>
                                        <span className="text-xs md:text-sm font-black text-white tracking-widest uppercase">{currentPower} SP</span>
                                    </div>
                                </div>
                                
                                {globalRank !== null && globalRank > 0 && (
                                    <button 
                                        onClick={() => router.push('/hierarchy')} 
                                        onMouseMove={handleMagneticMove}
                                        onMouseLeave={handleMagneticLeave}
                                        className="flex items-center gap-3 bg-white/5 hover:bg-white/10 px-4 md:px-6 py-2 rounded-xl md:rounded-2xl border border-white/10 transition-all group"
                                    >
                                        <Trophy className="w-4 h-4 text-aether-gold group-hover:scale-110 transition-transform" />
                                        <div className="flex flex-col items-start">
                                            <span className="text-[6px] md:text-[7px] font-black text-zinc-500 uppercase tracking-widest">Global Rank</span>
                                            <span className="text-xs md:text-sm font-black text-aether-gold tracking-widest uppercase">#{globalRank}</span>
                                        </div>
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-white/10 gap-6 overflow-x-auto whitespace-nowrap scrollbar-hide pb-1" id="self-tabs">
                    <button
                        onMouseEnter={playHover}
                        onClick={() => { playClick(); setActiveTab('profile'); }}
                        className={`pb-3 text-xs uppercase tracking-[0.2em] font-bold transition-colors relative ${activeTab === 'profile' ? 'text-orange-500' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Identity Core
                        {activeTab === 'profile' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.8)]"></div>}
                    </button>


                    {isAdmin && (
                        <button
                            onMouseEnter={playHover}
                            onClick={() => { playClick(); setActiveTab('admin'); }}
                            className={`pb-3 text-xs uppercase tracking-[0.2em] font-bold transition-colors relative ${activeTab === 'admin' ? 'text-red-500' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            Architect Chamber
                            {activeTab === 'admin' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)]"></div>}
                        </button>
                    )}
                </div>

                {/* Tab Content */}
                <div className="animate-fade-in">

                    {/* PROFILE TAB */}
                    {activeTab === 'profile' && (
                        <div className="flex flex-col gap-6">
                            <div className="glass bg-orange-950/10 border border-orange-500/20 p-4 rounded-xl flex items-start gap-4">
                                <ShieldAlert className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-orange-200/70 font-mono tracking-widest leading-relaxed uppercase">
                                    [SYS_HINT]: The Identity Core is your master control terminal. Configure your public aesthetics, manage security ciphers, and monitor your Global Rank. Distribute your Cipher Link below to recruit new Initiates—each successful referral automatically synthesizes <strong className="text-orange-400">+100 SP</strong> into your ledger.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="glass bg-white/5 border border-white/10 p-6 rounded-2xl relative" id="self-security-form">
                                <h3 className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-6 flex items-center gap-2">
                                    <User className="w-4 h-4 text-orange-500" /> Account Security
                                </h3>
                                <form className="space-y-4" onSubmit={async (e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    const nameVal = formData.get('identityName') as string;
                                    const passVal = formData.get('newCipher') as string;
                                    let msg = "Processing Updates...\n";

                                    if (nameVal && nameVal !== displayName) {
                                        await updateProfile({ display_name: nameVal });
                                        msg += "Identity Name Updated.\n";
                                    }

                                    const userVal = formData.get('userName') as string;
                                    if (userVal && userVal !== profile?.username) {
                                        await updateProfile({ username: userVal });
                                        msg += "Username Updated.\n";
                                    }

                                    const titleVal = formData.get('customTitle') as string;
                                    if (titleVal !== undefined && titleVal !== (profile?.custom_title || '')) {
                                        await updateProfile({ custom_title: titleVal });
                                        msg += "Title Updated.\n";
                                    }

                                    const bioVal = formData.get('bio') as string;
                                    if (bioVal !== undefined && bioVal !== (profile?.bio || '')) {
                                        await updateProfile({ bio: bioVal });
                                        msg += "Bio Updated.\n";
                                    }

                                    const colorVal = formData.get('themeColor') as string;
                                    if (colorVal && colorVal !== profile?.theme_color) {
                                        await updateProfile({ theme_color: colorVal });
                                        msg += "Theme Updated.\n";
                                    }

                                    if (passVal) {
                                        const { error } = await supabase.auth.updateUser({ password: passVal });
                                        if (error) msg += "Failed to update Cipher: " + error.message + "\n";
                                        else msg += "Cipher Successfully Changed!\n";
                                    }

                                    alert(msg);
                                    if (passVal) {
                                        (e.target as HTMLFormElement).reset();
                                    }
                                }}>
                                    <div className="space-y-1">
                                        <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Identity Name</label>
                                        <input name="identityName" type="text" defaultValue={displayName} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Username</label>
                                        <input name="userName" type="text" defaultValue={profile?.username || ''} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Update Cipher (Password)</label>
                                        <input name="newCipher" type="password" placeholder="••••••••" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors tracking-widest" />
                                    </div>
                                    <div className="pt-4 border-t border-white/10">
                                        <h4 className="text-[10px] uppercase font-bold tracking-widest text-orange-500 mb-4">Aesthetics & Lore</h4>
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Custom Title</label>
                                                <input name="customTitle" type="text" defaultValue={profile?.custom_title || ''} placeholder="e.g. Master of the Void" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Bio</label>
                                                <textarea name="bio" defaultValue={profile?.bio || ''} placeholder="Tell the Sanctum your purpose..." rows={3} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors resize-none"></textarea>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Aura Color (Theme)</label>
                                                <select name="themeColor" defaultValue={profile?.theme_color || 'sky'} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors appearance-none">
                                                    <option value="sky">Sky Blue</option>
                                                    <option value="orange">Ember Orange</option>
                                                    <option value="purple">Void Purple</option>
                                                    <option value="green">Matrix Green</option>
                                                    <option value="red">Blood Red</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <button type="submit" className="w-full mt-4 btn-ember py-3 rounded-lg text-[10px] uppercase font-bold tracking-widest">
                                        Save Changes
                                    </button>
                                </form>
                            </div>

                            <div className="space-y-6">
                                {/* Affiliation Cipher */}
                                <div className="glass bg-orange-950/20 border border-orange-500/30 p-6 rounded-2xl relative overflow-hidden" id="self-referral-link">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_100%_0%,rgba(234,88,12,0.1)_0%,transparent_50%)]"></div>
                                    <h3 className="text-xs uppercase tracking-widest text-white font-bold mb-2 flex items-center gap-2">
                                        <Share2 className="w-4 h-4 text-orange-500" /> Cipher Link (Affiliation)
                                    </h3>
                                    <p className="text-[10px] text-gray-400 font-mono tracking-widest mb-4">
                                        Share your unique signature. Referrals grant you +100 SP.
                                    </p>
                                    <div className="flex gap-2 relative z-10">
                                        <input 
                                            readOnly 
                                            title="Cipher Link"
                                            placeholder="Cipher Link"
                                            value={`https://truthbtoldhub.com/?cipher=${user?.id?.substring(0,8) || 'INIT...'}`}
                                            className="flex-1 bg-black/60 border border-orange-500/30 rounded-lg px-3 py-2.5 text-xs text-orange-200 font-mono focus:outline-none"
                                        />
                                        <button 
                                            onClick={(e) => {
                                                navigator.clipboard.writeText(`Begin Initiation: https://truthbtoldhub.com/?cipher=${user?.id?.substring(0,8) || 'INIT...'}`);
                                                const btn = e.currentTarget;
                                                const originalText = btn.innerHTML;
                                                btn.innerHTML = '<span class="text-[10px] uppercase font-bold tracking-widest text-white">COPIED</span>';
                                                setTimeout(() => btn.innerHTML = originalText, 2000);
                                            }}
                                            title="Copy Cipher Link"
                                            aria-label="Copy Cipher Link"
                                            className="bg-orange-600 hover:bg-orange-500 text-white px-4 rounded-lg transition-colors flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(234,88,12,0.4)]"
                                        >
                                            <Link className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-orange-500/20 flex justify-between items-center relative z-10">
                                        <span className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Echoes (Recruits)</span>
                                        <span className="text-sm font-bold text-orange-400">0</span>
                                    </div>
                                </div>
                                {/* Active Votes */}
                                <div className="glass bg-white/5 border border-white/10 p-6 rounded-2xl">
                                    <h3 className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-6 flex items-center gap-2">
                                        <CheckSquare className="w-4 h-4 text-orange-500" /> Active Votes (The Stage)
                                    </h3>
                                    <div className="text-center py-4 text-[10px] uppercase font-mono tracking-widest text-zinc-600">
                                        No active voting signatures.
                                    </div>
                                </div>

                                {/* Transaction Ledger Section */}
                                <div className="glass bg-white/5 border border-white/10 p-6 rounded-2xl relative overflow-hidden" id="self-transaction-ledger">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-xs uppercase tracking-widest text-gray-400 font-bold flex items-center gap-2">
                                            <History className="w-4 h-4 text-orange-500" /> Transaction Ledger
                                        </h3>
                                        <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">Live Sync Alpha</span>
                                    </div>

                                    <div className="space-y-3">
                                        {transactions.length === 0 ? (
                                            <div className="text-center py-6 text-[10px] uppercase font-mono tracking-widest text-zinc-600">
                                                No recent activity detected in the ledger.
                                            </div>
                                        ) : (
                                            transactions.map((tx) => (
                                                <div key={tx.id} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl hover:bg-white/5 transition-colors group">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`p-2 rounded-lg ${tx.amount > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'} border border-current opacity-60`}>
                                                            {tx.amount > 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownLeft className="w-4 h-4" />}
                                                        </div>
                                                        <div>
                                                            <h4 className="text-[11px] font-bold text-white uppercase tracking-wider">{tx.transaction_type}</h4>
                                                            <p className="text-[9px] text-zinc-500 font-mono tracking-tighter truncate max-w-[150px]">{tx.description}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-xs font-mono font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                            {tx.amount > 0 ? '+' : ''}{tx.amount} SP
                                                        </span>
                                                        <span className="block text-[8px] text-zinc-600 font-mono mt-1">
                                                            {new Date(tx.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-white/5 text-center">
                                        <button className="text-[9px] uppercase font-bold tracking-[0.2em] text-orange-500/50 hover:text-orange-500 transition-colors">
                                            View All Archival Records
                                        </button>
                                </div>
                            </div>
                        </div>
                        </div>
                        </div>
                    )}

                    {/* ADMIN CHAMBER TAB */}
                    {activeTab === 'admin' && isAdmin && (
                        <div className="space-y-8 animate-fade-in">
                            
                            {/* Warning Banner */}
                            <div className="p-5 border border-red-500/20 bg-red-950/10 rounded-3xl relative overflow-hidden backdrop-blur-xl">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(239,68,68,0.05)_0%,transparent_50%)]"></div>
                                <div className="relative z-10 flex items-center gap-4">
                                    <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse animate-duration-1000" />
                                    <div>
                                        <h3 className="text-sm font-black text-white tracking-[0.2em] uppercase gold-shimmer">Command Center Active</h3>
                                        <p className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest mt-1">
                                            Administrative override authority granted. Direct ledger synchronization and node isolation parameters online.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Overview */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <div className="glass bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shrink-0">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest block">Total Synchronized Souls</span>
                                        <span className="text-base font-black text-white font-mono tracking-widest">{stats.totalUsers}</span>
                                    </div>
                                </div>
                                <div className="glass bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-aether-gold/10 border border-aether-gold/20 flex items-center justify-center text-aether-gold shrink-0">
                                        <Zap className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest block">Ledger Mints (Total SP)</span>
                                        <span className="text-base font-black text-white font-mono tracking-widest">{stats.totalSP} SP</span>
                                    </div>
                                </div>
                                <div className="glass bg-white/[0.02] border border-white/5 p-6 rounded-2xl flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                                        <Database className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest block">Active Petitions</span>
                                        <span className="text-base font-black text-white font-mono tracking-widest">{stats.activePetitions}</span>
                                    </div>
                                </div>
                            </div>

                            {/* User Control Grid */}
                            <div className="glass bg-white/[0.02] border border-white/10 p-6 md:p-8 rounded-[2rem] space-y-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6">
                                    <div className="flex items-center gap-3">
                                        <Settings className="w-5 h-5 text-red-500 animate-spin-slow" />
                                        <h4 className="font-ritual text-lg text-white tracking-widest uppercase">Ecosystem Profiles</h4>
                                    </div>
                                    
                                    {/* Search Bar */}
                                    <div className="relative max-w-xs w-full">
                                        <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input 
                                            type="text" 
                                            placeholder="Search by name, email..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 transition-colors font-mono placeholder:text-zinc-600"
                                        />
                                    </div>
                                </div>

                                {/* User Data Grid */}
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full border-collapse text-left">
                                        <thead>
                                            <tr className="border-b border-white/5 text-[8px] font-mono text-zinc-500 uppercase tracking-widest">
                                                <th className="pb-3 pl-2">Initiate Signature</th>
                                                <th className="pb-3">Email Address</th>
                                                <th className="pb-3">Role Tier</th>
                                                <th className="pb-3">Soul Power</th>
                                                <th className="pb-3">Status</th>
                                                <th className="pb-3 text-right pr-2">Reconfigure</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.03] text-xs">
                                            {adminUsers
                                                .filter(u => {
                                                    const query = searchQuery.toLowerCase();
                                                    return (
                                                        (u.display_name && u.display_name.toLowerCase().includes(query)) ||
                                                        (u.username && u.username.toLowerCase().includes(query)) ||
                                                        (u.email && u.email.toLowerCase().includes(query))
                                                    );
                                                })
                                                .map(u => (
                                                    <tr key={u.id} className="hover:bg-white/[0.01] transition-colors group">
                                                        <td className="py-4 pl-2 flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/10 overflow-hidden p-0.5 group-hover:border-red-500/20 transition-colors shrink-0">
                                                                <img src={u.avatar_url || "https://api.dicebear.com/7.x/identicon/svg?seed=" + u.id} className="w-full h-full object-cover rounded" alt="avatar" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-white uppercase tracking-wider">{u.display_name || u.username || 'Prophet'}</span>
                                                                <span className="text-[7px] font-mono text-zinc-600 tracking-tighter truncate max-w-[120px]">{u.custom_title || 'No custom title'}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-4 font-mono text-[10px] text-zinc-400">{u.email || 'N/A'}</td>
                                                        <td className="py-4">
                                                            <span className={`px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                                u.tier === 'Architect' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                                                                u.tier === 'Sovereign' ? 'bg-aether-gold/10 text-aether-gold border border-aether-gold/20' : 
                                                                'bg-white/5 text-zinc-400 border border-white/10'
                                                            }`}>
                                                                {u.tier || 'Initiate'}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 font-mono font-bold text-white">{u.soul_power} SP</td>
                                                        <td className="py-4">
                                                            <span className={`px-2 py-0.5 rounded-md text-[8px] font-mono uppercase tracking-widest ${u.is_banned ? 'bg-red-950/40 text-red-400 border border-red-500/20' : 'bg-green-950/40 text-green-400 border border-green-500/20'}`}>
                                                                {u.is_banned ? 'Isolated' : 'Aligned'}
                                                            </span>
                                                        </td>
                                                        <td className="py-4 text-right pr-2">
                                                            <button 
                                                                onClick={() => {
                                                                    setEditingUserId(u.id);
                                                                    setEditForm({
                                                                        tier: u.tier || 'Initiate',
                                                                        soulPower: u.soul_power || 100,
                                                                        isBanned: u.is_banned || false,
                                                                        customTitle: u.custom_title || '',
                                                                        bio: u.bio || '',
                                                                        displayName: u.display_name || u.username || '',
                                                                        auraColor: u.aura_color || 'Neutral'
                                                                    });
                                                                }}
                                                                className="px-3.5 py-1.5 bg-white/5 hover:bg-red-500 hover:text-white border border-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                                            >
                                                                Configure
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Original Architect Chamber controls - side-by-side or grid for cleanliness */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Global System Override */}
                                <div className="glass bg-white/5 border border-white/10 hover:border-red-500/30 transition-colors p-6 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                                        <Zap className="w-5 h-5 text-red-500" />
                                        <h4 className="font-ritual text-lg text-white tracking-widest uppercase">Global Override</h4>
                                    </div>
                                    <form className="space-y-4" onSubmit={async (e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        const broadcast_message = formData.get('broadcast_message') as string;

                                        const { error } = await supabase.from('system_settings').update({ broadcast_message }).eq('id', 1);

                                        if (error) alert("Error updating broadcast: " + error.message);
                                        else { alert("System Broadcast Override Successful!"); (e.target as HTMLFormElement).reset(); }
                                    }}>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">System Marquee Broadcast</label>
                                            <input name="broadcast_message" required placeholder="Alert: New Content Drop in The Gallery..." className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:border-red-500 outline-none font-mono" />
                                        </div>
                                        <button type="submit" className="w-full bg-red-950/40 text-red-500 border border-red-500/30 font-black py-3 rounded-lg text-[9px] uppercase tracking-widest hover:bg-red-900/60 transition-colors mt-2">
                                            Initiate Override Sequence
                                        </button>
                                    </form>
                                </div>

                                {/* Content Pillars */}
                                <div className="glass bg-white/5 border border-white/10 hover:border-red-500/30 transition-colors p-6 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                                        <Clapperboard className="w-5 h-5 text-red-500" />
                                        <h4 className="font-ritual text-lg text-white tracking-widest uppercase">Content Pillars</h4>
                                    </div>
                                    <form className="space-y-4" onSubmit={async (e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        const title = formData.get('title') as string;
                                        const duration = formData.get('duration') as string;
                                        const format = formData.get('format') as string;
                                        const video_url = formData.get('video_url') as string;
                                        const thumbnail_url = formData.get('thumbnail_url') as string;

                                        const { error } = await supabase.from('films').insert([{
                                            title, duration, format, video_url, thumbnail_url
                                        }]);

                                        if (error) alert("Error adding film: " + error.message);
                                        else { alert("Film added to the Gallery!"); (e.target as HTMLFormElement).reset(); }
                                    }}>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">Film Title</label>
                                            <input name="title" required placeholder="e.g. THE FALL OF BABYLON" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:border-red-500 outline-none" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">Runtime</label>
                                                <input name="duration" required placeholder="e.g. 15:00" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:border-red-500 outline-none font-mono" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">Format</label>
                                                <input name="format" required defaultValue="4K" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:border-red-500 outline-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">Video Storage URL</label>
                                            <input name="video_url" placeholder="https://..." className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:border-red-500 outline-none font-mono" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">Thumbnail URL</label>
                                            <input name="thumbnail_url" placeholder="https://..." className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:border-red-500 outline-none font-mono" />
                                        </div>
                                        <button type="submit" className="w-full bg-red-950/40 text-red-500 border border-red-500/30 font-black py-3 rounded-lg text-[9px] uppercase tracking-widest hover:bg-red-900/60 transition-colors mt-2">
                                            Inject to Gallery
                                        </button>
                                    </form>
                                </div>

                                {/* Petitions / Treasury Admin */}
                                <div className="glass bg-white/5 border border-white/10 hover:border-red-500/30 transition-colors p-6 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                                        <Database className="w-5 h-5 text-red-500" />
                                        <h4 className="font-ritual text-lg text-white tracking-widest uppercase">Treasury Petitions</h4>
                                    </div>
                                    <form className="space-y-4" onSubmit={async (e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        const title = formData.get('title') as string;
                                        const description = formData.get('description') as string;
                                        const amount_requested = parseFloat(formData.get('amount') as string);

                                        const { error } = await supabase.from('petitions').insert([{
                                            requester_id: user.id,
                                            title, description, amount_requested, status: 'Consensus Building'
                                        }]);

                                        if (error) alert("Error adding petition: " + error.message);
                                        else { alert("Petition submitted to The Pool!"); (e.target as HTMLFormElement).reset(); }
                                    }}>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">Petition Concept</label>
                                            <input name="title" required placeholder="e.g. Server Infrastructure Grant" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:border-red-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">Request Amount (USD)</label>
                                            <input name="amount" type="number" step="0.01" required placeholder="500.00" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:border-red-500 outline-none font-mono" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">Justification / Details</label>
                                            <textarea name="description" required rows={3} placeholder="Describe the need..." className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:border-red-500 outline-none resize-none font-mono"></textarea>
                                        </div>
                                        <button type="submit" className="w-full bg-red-950/40 text-red-500 border border-red-500/30 font-black py-3 rounded-lg text-[9px] uppercase tracking-widest hover:bg-red-900/60 transition-colors mt-2">
                                            Lodge Petition
                                        </button>
                                    </form>
                                </div>

                                {/* Promote Soul direct form */}
                                <div className="glass bg-white/5 border border-white/10 hover:border-red-500/30 transition-colors p-6 rounded-2xl">
                                    <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                                        <ShieldAlert className="w-5 h-5 text-red-500" />
                                        <h4 className="font-ritual text-lg text-white tracking-widest uppercase">Promote Soul to Architect</h4>
                                    </div>
                                    <form className="space-y-4" onSubmit={async (e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        const soulIdentifier = formData.get('identifier') as string;

                                        const { data: users, error: searchError } = await supabase.from('profiles')
                                            .select('id, display_name')
                                            .ilike('display_name', soulIdentifier);

                                        if (searchError || !users || users.length === 0) {
                                            alert("Soul not found in the matrix. Ensure exact spelling of their Identity Name.");
                                            return;
                                        }

                                        const targetId = users[0].id;
                                        const { error } = await supabase.from('profiles').update({ tier: 'Architect' }).eq('id', targetId);

                                        if (error) alert("Error upgrading soul: " + error.message);
                                        else { 
                                            alert(`Success: ${users[0].display_name} has ascended to Architect.`); 
                                            (e.target as HTMLFormElement).reset();
                                            fetchAdminData();
                                        }
                                    }}>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-mono tracking-widest text-zinc-500">Identity Name</label>
                                            <input name="identifier" required placeholder="e.g. Neo" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:border-red-500 outline-none" />
                                        </div>
                                        <button type="submit" className="w-full bg-red-950/40 text-red-500 border border-red-500/30 font-black py-3 rounded-lg text-[9px] uppercase tracking-widest hover:bg-red-900/60 transition-colors mt-2">
                                            Execute Ascension
                                        </button>
                                    </form>
                                </div>
                            </div>

                            {/* Reconfiguration Slide-Over/Modal Dialog */}
                            {editingUserId && (
                                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
                                    <div className="w-full max-w-lg bg-[#050505]/95 border border-white/10 rounded-[2rem] p-8 md:p-10 relative overflow-hidden shadow-[0_0_80px_rgba(239,68,68,0.15)]">
                                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full blur-[60px] pointer-events-none"></div>
                                        
                                        <button 
                                            type="button"
                                            onClick={() => setEditingUserId(null)}
                                            className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors p-2 bg-white/5 hover:bg-white/10 rounded-full border border-white/10"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>

                                        <div className="space-y-6 relative z-10">
                                            <div className="space-y-2">
                                                <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500">
                                                    <Settings className="w-5 h-5 animate-spin-slow" />
                                                </div>
                                                <h3 className="font-ritual text-xl font-black uppercase tracking-widest text-white gold-shimmer">Aether Reconfiguration</h3>
                                                <p className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest">Altering signature parameters for Display Name: {editForm.displayName}</p>
                                            </div>

                                            <form className="space-y-4" onSubmit={async (e) => {
                                                e.preventDefault();
                                                setAdminLoading(true);
                                                try {
                                                    const { data: { session } } = await supabase.auth.getSession();
                                                    if (!session) return;

                                                    const targetUser = adminUsers.find(u => u.id === editingUserId);

                                                    const res = await fetch('/api/admin', {
                                                        method: 'POST',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            'Authorization': `Bearer ${session.access_token}`
                                                        },
                                                        body: JSON.stringify({
                                                            action: 'updateUser',
                                                            userId: editingUserId,
                                                            updates: {
                                                                tier: editForm.tier,
                                                                soulPower: editForm.soulPower,
                                                                oldSoulPower: targetUser?.soul_power || 0,
                                                                isBanned: editForm.isBanned,
                                                                display_name: editForm.displayName,
                                                                custom_title: editForm.customTitle,
                                                                bio: editForm.bio,
                                                                aura_color: editForm.auraColor
                                                            }
                                                        })
                                                    });

                                                    const data = await res.json();
                                                    if (data.success) {
                                                        alert("Reconfiguration committed successfully!");
                                                        setEditingUserId(null);
                                                        fetchAdminData();
                                                    } else {
                                                        alert("Reconfiguration failed: " + data.error);
                                                    }
                                                } catch (err: any) {
                                                    alert("Reconfiguration error: " + err.message);
                                                } finally {
                                                    setAdminLoading(false);
                                                }
                                            }}>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1 col-span-2">
                                                        <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Identity Name (Display Name)</label>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.displayName} 
                                                            onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })} 
                                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                                                        />
                                                    </div>
                                                    
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Role Tier</label>
                                                        <select 
                                                            value={editForm.tier} 
                                                            onChange={(e) => setEditForm({ ...editForm, tier: e.target.value })} 
                                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 appearance-none font-mono"
                                                        >
                                                            <option value="Initiate">Initiate</option>
                                                            <option value="Architect">Architect</option>
                                                            <option value="Sovereign">Sovereign</option>
                                                        </select>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Aura Color (Chat Glow)</label>
                                                        <select 
                                                            value={editForm.auraColor} 
                                                            onChange={(e) => setEditForm({ ...editForm, auraColor: e.target.value })} 
                                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 appearance-none font-mono"
                                                        >
                                                            <option value="Neutral">Neutral</option>
                                                            <option value="Architect">Architect</option>
                                                        </select>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Soul Power (SP)</label>
                                                        <input 
                                                            type="number" 
                                                            value={editForm.soulPower} 
                                                            onChange={(e) => setEditForm({ ...editForm, soulPower: parseInt(e.target.value, 10) || 0 })} 
                                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 font-mono"
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Isolation Status</label>
                                                        <select 
                                                            value={editForm.isBanned ? 'true' : 'false'} 
                                                            onChange={(e) => setEditForm({ ...editForm, isBanned: e.target.value === 'true' })} 
                                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 appearance-none font-mono"
                                                        >
                                                            <option value="false">Aligned (Active)</option>
                                                            <option value="true">Isolated (Banned)</option>
                                                        </select>
                                                    </div>

                                                    <div className="space-y-1 col-span-2">
                                                        <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Custom Title</label>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.customTitle} 
                                                            onChange={(e) => setEditForm({ ...editForm, customTitle: e.target.value })} 
                                                            placeholder="e.g. Master of the Void" 
                                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50"
                                                        />
                                                    </div>

                                                    <div className="space-y-1 col-span-2">
                                                        <label className="text-[8px] font-black uppercase text-zinc-500 tracking-wider">Biography</label>
                                                        <textarea 
                                                            value={editForm.bio} 
                                                            onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })} 
                                                            placeholder="Tell the Sanctum their purpose..." 
                                                            rows={3} 
                                                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50 resize-none"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex gap-4 pt-4">
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setEditingUserId(null)}
                                                        className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                                    >
                                                        Abort Protocol
                                                    </button>
                                                    <button 
                                                        type="submit" 
                                                        disabled={adminLoading}
                                                        className="flex-1 bg-white hover:bg-red-500 hover:text-white text-black py-3.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] flex items-center justify-center gap-2"
                                                    >
                                                        {adminLoading ? <Loader2 className="w-4 h-4 animate-spin text-current" /> : 'Commit changes'}
                                                    </button>
                                                </div>
                                            </form>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>

            </main>
            {/* Sentinel Guide Protocol */}
            <SentinelGuide 
                isOpen={isGuideOpen}
                onClose={() => setIsGuideOpen(false)}
                onComplete={handleGuideComplete}
                steps={SELF_PROTOCOL_STEPS}
                protocolName="IDENTITY PROTOCOL"
            />
        </div>
    );
}
