'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Flame, DollarSign, Send, Zap, ChevronRight, Lock, LogOut } from 'lucide-react';
import { Howl } from 'howler';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

// --- AUDIO ASSETS ---
let uiHoverSfx: any = null;
let pledgeSfx: any = null;
let errorSfx: any = null;
let ambientDrone: any = null;

if (typeof window !== 'undefined') {
    uiHoverSfx = new Howl({
        src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/hover_tech_01.mp3'],
        volume: 0.1,
        onloaderror: () => console.log('Hover sound failed to load, moving on silently.')
    });

    pledgeSfx = new Howl({
        src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/confirm_deep.mp3'],
        volume: 0.3,
    });

    errorSfx = new Howl({
        src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/error_buzz.mp3'],
        volume: 0.2,
    });
}


export default function Treasury() {
    const router = useRouter();
    const [isConfidential, setIsConfidential] = useState(false);

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/');
    };

    // Provide an explicit union type if we plan to store strings or numbers
    const [escrow, setEscrow] = useState<string | number>("4,000.00");
    const [petitions, setPetitions] = useState<any[]>([]);

    // Pledging State
    const [userAuth, setUserAuth] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [selectedPetition, setSelectedPetition] = useState<any>(null);
    const [pledgeAmount, setPledgeAmount] = useState<number>(0);
    const [isPledging, setIsPledging] = useState(false);

    // Make Offering State
    const [isMakingOffering, setIsMakingOffering] = useState(false);
    const [offeringAmount, setOfferingAmount] = useState<number>(0);
    const [isProcessingOffering, setIsProcessingOffering] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const isAdmin = profile?.tier === 'Architect';

    // Layout Refs for GSAP
    const mainContainerRef = useRef<HTMLDivElement>(null);
    const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
    const escrowObjRef = useRef<HTMLDivElement>(null);
    const bgRef = useRef<HTMLDivElement>(null);
    const escrowDisplayRef = useRef<HTMLHeadingElement>(null);

    const playHover = () => uiHoverSfx?.play();
    const playSuccess = () => pledgeSfx?.play();
    const playError = () => errorSfx?.play();

    // GSAP Parallax Background
    useGSAP(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!bgRef.current) return;
            const x = (e.clientX / window.innerWidth - 0.5) * 40;
            const y = (e.clientY / window.innerHeight - 0.5) * 40;
            gsap.to(bgRef.current, { x, y, duration: 2, ease: "power2.out" });
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

    // GSAP Animated Escrow Counter
    useEffect(() => {
        if (escrowDisplayRef.current) {
            const targetVal = typeof escrow === 'string' ? parseFloat(escrow.replace(/,/g, '')) : Number(escrow);
            const currentVal = parseFloat(escrowDisplayRef.current.innerText.replace(/[$,]/g, '')) || 0;

            gsap.to({ val: currentVal }, {
                val: targetVal,
                duration: 2,
                ease: "power3.out",
                onUpdate: function () {
                    if (escrowDisplayRef.current) {
                        escrowDisplayRef.current.innerText = '$' + this.targets()[0].val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    }
                }
            });
        }
    }, [escrow]);

    useGSAP(() => {
        // Entrance animation for cards
        if (petitions.length > 0 && cardsRef.current.length > 0) {
            gsap.fromTo(cardsRef.current,
                { y: 50, opacity: 0, scale: 0.95 },
                { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.1, ease: "back.out(1.5)" }
            );
        }

        // 3D Geometry Escrow continuous rotation
        if (escrowObjRef.current) {
            gsap.to(escrowObjRef.current, {
                rotateX: 360,
                rotateY: 360,
                duration: 20,
                repeat: -1,
                ease: "none"
            });
        }
    }, { dependencies: [petitions], scope: mainContainerRef });

    // GSAP Particle Engine
    const fireParticles = () => {
        const x = window.innerWidth / 2;
        const y = window.innerHeight / 2;

        for (let i = 0; i < 50; i++) {
            const particle = document.createElement('div');
            particle.className = 'fixed w-1.5 h-1.5 rounded-full bg-orange-500 pointer-events-none z-[200] mix-blend-screen shadow-[0_0_15px_#f97316]';
            document.body.appendChild(particle);

            gsap.set(particle, { x, y, scale: "random(0.5, 2)" });

            gsap.to(particle, {
                x: `+=${gsap.utils.random(-400, 400)}`,
                y: `+=${gsap.utils.random(-400, 400)}`,
                opacity: 0,
                duration: "random(1, 2)",
                ease: "power3.out",
                onComplete: () => particle.remove()
            });
        }
    };

    // Magnetic Card Hover Logic
    const handleCardMouseMove = (e: React.MouseEvent, index: number) => {
        if (!cardsRef.current[index]) return;
        const card = cardsRef.current[index];
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -10; // Max 10 deg tilt
        const rotateY = ((x - centerX) / centerX) * 10;

        gsap.to(card, {
            rotateX,
            rotateY,
            transformPerspective: 1000,
            ease: "power2.out",
            duration: 0.4
        });
    };

    const handleCardMouseLeave = (index: number) => {
        if (!cardsRef.current[index]) return;
        gsap.to(cardsRef.current[index], {
            rotateX: 0,
            rotateY: 0,
            ease: "elastic.out(1, 0.3)",
            duration: 1
        });
    };

    // Request Aid State
    const [isRequestingAid, setIsRequestingAid] = useState(false);
    const [requestTitle, setRequestTitle] = useState('');
    const [requestAmount, setRequestAmount] = useState('');
    const [requestDescription, setRequestDescription] = useState('');
    const [isSubmittingAid, setIsSubmittingAid] = useState(false);

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
                    setEscrow(escrowData[0].balance_usd);
                }

                // Fetch Petitions
                const { data: petData, error } = await supabase.from('petitions').select('*').order('created_at', { ascending: false });

                let finalPetitions: any[] = [];
                if (petData && !error) {
                    finalPetitions = [...petData];
                }
                setPetitions(finalPetitions);
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

            // Audio & Toast & Particles
            playSuccess();
            fireParticles();
            setToastMessage(`Pledged ${pledgeAmount} SP successfully.`);
            setTimeout(() => setToastMessage(null), 3000);

        } catch (err) {
            console.error("Pledge failed:", err);
            playError();
            setToastMessage("An error occurred while pledging.");
            setTimeout(() => setToastMessage(null), 3000);
        } finally {
            setIsPledging(false);
        }
    };

    const handleExecuteOffering = async () => {
        if (!userAuth || offeringAmount <= 0) return;

        setIsProcessingOffering(true);
        try {
            // Simulated payment processor success
            await new Promise(resolve => setTimeout(resolve, 1500));

            // 1. Update Escrow Balance
            const currentEscrow = typeof escrow === 'string' ? parseFloat(escrow.replace(/,/g, '')) : Number(escrow);
            const newEscrow = currentEscrow + offeringAmount;

            await supabase.from('treasury_escrow').update({ balance_usd: newEscrow }).eq('id', 1); // Assuming ID 1 for global escrow

            // 2. Log Transaction
            await supabase.from('transactions').insert([{
                profile_id: userAuth.id,
                amount: offeringAmount, // Positive because it's a deposit
                transaction_type: 'OFFERING',
                description: `Fiat Offering to The Pool`
            }]);

            // 3. Grant SP Bonus (e.g., 10x fiat amount as a bonus for supporting the treasury)
            if (profile) {
                const spBonus = offeringAmount * 10;
                await supabase.from('profiles').update({ soul_power: profile.soul_power + spBonus }).eq('id', userAuth.id);
                setProfile({ ...profile, soul_power: profile.soul_power + spBonus });
            }

            setEscrow(newEscrow);
            setIsMakingOffering(false);
            setOfferingAmount(0);

            playSuccess();
            fireParticles();
            setToastMessage(`Offering successful. Voids aligned.`);
            setTimeout(() => setToastMessage(null), 3000);

        } catch (err) {
            console.error("Offering failed:", err);
            playError();
            setToastMessage("Offering failed.");
            setTimeout(() => setToastMessage(null), 3000);
        } finally {
            setIsProcessingOffering(false);
        }
    };

    const handleRequestAid = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userAuth) return;
        setIsSubmittingAid(true);
        try {
            const amount = parseFloat(requestAmount);
            if (isNaN(amount) || amount <= 0) throw new Error("Invalid request amount.");

            const { data, error } = await supabase.from('petitions').insert([{
                requester_id: userAuth.id,
                title: requestTitle,
                description: requestDescription,
                amount_requested: amount,
                status: 'Consensus Building',
                sp_goal: amount * 10, // heuristic: SP goal is 10x USD amount
                sp_pledged: 0,
                backer_count: 0,
                consensus_percentage: 0
            }]).select();

            if (error) throw error;

            if (data && data.length > 0) {
                setPetitions([data[0], ...petitions]);
            }

            setIsRequestingAid(false);
            setRequestTitle('');
            setRequestAmount('');
            setRequestDescription('');
            alert('Your petition for aid has been submitted to The Pool.');
        } catch (err: any) {
            console.error("Aid request failed:", err);
            alert("Error: " + err.message);
        } finally {
            setIsSubmittingAid(false);
        }
    };

    const handleAdminAction = async (petitionId: string, newStatus: string) => {
        if (!userAuth || !isAdmin) return;

        try {
            const { error } = await supabase.from('petitions')
                .update({ status: newStatus })
                .eq('id', petitionId);

            if (error) throw error;

            setPetitions(petitions.map(p =>
                p.id === petitionId ? { ...p, status: newStatus } : p
            ));

        } catch (err: any) {
            console.error("Admin action failed:", err);
            playError();
            alert("Error updating petition status: " + err.message);
        }
    };

    const handleAdminErase = async (petitionId: string) => {
        if (!userAuth || !isAdmin) return;

        if (!confirm("Are you sure you want to completely erase this petition from The Pool?")) return;

        try {
            const { error } = await supabase.from('petitions')
                .delete()
                .eq('id', petitionId);

            if (error) throw error;

            setPetitions(petitions.filter(p => p.id !== petitionId));

            // Audio & visual fallback
            playSuccess();

        } catch (err: any) {
            console.error("Admin erase failed:", err);
            playError();
            alert("Error erasing petition: " + err.message);
        }
    };

    // Deprecated static derived formatting (Handled by GSAP now)
    const formattedEscrow = typeof escrow === 'number'
        ? escrow.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : escrow;

    // Expandable Petition State
    const [expandedPetitions, setExpandedPetitions] = useState<Record<string, boolean>>({});

    const togglePetitionExpanded = (id: string) => {
        playHover();
        setExpandedPetitions(prev => ({
            ...prev,
            [id]: !prev[id]
        }));
    };

    return (
        <div className="relative min-h-screen bg-black text-white selection:bg-orange-500/30 font-sans flex flex-col items-center overflow-x-hidden">
            {/* Background - The Treasury uses the custom pool void asset with Parallax */}
            <div ref={bgRef} className="fixed inset-0 z-0 bg-[url('https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/the_pool.png')] bg-cover bg-center brightness-50 contrast-125 scale-110 pointer-events-none"></div>

            {/* Header */}
            <header className="sticky top-0 w-full max-w-lg z-50 glass bg-zinc-950/80 backdrop-blur-xl px-6 py-4 flex justify-between items-center border-b border-orange-500/10">
                <button onClick={() => router.push('/sanctum')} className="text-orange-500 hover:text-white transition-colors group">
                    <ArrowLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </button>
                <div className="flex flex-col items-center">
                    <span className="font-ritual text-sm font-bold tracking-widest text-white leading-none drop-shadow-md">
                        THE POOL
                    </span>
                    <div className="flex items-center gap-2 mt-1 px-3 py-0.5 bg-black/50 border border-orange-500/30 rounded-full shadow-[0_0_10px_rgba(234,88,12,0.2)]">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_5px_#22c55e]"></div>
                        <span className="text-[9px] text-green-400 font-mono uppercase tracking-widest font-bold">
                            {profile?.soul_power !== undefined ? `${profile.soul_power} SP` : 'SYNCING MATRIX...'}
                        </span>
                    </div>
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
                            {/* Geometric 3D Escrow Node */}
                            <div className="w-12 h-12 relative [perspective:1000px] shrink-0 mr-2">
                                <div ref={escrowObjRef} className="w-full h-full relative [transform-style:preserve-3d]">
                                    {/* 3D Wireframe Cube Faces */}
                                    <div className="absolute inset-0 border border-orange-500/50 bg-orange-500/10 [transform:translateZ(24px)] flex items-center justify-center shadow-[0_0_15px_rgba(234,88,12,0.4)]"></div>
                                    <div className="absolute inset-0 border border-orange-500/50 bg-orange-500/10 [transform:translateZ(-24px)] flex items-center justify-center"></div>
                                    <div className="absolute inset-0 border border-orange-500/50 bg-orange-500/10 [transform:translateY(24px)_rotateX(90deg)] flex items-center justify-center"></div>
                                    <div className="absolute inset-0 border border-orange-500/50 bg-orange-500/10 [transform:translateY(-24px)_rotateX(-90deg)] flex items-center justify-center"></div>
                                    <div className="absolute inset-0 border border-orange-500/50 bg-orange-500/10 [transform:translateX(24px)_rotateY(90deg)] flex items-center justify-center"></div>
                                    <div className="absolute inset-0 border border-orange-500/50 bg-orange-500/10 [transform:translateX(-24px)_rotateY(-90deg)] flex items-center justify-center"></div>
                                    {/* Core Flame */}
                                    <div className="absolute inset-0 flex items-center justify-center [transform:translateZ(0px)]">
                                        <Flame className="w-6 h-6 text-orange-400 drop-shadow-[0_0_10px_#f97316] animate-pulse" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <h2 className="text-[10px] text-gray-500 font-mono uppercase tracking-widest">Global Escrow</h2>
                                <h3 ref={escrowDisplayRef} className="font-ritual text-2xl text-white tracking-widest leading-none mt-1">$0.00</h3>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="block text-[8px] text-green-500/80 font-mono uppercase tracking-widest px-2 py-1 bg-green-500/10 rounded border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                                SECURE
                            </span>
                        </div>
                    </div>

                    <p className="text-xs text-gray-400 font-mono leading-relaxed mt-4">
                        The Pool sustains the Obsidian Void. Funds are held in escrow and distributed via sovereign consensus.
                    </p>

                    <div className="mt-6 flex gap-3">
                        <button
                            onMouseEnter={playHover}
                            onClick={() => setIsMakingOffering(true)}
                            className="flex-1 bg-gradient-to-r from-orange-600 to-orange-800 text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-orange-900/40 hover:scale-[1.02] transition-transform"
                        >
                            Make Offering
                        </button>
                        <button
                            onMouseEnter={playHover}
                            onClick={() => setIsRequestingAid(true)}
                            className="flex-1 glass bg-white/5 border border-white/10 text-white font-bold py-3 rounded-xl text-[10px] uppercase tracking-[0.2em] hover:bg-white/10 transition-colors"
                        >
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

                    <div className="space-y-4" ref={mainContainerRef}>
                        {petitions.map((pet, index) => (
                            <div
                                key={pet.id}
                                ref={el => { cardsRef.current[index] = el }}
                                onMouseMove={(e) => !pet.isExample && handleCardMouseMove(e, index)}
                                onMouseLeave={() => !pet.isExample && handleCardMouseLeave(index)}
                                className={`glass bg-white/5 border ${pet.status === 'Consensus Reached' || pet.status === 'Disbursed' ? 'border-green-500/20 opacity-70' : 'border-white/5'} ${pet.isExample ? 'opacity-30 grayscale pointer-events-none' : 'hover:border-orange-500/30 transition-colors'} rounded-2xl p-5 relative group [transform-style:preserve-3d]`}
                            >
                                {pet.isExample && (
                                    <div className="absolute inset-0 flex items-center justify-center z-10 overflow-hidden rounded-2xl pointer-events-none">
                                        <span className="text-4xl md:text-6xl font-ritual tracking-[0.5em] text-white/10 rotate-[-15deg] select-none mix-blend-overlay drop-shadow-lg">EXAMPLE</span>
                                    </div>
                                )}
                                {/* We keep overflow-hidden off the main wrapper so 3D children can pop, but we use a psuedo element for background boundaries if needed. For now it's fine. */}
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
                                    <div className="space-y-2 mt-4">
                                        <div className="flex justify-between text-[9px] font-mono">
                                            <span className="text-gray-500 uppercase">Consensus ({pet.sp_pledged || 0} / {pet.sp_goal || 10000} SP)</span>
                                            <span className="text-orange-500 font-bold">{pet.consensus_percentage || 0}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-black/50 rounded-full overflow-hidden relative">
                                            <div
                                                className="absolute top-0 left-0 h-full bg-gradient-to-r from-orange-600 via-amber-500 to-yellow-300 transition-all duration-1000 shadow-[0_0_10px_rgba(245,158,11,0.5)]"
                                                style={{ width: `${pet.consensus_percentage || 0}%` }}
                                            >
                                                {/* Flare */}
                                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full blur-md opacity-50 mix-blend-overlay"></div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2 mt-4 pt-2">
                                            <button
                                                onMouseEnter={playHover}
                                                onClick={() => setSelectedPetition(pet)}
                                                className="flex-1 py-2.5 bg-orange-500/10 border border-orange-500/30 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-orange-500/20 hover:border-orange-500 transition-all text-orange-400 group-hover:text-orange-300"
                                            >
                                                Vote to Align
                                            </button>
                                            {pet.description && (
                                                <button
                                                    onMouseEnter={playHover}
                                                    onClick={() => togglePetitionExpanded(pet.id)}
                                                    className="px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                                    title="View Lore"
                                                >
                                                    <ChevronRight className={`w-4 h-4 transition-transform duration-300 ${expandedPetitions[pet.id] ? 'rotate-90 text-orange-500' : ''}`} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Expanded Lore Section */}
                                {expandedPetitions[pet.id] && pet.description && (
                                    <div className="mt-4 pt-4 border-t border-white/10 animate-fade-in relative">
                                        <div className="absolute -left-5 top-4 w-1 h-8 bg-orange-500/50 rounded-r"></div>
                                        <h5 className="text-[10px] font-mono uppercase tracking-widest text-orange-500/80 mb-2">Architect's Dossier</h5>
                                        <p className="text-xs text-gray-300 font-mono leading-relaxed whitespace-pre-wrap">{pet.description}</p>
                                    </div>
                                )}

                                {isAdmin && (
                                    <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                                        <button
                                            onClick={() => handleAdminAction(pet.id, 'Disbursed')}
                                            className="flex-1 py-1.5 bg-green-900/30 border border-green-500/30 rounded text-[9px] text-green-400 font-bold uppercase tracking-widest hover:bg-green-900/50"
                                        >
                                            Disburse
                                        </button>
                                        <button
                                            onClick={() => handleAdminAction(pet.id, 'Rejected')}
                                            className="flex-1 py-1.5 bg-red-900/30 border border-red-500/30 rounded text-[9px] text-red-400 font-bold uppercase tracking-widest hover:bg-red-900/50"
                                        >
                                            Reject
                                        </button>
                                        <button
                                            onClick={() => handleAdminErase(pet.id)}
                                            className="flex-1 py-1.5 bg-zinc-900/50 border border-zinc-500/30 rounded text-[9px] text-zinc-400 font-bold uppercase tracking-widest hover:bg-red-900/80 hover:text-red-400 hover:border-red-500/50 transition-colors"
                                            title="Erase from Void"
                                        >
                                            Erase
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
                                    className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-orange-800 rounded-xl text-[10px] uppercase tracking-widest font-bold text-white shadow-lg disabled:opacity-50 transition-transform active:scale-95 flex items-center justify-center gap-2 relative overflow-hidden group"
                                >
                                    <div className="absolute inset-0 bg-white/20 translate-y-[100%] group-hover:translate-y-0 transition-transform duration-300"></div>
                                    <span className="relative z-10">{isPledging ? 'Processing...' : 'Confirm Pledge'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Make Offering Modal */}
            {isMakingOffering && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-zinc-950 border border-orange-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_0_50px_rgba(234,88,12,0.15)] animate-fade-in relative">
                        {/* Decorative glow */}
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>

                        <div className="p-6">
                            <h3 className="font-ritual text-2xl text-white tracking-widest mb-1">OFFERING</h3>
                            <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase mb-6">Deposit fiat into the Global Escrow.</p>

                            <div className="bg-black/50 rounded-xl p-4 mb-6 border border-white/5">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-[9px] uppercase tracking-widest text-gray-500">Amount (USD)</span>
                                </div>
                                <div className="relative">
                                    <DollarSign className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500/50" />
                                    <input
                                        type="number"
                                        value={offeringAmount || ''}
                                        onChange={(e) => setOfferingAmount(Number(e.target.value))}
                                        placeholder="0"
                                        className="w-full bg-transparent border-b border-green-500/50 text-3xl font-mono text-white py-2 pl-6 focus:outline-none focus:border-green-500 transition-colors placeholder:text-zinc-800"
                                    />
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[9px] font-mono text-orange-500/80">
                                        +{offeringAmount * 10 || 0} SP BONUS
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    {[50, 100, 500].map(amt => (
                                        <button
                                            key={amt}
                                            onMouseEnter={playHover}
                                            onClick={() => setOfferingAmount(amt)}
                                            className="flex-1 py-1.5 bg-white/5 hover:bg-green-500/20 border border-white/10 hover:border-green-500/50 rounded text-[9px] font-mono text-gray-300 transition-colors"
                                        >
                                            +${amt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setIsMakingOffering(false); setOfferingAmount(0); }}
                                    className="flex-1 py-3 text-[10px] uppercase tracking-widest font-bold text-gray-500 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleExecuteOffering}
                                    disabled={isProcessingOffering || offeringAmount <= 0}
                                    className="flex-1 py-3 bg-gradient-to-r from-green-700 to-green-900 rounded-xl text-[10px] uppercase tracking-widest font-bold text-white shadow-lg disabled:opacity-50 transition-transform active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isProcessingOffering ? 'Processing...' : 'Confirm Deposit'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Request Aid Modal */}
            {isRequestingAid && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-zinc-950 border border-orange-500/30 rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_0_50px_rgba(234,88,12,0.15)] animate-fade-in relative">
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-orange-500 to-transparent"></div>

                        <div className="p-6">
                            <h3 className="font-ritual text-2xl text-white tracking-widest mb-1">REQUEST AID</h3>
                            <p className="text-[10px] text-gray-400 font-mono tracking-widest uppercase mb-6">Submit a petition to The Pool.</p>

                            <form onSubmit={handleRequestAid} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Petition Title</label>
                                    <input
                                        required
                                        value={requestTitle}
                                        onChange={(e) => setRequestTitle(e.target.value)}
                                        placeholder="e.g. Studio Infrastructure"
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 transition-colors"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Requested Amount (USD)</label>
                                    <input
                                        required
                                        type="number"
                                        step="0.01"
                                        value={requestAmount}
                                        onChange={(e) => setRequestAmount(e.target.value)}
                                        placeholder="0.00"
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 transition-colors font-mono"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] uppercase font-mono tracking-widest text-gray-500">Justification</label>
                                    <textarea
                                        required
                                        value={requestDescription}
                                        onChange={(e) => setRequestDescription(e.target.value)}
                                        rows={3}
                                        placeholder="Explain the necessity of this aid..."
                                        className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 transition-colors resize-none"
                                    ></textarea>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsRequestingAid(false)}
                                        className="flex-1 py-3 text-[10px] uppercase tracking-widest font-bold text-gray-500 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmittingAid}
                                        className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-orange-800 rounded-xl text-[10px] uppercase tracking-widest font-bold text-white shadow-lg disabled:opacity-50 transition-transform active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        {isSubmittingAid ? 'Submitting...' : 'Lodge Petition'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Toast Layer */}
            {toastMessage && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] animate-fade-in">
                    <div className="glass bg-zinc-950/90 border border-orange-500/50 rounded-full px-6 py-3 flex items-center gap-3 shadow-[0_0_30px_rgba(234,88,12,0.3)] backdrop-blur-md">
                        <Zap className="w-4 h-4 text-orange-500 animate-pulse" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-white">{toastMessage}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
