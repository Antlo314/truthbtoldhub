'use client';

/**
 * The Mark — pick a cell, paint, leave one mark this calendar year.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { useTruthOs } from '@/components/truthos/truthOsStore';
import { isAdminEmail } from '@/lib/adminEmails';
import {
    WALL_CELLS,
    WALL_YEAR,
    clipCaption,
    type WallFace,
    type WallMark,
} from '@/lib/truthos/wall';

const PALETTE = ['#34d399', '#fbbf24', '#f87171', '#60a5fa', '#c084fc', '#f472b6', '#f5f5f4', '#0a0a0a'];
const SIZE = 256;

type Tool = 'brush' | 'marker' | 'eraser';

async function authHeader(): Promise<HeadersInit> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' };
}

export default function WallPanel({ onClose }: { onClose: () => void }) {
    const year = WALL_YEAR();
    const email = useTruthOs((s) => s.sessionEmail);
    const isAdmin = isAdminEmail(email);
    const setAuthPrompt = useTruthOs((s) => s.setAuthPrompt);
    const profile = useSoulStore((s) => s.profile);
    const [marks, setMarks] = useState<WallMark[]>([]);
    const [mine, setMine] = useState(false);
    const [pick, setPick] = useState<{ face: WallFace; col: number; row: number } | null>(null);
    const [color, setColor] = useState(PALETTE[0]);
    const [tool, setTool] = useState<Tool>('brush');
    const [size, setSize] = useState(8);
    const [caption, setCaption] = useState(profile?.display_name || '');
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);
    const [done, setDone] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);

    const taken = (face: WallFace, col: number, row: number) =>
        marks.some((m) => m.face === face && m.col === col && m.row === row);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const res = await fetch('/api/wall');
                const json = await res.json();
                if (alive) setMarks(json.marks ?? []);
            } catch {
                if (alive) setMarks([]);
            }
            const headers = await authHeader();
            if (!('Authorization' in headers)) return;
            try {
                const me = await fetch('/api/wall/me', { headers });
                const json = await me.json();
                if (alive) setMine(!!json.marked);
            } catch {
                /* */
            }
        })();
        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        const c = canvasRef.current;
        if (!c || !pick) return;
        c.width = SIZE;
        c.height = SIZE;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#e8e0d4';
        ctx.fillRect(0, 0, SIZE, SIZE);
    }, [pick]);

    const paint = (e: React.PointerEvent) => {
        const c = canvasRef.current;
        const ctx = c?.getContext('2d');
        if (!c || !ctx) return;
        const r = c.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width) * SIZE;
        const y = ((e.clientY - r.top) / r.height) * SIZE;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = tool === 'marker' ? size * 2.2 : size;
        ctx.strokeStyle = tool === 'eraser' ? '#e8e0d4' : color;
        ctx.globalCompositeOperation = 'source-over';
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
    };

    const commit = useCallback(async () => {
        if (!pick || !email) {
            setAuthPrompt(true);
            return;
        }
        const c = canvasRef.current;
        if (!c) return;
        setBusy(true);
        setErr(null);
        try {
            const png = c.toDataURL('image/png');
            const headers = await authHeader();
            const res = await fetch('/api/wall', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    face: pick.face,
                    col: pick.col,
                    row: pick.row,
                    png,
                    caption: clipCaption(caption || profile?.display_name || 'Soul'),
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                setErr(json.error || 'Could not leave the mark.');
                return;
            }
            sacredUi.access();
            setDone(true);
            setMine(true);
        } catch {
            setErr('The wall did not take the mark.');
        } finally {
            setBusy(false);
        }
    }, [pick, email, caption, profile?.display_name, setAuthPrompt]);

    return (
        <div className="fixed inset-0 z-[55] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <button type="button" className="absolute inset-0 bg-black/80" aria-label="Close" onClick={onClose} />
            <div className="relative w-full sm:max-w-3xl h-[min(94dvh,820px)] bg-[#0c0b09] border border-amber-400/20 sm:rounded-2xl overflow-hidden flex flex-col shadow-2xl">
                <header className="shrink-0 flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10">
                    <div>
                        <p className="text-[10px] uppercase tracking-[0.3em] font-mono text-amber-300/80">The Mark · {year}</p>
                        <h2 className="text-white font-semibold text-lg leading-tight">One mark a year. It stays.</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-3 py-1.5 rounded-lg border border-white/15 text-[10px] uppercase tracking-widest text-white/60 hover:text-white"
                    >
                        Close
                    </button>
                </header>

                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
                    {done ? (
                        <div className="space-y-4 py-6 text-center">
                            <p className="text-amber-200 text-lg font-medium">Your mark is on the wall.</p>
                            <p className="text-sm text-white/50">Come back January 1. Sit in The Hall, or tend the Word tomorrow.</p>
                            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                <a
                                    href="/archive"
                                    onClick={() => sacredUi.click()}
                                    className="px-4 py-3 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-100 text-sm min-h-[44px]"
                                >
                                    Sit in The Hall
                                </a>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-3 rounded-xl border border-white/15 text-white/80 text-sm min-h-[44px]"
                                >
                                    Stay in the house
                                </button>
                            </div>
                        </div>
                    ) : pick ? (
                        <div className="space-y-3">
                            <button
                                type="button"
                                onClick={() => setPick(null)}
                                className="text-[11px] text-white/50 hover:text-white"
                            >
                                ← another cell
                            </button>
                            <canvas
                                ref={canvasRef}
                                className="w-full max-w-[280px] mx-auto aspect-square rounded-lg border border-white/15 touch-none bg-[#e8e0d4] cursor-crosshair"
                                onPointerDown={(e) => {
                                    drawing.current = true;
                                    (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
                                    const ctx = canvasRef.current?.getContext('2d');
                                    ctx?.beginPath();
                                    paint(e);
                                }}
                                onPointerMove={(e) => {
                                    if (drawing.current) paint(e);
                                }}
                                onPointerUp={() => {
                                    drawing.current = false;
                                }}
                            />
                            <div className="flex flex-wrap gap-1.5 justify-center">
                                {PALETTE.map((p) => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => {
                                            setColor(p);
                                            setTool('brush');
                                        }}
                                        className={`w-8 h-8 rounded-full border ${color === p ? 'border-white scale-110' : 'border-white/20'}`}
                                        style={{ background: p }}
                                        aria-label={p}
                                    />
                                ))}
                                <label className="w-8 h-8 rounded-full border border-white/20 overflow-hidden">
                                    <input
                                        type="color"
                                        value={color}
                                        onChange={(e) => setColor(e.target.value)}
                                        className="w-12 h-12 -m-2 cursor-pointer"
                                    />
                                </label>
                            </div>
                            <div className="flex flex-wrap gap-2 justify-center text-[11px]">
                                {(['brush', 'marker', 'eraser'] as Tool[]).map((t) => (
                                    <button
                                        key={t}
                                        type="button"
                                        onClick={() => setTool(t)}
                                        className={`px-3 py-2 rounded-lg border min-h-[40px] ${
                                            tool === t ? 'border-amber-300/50 text-amber-100' : 'border-white/12 text-white/60'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                                <label className="flex items-center gap-2 text-white/50 px-2">
                                    size
                                    <input
                                        type="range"
                                        min={2}
                                        max={28}
                                        value={size}
                                        onChange={(e) => setSize(Number(e.target.value))}
                                    />
                                </label>
                            </div>
                            <input
                                value={caption}
                                onChange={(e) => setCaption(e.target.value.slice(0, 24))}
                                maxLength={24}
                                placeholder="Your name under the paint"
                                className="w-full max-w-sm mx-auto block px-3 py-2 rounded-lg bg-white/5 border border-white/12 text-sm text-white"
                            />
                            {err && <p className="text-center text-rose-300 text-sm">{err}</p>}
                            <button
                                type="button"
                                disabled={busy || mine}
                                onClick={() => void commit()}
                                className="w-full max-w-sm mx-auto block py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-black font-semibold text-sm disabled:opacity-40 min-h-[48px]"
                            >
                                {mine ? 'You already marked this year' : busy ? 'Leaving…' : 'Leave mark'}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <p className="text-sm text-white/55">
                                {email
                                    ? mine
                                        ? 'Your year is spent. Walk the mural — January 1 it opens again.'
                                        : 'Choose a small empty section.'
                                    : 'Sign in to paint. Looking is free.'}
                            </p>
                            {!email && (
                                <button
                                    type="button"
                                    onClick={() => setAuthPrompt(true)}
                                    className="px-4 py-2 rounded-lg bg-white text-black text-sm font-semibold"
                                >
                                    Sign in
                                </button>
                            )}
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(18px,1fr))] gap-0.5">
                                {WALL_CELLS.map((c) => {
                                    const fill = marks.find((m) => m.face === c.face && m.col === c.col && m.row === c.row);
                                    const locked = mine || !email;
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            title={
                                                fill
                                                    ? `${fill.caption || 'mark'}${isAdmin ? ' · click to hide' : ''}`
                                                    : c.id
                                            }
                                            disabled={!!fill || locked}
                                            onClick={() => {
                                                if (fill) {
                                                    if (!isAdmin) return;
                                                    void (async () => {
                                                        const headers = await authHeader();
                                                        await fetch('/api/wall/hide', {
                                                            method: 'POST',
                                                            headers,
                                                            body: JSON.stringify({ face: c.face, col: c.col, row: c.row }),
                                                        });
                                                        setMarks((prev) =>
                                                            prev.filter(
                                                                (m) =>
                                                                    !(m.face === c.face && m.col === c.col && m.row === c.row),
                                                            ),
                                                        );
                                                    })();
                                                    return;
                                                }
                                                if (locked) return;
                                                sacredUi.click();
                                                setPick({ face: c.face, col: c.col, row: c.row });
                                            }}
                                            className={`aspect-square rounded-[2px] border ${
                                                fill
                                                    ? fill.goldFrame
                                                        ? 'border-amber-300 bg-amber-200/80'
                                                        : 'border-white/20 bg-white/30'
                                                    : locked
                                                      ? 'border-white/5 bg-white/[0.03]'
                                                      : 'border-amber-300/40 bg-amber-400/10 hover:bg-amber-400/25'
                                            }`}
                                            style={
                                                fill
                                                    ? { backgroundImage: `url(${fill.png})`, backgroundSize: 'cover' }
                                                    : undefined
                                            }
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
