'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import gsap from 'gsap';
import { Sparkles, Mic, Radio, X } from 'lucide-react';

export default function Oracle() {
    const [isOpen, setIsOpen] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [convo, setConvo] = useState<{ role: string, text: string }[]>([]);

    const orbRef = useRef<HTMLDivElement>(null);
    const ringRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();

    // Orb idling animation
    useEffect(() => {
        if (!orbRef.current || !ringRef.current) return;

        gsap.to(orbRef.current, {
            y: -10,
            duration: 2,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });

        gsap.to(ringRef.current, {
            rotation: 360,
            duration: 10,
            repeat: -1,
            ease: "linear"
        });
    }, []);

    // React to thinking state
    useEffect(() => {
        if (!orbRef.current) return;
        if (isThinking) {
            gsap.to(orbRef.current, {
                scale: 1.15,
                boxShadow: "0 0 40px rgba(168, 85, 247, 0.8)",
                duration: 0.4,
                repeat: -1,
                yoyo: true,
                ease: "power1.inOut"
            });
        } else {
            gsap.to(orbRef.current, {
                scale: 1,
                boxShadow: "0 0 20px rgba(168, 85, 247, 0.3)",
                duration: 1,
                ease: "power2.out"
            });
        }
    }, [isThinking]);

    const handleAsk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!textInput.trim() || isThinking) return;

        const newQuery = textInput;
        setConvo(prev => [...prev, { role: 'user', text: newQuery }]);
        setTextInput('');
        setIsThinking(true);

        // Provide conversational context based on current path
        const contextMap: any = {
            '/': 'You are at the threshold of the Obsidian Void.',
            '/sanctum': 'This is the Sanctum Hub. The central nervous system of our platform.',
            '/codex': 'Welcome to The Codex. A live communication layer for the community.',
            '/cineworks': 'You are currently browsing Cineworks. Observe our film architecture.',
            '/treasury': 'This is The Pool. Our collective treasury and petition system.',
            '/self': 'You are viewing your Soul Matrix. Your identity and power are verified here.'
        };

        const pageContext = contextMap[pathname] || 'You are traversing the unknown regions of the Sanctum.';

        try {
            const res = await fetch('/api/oracle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: newQuery,
                    context: pageContext,
                    history: convo.slice(-4)
                }),
            });
            const data = await res.json();
            setConvo(prev => [...prev, { role: 'oracle', text: data.message }]);
        } catch (error) {
            setConvo(prev => [...prev, { role: 'oracle', text: "My connection to the æther is unstable right now." }]);
        } finally {
            setIsThinking(false);
        }
    };

    return (
        <div className="fixed mb-12 sm:mb-0 bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-none">

            {/* Oracle Terminal UI */}
            {isOpen && (
                <div
                    ref={panelRef}
                    className="mb-6 w-80 md:w-96 h-[400px] glass bg-black/80 border border-purple-500/30 rounded-3xl p-4 flex flex-col pointer-events-auto shadow-[0_0_50px_rgba(168,85,247,0.15)] origin-bottom-right animate-in fade-in zoom-in duration-300"
                >
                    <div className="flex justify-between items-center mb-4 border-b border-purple-500/20 pb-2">
                        <div className="flex items-center gap-2 text-purple-400">
                            <Sparkles className="w-4 h-4" />
                            <span className="font-ritual uppercase tracking-widest text-sm text-white">The Oracle</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-hide">
                        {convo.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-2">
                                <Radio className="w-8 h-8 text-purple-500 animate-pulse" />
                                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Connect to the Artificial Intelligence.<br />Awaiting Input.</p>
                            </div>
                        ) : (
                            convo.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'oracle' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-2xl text-xs sm:text-sm font-sans ${msg.role === 'oracle' ? 'bg-purple-900/30 border border-purple-500/20 text-purple-100' : 'bg-white/10 text-white border border-white/5'}`}>
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
                            className="flex-1 bg-black/50 border border-purple-500/20 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-purple-500 transition-colors"
                        />
                        <button type="submit" className="bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/50 text-purple-300 px-4 rounded-xl transition-colors flex items-center justify-center">
                            <Mic className="w-4 h-4" />
                        </button>
                    </form>
                </div>
            )}

            {/* The Orb */}
            <div className="relative pointer-events-auto cursor-pointer group" onClick={() => setIsOpen(!isOpen)}>
                {/* Rotating ring */}
                <div ref={ringRef} className="absolute -inset-2 rounded-full border border-purple-500/30 border-t-purple-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                {/* Orb Core */}
                <div
                    ref={orbRef}
                    className="w-14 h-14 rounded-full bg-gradient-to-tr from-purple-900 via-purple-600 to-fuchsia-400 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.3)] backdrop-blur-md"
                >
                    <div className="w-8 h-8 rounded-full bg-white/20 blur-[2px] absolute top-2 left-2 mix-blend-overlay pointer-events-none"></div>
                    <Sparkles className="w-6 h-6 text-white/90 drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]" />
                </div>
            </div>
        </div>
    );
}
