'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import gsap from 'gsap';
import { Sparkles, Mic, Radio, X, Flame, Navigation, Target, Lightbulb } from 'lucide-react';

export default function Oracle() {
    const [isOpen, setIsOpen] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [convo, setConvo] = useState<{ role: string, text: string }[]>([]);

    const [isTouring, setIsTouring] = useState(false);
    const [tourStep, setTourStep] = useState(0);

    const currentAudioRef = useRef<HTMLAudioElement | null>(null);
    const orbRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const router = useRouter();

    const tourFrames = [
        {
            title: "AWAITING INITIATION",
            text: "Welcome to the Obsidian Void. I am The Oracle.",
            action: "Begin Convergence",
            route: "/sanctum"
        },
        {
            title: "THE POOL",
            text: "This is the Treasury. Here, initiates submit petitions for mutual aid. You may fund them using your Soul Power (SP).",
            action: "Acknowledge",
            route: "/treasury"
        },
        {
            title: "THE ARCHIVE",
            text: "The Codex. Our cryptographic ledger. Whispers recorded here are eternal. Speaking requires SP to prevent corruption.",
            action: "Acknowledge",
            route: "/codex"
        },
        {
            title: "CINEWORKS",
            text: "The Gallery of prophetic breakdowns. You can boost these signals by spending SP, directly funding our operations.",
            action: "Acknowledge",
            route: "/cineworks"
        },
        {
            title: "IDENTITY CORE",
            text: "Your Soul Matrix. Copy your Cipher Link here to recruit others into the void. Each echo grants you immense SP. The tour is complete.",
            action: "Enter The Void",
            route: "/self"
        }
    ];

    useEffect(() => {
        if (!orbRef.current) return;
        gsap.to(orbRef.current, {
            y: -15, rotation: 2, duration: 2,
            repeat: -1, yoyo: true, ease: "sine.inOut"
        });
    }, []);

    useEffect(() => {
        if (isThinking && orbRef.current) {
            gsap.to(orbRef.current, { scale: 1.2, filter: "brightness(2)", duration: 0.2, repeat: -1, yoyo: true });
        } else if (orbRef.current) {
            gsap.to(orbRef.current, { scale: 1, filter: "brightness(1)", duration: 0.5 });
        }
    }, [isThinking]);

    const playOracleVoice = (base64Audio: string) => {
        if (currentAudioRef.current) currentAudioRef.current.pause();
        const audioBlob = new Blob([Buffer.from(base64Audio, 'base64')], { type: 'audio/mpeg' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;
        audio.play();
        audio.onplaying = () => gsap.to(orbRef.current, { scale: 1.15, filter: "brightness(2)", duration: 0.1, yoyo: true, repeat: -1 });
        audio.onended = () => gsap.to(orbRef.current, { scale: 1, filter: "brightness(1)", duration: 0.5 });
    };

    const handleAsk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!textInput.trim() || isThinking) return;

        const newQuery = textInput;
        setConvo(prev => [...prev, { role: 'user', text: newQuery }]);
        setTextInput('');
        setIsThinking(true);

        const pageContext = `You are on the ${pathname} path of the Sanctum.`;

        try {
            const res = await fetch('/api/oracle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: newQuery, context: pageContext, history: convo.slice(-4) }),
            });
            const data = await res.json();
            setConvo(prev => [...prev, { role: 'oracle', text: data.message }]);
            if (data.route) setTimeout(() => router.push(data.route), 1000);
            if (data.audio) playOracleVoice(data.audio);
        } catch (error) {
            setConvo(prev => [...prev, { role: 'oracle', text: "Signal lost in the void." }]);
        } finally {
            setIsThinking(false);
        }
    };

    // Auto-Tour detection
    useEffect(() => {
        if (pathname === '/sanctum') {
            const hasToured = localStorage.getItem('oracle_tour_completed');
            if (!hasToured) {
                // Wait slightly for entrance animations to finish, then launch tour
                const t = setTimeout(() => {
                    setIsTouring(true);
                }, 2000);
                return () => clearTimeout(t);
            }
        }
    }, [pathname]);

    const advanceTour = () => {
        if (tourStep < tourFrames.length - 1) {
            const nextStep = tourStep + 1;
            setTourStep(nextStep);
            router.push(tourFrames[nextStep].route);
        } else {
            // End tour
            setIsTouring(false);
            localStorage.setItem('oracle_tour_completed', 'true');
            router.push('/sanctum');
            setIsOpen(true);
            setConvo([{ role: 'oracle', text: 'You have completed the initiation. The Obsidian Void is yours to command.' }]);
            setTimeout(() => setIsOpen(false), 5000);
        }
    };

    return (
        <>
            {/* Holographic Tour Overlay */}
            {isTouring && (
                <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto">
                    {/* Glowing Vignette */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(234,88,12,0.1)_100%)] pointer-events-none"></div>
                    
                    <div className="bg-zinc-950 border border-orange-500/50 p-8 rounded-3xl max-w-lg w-full text-center relative overflow-hidden shadow-[0_0_100px_rgba(234,88,12,0.2)] animate-in zoom-in duration-500">
                        {/* Background flare */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-600/20 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="w-20 h-20 mx-auto bg-orange-950/50 border border-orange-500/50 rounded-full flex items-center justify-center mb-6 relative z-10">
                            <Flame className="w-10 h-10 text-orange-500 drop-shadow-[0_0_15px_#f97316] animate-pulse" />
                        </div>

                        <div className="relative z-10">
                            <h2 className="font-ritual text-3xl tracking-[0.2em] text-white uppercase mb-4">{tourFrames[tourStep].title}</h2>
                            <p className="text-gray-300 font-mono text-sm leading-relaxed tracking-wider mb-8">
                                {tourFrames[tourStep].text}
                            </p>

                            <div className="flex justify-between items-center border-t border-orange-500/20 pt-6 mt-6">
                                <div className="text-[10px] uppercase font-mono tracking-widest text-gray-500 flex items-center gap-2">
                                    <Navigation className="w-3 h-3" /> Step {tourStep + 1} / {tourFrames.length}
                                </div>
                                <button 
                                    onClick={advanceTour}
                                    className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(234,88,12,0.4)] transition-all hover:scale-105 active:scale-95"
                                >
                                    {tourFrames[tourStep].action}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed mb-12 sm:mb-0 bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-none transition-transform">
                
                {isOpen && (
                    <div ref={panelRef} className="mb-6 w-80 md:w-[400px] h-[450px] bg-black/70 backdrop-blur-2xl border border-white/10 rounded-3xl p-4 flex flex-col pointer-events-auto shadow-[0_0_40px_rgba(0,0,0,0.8)] origin-bottom-right animate-in fade-in zoom-in duration-300">
                        <div className="flex justify-between items-center mb-4 border-b border-orange-500/30 pb-2">
                            <div className="flex items-center gap-2 text-orange-400">
                                <Flame className="w-4 h-4" />
                                <span className="font-ritual uppercase tracking-widest text-sm text-white">The Oracle</span>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                            {convo.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-3">
                                    <Lightbulb className="w-8 h-8 text-orange-500 animate-pulse" />
                                    <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest leading-relaxed">I am the architect of your onboarding.<br/>Ask me the way.</p>
                                </div>
                            ) : (
                                convo.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'oracle' ? 'justify-start' : 'justify-end'}`}>
                                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs sm:text-sm font-sans ${msg.role === 'oracle' ? 'bg-orange-950/60 border border-orange-500/30 text-orange-100 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'bg-white/10 text-white border border-white/5'}`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <form onSubmit={handleAsk} className="mt-4 flex gap-2">
                            <input
                                type="text"
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                placeholder="Consult the Oracle..."
                                className="flex-1 bg-black/50 border border-orange-500/30 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-orange-500 transition-colors"
                            />
                            <button type="submit" className="bg-orange-500/20 hover:bg-orange-500/40 border border-orange-500/50 text-orange-300 px-4 rounded-xl transition-colors flex items-center justify-center">
                                <Mic className="w-4 h-4" />
                            </button>
                        </form>
                    </div>
                )}

                <div className="relative pointer-events-auto cursor-pointer group mt-2 flex items-center justify-center" onClick={() => setIsOpen(!isOpen)}>
                    {!isOpen && !isTouring && (
                        <div className="absolute right-full mr-2 md:mr-4 top-1/2 -translate-y-1/2 opacity-70 group-hover:opacity-100 transition-opacity bg-black/80 border border-orange-500/30 text-orange-400 text-[10px] md:text-xs uppercase font-mono tracking-widest px-3 py-1 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.2)] whitespace-nowrap hidden sm:block">
                            Speak to Zion
                        </div>
                    )}
                    <div ref={orbRef} className={`w-16 h-16 relative flex items-center justify-center transition-transform ${isTouring ? 'scale-0' : 'group-hover:scale-110'}`}>
                        <div className="absolute inset-0 bg-orange-600 rounded-full blur-xl opacity-40 animate-pulse mix-blend-screen group-hover:opacity-70 transition-opacity duration-700"></div>
                        <div className="absolute inset-2 bg-yellow-500 rounded-full blur-md opacity-60 animate-bounce mix-blend-screen duration-1000"></div>
                        <div className="relative z-10 w-10 h-10 bg-gradient-to-t from-orange-600 to-yellow-300 rounded-full shadow-[0_0_20px_#f97316] flex items-center justify-center [clip-path:polygon(50%_0%,100%_50%,80%_100%,20%_100%,0%_50%)] animate-pulse">
                            <Flame className="w-6 h-6 text-white drop-shadow-[0_0_5px_#fff]" />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
