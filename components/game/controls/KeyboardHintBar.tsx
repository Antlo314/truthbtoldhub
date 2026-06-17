'use client';

interface Hint {
    keys: string[];
    label: string;
}

interface Props {
    hints: Hint[];
    className?: string;
}

export default function KeyboardHintBar({ hints, className = '' }: Props) {
    return (
        <div
            className={`pointer-events-none flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-6 py-3 rounded-2xl border border-white/10 bg-black/55 backdrop-blur-md ${className}`}
        >
            {hints.map((h) => (
                <div key={h.label} className="flex items-center gap-2">
                    <div className="flex gap-1">
                        {h.keys.map((k) => (
                            <kbd
                                key={k}
                                className="min-w-[1.65rem] px-1.5 py-0.5 rounded-md border border-white/20 bg-white/10 text-[10px] font-mono font-bold text-zinc-200 text-center"
                            >
                                {k}
                            </kbd>
                        ))}
                    </div>
                    <span className="text-[10px] uppercase tracking-widest text-zinc-400">{h.label}</span>
                </div>
            ))}
        </div>
    );
}