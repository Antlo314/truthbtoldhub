'use client';

/**
 * Truth.OS 4 dock.
 *
 * Desktop: a floating glass shelf. Icon size is a continuous function of
 * the cursor's distance (real magnification, neighbours swell with it),
 * a dot under running apps, a bounce on launch, and a right-click menu
 * for pinning, new windows and quitting. App Library sits first; the gold
 * door to the 3D house sits last, behind its own divider.
 *
 * Phone: four pinned apps on a glass tray, no magnification (no cursor).
 */
import { useEffect, useRef, useState } from 'react';
import {
    AnimatePresence,
    motion,
    useMotionValue,
    useSpring,
    useTransform,
    type MotionValue,
    type MotionStyle,
} from 'framer-motion';
import { LayoutGrid } from 'lucide-react';
import type { OsAppId, OsWindow } from './truthOsStore';
import { APP_META, MULTI_INSTANCE } from './truthOsStore';
import { HouseTile, OsIconTile } from './OsIcon';

const BASE = 50;
const PEAK = 76;
const REACH = 140;

/** Sentinels can't be app ids — 'library' IS an app, and collided with the App Library button */
type DockItem = OsAppId | '@library' | '@house';

function Magnified({
    mouseX,
    label,
    running,
    focused,
    bouncing,
    onClick,
    onContextMenu,
    children,
}: {
    mouseX: MotionValue<number>;
    label: string;
    running?: boolean;
    focused?: boolean;
    bouncing?: boolean;
    onClick: () => void;
    onContextMenu?: (e: React.MouseEvent, el: HTMLElement) => void;
    children: React.ReactNode;
}) {
    const ref = useRef<HTMLButtonElement>(null);
    const [hover, setHover] = useState(false);
    const dist = useTransform(mouseX, (x) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r || x === Infinity) return REACH;
        return Math.abs(x - (r.x + r.width / 2));
    });
    const raw = useTransform(dist, [0, REACH], [PEAK, BASE], { clamp: true });
    const size = useSpring(raw, { mass: 0.1, stiffness: 900, damping: 42 });

    return (
        <motion.button
            ref={ref}
            type="button"
            aria-label={label}
            onClick={onClick}
            onContextMenu={(e) => {
                if (!onContextMenu || !ref.current) return;
                e.preventDefault();
                onContextMenu(e, ref.current);
            }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            className="relative flex items-end justify-center outline-none"
            style={{ width: size, height: size } as unknown as MotionStyle}
            animate={bouncing ? { y: [0, -22, 0, -9, 0] } : { y: 0 }}
            transition={bouncing ? { duration: 0.85, times: [0, 0.3, 0.6, 0.8, 1], ease: 'easeOut' } : { duration: 0.15 }}
        >
            <AnimatePresence>
                {hover && (
                    <motion.span
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 2 }}
                        transition={{ duration: 0.12 }}
                        className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/12 bg-[#1d2029]/95 px-2.5 py-1 text-[12px] font-medium text-white shadow-xl backdrop-blur-md"
                    >
                        {label}
                    </motion.span>
                )}
            </AnimatePresence>
            {children}
            <span
                className={`absolute -bottom-[7px] h-[4px] w-[4px] rounded-full transition-opacity ${running ? 'opacity-100' : 'opacity-0'}`}
                style={{ background: focused ? 'var(--os-accent, #fff)' : 'rgba(255,255,255,0.7)' }}
            />
        </motion.button>
    );
}

type Menu = { app: OsAppId; left: number };

