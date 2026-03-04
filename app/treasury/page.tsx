'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Flame, DollarSign, Send, Zap, ChevronRight, Lock, LogOut } from 'lucide-react';

export default function Treasury() {
    const router = useRouter();
    const [isConfidential, setIsConfidential] = useState(false);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    const [escrow, setEscrow] = useState("4,000.00");
    const [petitions, setPetitions] = useState<any[]>([]);

    // Pledging State
    const [userAuth, setUserAuth] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [selectedPetition, setSelectedPetition] = useState<any>(null);
    const [pledgeAmount, setPledgeAmount] = useState<number>(0);
    const [isPledging, setIsPledging] = useState(false);

    useEffect(() => {
        async function fetchTreasury() {
            try {
                // Fetch User Context
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    setUserAuth(user);
                    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                    if (prof) setProfile(prof);
                }

                // Fetch Escrow Balance
                const { data: escrowData } = await supabase.from('treasury_escrow').select('balance_usd').limit(1);
                if (escrowData && escrowData.length > 0) {
                    setEscrow(Number(escrowData[0].balance_usd).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
                }

                // Fetch Petitions
                const { data: petData, error } = await supabase.from('petitions').select('*').order('created_at', { ascending: false });
                if (petData && petData.length > 0 && !error) {
                    setPetitions(petData);
                } else {
                    // Fallback to placeholder data if DB is empty or missing columns
                    setPetitions([
                        { id: '0x1a8b2', title: 'Equipment Grant: Studio Upgrade', amount_requested: 850.00, status: 'Consensus Building', consensus_percentage: 18, sp_goal: 10000, sp_pledged: 1800, backer_count: 4 },
                        { id: '0x0f3c1', title: 'Emergency Medical Fund', amount_requested: 1200.00, status: 'Consensus Reached', consensus_percentage: 100, sp_goal: 5000, sp_pledged: 5000, backer_count: 12 }
                    ]);
                }
            } catch (err) {
                console.error("Error fetching treasury:", err);
            }
        }
        fetchTreasury();
    }, []);

    const handleExecutePledge = async () => {
        if (!selectedPetition || !userAuth || pledgeAmount <= 0) return;
        if (profile?.soul_power < pledgeAmount) {
            alert("Insufficient Sanctum Power for this pledge.");
            return;
        }

        setIsPledging(true);
        try {
            // 1. Deduct SP from User
            const newSP = profile.soul_power - pledgeAmount;
            await supabase.from('profiles').update({ soul_power: newSP }).eq('id', userAuth.id);

            // 2. Add SP to Petition
            const newPledged = (selectedPetition.sp_pledged || 0) + pledgeAmount;
            const newConsensus = Math.min(100, Math.floor((newPledged / (selectedPetition.sp_goal || 10000)) * 100));
            const newBackerCount = (selectedPetition.backer_count || 0) + 1; // Simplistic count

            // Determine if status should change
            let newStatus = selectedPetition.status;
            if (newConsensus >= 100) newStatus = 'Consensus Reached';

            await supabase.from('petitions')
                .update({
                    sp_pledged: newPledged,
                    consensus_percentage: newConsensus,
                    backer_count: newBackerCount,
                    status: newStatus
                })
                .eq('id', selectedPetition.id);

            // 3. Log Transaction
            await supabase.from('transactions').insert([{
                profile_id: userAuth.id,
                amount: -pledgeAmount, // Negative because it's a spend
                transaction_type: 'PLEDGE',
                description: `Pledged to Petition: ${selectedPetition.title}`
            }]);

            // Refresh local state
            setProfile({ ...profile, soul_power: newSP });
            setPetitions(petitions.map(p => {
                if (p.id === selectedPetition.id) {
                    return { ...p, sp_pledged: newPledged, consensus_percentage: newConsensus, backer_count: newBackerCount, status: newStatus };
                }
                return p;
            }));

            setSelectedPetition(null);
            setPledgeAmount(0);

        } catch (err) {
            console.error("Pledge failed:", err);
            alert("An error occurred while pledging.");
        } finally {
            setIsPledging(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-black text-white selection:bg-orange-500/30 font-sans flex flex-col items-center">
            {/* Background - The Treasury uses the custom pool void asset */}
            <div className="fixed inset-0 z-0 bg-[url('https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_pool.png')] bg-cover bg-center brightness-50 contrast-125"></div>

            {/* Header */}
            <header className="sticky top-0 w-full max-w-lg z-50 glass bg-zinc-950/80 backdrop-blur-xl px-6 py-4 flex justify-between items-center border-b border-orange-500/10">
                <button onClick={() => router.push('/sanctum')} className="text-orange-500 hover:text-white transition-colors group">
                    <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex flex-col items-center pl-8">
                    <span className="font-ritual text-sm font-bold tracking-widest text-white leading-none drop-shadow-md">
                        THE POOL
                    </span>
                    <span className="text-[9px] text-orange-500/80 font-mono uppercase tracking-[0.2em]">
                        Mutual Aid Treasury
                    </span>
                </div>
                <button onClick={handleSignOut} className="text-gray-500 hover:text-red-500 transition-colors group flex items-center gap-2" title="Sign Out">
                    <span className="text-[9px] uppercase font-bold tracking-widest hidden md:inline">Disconnect</span>
                    <LogOut className="w-5 h-5" />
                </button>
            </header>

            <main className="flex-1 w-full max-w-lg relative z-10 p-4 md:p-6 pb-32 space-y-8 animate-fade-in">

                {/* Treasury Escrow Status block */}
                <div className="glass-panel p-6 rounded-3xl border-orange-500/20 shadow-[0_0_40px_rgba(234,88,12,0.1)] relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-orange-600/10 rounded-full blur-3xl mix-blend-screen pointer-events-none"></div>

                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-950/50 border border-orange-500/30 flex items-center justify-center text-orange-500">
                                <Flame className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Global Escrow</h2>
                                <h3 className="font-ritual text-2xl text-white tracking-widest leading-none mt-1">${escrow}</h3>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block text-[8px] text-green-500/80 font-mono uppercase tracking-widest px-2 py-1 bg-green-500/10 rounded border border-green-500/20">
                                SECURE
                            </span>
                        </div>
                    </div>

                    <p className="text-xs text-gray-400 font-mono leading-relaxed mt-4">
                        The Pool sustains the Obsidian Void. Funds are held in escrow and distributed via sovereign consensus.
                    </p>

                    <div className="mt-6 flex gap-3">
                        <button className="flex-1 bg-gradient-to-r from-orange-600 to-orange-800 text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-orange-900/40 hover:scale-[1.02] transition-transform">
                            Make Offering
                        </button>
                        <button className="flex-1 glass bg-white/5 border border-white/10 text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 transition-colors">
                            Request Aid
                        </button>
                    </div>
                </div>

                {/* Global Consensus - Petitions */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-5 bg-orange-500"></div>
                        <h3 className="font-ritual text-white text-base tracking-widest uppercase">Active Petitions</h3>
                    </div>

                    <div className="space-y-4">
                        {petitions.map((pet) => (
                            <div key={pet.id} className={`glass bg-white/5 border ${pet.status === 'Consensus Reached' || pet.status === 'Disbursed' ? 'border-green-500/20 opacity-70' : 'border-white/5 hover:border-orange-500/30'} rounded-2xl p-5 relative overflow-hidden group transition-colors`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex flex-col">
                                        <span className={`text-[9px] font-mono ${pet.status === 'Consensus Reached' || pet.status === 'Disbursed' ? 'text-gray-500' : 'text-orange-500/60'}`}>REQ_ID: {pet.id.toString().substring(0, 8)}</span>
                                        <h4 className={`text-sm font-bold mt-1 ${pet.status === 'Consensus Reached' || pet.status === 'Disbursed' ? 'text-gray-300 line-through decoration-gray-600' : 'text-white'}`}>{pet.title}</h4>
                                    </div>
                                    <div className="text-right">
                                        <span className={`text-lg font-bold font-mono ${pet.status === 'Consensus Reached' || pet.status === 'Disbursed' ? 'text-gray-400' : 'text-white'}`}>${Number(pet.amount_requested).toFixed(2)}</span>
                                        <span className="text-[8px] text-gray-500 block uppercase font-mono tracking-widest mt-1">
                                            {pet.status === 'Disbursed' || pet.status === 'Consensus Reached' ? 'Disbursed' : 'Requested'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mb-4">
                                    <span className={`text-[9px] px-2 py-1 rounded uppercase font-bold tracking-tighter ${pet.status === 'Consensus Reached' || pet.status === 'Disbursed' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                                        {pet.status}
                                    </span>
                                    {pet.status !== 'Consensus Reached' && pet.status !== 'Disbursed' ? (
                                        <div className="flex -space-x-2">
                                            <div className="w-5 h-5 rounded-full bg-zinc-800 border border-white/10"></div>
                                            <div className="w-5 h-5 rounded-full bg-zinc-700 border border-white/10"></div>
                                            <div className="w-5 h-5 rounded-full bg-orange-600 border border-orange-500/30 flex items-center justify-center text-[8px] font-bold text-white">
                                                +8
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] text-green-500 font-mono font-bold">100%</span>
                                    )}
                                </div>

                                {pet.status !== 'Consensus Reached' && pet.status !== 'Disbursed' && (
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[9px] font-mono">
                                            <span className="text-gray-500 uppercase">Consensus ({pet.sp_pledged || 0} / {pet.sp_goal || 10000} SP)</span>
                                            <span className="text-orange-500 font-bold">{pet.consensus_percentage || 0}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-orange-600 to-amber-500 transition-all duration-1000" style={{ width: `${pet.consensus_percentage || 0}%` }}></div>
                                        </div>
                                        <button
                                            onClick={() => setSelectedPetition(pet)}
                                            className="w-full py-2.5 bg-white/5 border border-white/10 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-orange-500/20 hover:border-orange-500 transition-all mt-3 text-orange-500 group-hover:text-white"
                                        >
                                            Vote to Align
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Pledge Modal */}
            {selectedPetition && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-zinc-950 border border-orange-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_0_50px_rgba(234,88,12,0.15)] animate-fade-in relative">
                        {/* Decorative glow */}
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>

                        <div className="p-6">
                            <h3 className="font-ritual text-2xl text-white tracking-widest mb-1">PLEDGE SP</h3>
                            <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase mb-6 truncate">{selectedPetition.title}</p>

                            <div className="bg-black/50 rounded-xl p-4 mb-6 border border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] uppercase tracking-widest text-gray-500">Available Balance</span>
                                    <span className="text-xs font-mono font-bold text-orange-500">{profile?.soul_power || 0} SP</span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={pledgeAmount || ''}
                                        onChange={(e) => setPledgeAmount(Number(e.target.value))}
                                        placeholder="0"
                                        className="w-full bg-transparent border-b border-orange-500/50 text-3xl font-mono text-white py-2 focus:outline-none focus:border-orange-500 transition-colors placeholder:text-zinc-800"
                                    />
                                    <Zap className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500/50" />
                                </div>
                                <div className="flex gap-2 mt-4">
                                    {[100, 500, 1000].map(amt => (
                                        <button
                                            key={amt}
                                            onClick={() => setPledgeAmount(amt)}
                                            className="flex-1 py-1.5 bg-white/5 hover:bg-orange-500/20 border border-white/10 hover:border-orange-500/50 rounded text-[9px] font-mono text-gray-300 transition-colors"
                                        >
                                            +{amt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setSelectedPetition(null)}
                                    className="flex-1 py-3 text-[10px] uppercase tracking-widest font-bold text-gray-500 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExecutePledge}
                                    disabled={isPledging || pledgeAmount <= 0 || pledgeAmount > (profile?.soul_power || 0)}
                                    className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-orange-800 rounded-xl text-[10px] uppercase tracking-widest font-bold text-white shadow-lg disabled:opacity-50 transition-transform active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isPledging ? 'Processing...' : 'Confirm Pledge'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
