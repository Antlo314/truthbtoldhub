'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, User, ShieldAlert, Key, Settings, Zap, Database, CheckSquare, Layers, Clapperboard, LogOut, Upload } from 'lucide-react';
import { Howl } from 'howler';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ethers } from 'ethers';

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

    const [activeTab, setActiveTab] = useState('profile'); // profile | wallet | admin

    // Lumen Wallet Dual-Gateway States
    const [walletAction, setWalletAction] = useState<'deposit' | 'withdraw'>('deposit');
    const [paymentMethod, setPaymentMethod] = useState<'fiat' | 'crypto'>('fiat');
    const [isProcessingTx, setIsProcessingTx] = useState(false);
    const [depositAmount, setDepositAmount] = useState<string>('');

    const [userAuth, setUserAuth] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [uploading, setUploading] = useState(false);
    const [isRecovery, setIsRecovery] = useState(false);
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

        async function fetchIdentity() {
            try {
                // Ensure we get the absolute latest auth token
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUserAuth({ ...user });
                    // Fetch profile, ensuring we don't hit a Next.js cached response
                    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                    if (data && !error) {
                        setProfile({ ...data }); // spread to force strict react re-render
                    }
                }
            } catch (err) {
                console.error("Error fetching identity:", err);
            }
        }
        fetchIdentity();
    }, []);

    const userEmail = userAuth?.email || 'guest@obsidianvoid.net';
    const isAdmin = profile?.tier === 'Architect';
    const displayName = profile?.display_name || profile?.username || 'Guest Soul';
    const currentTier = profile?.tier || 'Initiate';
    const currentPower = profile?.soul_power || 100;
    const avatarUrl = profile?.avatar_url || "https://api.dicebear.com/7.x/identicon/svg?seed=soul";

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const uploadAvatar = async (event: any) => {
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

            const { error: updateError } = await supabase.from('profiles').update({ avatar_url: newAvatarUrl }).eq('id', userAuth.id);
            if (updateError) throw updateError;

            setProfile({ ...profile, avatar_url: newAvatarUrl });
        } catch (error: any) {
            alert('Error uploading avatar: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleGatewayInit = async () => {
        playClick();
        if (!depositAmount || Number(depositAmount) <= 0) {
            alert("Enter a valid liquidity amount.");
            return;
        }

        if (paymentMethod === 'fiat') {
            // Stripe Gateway initialization
            try {
                setIsProcessingTx(true);
                const res = await fetch('/api/stripe/checkout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount: depositAmount, userId: userAuth?.id })
                });

                if (!res.ok) throw new Error("Stripe keys missing or route err");

                const data = await res.json();
                if (data.url) {
                    window.location.href = data.url; // Redirect to Stripe
                }
            } catch (err: any) {
                alert(`Fiat Gateway Error: ${err.message}. Add STRIPE_SECRET_KEY to .env.local`);
            } finally {
                setIsProcessingTx(false);
            }
        } else {
            // Web3 Crypto Gateway initialization
            setIsProcessingTx(true);
            try {
                // @ts-ignore - window.ethereum is injected by MetaMask
                if (typeof window.ethereum !== 'undefined') {
                    // @ts-ignore
                    await window.ethereum.request({ method: 'eth_requestAccounts' });
                    // @ts-ignore
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const signer = await provider.getSigner();
                    const address = await signer.getAddress();
                    alert(`Web3 Uplink Established. Discovered wallet signature: ${address.substring(0, 6)}...${address.substring(address.length - 4)}`);
                    // In a full implementation, you'd trigger a Smart Contract `deposit` here
                } else {
                    alert('MetaMask or Web3 Wallet provider not detected in browser.');
                }
            } catch (err: any) {
                alert('Web3 Connection Terminated: ' + err.message);
            } finally {
                setIsProcessingTx(false);
            }
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
                            <p className="text-xs text-gray-400 font-mono tracking-widest">{userEmail}</p>

                            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-orange-500" />
                                    <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400">Sanctum Power: <strong className="text-white">{currentPower} SP</strong></span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Key className="w-4 h-4 text-orange-500" />
                                    <span className="text-[10px] uppercase font-mono tracking-widest text-gray-400">Tier: <strong className="text-white">{currentTier}</strong></span>
                                </div>
                            </div>
                        </div>

                        {/* Modify Protocol Removed per protocol */}
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-white/10 gap-6 overflow-x-auto whitespace-nowrap scrollbar-hide pb-1">
                    <button
                        onMouseEnter={playHover}
                        onClick={() => { playClick(); setActiveTab('profile'); }}
                        className={`pb-3 text-xs uppercase tracking-[0.2em] font-bold transition-colors relative ${activeTab === 'profile' ? 'text-orange-500' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Identity Core
                        {activeTab === 'profile' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.8)]"></div>}
                    </button>

                    <button
                        onMouseEnter={playHover}
                        onClick={() => { playClick(); setActiveTab('wallet'); }}
                        className={`pb-3 text-xs uppercase tracking-[0.2em] font-bold transition-colors relative ${activeTab === 'wallet' ? 'text-orange-500' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Lumen Wallet
                        {activeTab === 'wallet' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.8)]"></div>}
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
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="glass bg-white/5 border border-white/10 p-6 rounded-2xl relative">
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
                                        const { error } = await supabase.from('profiles').update({ display_name: nameVal }).eq('id', userAuth.id);
                                        if (error) msg += "Failed to update Name: " + error.message + "\n";
                                        else msg += "Identity Name Updated.\n";
                                    }

                                    const userVal = formData.get('userName') as string;
                                    if (userVal && userVal !== profile?.username) {
                                        const { error } = await supabase.from('profiles').update({ username: userVal }).eq('id', userAuth.id);
                                        if (error) msg += "Failed to update Username: " + error.message + "\n";
                                        else msg += "Username Updated.\n";
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
                                    <button type="submit" className="w-full mt-4 btn-ember py-3 rounded-lg text-[10px] uppercase font-bold tracking-widest">
                                        Save Changes
                                    </button>
                                </form>
                            </div>

                            <div className="glass bg-white/5 border border-white/10 p-6 rounded-2xl">
                                <h3 className="text-xs uppercase tracking-widest text-gray-400 font-bold mb-6 flex items-center gap-2">
                                    <CheckSquare className="w-4 h-4 text-orange-500" /> Active Votes (The Stage)
                                </h3>
                                <div className="text-center py-8">
                                    <p className="text-[10px] uppercase font-mono tracking-widest text-gray-600">No active voting signatures.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* WALLET TAB */}
                    {activeTab === 'wallet' && (
                        <div className="glass bg-white/5 border border-white/10 p-4 md:p-8 rounded-3xl relative overflow-hidden">
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>

                            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6 border-b border-white/5 pb-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-orange-950/40 border border-orange-500/20 flex items-center justify-center text-orange-500 shadow-[0_0_20px_rgba(234,88,12,0.2)] shrink-0">
                                        <Zap className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h2 className="font-ritual text-3xl text-white tracking-widest">LUMEN WALLET</h2>
                                        <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase mt-1">
                                            Universal Energy Gateway
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[9px] text-gray-500 font-mono uppercase tracking-widest block mb-1">Available Liquidity</span>
                                    <span className="font-ritual text-4xl text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-600 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)] leading-none">
                                        {currentPower} <span className="text-2xl text-orange-500/80">SP</span>
                                    </span>
                                </div>
                            </div>

                            {/* Wallet Action Toggle */}
                            <div className="flex p-1 bg-black/40 border border-white/10 rounded-xl mb-8 max-w-sm mx-auto">
                                <button
                                    onClick={() => { playClick(); setWalletAction('deposit'); }}
                                    className={`w-1/2 py-2 text-[10px] uppercase font-bold tracking-widest rounded-lg transition-all ${walletAction === 'deposit' ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(234,88,12,0.5)]' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Deposit
                                </button>
                                <button
                                    onClick={() => { playClick(); setWalletAction('withdraw'); }}
                                    className={`w-1/2 py-2 text-[10px] uppercase font-bold tracking-widest rounded-lg transition-all ${walletAction === 'withdraw' ? 'bg-zinc-800 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'text-gray-400 hover:text-white'}`}
                                >
                                    Withdraw
                                </button>
                            </div>

                            {/* Payment Method Toggle */}
                            <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto mb-8">
                                <button
                                    onClick={() => { playClick(); setPaymentMethod('fiat'); }}
                                    className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center gap-2 ${paymentMethod === 'fiat' ? 'bg-blue-950/20 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.15)]' : 'bg-black/40 border-white/10 opacity-50 hover:opacity-100'}`}
                                >
                                    <span className="text-2xl">💳</span>
                                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Fiat (Stripe)</span>
                                </button>
                                <button
                                    onClick={() => { playClick(); setPaymentMethod('crypto'); }}
                                    className={`p-4 rounded-xl border transition-all flex flex-col items-center justify-center gap-2 ${paymentMethod === 'crypto' ? 'bg-purple-950/20 border-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.15)]' : 'bg-black/40 border-white/10 opacity-50 hover:opacity-100'}`}
                                >
                                    <span className="text-2xl">💎</span>
                                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Web3 (Crypto)</span>
                                </button>
                            </div>

                            {/* Transaction Form Engine */}
                            <div className="max-w-md mx-auto aspect-video">
                                {walletAction === 'deposit' ? (
                                    <div className="space-y-4 animate-fade-in">
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={depositAmount}
                                                onChange={(e) => setDepositAmount(e.target.value)}
                                                placeholder="Amount..."
                                                className="w-full bg-black/60 border border-orange-500/30 rounded-xl pl-12 pr-16 py-4 text-2xl text-white font-ritual focus:outline-none focus:border-orange-500 transition-colors placeholder:text-gray-700 placeholder:font-sans placeholder:text-base"
                                            />
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-orange-500 font-ritual text-2xl">$</span>
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-mono tracking-widest uppercase">USD</span>
                                        </div>
                                        <p className="text-center text-[9px] text-orange-500/70 font-mono tracking-widest uppercase">
                                            Est. Output: {(Number(depositAmount) * 100).toLocaleString()} Lumen (SP)
                                        </p>
                                        <button
                                            onMouseEnter={playHover}
                                            onClick={handleGatewayInit}
                                            disabled={isProcessingTx}
                                            className={`w-full py-4 rounded-xl font-bold uppercase tracking-[0.2em] text-[10px] transition-all flex items-center justify-center gap-2 ${paymentMethod === 'fiat' ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_20px_rgba(147,51,234,0.4)]'} ${isProcessingTx ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            {isProcessingTx ? 'Processing...' : (paymentMethod === 'fiat' ? 'Initialize Stripe Checkout' : 'Connect Web3 Wallet')}
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-4 animate-fade-in text-center p-6 border border-zinc-800 rounded-2xl bg-black/40">
                                        <Database className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Withdrawal Protocol</h3>
                                        <p className="text-[10px] text-gray-400 font-mono leading-relaxed mt-2 text-left">
                                            Requesting liquidity exit requires a minimum of <strong className="text-orange-500">10,000 SP</strong>. Validated withdrawals are processed to your linked identity {paymentMethod === 'fiat' ? 'bank account via Stripe Connect' : 'crypto wallet via Smart Contract payout'}.
                                        </p>
                                        <button
                                            disabled
                                            className="w-full mt-4 py-3 bg-zinc-900 border border-zinc-800 text-zinc-600 uppercase tracking-widest text-[9px] font-bold rounded-lg cursor-not-allowed"
                                        >
                                            Insufficient Liquidity
                                        </button>
                                    </div>
                                )}
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

                            </div>
                        </div>
                    )}

                </div>

            </main>
        </div>
    );
}
