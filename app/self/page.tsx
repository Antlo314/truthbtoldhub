'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, User, ShieldAlert, Key, Settings, Zap, Database, CheckSquare, Layers } from 'lucide-react';

export default function PowerSelf() {
    const router = useRouter();

    // Mock auth state for UI development
    const [isAdminState, setIsAdminState] = useState(false);
    const [activeTab, setActiveTab] = useState('profile'); // profile | wallet | admin

    const [userAuth, setUserAuth] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);

    useEffect(() => {
        async function fetchIdentity() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUserAuth(user);
                    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                    if (data) setProfile(data);
                }
            } catch (err) {
                console.error("Error fetching identity:", err);
            }
        }
        fetchIdentity();
    }, []);

    const isAdmin = profile?.tier === 'Architect' || isAdminState;
    const displayName = profile?.display_name || profile?.username || 'Guest Soul';
    const userEmail = userAuth?.email || 'guest@obsidianvoid.net';
    const currentTier = profile?.tier || 'Initiate';
    const currentPower = profile?.soul_power || 100;
    const avatarUrl = profile?.avatar_url || "https://api.dicebear.com/7.x/identicon/svg?seed=soul";

    // Toggle for testing admin view easily
    const toggleAdmin = () => setIsAdminState(!isAdminState);

    return (
        <div className="relative min-h-screen bg-black text-white selection:bg-orange-500/30 font-sans flex flex-col">
            {/* Background - Inner Sanctum */}
            <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_0%,#1a0a00_0%,#000_100%)]"></div>

            {/* Header */}
            <header className="sticky top-0 z-50 glass bg-black/60 backdrop-blur-xl px-4 py-4 md:px-6 flex justify-between items-center border-b border-orange-500/10">
                <button onClick={() => router.push('/sanctum')} className="text-orange-500 hover:text-white transition-colors group">
                    <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="font-ritual text-sm font-bold tracking-widest text-white leading-none">
                        SOUL MATRIX
                    </span>
                    <span className="text-[9px] text-orange-500/80 font-mono uppercase tracking-[0.2em]">
                        Identity & Authority
                    </span>
                </div>
                <button onClick={toggleAdmin} className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${isAdmin ? 'bg-red-950/50 border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/30'}`}>
                    <ShieldAlert className="w-4 h-4" />
                </button>
            </header>

            <main className="flex-1 relative z-10 p-4 md:p-8 pb-32 max-w-4xl mx-auto w-full animate-fade-in space-y-8">

                {/* Profile Identity Card */}
                <div className="glass-panel rounded-3xl p-6 relative overflow-hidden border-orange-500/20">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl mix-blend-screen -z-10"></div>

                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="w-24 h-24 rounded-2xl bg-zinc-900 border border-orange-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(234,88,12,0.15)] relative group cursor-pointer overflow-hidden p-1">
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover rounded-xl" />
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-[10px] font-mono text-white uppercase tracking-widest">Update</span>
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

                        <div className="w-full md:w-auto flex flex-col gap-2">
                            <button className="w-full md:w-auto px-6 py-3 glass bg-white/5 border border-white/10 hover:border-white/30 rounded-xl text-[10px] uppercase tracking-[0.2em] font-bold transition-all flex items-center justify-center gap-2">
                                <Settings className="w-3.5 h-3.5" /> Modify Protocol
                            </button>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex border-b border-white/10 gap-6">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`pb-3 text-xs uppercase tracking-[0.2em] font-bold transition-colors relative ${activeTab === 'profile' ? 'text-orange-500' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Identity Core
                        {activeTab === 'profile' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.8)]"></div>}
                    </button>

                    <button
                        onClick={() => setActiveTab('wallet')}
                        className={`pb-3 text-xs uppercase tracking-[0.2em] font-bold transition-colors relative ${activeTab === 'wallet' ? 'text-orange-500' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Lumen Wallet
                        {activeTab === 'wallet' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-500 shadow-[0_0_10px_rgba(234,88,12,0.8)]"></div>}
                    </button>

                    {isAdmin && (
                        <button
                            onClick={() => setActiveTab('admin')}
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
                                <form className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Identity Name</label>
                                        <input type="text" defaultValue={displayName} className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Update Cipher (Password)</label>
                                        <input type="password" placeholder="••••••••" className="w-full bg-black/50 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500 transition-colors tracking-widest" />
                                    </div>
                                    <button type="button" className="w-full mt-4 btn-ember py-3 rounded-lg text-[10px] uppercase font-bold tracking-widest">
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
                        <div className="glass bg-white/5 border border-white/10 p-8 rounded-3xl relative overflow-hidden">
                            <div className="absolute -top-24 -right-24 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>

                            <div className="flex flex-col items-center justify-center text-center py-12 space-y-4">
                                <div className="w-16 h-16 rounded-full bg-orange-950/40 border border-orange-500/20 flex items-center justify-center text-orange-500 shadow-[0_0_20px_rgba(234,88,12,0.2)] mb-4">
                                    <Zap className="w-8 h-8" />
                                </div>
                                <h2 className="font-ritual text-4xl text-white tracking-widest">LUMEN WALLET</h2>
                                <p className="text-xs text-gray-400 font-mono tracking-widest uppercase max-w-sm">
                                    Your energetic currency within the Obsidian Void ecosystem.
                                </p>

                                <div className="mt-8 mb-4 px-12 py-6 glass bg-black/40 border border-orange-500/30 rounded-2xl flex flex-col gap-2">
                                    <span className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Current Balance</span>
                                    <span className="font-ritual text-5xl text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-600 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]">
                                        {currentPower} SP
                                    </span>
                                </div>

                                <button className="px-8 py-3 bg-white text-black font-bold uppercase tracking-[0.2em] text-[10px] rounded-xl hover:bg-gray-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)] mt-6">
                                    MINT NEW ENERGY
                                </button>
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

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                                {/* Admin Card */}
                                <div className="glass bg-white/5 border border-white/10 hover:border-red-500/30 transition-colors p-6 rounded-2xl group cursor-pointer">
                                    <Database className="w-8 h-8 text-red-500 mb-4 group-hover:scale-110 transition-transform" />
                                    <h4 className="font-ritual text-lg text-white tracking-widest mb-2">Cycle Management</h4>
                                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest leading-relaxed">
                                        Initiate or close global voting cycles for The Stage.
                                    </p>
                                </div>

                                <div className="glass bg-white/5 border border-white/10 hover:border-red-500/30 transition-colors p-6 rounded-2xl group cursor-pointer">
                                    <Layers className="w-8 h-8 text-red-500 mb-4 group-hover:scale-110 transition-transform" />
                                    <h4 className="font-ritual text-lg text-white tracking-widest mb-2">Content Pillars</h4>
                                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest leading-relaxed">
                                        Upload new items to the Stage or Gallery.
                                    </p>
                                </div>

                                <div className="glass bg-white/5 border border-white/10 hover:border-red-500/30 transition-colors p-6 rounded-2xl group cursor-pointer">
                                    <Zap className="w-8 h-8 text-red-500 mb-4 group-hover:scale-110 transition-transform" />
                                    <h4 className="font-ritual text-lg text-white tracking-widest mb-2">System Broadcasts</h4>
                                    <p className="text-[10px] text-gray-500 font-mono uppercase tracking-widest leading-relaxed">
                                        Update the marquee or dispatch global notifications.
                                    </p>
                                </div>

                            </div>
                        </div>
                    )}

                </div>

            </main>
        </div>
    );
}
