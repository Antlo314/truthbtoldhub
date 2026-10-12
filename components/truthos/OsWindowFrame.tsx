'use client';

/**
 * Truth.OS 4 window frame.
 *
 * Desktop: traffic lights, a centred title, drag anywhere on the bar,
 * drag to an edge to snap (halves, quarters, top = fill), hover the green
 * light for the tiling picker, resize from any edge or corner.
 *
 * Phone: every app is full screen under a slim header — Home on the left
 * (the window stays alive, like an app in the background), the title, and
 * Close on the right.
 */
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { motion, useReducedMotion, type MotionStyle } from 'framer-motion';
import { ChevronLeft, X } from 'lucide-react';
import type { OsAppId } from './truthOsStore';

export type SnapZone = 'left' | 'right' | 'tl' | 'tr' | 'bl' | 'br';
type Rect = { x: number; y: number; w: number; h: number };

function zoneRect(zone: SnapZone, ws: { w: number; h: number }): Rect {
    const g = 6;
    const hw = Math.floor((ws.w - g * 3) / 2);
    const hh = Math.floor((ws.h - g * 3) / 2);
    switch (zone) {
        case 'left':
            return { x: g, y: g, w: hw, h: ws.h - g * 2 };
        case 'right':
            return { x: g * 2 + hw, y: g, w: hw, h: ws.h - g * 2 };
        case 'tl':
            return { x: g, y: g, w: hw, h: hh };
        case 'tr':
            return { x: g * 2 + hw, y: g, w: hw, h: hh };
        case 'bl':
            return { x: g, y: g * 2 + hh, w: hw, h: hh };
        case 'br':
            return { x: g * 2 + hw, y: g * 2 + hh, w: hw, h: hh };
    }
}

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
const HANDLES: { dir: ResizeDir; cls: string; cursor: string }[] = [
    { dir: 'n', cls: '-top-1 left-3 right-3 h-2', cursor: 'ns-resize' },
    { dir: 's', cls: '-bottom-1 left-3 right-3 h-2', cursor: 'ns-resize' },
    { dir: 'e', cls: '-right-1 top-3 bottom-3 w-2', cursor: 'ew-resize' },
    { dir: 'w', cls: '-left-1 top-3 bottom-3 w-2', cursor: 'ew-resize' },
    { dir: 'ne', cls: '-top-1 -right-1 w-4 h-4', cursor: 'nesw-resize' },
    { dir: 'nw', cls: '-top-1 -left-1 w-4 h-4', cursor: 'nwse-resize' },
    { dir: 'se', cls: '-bottom-1 -right-1 w-4 h-4', cursor: 'nwse-resize' },
    { dir: 'sw', cls: '-bottom-1 -left-1 w-4 h-4', cursor: 'nesw-resize' },
];

const LAYOUTS: [SnapZone | 'max', string, string][] = [
    ['left', 'Left half', 'left-[3px] top-[3px] bottom-[3px] right-1/2 mr-[1.5px]'],
    ['right', 'Right half', 'right-[3px] top-[3px] bottom-[3px] left-1/2 ml-[1.5px]'],
    ['max', 'Fill', 'inset-[3px]'],
    ['tl', 'Top left', 'left-[3px] top-[3px] right-1/2 bottom-1/2 mr-[1.5px] mb-[1.5px]'],
    ['tr', 'Top right', 'right-[3px] top-[3px] left-1/2 bottom-1/2 ml-[1.5px] mb-[1.5px]'],
    ['bl', 'Bottom left', 'left-[3px] bottom-[3px] right-1/2 top-1/2 mr-[1.5px] mt-[1.5px]'],
    ['br', 'Bottom right', 'right-[3px] bottom-[3px] left-1/2 top-1/2 ml-[1.5px] mt-[1.5px]'],
];

function Light({
    color,
    edge,
    glyph,
    focused,
    title,
    onClick,
}: {
    color: string;
    edge: string;
    glyph: string;
    focused: boolean;
    title: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            title={title}
            aria-label={title}
            onClick={(e) => {
                e.stopPropagation();
                onClick();
            }}
            className="flex h-3 w-3 items-center justify-center rounded-full transition-colors"
            style={{
                background: focused ? color : 'rgba(255,255,255,0.18)',
                boxShadow: focused ? `inset 0 0 0 0.5px ${edge}` : 'inset 0 0 0 0.5px rgba(255,255,255,0.08)',
            }}
        >
            <span className="select-none text-[9px] font-bold leading-none text-black/55 opacity-0 group-hover/lights:opacity-100">
                {glyph}
            </span>
        </button>
    );
}

