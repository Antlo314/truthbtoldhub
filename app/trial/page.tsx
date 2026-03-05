'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, Terminal, Lock, Unlock } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { Howl } from 'howler';

// Sounds
let typeSfx: any = null;
let accessGrantedSfx: any = null;
let accessDeniedSfx: any = null;

if (typeof window !== 'undefined') {
    typeSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/hover_tech_01.mp3'], volume: 0.1 });
    accessGrantedSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/confirm_deep.mp3'], volume: 0.4 });
    accessDeniedSfx = new Howl({ src: ['https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/sfx/error_buzz.mp3'], volume: 0.3 });
}

export default function TheTrial() {
    const router = useRouter();
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<string[]>([
        "OBSIDIAN VOID OS v9.9.0",
        "CONNECTING TO THE SANCTUM MAINFRAME...",
        "CONNECTION ESTABLISHED.",
        "WARNING: UNAUTHORIZED ENTITY DETECTED.",
        "CIPHER REQUIRED.",
        "RIDDLE: 'I am the motion of the awakened. To escape the gravity of the matrix and claim the sky, what must you do?'"
    ]);
    const [isGranted, setIsGranted] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        gsap.from(containerRef.current, {
            opacity: 0,
            y: 50,
            duration: 1.5,
            ease: "power3.out"
        });
    }, []);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history]);

    const handleCommand = (e: React.FormEvent) => {
        e.preventDefault();
        const cmd = input.trim().toUpperCase();
        if (!cmd) return;

        typeSfx?.play();
        setHistory(prev => [...prev, `> ${cmd}`]);
        setInput('');

        setTimeout(() => {
            if (cmd === 'ASCEND') {
                accessGrantedSfx?.play();
                setHistory(prev => [...prev, "[ SYSTEM ] CIPHER ACCEPTED. TIER UPGRADE AUTHORIZED.", "[ SYSTEM ] WELCOME TO THE ARCHITECT CHAMBER."]);
                setIsGranted(true);
                setTimeout(() => {
                    router.push('/self'); // Send them to Soul Matrix after ascension
                }, 3000);
            } else if (cmd === 'HELP') {
                setHistory(prev => [...prev, "Available Commands: HELP, CLEAR, [REDACTED]"]);
            } else if (cmd === 'CLEAR') {
                setHistory(["OBSIDIAN VOID OS v9.9.0"]);
            } else {
                accessDeniedSfx?.play();
                setHistory(prev => [...prev, `ERR: Command '${cmd}' not recognized or authorized.`]);
            }
        }, 500);
    };

    return (
        <div className="min-h-screen bg-black text-green-500 font-mono p-4 md:p-8 flex flex-col justify-center items-center selection:bg-green-500/30">
            {/* Scanline CRT overlay */}
            <div className="fixed inset-0 pointer-events-none opacity-10 mix-blend-overlay z-50 pointer-events-none" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/black-mamba.png')" }}></div>
            <div className="fixed inset-0 pointer-events-none z-40 block" style={{ backgroundImage: "linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06))", backgroundSize: "100% 4px, 3px 100%" }}></div>

            <div ref={containerRef} className="w-full max-w-3xl glass bg-black/80 border border-green-500/30 rounded-lg p-6 flex flex-col h-[70vh] shadow-[0_0_50px_rgba(34,197,94,0.1)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-green-500/50 shadow-[0_0_20px_rgba(34,197,94,1)] animate-pulse"></div>

                <div className="flex items-center gap-3 border-b border-green-500/30 pb-4 mb-4">
                    <Terminal className="w-6 h-6 text-green-500" />
                    <h1 className="text-xl tracking-widest font-bold">THE TRIAL - INITIATION SEQUENCE</h1>
                    <div className="ml-auto flex items-center gap-2">
                        {isGranted ? <Unlock className="w-5 h-5 text-orange-500" /> : <Lock className="w-5 h-5 text-red-500" />}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 text-sm tracking-wider">
                    {history.map((line, i) => (
                        <div key={i} className={line.includes('ERR:') ? 'text-red-500' : (line.includes('[ SYSTEM ]') || line.includes('WARNING')) ? 'text-orange-500' : 'text-green-500'}>
                            {line}
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>

                {!isGranted && (
                    <form onSubmit={handleCommand} className="mt-4 flex items-center gap-2 border-t border-green-500/30 pt-4">
                        <ChevronRight className="w-5 h-5 text-green-500" />
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-green-500 tracking-widest"
                            autoFocus
                        />
                        <div className="w-2 h-5 bg-green-500 animate-pulse"></div>
                    </form>
                )}
            </div>

            <button onClick={() => router.push('/sanctum')} className="mt-8 text-xs text-gray-500 hover:text-white uppercase tracking-widest font-sans px-4 py-2 border border-gray-800 rounded hover:border-white transition-all z-10">
                ABORT PROTOCOL
            </button>
        </div>
    );
}
