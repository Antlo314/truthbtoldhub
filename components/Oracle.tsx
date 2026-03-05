'use client';
import { useState, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import gsap from 'gsap';
import { Sparkles, Mic, Radio, X, Flame } from 'lucide-react';

export default function Oracle() {
    const [isOpen, setIsOpen] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const [textInput, setTextInput] = useState('');
    const [convo, setConvo] = useState<{ role: string, text: string }[]>([]);

    // Audio ref to prevent overlapping voices
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);

    const orbRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);

    // Cursor Dodging Logic (Smart positioning)
    useEffect(() => {
        if (!isOpen && containerRef.current) {
            const handleMouseMove = (e: MouseEvent) => {
                const rect = containerRef.current?.getBoundingClientRect();
                if (!rect) return;

                // Calculate distance from mouse to the center of the oracle
                const oracleX = rect.left + rect.width / 2;
                const oracleY = rect.top + rect.height / 2;
                const dist = Math.hypot(e.clientX - oracleX, e.clientY - oracleY);

                // If mouse is within 150px, dodge it
                if (dist < 150) {
                    const angle = Math.atan2(oracleY - e.clientY, oracleX - e.clientX);
                    const pushDistance = 150 - dist;
                    const newX = Math.cos(angle) * pushDistance * 1.5;
                    const newY = Math.sin(angle) * pushDistance * 1.5;

                    gsap.to(containerRef.current, {
                        x: newX,
                        y: newY,
                        duration: 0.5,
                        ease: "power2.out"
                    });
                } else {
                    gsap.to(containerRef.current, {
                        x: 0,
                        y: 0,
                        duration: 1.5,
                        ease: "elastic.out(1, 0.3)"
                    });
                }
            };

            window.addEventListener('mousemove', handleMouseMove);
            return () => window.removeEventListener('mousemove', handleMouseMove);
        }
    }, [isOpen]);

    // Sprite Idling animation
    useEffect(() => {
        if (!orbRef.current) return;

        gsap.to(orbRef.current, {
            y: -15,
            rotation: 2,
            duration: 1.5,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    }, []);

    // React to thinking state
    useEffect(() => {
        if (!orbRef.current) return;
        if (isThinking) {
            gsap.to(orbRef.current, {
                scale: 1.2,
                filter: "brightness(1.5)",
                duration: 0.2,
                repeat: -1,
                yoyo: true,
                ease: "power1.inOut"
            });
        } else {
            gsap.to(orbRef.current, {
                scale: 1,
                filter: "brightness(1)",
                duration: 0.5,
                ease: "power2.out"
            });
        }
    }, [isThinking]);

    const highlightDOM = (text: string) => {
        const lower = text.toLowerCase();

        let selectors: string[] = [];
        if (lower.includes('cineworks') || lower.includes('gallery')) {
            selectors.push('a[href="/cineworks"]', 'button[aria-label="cineworks"]');
        }
        if (lower.includes('treasury') || lower.includes('pool')) {
            selectors.push('a[href="/treasury"]');
        }
        if (lower.includes('codex') || lower.includes('whispers')) {
            selectors.push('a[href="/codex"]');
        }
        if (lower.includes('soul matrix') || lower.includes('identity') || lower.includes('profile')) {
            selectors.push('a[href="/self"]', '#tour-profile-btn');
        }
        if (lower.includes('sanctum') || lower.includes('hub')) {
            selectors.push('a[href="/sanctum"]');
        }

        if (selectors.length > 0) {
            const elements = document.querySelectorAll(selectors.join(', '));
            elements.forEach(el => {
                el.classList.add('oracle-highlight');
                // Remove highlight after 4 seconds
                setTimeout(() => {
                    el.classList.remove('oracle-highlight');
                }, 4000);
            });
        }
    };

    const handleAsk = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!textInput.trim() || isThinking) return;

        const newQuery = textInput;
        setConvo(prev => [...prev, { role: 'user', text: newQuery }]);
        setTextInput('');
        setIsThinking(true);

        // Provide conversational context
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

            // Smart Highlighting based on Oracle response
            highlightDOM(data.message);

            // Agentic Navigation
            if (data.route) {
                setTimeout(() => {
                    router.push(data.route);
                }, 1000); // 1s delay for cinematic effect
            }

            // Zero-Lag Neural Voice Playback
            if (data.audio) {
                if (currentAudioRef.current) {
                    currentAudioRef.current.pause();
                }
                const audioBlob = new Blob([Buffer.from(data.audio, 'base64')], { type: 'audio/mpeg' });
                const audioUrl = URL.createObjectURL(audioBlob);
                const audio = new Audio(audioUrl);
                currentAudioRef.current = audio;
                audio.play();

                // Add speaking animation tied to audio
                audio.onplaying = () => {
                    gsap.to(orbRef.current, {
                        scale: 1.1,
                        filter: "brightness(2)",
                        duration: 0.1,
                        yoyo: true,
                        repeat: -1
                    });
                };
                audio.onended = () => {
                    gsap.to(orbRef.current, { scale: 1, filter: "brightness(1)", duration: 0.5 });
                };
            }

        } catch (error) {
            setConvo(prev => [...prev, { role: 'oracle', text: "My connection to the flame is unstable right now." }]);
        } finally {
            setIsThinking(false);
        }
    };

    // Proactive Route Guidance
    useEffect(() => {
        const triggerProactiveGuide = async () => {
            setIsThinking(true);
            setIsOpen(true);

            const contextMap: any = {
                '/': 'Tell the user how to sign up: use their email, and expect a confirmation link in their inbox to verify their Soul. Explain that SP (Sanctum Power) is the future of our ecosystem.',
                '/sanctum': 'They are in the Sanctum Hub. Explain this is the central nervous system holding all pillars together.',
                '/codex': 'They are in The Codex. Explain the live communication layer for the community.',
                '/cineworks': 'They are in Cineworks. Detail the original films and visual archives.',
                '/treasury': 'They are in The Pool. Detail how they can fund petitions using SP.',
                '/self': 'They are in the Soul Matrix. Detail how their identity and power are verified here.',
                '/trial': 'They are in The Trial. Explain this is the initiation sequence to test their cryptographic resolve.'
            };

            const systemInstruction =
                "System Instruction: The user just navigated to a new area. " +
                (contextMap[pathname] || "Give a brief, cryptic 1-sentence greeting.") +
                " Keep your response under 3 sentences.";

            try {
                const res = await fetch('/api/oracle', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message: "System: Proactively greet the user and explain this page based on your knowledge base.",
                        context: systemInstruction,
                        history: convo.slice(-2)
                    }),
                });
                const data = await res.json();

                setConvo(prev => [...prev, { role: 'oracle', text: data.message }]);
                highlightDOM(data.message);

                // Also play audio if it's the first time landing
                if (data.audio) {
                    if (currentAudioRef.current) {
                        currentAudioRef.current.pause();
                    }
                    const audioBlob = new Blob([Buffer.from(data.audio, 'base64')], { type: 'audio/mpeg' });
                    const audioUrl = URL.createObjectURL(audioBlob);
                    const audio = new Audio(audioUrl);
                    currentAudioRef.current = audio;
                    audio.play();

                    audio.onplaying = () => {
                        gsap.to(orbRef.current, {
                            scale: 1.1,
                            filter: "brightness(2)",
                            duration: 0.1,
                            yoyo: true,
                            repeat: -1
                        });
                    };
                    audio.onended = () => {
                        gsap.to(orbRef.current, { scale: 1, filter: "brightness(1)", duration: 0.5 });
                    };
                }

            } catch (error) {
                // Silently fail if they navigate away during fetch
            } finally {
                setIsThinking(false);
            }
        };

        const timer = setTimeout(() => {
            triggerProactiveGuide();
        }, 1500);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    return (
        <div ref={containerRef} className="fixed mb-12 sm:mb-0 bottom-6 right-6 z-[9999] flex flex-col items-end pointer-events-none transition-transform">

            {/* Oracle Terminal UI */}
            {isOpen && (
                <div
                    ref={panelRef}
                    className="mb-6 w-80 md:w-96 h-[400px] glass bg-black/90 border border-orange-500/40 rounded-3xl p-4 flex flex-col pointer-events-auto shadow-[0_0_50px_rgba(249,115,22,0.15)] origin-bottom-right animate-in fade-in zoom-in duration-300"
                >
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
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-2">
                                <Radio className="w-8 h-8 text-orange-500 animate-pulse" />
                                <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Connect to the Flame.<br />Awaiting Input.</p>
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

            {/* Flaming Sprite Core */}
            <div className="relative pointer-events-auto cursor-pointer group mt-2" onClick={() => setIsOpen(!isOpen)}>
                {/* Oracle Sprite rendering */}
                <div
                    ref={orbRef}
                    className="w-16 h-16 relative flex items-center justify-center group-hover:scale-110 transition-transform"
                >
                    <div className="absolute inset-0 bg-orange-600 rounded-full blur-xl opacity-40 animate-pulse mix-blend-screen group-hover:opacity-70 transition-opacity duration-700"></div>
                    <div className="absolute inset-2 bg-yellow-500 rounded-full blur-md opacity-60 animate-bounce mix-blend-screen duration-1000"></div>
                    <div className="relative z-10 w-10 h-10 bg-gradient-to-t from-orange-600 to-yellow-300 rounded-full shadow-[0_0_20px_#f97316] flex items-center justify-center [clip-path:polygon(50%_0%,100%_50%,80%_100%,20%_100%,0%_50%)] animate-pulse">
                        <Flame className="w-6 h-6 text-white drop-shadow-[0_0_5px_#fff]" />
                    </div>
                </div>
            </div>
        </div>
    );
}