export default function OsWindowFrame({
    title,
    x,
    y,
    w,
    h,
    z,
    maximized,
    focused,
    phone = false,
    children,
    onFocus,
    onClose,
    onMinimize,
    onMaximize,
    onMove,
    onRect,
}: {
    title: string;
    app: OsAppId;
    x: number;
    y: number;
    w: number;
    h: number;
    z: number;
    maximized: boolean;
    focused: boolean;
    phone?: boolean;
    children: ReactNode;
    onFocus: () => void;
    onClose: () => void;
    onMinimize: () => void;
    onMaximize: () => void;
    onMove: (x: number, y: number) => void;
    onRect: (rect: Partial<Rect>) => void;
}) {
    const frameRef = useRef<HTMLDivElement>(null);
    const [edge, setEdgeState] = useState<SnapZone | 'max' | null>(null);
    const edgeRef = useRef<SnapZone | 'max' | null>(null);
    const setEdge = (z: SnapZone | 'max' | null) => {
        edgeRef.current = z;
        setEdgeState(z);
    };
    const [layouts, setLayouts] = useState(false);
    const layoutsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [dragging, setDragging] = useState(false);
    const reduce = useReducedMotion();
    const fill = phone || maximized;

    const workspace = () => {
        const r = frameRef.current?.parentElement?.getBoundingClientRect();
        return r ? { w: r.width, h: r.height } : { w: window.innerWidth, h: window.innerHeight - 120 };
    };
    const applyZone = (zone: SnapZone | 'max') => {
        if (zone === 'max') onMaximize();
        else onRect(zoneRect(zone, workspace()));
    };

    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

    const style: CSSProperties = fill
        ? phone
            ? { position: 'absolute', inset: 0, zIndex: z }
            : { position: 'absolute', left: 6, right: 6, top: 6, bottom: 6, zIndex: z }
        : {
              position: 'absolute',
              left: x,
              top: y,
              width: Math.min(w, vw - 16),
              height: Math.min(h, vh - 120),
              zIndex: z,
          };

    const shadow = focused
        ? '0 30px 80px -20px rgba(0,0,0,0.85), 0 0 0 1px rgba(255,255,255,0.12), 0 0 0 1px color-mix(in srgb, var(--os-accent, #34d399) 18%, transparent)'
        : '0 16px 44px -16px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.07)';

    const startDrag = (e: React.PointerEvent) => {
        if (fill) return;
        if ((e.target as HTMLElement).closest('[data-nodrag]')) return;
        const o = { ox: e.clientX, oy: e.clientY, sx: x, sy: y };
        setDragging(true);
        const move = (ev: PointerEvent) => {
            onMove(o.sx + (ev.clientX - o.ox), Math.max(0, o.sy + (ev.clientY - o.oy)));
            const W = window.innerWidth;
            const H = window.innerHeight;
            const px = ev.clientX;
            const py = ev.clientY;
            if (py <= 36) setEdge('max');
            else if (px <= 6) setEdge(py < H * 0.25 ? 'tl' : py > H * 0.75 ? 'bl' : 'left');
            else if (px >= W - 6) setEdge(py < H * 0.25 ? 'tr' : py > H * 0.75 ? 'br' : 'right');
            else setEdge(null);
        };
        const up = () => {
            setDragging(false);
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            const zone = edgeRef.current;
            setEdge(null);
            if (zone) applyZone(zone);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    const startResize = (dir: ResizeDir) => (e: React.PointerEvent) => {
        if (fill) return;
        e.stopPropagation();
        onFocus();
        const start = { x, y, w, h, ox: e.clientX, oy: e.clientY };
        const move = (ev: PointerEvent) => {
            const dx = ev.clientX - start.ox;
            const dy = ev.clientY - start.oy;
            const n: Rect = { x: start.x, y: start.y, w: start.w, h: start.h };
            if (dir.includes('e')) n.w = start.w + dx;
            if (dir.includes('s')) n.h = start.h + dy;
            if (dir.includes('w')) {
                n.w = start.w - dx;
                n.x = start.x + dx;
            }
            if (dir.includes('n')) {
                n.h = start.h - dy;
                n.y = start.y + dy;
            }
            if (n.w >= 300 && n.h >= 220) onRect(n);
        };
        const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    const preview = (() => {
        if (!edge) return null;
        const ws = workspace();
        const r = edge === 'max' ? { x: 6, y: 6, w: ws.w - 12, h: ws.h - 12 } : zoneRect(edge, ws);
        return { left: r.x, top: r.y, width: r.w, height: r.h } as CSSProperties;
    })();

    return (
        <>
            {preview && (
                <div
                    className="pointer-events-none absolute z-[9999] rounded-xl border border-white/30 bg-white/[0.08] backdrop-blur-[2px] transition-all duration-100"
                    style={preview}
                />
            )}
            <motion.div
                ref={frameRef}
                data-os-window
                initial={reduce ? false : phone ? { opacity: 0, y: 24 } : { opacity: 0, scale: 0.94, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduce ? { opacity: 0 } : phone ? { opacity: 0, y: 30 } : { opacity: 0, scale: 0.92, y: 16 }}
                transition={reduce ? { duration: 0.1 } : { type: 'spring', stiffness: 480, damping: 36, mass: 0.7 }}
                className={`flex flex-col overflow-hidden bg-[#101219] ${phone ? '' : 'rounded-xl'} ${dragging ? 'select-none' : ''}`}
                style={{ ...style, boxShadow: phone ? undefined : shadow } as unknown as MotionStyle}
                onPointerDown={onFocus}
            >
                {phone ? (
                    <div
                        className="relative flex h-12 shrink-0 items-center justify-between border-b border-white/[0.07] bg-[#15171f] px-1.5"
                        style={{ paddingTop: 'env(safe-area-inset-top, 0px)', boxSizing: 'content-box' }}
                    >
                        <button
                            type="button"
                            onClick={onMinimize}
                            className="flex h-11 items-center gap-0.5 rounded-lg px-2 text-[15px] text-[var(--os-accent,#34d399)] touch-manipulation"
                            aria-label="Home"
                        >
                            <ChevronLeft size={22} /> Home
                        </button>
                        <span className="pointer-events-none absolute inset-x-24 truncate text-center text-[15px] font-semibold text-white">
                            {title}
                        </span>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-11 w-11 items-center justify-center rounded-full text-white/60 touch-manipulation active:bg-white/10"
                            aria-label="Close"
                        >
                            <X size={19} />
                        </button>
                    </div>
                ) : (
                    <div
                        className={`relative flex h-[38px] shrink-0 items-center border-b border-black/30 px-3.5 ${
                            focused ? 'bg-[#1b1e28]' : 'bg-[#16181f]'
                        }`}
                        onPointerDown={startDrag}
                        onDoubleClick={onMaximize}
                    >
                        <div data-nodrag className="group/lights relative z-10 flex items-center gap-2">
                            <Light color="#ff5f57" edge="#e0443e" glyph="×" focused={focused} title="Close" onClick={onClose} />
                            <Light color="#febc2e" edge="#d89e24" glyph="−" focused={focused} title="Minimise" onClick={onMinimize} />
                            <div
                                className="relative flex"
                                onMouseEnter={() => {
                                    if (layoutsTimer.current) clearTimeout(layoutsTimer.current);
                                    layoutsTimer.current = setTimeout(() => setLayouts(true), 420);
                                }}
                                onMouseLeave={() => {
                                    if (layoutsTimer.current) clearTimeout(layoutsTimer.current);
                                    layoutsTimer.current = setTimeout(() => setLayouts(false), 220);
                                }}
                            >
                                <Light
                                    color="#28c840"
                                    edge="#1dad2b"
                                    glyph="+"
                                    focused={focused}
                                    title="Zoom · hover to tile"
                                    onClick={() => {
                                        setLayouts(false);
                                        onMaximize();
                                    }}
                                />
                                {layouts && (
                                    <div className="absolute left-0 top-full z-50 mt-2.5 rounded-xl border border-white/12 bg-[#1d2029]/95 p-2 shadow-2xl backdrop-blur-2xl">
                                        <p className="mb-1.5 px-0.5 text-[11px] font-medium text-white/45">Move &amp; resize</p>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            {LAYOUTS.map(([zone, label, cls]) => (
                                                <button
                                                    key={zone}
                                                    type="button"
                                                    title={label}
                                                    onClick={() => {
                                                        setLayouts(false);
                                                        applyZone(zone);
                                                    }}
                                                    className="group/l relative h-9 w-12 overflow-hidden rounded-md bg-white/[0.06] ring-1 ring-white/10 hover:ring-white/30"
                                                >
                                                    <span className={`absolute rounded-[3px] bg-white/35 group-hover/l:bg-[var(--os-accent,#34d399)] ${cls}`} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <span
                            className={`pointer-events-none absolute inset-x-24 truncate text-center text-[13px] font-semibold tracking-tight ${
                                focused ? 'text-white/85' : 'text-white/35'
                            }`}
                        >
                            {title}
                        </span>
                    </div>
                )}

                {/* contain: paint makes the window the containing block for any
                    position:fixed a hosted feature draws — its backdrop or modal
                    stays inside this window instead of painting the desktop */}
                <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain [contain:paint]">{children}</div>

                {!fill &&
                    HANDLES.map((hd) => (
                        <div
                            key={hd.dir}
                            className={`absolute z-20 ${hd.cls}`}
                            style={{ cursor: hd.cursor, touchAction: 'none' }}
                            onPointerDown={startResize(hd.dir)}
                        />
                    ))}
            </motion.div>
        </>
    );
}
