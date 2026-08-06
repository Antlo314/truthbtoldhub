'use client';

/**
 * Truth.OS window frame — draggable, resizable, edge-snapping chrome.
 * Aero-style: drag to screen edges for half/quarter snap, hover the
 * maximize button for Windows-11-style snap layouts, 8-way resize.
 */
import { useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { BentoSlot, OsAppId } from './truthOsStore';
import { ACCENT_STYLES, OsIconTile, getAppAccent } from './OsIcon';

export type SnapZone = 'left' | 'right' | 'tl' | 'tr' | 'bl' | 'br';

type Rect = { x: number; y: number; w: number; h: number };

function zoneRect(zone: SnapZone, ws: { w: number; h: number }): Rect {
    const half = { w: Math.floor(ws.w / 2), h: ws.h };
    const quart = { w: Math.floor(ws.w / 2), h: Math.floor(ws.h / 2) };
    switch (zone) {
        case 'left':
            return { x: 0, y: 0, ...half };
        case 'right':
            return { x: ws.w - half.w, y: 0, ...half };
        case 'tl':
            return { x: 0, y: 0, ...quart };
        case 'tr':
            return { x: ws.w - quart.w, y: 0, ...quart };
        case 'bl':
            return { x: 0, y: ws.h - quart.h, ...quart };
        case 'br':
            return { x: ws.w - quart.w, y: ws.h - quart.h, ...quart };
    }
}

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const RESIZE_HANDLES: { dir: ResizeDir; cls: string; cursor: string }[] = [
    { dir: 'n', cls: 'top-0 left-2 right-2 h-1.5', cursor: 'ns-resize' },
    { dir: 's', cls: 'bottom-0 left-2 right-2 h-1.5', cursor: 'ns-resize' },
    { dir: 'e', cls: 'right-0 top-2 bottom-2 w-1.5', cursor: 'ew-resize' },
    { dir: 'w', cls: 'left-0 top-2 bottom-2 w-1.5', cursor: 'ew-resize' },
    { dir: 'ne', cls: 'top-0 right-0 w-3 h-3', cursor: 'nesw-resize' },
    { dir: 'nw', cls: 'top-0 left-0 w-3 h-3', cursor: 'nwse-resize' },
    { dir: 'se', cls: 'bottom-0 right-0 w-3 h-3', cursor: 'nwse-resize' },
    { dir: 'sw', cls: 'bottom-0 left-0 w-3 h-3', cursor: 'nesw-resize' },
];

export default function OsWindowFrame({
    title,
    app,
    x,
    y,
    w,
    h,
    z,
    maximized,
    focused,
    bento,
    phone = false,
    children,
    onFocus,
    onClose,
    onMinimize,
    onMaximize,
    onMove,
    onSnap,
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
    bento: boolean;
    phone?: boolean;
    children: ReactNode;
    onFocus: () => void;
    onClose: () => void;
    onMinimize: () => void;
    onMaximize: () => void;
    onMove: (x: number, y: number) => void;
    onSnap: (s: BentoSlot) => void;
    onRect: (rect: Partial<Rect>) => void;
}) {
    const drag = useRef<{ ox: number; oy: number; sx: number; sy: number } | null>(null);
    const resize = useRef<{
        dir: ResizeDir;
        ox: number;
        oy: number;
        start: Rect;
    } | null>(null);
    const frameRef = useRef<HTMLDivElement>(null);
    const [edgeZone, setEdgeZoneState] = useState<SnapZone | 'max' | null>(null);
    const edgeZoneRef = useRef<SnapZone | 'max' | null>(null);
    const setEdgeZone = (z: SnapZone | 'max' | null) => {
        edgeZoneRef.current = z;
        setEdgeZoneState(z);
    };
    const [layoutsOpen, setLayoutsOpen] = useState(false);
    const layoutsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const reduceMotion = useReducedMotion();
    const [dragging, setDragging] = useState(false);
    const narrow = phone || (typeof window !== 'undefined' && window.innerWidth < 768);
    const accentId = getAppAccent(app);
    const accentStyle = ACCENT_STYLES[accentId];
    const borderCls = focused ? 'border-white/20' : 'border-white/10';
    const fillScreen = (maximized || narrow) && !(bento && !maximized && !narrow);
    const floating = !fillScreen && !(bento && !maximized && !narrow);

    const workspace = (): { w: number; h: number } => {
        // The window layer already ends above the taskbar
        const parent = frameRef.current?.parentElement;
        if (parent) {
            const r = parent.getBoundingClientRect();
            return { w: r.width, h: r.height };
        }
        return {
            w: typeof window !== 'undefined' ? window.innerWidth : 1280,
            h: typeof window !== 'undefined' ? window.innerHeight - 60 : 720,
        };
    };

    const applyZone = (zone: SnapZone) => {
        onRect(zoneRect(zone, workspace()));
    };

    // The focused window carries the system accent — a hairline ring plus a
    // soft halo, layered under the existing depth shadow.
    const focusGlow =
        '0 28px 80px -16px rgba(0,0,0,0.85), 0 0 0 1px color-mix(in srgb, var(--os-accent, #34d399) 45%, transparent), 0 0 26px -8px color-mix(in srgb, var(--os-accent, #34d399) 40%, transparent)';

    const style: CSSProperties = fillScreen
        ? {
              position: 'absolute',
              left: narrow ? 0 : 8,
              right: narrow ? 0 : 8,
              top: narrow ? 'max(0px, env(safe-area-inset-top, 0px))' : 8,
              bottom: narrow ? 0 : 8,
              width: undefined,
              height: undefined,
              zIndex: z,
              background: 'rgba(15,17,24,0.86)',
              backdropFilter: 'blur(28px) saturate(1.35)',
              WebkitBackdropFilter: 'blur(28px) saturate(1.35)',
          }
        : bento && !maximized && !narrow
          ? {
                position: 'relative',
                width: '100%',
                height: '100%',
                zIndex: z,
                background: 'rgba(15,17,24,0.86)',
                backdropFilter: 'blur(28px) saturate(1.35)',
                WebkitBackdropFilter: 'blur(28px) saturate(1.35)',
            }
          : {
                position: 'absolute',
                left: x,
                top: y,
                width: Math.min(w, typeof window !== 'undefined' ? window.innerWidth - 24 : w),
                height: Math.min(h, typeof window !== 'undefined' ? window.innerHeight - 100 : h),
                zIndex: z,
                background: 'rgba(15,17,24,0.86)',
                backdropFilter: 'blur(28px) saturate(1.35)',
                WebkitBackdropFilter: 'blur(28px) saturate(1.35)',
            };

    const startResize = (dir: ResizeDir) => (e: React.PointerEvent) => {
        if (narrow || maximized || bento) return;
        e.stopPropagation();
        onFocus();
        resize.current = { dir, ox: e.clientX, oy: e.clientY, start: { x, y, w, h } };
        const move = (ev: PointerEvent) => {
            const r = resize.current;
            if (!r) return;
            const dx = ev.clientX - r.ox;
            const dy = ev.clientY - r.oy;
            const next: Rect = { ...r.start };
            if (r.dir.includes('e')) next.w = r.start.w + dx;
            if (r.dir.includes('s')) next.h = r.start.h + dy;
            if (r.dir.includes('w')) {
                next.w = r.start.w - dx;
                next.x = r.start.x + dx;
            }
            if (r.dir.includes('n')) {
                next.h = r.start.h - dy;
                next.y = r.start.y + dy;
            }
            if (next.w >= 280 && next.h >= 200) onRect(next);
        };
        const up = () => {
            resize.current = null;
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
    };

    const edgePreviewRect = (): CSSProperties | null => {
        if (!edgeZone) return null;
        const ws = workspace();
        const base: CSSProperties = {
            position: 'absolute',
            zIndex: 9999,
            pointerEvents: 'none',
        };
        if (edgeZone === 'max') return { ...base, left: 4, top: 4, width: ws.w - 8, height: ws.h - 8 };
        const r = zoneRect(edgeZone, ws);
        return { ...base, left: r.x + 4, top: r.y + 4, width: r.w - 8, height: r.h - 8 };
    };

    const preview = edgePreviewRect();

    return (
        <>
            {preview && (
                <div
                    className="rounded-2xl border-2 border-white/40 bg-white/10 backdrop-blur-sm transition-all duration-75"
                    style={preview}
                />
            )}
            <motion.div
                ref={frameRef}
                data-os-window
                initial={reduceMotion ? false : { opacity: 0, scale: 0.965, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
                transition={
                    reduceMotion
                        ? { duration: 0.12 }
                        : // Spring reads as weight rather than a timed fade
                          { type: 'spring', stiffness: 520, damping: 38, mass: 0.7 }
                }
                className={`flex flex-col overflow-hidden border shadow-2xl ${
                    narrow ? 'rounded-none sm:rounded-xl' : 'rounded-xl'
                } ${borderCls} ${focused ? '' : 'shadow-[0_12px_40px_-12px_rgba(0,0,0,0.6)] opacity-[0.97]'} ${
                    bento && !maximized && !narrow ? 'h-full w-full absolute inset-0' : ''
                }`}
                style={
                    (focused
                        ? { ...style, boxShadow: focusGlow }
                        : style) as unknown as import('framer-motion').MotionStyle
                }
                onMouseDown={onFocus}
            >
                <div
                    className={`shrink-0 relative flex items-center border-b border-white/[0.07] cursor-default ${
                        narrow ? 'h-11 min-h-[44px] px-2.5' : 'h-10 px-3'
                    } ${focused ? 'bg-white/[0.07]' : 'bg-white/[0.03]'}`}
                    onDoubleClick={() => {
                        if (!narrow) onMaximize();
                    }}
                    onPointerDown={(e) => {
                        if (narrow || maximized || bento) return;
                        // Traffic lights and popovers must not start a drag
                        if ((e.target as HTMLElement).closest('[data-traffic]')) return;
                        drag.current = { ox: e.clientX, oy: e.clientY, sx: x, sy: y };
                        setDragging(true);
                        const move = (ev: PointerEvent) => {
                            if (!drag.current) return;
                            onMove(
                                drag.current.sx + (ev.clientX - drag.current.ox),
                                drag.current.sy + (ev.clientY - drag.current.oy),
                            );
                            // Aero edge detection
                            const vw = window.innerWidth;
                            const px = ev.clientX;
                            const py = ev.clientY;
                            if (py <= 6) setEdgeZone('max');
                            else if (px <= 8) setEdgeZone(py < window.innerHeight * 0.25 ? 'tl' : py > window.innerHeight * 0.75 ? 'bl' : 'left');
                            else if (px >= vw - 8) setEdgeZone(py < window.innerHeight * 0.25 ? 'tr' : py > window.innerHeight * 0.75 ? 'br' : 'right');
                            else setEdgeZone(null);
                        };
                        const up = () => {
                            drag.current = null;
                            setDragging(false);
                            window.removeEventListener('pointermove', move);
                            window.removeEventListener('pointerup', up);
                            const zone = edgeZoneRef.current;
                            setEdgeZone(null);
                            if (zone === 'max') onMaximize();
                            else if (zone) applyZone(zone);
                        };
                        window.addEventListener('pointermove', move);
                        window.addEventListener('pointerup', up);
                    }}
                >
                    {/* Traffic lights. Grey when unfocused; glyphs appear on
                        hover of the group, exactly like the real thing. */}
                    <div data-traffic className="group flex items-center gap-2 shrink-0">
                        <button
                            type="button"
                            title="Close"
                            onClick={(e) => {
                                e.stopPropagation();
                                onClose();
                            }}
                            className={`flex items-center justify-center rounded-full border transition-colors ${
                                narrow ? 'w-4 h-4' : 'w-3 h-3'
                            } ${
                                focused
                                    ? 'bg-[#ff5f57] border-[#e0443e]'
                                    : 'bg-white/20 border-white/10 group-hover:bg-[#ff5f57] group-hover:border-[#e0443e]'
                            }`}
                        >
                            <span className="opacity-0 group-hover:opacity-100 text-[9px] leading-none font-bold text-black/60 select-none">
                                ×
                            </span>
                        </button>
                        <button
                            type="button"
                            title="Minimize"
                            onClick={(e) => {
                                e.stopPropagation();
                                onMinimize();
                            }}
                            className={`flex items-center justify-center rounded-full border transition-colors ${
                                narrow ? 'w-4 h-4' : 'w-3 h-3'
                            } ${
                                focused
                                    ? 'bg-[#febc2e] border-[#d89e24]'
                                    : 'bg-white/20 border-white/10 group-hover:bg-[#febc2e] group-hover:border-[#d89e24]'
                            }`}
                        >
                            <span className="opacity-0 group-hover:opacity-100 text-[9px] leading-none font-bold text-black/60 select-none">
                                −
                            </span>
                        </button>
                        <div
                            className="relative"
                            onMouseEnter={() => {
                                if (narrow) return;
                                if (layoutsTimer.current) clearTimeout(layoutsTimer.current);
                                layoutsTimer.current = setTimeout(() => setLayoutsOpen(true), 460);
                            }}
                            onMouseLeave={() => {
                                if (layoutsTimer.current) clearTimeout(layoutsTimer.current);
                                layoutsTimer.current = setTimeout(() => setLayoutsOpen(false), 240);
                            }}
                        >
                            <button
                                type="button"
                                title="Zoom · hover for tiling"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLayoutsOpen(false);
                                    onMaximize();
                                }}
                                className={`flex items-center justify-center rounded-full border transition-colors ${
                                    narrow ? 'w-4 h-4' : 'w-3 h-3'
                                } ${
                                    focused
                                        ? 'bg-[#28c840] border-[#1dad2b]'
                                        : 'bg-white/20 border-white/10 group-hover:bg-[#28c840] group-hover:border-[#1dad2b]'
                                }`}
                            >
                                <span className="opacity-0 group-hover:opacity-100 text-[8px] leading-none font-bold text-black/60 select-none">
                                    +
                                </span>
                            </button>
                            {layoutsOpen && (
                                <div
                                    className="absolute left-0 top-full mt-2 z-50 rounded-xl border border-white/15 bg-[#181b24]/95 backdrop-blur-2xl shadow-2xl p-2 ring-1 ring-black/50"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <p className="text-[8px] uppercase tracking-[0.25em] text-white/40 font-mono mb-1.5 px-0.5 whitespace-nowrap">
                                        Move &amp; tile
                                    </p>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {(
                                            [
                                                ['left', 'Left half'],
                                                ['right', 'Right half'],
                                                ['max', 'Fill'],
                                                ['tl', 'Top-left'],
                                                ['tr', 'Top-right'],
                                                ['bl', 'Bottom-left'],
                                                ['br', 'Bottom-right'],
                                            ] as [SnapZone | 'max', string][]
                                        ).map(([zone, label]) => (
                                            <button
                                                key={zone}
                                                type="button"
                                                title={label}
                                                onClick={() => {
                                                    setLayoutsOpen(false);
                                                    if (zone === 'max') onMaximize();
                                                    else applyZone(zone);
                                                }}
                                                className="w-12 h-9 rounded-lg border border-white/15 bg-white/[0.05] hover:bg-white/15 hover:border-white/35 relative overflow-hidden transition-colors"
                                            >
                                                <span
                                                    className={`absolute bg-white/50 rounded-[3px] ${
                                                        zone === 'left'
                                                            ? 'left-1 top-1 bottom-1 right-1/2 mr-0.5'
                                                            : zone === 'right'
                                                              ? 'right-1 top-1 bottom-1 left-1/2 ml-0.5'
                                                              : zone === 'max'
                                                                ? 'inset-1'
                                                                : zone === 'tl'
                                                                  ? 'left-1 top-1 right-1/2 bottom-1/2 mr-0.5 mb-0.5'
                                                                  : zone === 'tr'
                                                                    ? 'right-1 top-1 left-1/2 bottom-1/2 ml-0.5 mb-0.5'
                                                                    : zone === 'bl'
                                                                      ? 'left-1 bottom-1 right-1/2 top-1/2 mr-0.5 mt-0.5'
                                                                      : 'right-1 bottom-1 left-1/2 top-1/2 ml-0.5 mt-0.5'
                                                    }`}
                                                />
                                            </button>
                                        ))}
                                        <button
                                            type="button"
                                            title="Bento hero"
                                            onClick={() => {
                                                setLayoutsOpen(false);
                                                onSnap('hero');
                                            }}
                                            className="w-12 h-9 rounded-lg border border-white/15 bg-white/[0.05] hover:bg-white/15 hover:border-white/35 relative overflow-hidden transition-colors"
                                        >
                                            <span className="absolute left-1 top-1 bottom-1 right-1/2 mr-0.5 bg-amber-300/60 rounded-[3px]" />
                                            <span className="absolute right-1 top-1 left-1/2 bottom-1/2 ml-0.5 mb-0.5 bg-white/40 rounded-[3px]" />
                                            <span className="absolute right-1 bottom-1 left-1/2 top-1/2 ml-0.5 mt-0.5 bg-white/40 rounded-[3px]" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Centered title, absolute so the lights never shift it */}
                    <div className="pointer-events-none absolute inset-x-0 flex items-center justify-center gap-1.5 px-16">
                        <OsIconTile app={app} size="sm" open={focused} />
                        <span
                            className={`text-[12px] sm:text-[13px] font-semibold truncate tracking-tight max-w-[60%] ${
                                focused ? 'text-white/90' : 'text-white/40'
                            }`}
                        >
                            {title}
                        </span>
                    </div>
                </div>
                <div className="flex-1 min-h-0 overflow-hidden overflow-y-auto bg-[#0b0d14]/70 overscroll-contain">
                    {children}
                </div>

                {/* Resize handles — float mode on desktop only */}
                {floating &&
                    !narrow &&
                    RESIZE_HANDLES.map((hd) => (
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