export default function OsDock({
    pinned,
    windows,
    focusApp,
    phone,
    onLaunch,
    onFocusApp,
    onNewWindow,
    onQuitApp,
    onTogglePin,
    onLibrary,
    onHouse,
}: {
    pinned: OsAppId[];
    windows: OsWindow[];
    focusApp: OsAppId | null;
    phone: boolean;
    onLaunch: (app: OsAppId) => void;
    onFocusApp: (app: OsAppId) => void;
    onNewWindow: (app: OsAppId) => void;
    onQuitApp: (app: OsAppId) => void;
    onTogglePin: (app: OsAppId) => void;
    onLibrary: () => void;
    onHouse?: () => void;
}) {
    const mouseX = useMotionValue(Infinity);
    const [bounce, setBounce] = useState<string | null>(null);
    const [menu, setMenu] = useState<Menu | null>(null);

    useEffect(() => {
        if (!menu) return;
        const close = () => setMenu(null);
        window.addEventListener('pointerdown', close);
        return () => window.removeEventListener('pointerdown', close);
    }, [menu]);

    const running = Array.from(new Set(windows.map((w) => w.app)));
    const items: OsAppId[] = [...pinned, ...running.filter((a) => !pinned.includes(a))];

    const launch = (app: OsAppId) => {
        if (running.includes(app)) {
            onFocusApp(app);
            return;
        }
        setBounce(app);
        setTimeout(() => setBounce(null), 900);
        onLaunch(app);
    };

    if (phone) {
        return (
            <div
                className="absolute inset-x-3 z-50 flex items-center justify-around rounded-[28px] border border-white/15 bg-white/[0.12] px-3 py-2.5 backdrop-blur-2xl"
                style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
            >
                {pinned.slice(0, 4).map((app) => (
                    <button
                        key={app}
                        type="button"
                        aria-label={APP_META[app].label}
                        onClick={() => launch(app)}
                        className="transition-transform active:scale-90 touch-manipulation"
                    >
                        <OsIconTile app={app} size={54} />
                    </button>
                ))}
            </div>
        );
    }

    const all: DockItem[] = ['@library', ...items, ...(onHouse ? (['@house'] as const) : [])];

    return (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-50 flex justify-center">
            <motion.div
                onMouseMove={(e) => mouseX.set(e.clientX)}
                onMouseLeave={() => mouseX.set(Infinity)}
                initial={{ y: 90, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.1 }}
                className="pointer-events-auto relative flex items-end gap-2 rounded-[22px] border border-white/[0.14] bg-white/[0.10] px-2.5 pb-2 pt-2 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.7)] backdrop-blur-2xl"
                style={{ height: BASE + 18 } as unknown as MotionStyle}
            >
                {all.map((it, i) => {
                    if (it === '@library') {
                        return (
                            <div key="@library" className="flex items-end gap-2">
                                <Magnified mouseX={mouseX} label="App Library" onClick={onLibrary}>
                                    <span
                                        className="flex h-full w-full items-center justify-center rounded-[23.5%] text-white"
                                        style={{
                                            background: 'linear-gradient(160deg, rgba(255,255,255,0.28), rgba(255,255,255,0.08))',
                                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), inset 0 0 0 1px rgba(255,255,255,0.12)',
                                        }}
                                    >
                                        <LayoutGrid className="h-[48%] w-[48%]" />
                                    </span>
                                </Magnified>
                                <span className="mb-2 h-9 w-px self-end bg-white/20" />
                            </div>
                        );
                    }
                    if (it === '@house') {
                        return (
                            <div key="@house" className="flex items-end gap-2">
                                <span className="mb-2 h-9 w-px self-end bg-white/20" />
                                <Magnified mouseX={mouseX} label="Enter the House" onClick={onHouse!}>
                                    <HouseTile size="fill" />
                                </Magnified>
                            </div>
                        );
                    }
                    const app = it as OsAppId;
                    return (
                        <Magnified
                            key={`${app}-${i}`}
                            mouseX={mouseX}
                            label={APP_META[app].label}
                            running={running.includes(app)}
                            focused={focusApp === app}
                            bouncing={bounce === app}
                            onClick={() => launch(app)}
                            onContextMenu={(_, el) => {
                                const r = el.getBoundingClientRect();
                                setMenu({ app, left: r.left + r.width / 2 });
                            }}
                        >
                            <OsIconTile app={app} size="fill" />
                        </Magnified>
                    );
                })}

            </motion.div>
            <AnimatePresence>
                {menu && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.1 }}
                        onPointerDown={(e) => e.stopPropagation()}
                        className="pointer-events-auto absolute z-[90] w-52 -translate-x-1/2 rounded-xl border border-white/12 bg-[#1d2029]/95 p-1.5 shadow-2xl backdrop-blur-2xl"
                        style={{ left: menu.left, bottom: BASE + 26 } as unknown as MotionStyle}
                    >
                        <p className="truncate px-2.5 pb-1 pt-0.5 text-[11.5px] font-medium text-white/45">{APP_META[menu.app].label}</p>
                        {[
                            ...(MULTI_INSTANCE.has(menu.app) ? [{ label: 'New window', run: () => onNewWindow(menu.app) }] : []),
                            ...(!running.includes(menu.app) ? [{ label: 'Open', run: () => launch(menu.app) }] : []),
                            {
                                label: pinned.includes(menu.app) ? 'Remove from Dock' : 'Keep in Dock',
                                run: () => onTogglePin(menu.app),
                            },
                            ...(running.includes(menu.app) ? [{ label: 'Quit', run: () => onQuitApp(menu.app), danger: true }] : []),
                        ].map((o) => (
                            <button
                                key={o.label}
                                type="button"
                                onClick={() => {
                                    setMenu(null);
                                    o.run();
                                }}
                                className={`block w-full rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                                    'danger' in o && o.danger
                                        ? 'text-rose-300 hover:bg-rose-500/80 hover:text-white'
                                        : 'text-white/90 hover:bg-[var(--os-accent,#34d399)] hover:text-black'
                                }`}
                            >
                                {o.label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
