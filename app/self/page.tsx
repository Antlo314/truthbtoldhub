'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useSoulStore } from '@/lib/store/useSoulStore';
import SentinelGuide, { GuideStep } from '@/components/guide/SentinelGuide';
import { ArrowLeft, User, ShieldAlert, Key, Settings, Zap, Database, CheckSquare, Layers, Clapperboard, LogOut, Upload, Share2, Link, Trophy, History, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
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

    const [activeTab, setActiveTab] = useState('profile'); // profile | admin
    const [uploading, setUploading] = useState(false);
    const [isRecovery, setIsRecovery] = useState(false);
    const [isGuideOpen, setIsGuideOpen] = useState(false);
    const [globalRank, setGlobalRank] = useState<number | null>(null);
    const [transactions, setTransactions] = useState<any[]>([]);

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

    const userEmail = user?.email || 'guest@obsidianvoid.net';
    const isAdmin = profile?.tier === 'Architect';
    const displayName = profile?.display_name || profile?.username || 'Guest Soul';
    const currentTier = profile?.tier || 'Initiate';
    const currentPower = profile?.soul_power || 100;
    const avatarUrl = profile?.avatar_url || "https://api.dicebear.com/7.x/identicon/svg?seed=soul";

    const handleSignOut = async () => {
        await storeSignOut();
        router.push('/');
    };

    };

    const handleGuideComplete = () => {
        localStorage.setItem('self_guide_complete', 'true');
        setIsGuideOpen(false);
    };

    return (
        try {
            setUploading(true);
            if (!event.target.files || event.target.files.length === 0) {
                throw new Error('You must select an image to upload.');
            }
            const file = event.target.files[0];
            const fileExt = file.name.split('.').pop();
            const fileName = `${userAuth.id}-${Math.random()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            let { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data: publicUrlData } = supabase.storage.from('avatars').getPublicUrl(filePath);
            const newAvatarUrl = publicUrlData.publicUrl;

            await updateProfile({ avatar_url: newAvatarUrl });
        } catch (error: any) {
            alert('Error uploading avatar: ' + error.message);
        } finally {
            setUploading(false);
        }
    };


    return (
        <div className="relative min-h-screen bg-black text-white selection:bg-orange-500/30 font-sans flex flex-col overflow-x-hidden">
            {/* Background Parallax - Inner Sanctum */}
            <div ref={bgRef} className="fixed inset-0 z-0 scale-110 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,#1a0a00_0%,#000_100%)]"></div>
                <div className="absolute inset-0 bg-[linear-gradient(rgba(234,88,12,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(234,88,12,0.015)_1px,transparent_1px)] bg-[size:30px_30px]"></div>
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 glass bg-black/60 backdrop-blur-xl px-4 py-4 md:px-6 flex justify-between items-center border-b border-orange-500/10">
                <button
                    onMouseEnter={playHover}
                    onClick={() => { playClick(); router.push('/sanctum'); }}
                    className="text-orange-500 hover:text-white transition-colors group"
                >
                    <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex flex-col items-center pl-8">
                    <span className="font-ritual text-sm font-bold tracking-widest text-white leading-none">
                        SOUL MATRIX
                    </span>
                    <span className="text-[9px] text-orange-500/80 font-mono uppercase tracking-[0.2em]">
                        Identity & Authority
                    </span>
                </div>
                <button onClick={handleSignOut} className="text-gray-500 hover:text-red-500 transition-colors group flex items-center gap-2" title="Sign Out">
                    <span className="text-[9px] uppercase font-bold tracking-widest hidden md:inline">Disconnect</span>
                    <LogOut className="w-5 h-5" />
                </button>
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
                    onMouseEnter={(e) => {
                        playHover();
                        gsap.to(e.currentTarget, { scale: 1.01, rotationX: 1, rotationY: -1, duration: 0.5, ease: "power2.out", filter: "brightness(1.1)" });
                    }}
                    onMouseLeave={(e) => {
                        gsap.to(e.currentTarget, { scale: 1, rotationX: 0, rotationY: 0, duration: 0.5, ease: "power2.out", filter: "brightness(1)" });
                    }}
                    style={{ perspective: '1000px' }}
                    className="glass-panel rounded-3xl p-6 relative overflow-hidden border-orange-500/20 transition-all cursor-default"
                >
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl mix-blend-screen -z-10"></div>

                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={uploadAvatar} />
                        <div onClick={() => !uploading && fileInputRef.current?.click()} className="w-24 h-24 rounded-2xl bg-zinc-900 border border-orange-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(234,88,12,0.15)] relative group cursor-pointer overflow-hidden p-1 shrink-0">
                            <img src={avatarUrl} alt="Avatar" className={`w-full h-full object-cover rounded-xl ${uploading ? 'opacity-50 grayscale' : ''}`} />
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {uploading ? (
                                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <div className="flex flex-col items-center gap-1">
                                        <Upload className="w-4 h-4 text-white" />
                                        <span className="text-[8px] font-mono text-white uppercase tracking-widest">Update</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 text-center md:text-left space-y-2">
                            <div className="flex flex-col md:flex-row items-center gap-3">
                                <h1 className="font-ritual text-3xl font-bold tracking-widest text-white">{displayName}</h1>
                                {isAdmin && (
                                    <span className="text-[9px] px-2 py-0.5 rounded bg-red-950/40 text-red-400 border border-red-500/30 uppercase tracking-[0.2em] font-bold">
                                        Architect
                                    </span>
                                )}
                                {!isAdmin && (
                                    <span className="text-[9px] px-2 py-0.5 rounded bg-orange-950/40 text-orange-400 border border-orange-500/30 uppercase tracking-[0.2em] font-bold">
                                        {currentTier}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-gray-400 font-mono tracking-widest leading-relaxed">
                                {profile?.custom_title && <span className="block text-orange-500 mb-1">{profile.custom_title}</span>}
                                {profile?.bio || userEmail}
                            </p>

                            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-orange-500" />
                                    <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400">Sanctum Power: <strong className="text-white">{currentPower} SP</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Key className="w-4 h-4 text-orange-500" />
                                    <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400">Tier: <strong className="text-white">{currentTier}</strong></span>
                                </div>
                                {globalRank !== null && globalRank > 0 && (
                                    <button onClick={() => router.push('/hierarchy')} className="flex items-center gap-2 bg-orange-950/20 hover:bg-orange-500/20 px-3 py-1.5 rounded-lg border border-orange-500/30 transition-all group">
                                        <Trophy className="w-3.5 h-3.5 text-orange-500 group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] uppercase font-mono tracking-widest text-orange-200">Global Rank: <strong className="text-orange-500 font-bold ml-1">#{globalRank}</strong></span>
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Modify Protocol Removed per protocol */}
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
                                            value={`https://truthbtoldhub.com/?cipher=${userAuth?.id?.substring(0,8) || 'INIT...'}`}
                                            className="flex-1 bg-black/60 border border-orange-500/30 rounded-lg px-3 py-2.5 text-xs text-orange-200 font-mono focus:outline-none"
                                        />
                                        <button 
                                            onClick={(e) => {
                                                navigator.clipboard.writeText(`Begin Initiation: https://truthbtoldhub.com/?cipher=${userAuth?.id?.substring(0,8) || 'INIT...'}`);
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
                                    <div className="text-center py-4 text-[10px] uppercase font-mono tracking-widest text-gray-600">
                                        No active voting signatures.
                                    </div>
                                </div>
                            </div>
                        </div>
                        </div>
                    )}

                    {/* ADMIN CHAMBER TAB */}
                    {activeTab === 'admin' && isAdmin && (
                        <div className="space-y-6">
                            <div className="p-4 border border-red-500/30 bg-red-950/20 rounded-xl relative overflow-hidden">
                                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-10 blur-[1px]"></div>
                                <div className="relative z-10 flex items-center gap-3">
                                    <ShieldAlert className="w-6 h-6 text-red-500" />
                                    <div>
                                        <h3 className="text-sm font-bold text-red-500 tracking-widest uppercase">System Architect Privileges Active</h3>
                                        <p className="text-[9px] text-red-400/70 font-mono uppercase tracking-widest leading-relaxed mt-1">
                                            Warning: Changes made here alter the global state of the Sanctum. Act with intent.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                                {/* Global System Override Form */}
                                <div className="glass bg-white/5 border border-white/10 hover:border-red-500/30 transition-colors p-6 rounded-2xl lg:col-span-2">
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
                                            <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">System Marquee Broadcast</label>
                                            <input name="broadcast_message" required placeholder="Alert: New Content Drop in The Gallery..." className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-red-500 outline-none" />
                                        </div>
                                        <button type="submit" className="w-full md:w-auto bg-red-950/40 text-red-500 border border-red-500/30 font-bold py-3 px-8 rounded-lg text-[10px] uppercase tracking-widest hover:bg-red-900/60 transition-colors mt-2">
                                            Initiate Override Sequence
                                        </button>
                                    </form>
                                </div>

                                {/* Films / Cineworks Admin Form */}
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
                                            <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Film Title</label>
                                            <input name="title" required placeholder="e.g. THE FALL OF BABYLON" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-red-500 outline-none" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Runtime</label>
                                                <input name="duration" required placeholder="e.g. 15:00" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-red-500 outline-none" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Format</label>
                                                <input name="format" required defaultValue="4K" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-red-500 outline-none" />
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Video Storage URL</label>
                                            <input name="video_url" placeholder="https://..." className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-red-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Thumbnail URL</label>
                                            <input name="thumbnail_url" placeholder="https://..." className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-red-500 outline-none" />
                                        </div>
                                        <button type="submit" className="w-full bg-red-950/40 text-red-500 border border-red-500/30 font-bold py-3 rounded-lg text-[10px] uppercase tracking-widest hover:bg-red-900/60 transition-colors mt-2">
                                            Inject to Gallery
                                        </button>
                                    </form>
                                </div>

                                {/* Petitions / Treasury Admin Form */}
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

                                        // As an Architect, you can lodge petitions on behalf of the system or yourself
                                        const { error } = await supabase.from('petitions').insert([{
                                            requester_id: userAuth.id,
                                            title, description, amount_requested, status: 'Consensus Building'
                                        }]);

                                        if (error) alert("Error adding petition: " + error.message);
                                        else { alert("Petition submitted to The Pool!"); (e.target as HTMLFormElement).reset(); }
                                    }}>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Petition Concept</label>
                                            <input name="title" required placeholder="e.g. Server Infrastructure Grant" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-red-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Request Amount (USD)</label>
                                            <input name="amount" type="number" step="0.01" required placeholder="500.00" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-red-500 outline-none" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Justification / Details</label>
                                            <textarea name="description" required rows={3} placeholder="Describe the need..." className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-red-500 outline-none resize-none"></textarea>
                                        </div>
                                        <button type="submit" className="w-full bg-red-950/40 text-red-500 border border-red-500/30 font-bold py-3 rounded-lg text-[10px] uppercase tracking-widest hover:bg-red-900/60 transition-colors mt-2">
                                            Lodge Petition
                                        </button>
                                    </form>
                                </div>

                                {/* Architect Promotion Form */}
                                <div className="glass bg-white/5 border border-white/10 hover:border-red-500/30 transition-colors p-6 rounded-2xl lg:col-span-2">
                                    <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
                                        <ShieldAlert className="w-5 h-5 text-red-500" />
                                        <h4 className="font-ritual text-lg text-white tracking-widest uppercase">Promote Soul to Architect</h4>
                                    </div>
                                    <form className="space-y-4" onSubmit={async (e) => {
                                        e.preventDefault();
                                        const formData = new FormData(e.currentTarget);
                                        const soulIdentifier = formData.get('identifier') as string;

                                        // Find user by display_name
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
                                        else { alert(`Success: ${users[0].display_name} has ascended to Architect.`); (e.target as HTMLFormElement).reset(); }
                                    }}>
                                        <div className="space-y-1">
                                            <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Identity Name</label>
                                            <input name="identifier" required placeholder="e.g. Neo" className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-red-500 outline-none" />
                                        </div>
                                        <button type="submit" className="w-full md:w-auto bg-red-950/40 text-red-500 border border-red-500/30 font-bold py-3 px-8 rounded-lg text-[10px] uppercase tracking-widest hover:bg-red-900/60 transition-colors mt-2">
                                            Execute Ascension
                                        </button>
                                    </form>
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
