'use client';

/**
 * Truth.OS Dock — macOS-grade floating dock.
 *
 * The magnification is the real thing, not a hover scale: every icon's
 * size is a continuous function of the cursor's distance along the dock,
 * driven through framer-motion motion values so neighbours swell as the
 * cursor approaches and the wave travels with it. Icons bounce once on
 * launch, running apps carry a dot, minimizing tucks the window toward
 * its dock icon.
 *
 * Phone gets an iOS-style fixed dock — four tiles and no magnification,
 * because there is no cursor to magnify against.
 */
import { useRef, useState, type CSSProperties } from 'react';
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
import { APP_META } from './truthOsStore';
import { getAppIconMeta, getAppAccent, ACCENT_STYLES } from './OsIcon';

const BASE = 44;       // resting icon size
const PEAK = 78;       // size directly under the cursor
const REACH = 130;     // px of dock the wave spans on either side

/** One dock icon whose size follows the cursor. */
function DockIcon({
    app,
    label,
    running,
    focused,
    bouncing,
    mouseX,
    onClick,
    onContextMenu,
}: {
    app: OsAppId | 'launchpad' | 'chamber';
    label: string;
    running?: boolean;
    focused?: boolean;
    bouncing?: boolean;
    mouseX: MotionValue<number>;
    onClick: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
}) {
    const ref = useRef<HTMLButtonElement>(null);
    const [hover, setHover] = useState(false);

    const distance = useTransform(mouseX, (x) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r || x === Infinity) return REACH;
        return Math.abs(x - (r.x + r.width / 2));
    });
    const sizeRaw = useTransform(distance, [0, REACH], [PEAK, BASE], { clamp: true });
    // Stiff spring: the wave keeps up with the cursor instead of lagging it
    const size = useSpring(sizeRaw, { mass: 0.1, stiffness: 900, damping: 44 });

    // 'chamber' is a real OsAppId with its own glyph; only Launchpad is synthetic
    const meta = app === 'launchpad' ? null : getAppIconMeta(app as OsAppId);
    const Icon = meta?.Icon ?? LayoutGrid;
    const accent = meta ? ACCENT_STYLES[getAppAccent(app as OsAppId)] : null;

    return (
        <motion.button
            ref={ref}
            type="button"
            onClick={onClick}
            onContextMenu={onContextMenu}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            className="relative flex flex-col items-center justify-end outline-none"
            style={{ width: size, height: size } as unknown as MotionStyle}
            animate={bouncing ? { y: [0, -26, 0, -12, 0] } : { y: 0 }}
            transition={
                bouncing
                    ? { duration: 0.9, times: [0, 0.3, 0.6, 0.8, 1], ease: 'easeOut' }
                    : { duration: 0.15 }
            }
        >
            {/* Tooltip — the macOS pill above the icon */}
            <AnimatePresence>
                {hover && (
                    <motion.span
                        initial={{ opacity: 0, y: 6, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.94 }}
                        transition={{ duration: 0.14 }}
                        className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md border border-white/15 bg-[#1a1d26]/95 px-2.5 py-1 text-[11px] font-medium text-white/95 shadow-xl backdrop-blur-md"
                    >
                        {label}
                    </motion.span>
                )}
            </AnimatePresence>

            <motion.span
                style={{ width: size, height: size } as unknown as MotionStyle}
                className={`flex items-center justify-center rounded-[22%] border shadow-lg transition-colors ${
                    app === 'chamber'
                        ? 'border-amber-300/40 bg-gradient-to-br from-amber-300 via-amber-500 to-amber-700 text-black'
                        : app === 'launchpad'
                          ? 'border-white/20 bg-gradient-to-br from-slate-500/80 to-slate-800/80 text-white'
                          : `${accent?.soft ?? 'border-white/15'} bg-gradient-to-br from-white/14 to-white/[0.03] text-white`
                }`}
            >
                <motion.span
                    style={
                        {
                            // Icon glyph tracks the tile: ~55% of tile size
                            width: useTransform(size, (s) => s * 0.55),
                            height: useTransform(size, (s) => s * 0.55),
                        } as unknown as MotionStyle
                    }
                    className="flex items-center justify-center [&>svg]:w-full [&>svg]:h-full"
                >
                    <Icon />
                </motion.span>
            </motion.span>

            {/* Running indicator — the focused app's dot carries the accent */}
            <span
                className={`absolute -bottom-[7px] h-1 w-1 rounded-full transition-all ${
                    running ? (focused ? '' : 'bg-white/60') : 'bg-transparent'
                }`}
                style={
                    running && focused
                        ? {
                              background: 'var(--os-accent, #fff)',
                              boxShadow: '0 0 6px var(--os-accent, rgba(255,255,255,0.9))',
                          }
                        : undefined
                }
            />
        </motion.button>
    );
}

export default function OsDock({
    pinned,
    windows,
    focusApp,
    phone,
    onLaunch,
    onFocusApp,
    onTogglePin,
    onAppMenu,
    onLaunchpad,
    onChamber,
}: {
    pinned: OsAppId[];
    windows: OsWindow[];
    focusApp: OsAppId | null;
    phone: boolean;
    onLaunch: (app: OsAppId) => void;
    onFocusApp: (app: OsAppId) => void;
    onTogglePin: (app: OsAppId) => void;
    /** Right-click — opens the shell's jump list (falls back to pin toggle) */
    onAppMenu?: (app: OsAppId, x: number, y: number) => void;
    onLaunchpad: () => void;
    onChamber?: () => void;
}) {
    const mouseX = useMotionValue(Infinity);
    const [bounce, setBounce] = useState<string | null>(null);

    const runningApps = Array.from(new Set(windows.map((w) => w.app)));
    // Dock order: pinned first (stable), then running apps that aren't pinned
    const items: OsAppId[] = [
        ...pinned,
        ...runningApps.filter((a) => !pinned.includes(a)),
    ];

    const launch = (app: OsAppId) => {
        const isRunning = runningApps.includes(app);
        if (!isRunning) {
            setBounce(app);
            setTimeout(() => setBounce(null), 950);
            onLaunch(app);
        } else {
            onFocusApp(app);
        }
    };

    if (phone) {
        // iOS dock: fixed tiles, safe-area aware, no magnification
        const phoneApps = items.slice(0, 4);
        return (
            <div
                className="absolute inset-x-3 z-50 flex items-center justify-around rounded-[26px] border border-white/15 bg-white/10 backdrop-blur-2xl px-3 py-2"
                style={{ bottom: 'max(0.6rem, env(safe-area-inset-bottom, 0px))' }}
            >
                {phoneApps.map((app) => {
                    const { Icon } = getAppIconMeta(app);
                    const a = ACCENT_STYLES[getAppAccent(app)];
                    return (
                        <button
                            key={app}
                            type="button"
                            onClick={() => launch(app)}
                            className={`flex h-12 w-12 items-center justify-center rounded-[22%] border ${a.soft} bg-gradient-to-br from-white/15 to-white/[0.04] text-white active:scale-90 transition-transform touch-manipulation`}
                        >
                            <Icon size={22} />
                        </button>
                    );
                })}
                <button
                    type="button"
                    onClick={onLaunchpad}
                    className="flex h-12 w-12 items-center justify-center rounded-[22%] border border-white/20 bg-gradient-to-br from-slate-500/70 to-slate-800/70 text-white active:scale-90 transition-transform touch-manipulation"
                >
                    <LayoutGrid size={22} />
                </button>
            </div>
        );
    }

    return (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-50 flex justify-center">
            <motion.div
                onMouseMove={(e) => mouseX.set(e.clientX)}
                onMouseLeave={() => mouseX.set(Infinity)}
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 26, delay: 0.15 }}
                className="pointer-events-auto flex items-end gap-2 rounded-2xl border border-white/15 bg-white/[0.09] px-2.5 pb-2 pt-2 shadow-[0_20px_60px_-12px_rgba(0,0,0,0.75)] ring-1 ring-black/40 backdrop-blur-2xl"
                style={{ height: BASE + 18 } as CSSProperties}
            >
                <DockIcon
                    app="launchpad"
                    label="Launchpad"
                    mouseX={mouseX}
                    onClick={onLaunchpad}
                />
                <span className="mx-0.5 h-9 w-px self-center bg-white/15" />
                {items.map((app) => (
                    <DockIcon
                        key={app}
                        app={app}
                        label={APP_META[app].label}
                        running={runningApps.includes(app)}
                        focused={focusApp === app}
                        bouncing={bounce === app}
                        mouseX={mouseX}
                        onClick={() => launch(app)}
                        onContextMenu={(e) => {
                            e.preventDefault();
                            if (onAppMenu) onAppMenu(app, e.clientX, e.clientY);
                            else onTogglePin(app);
                        }}
                    />
                ))}
                {onChamber && (
                    <>
                        <span className="mx-0.5 h-9 w-px self-center bg-white/15" />
                        <DockIcon
                            app="chamber"
                            label="Enter the Chamber"
                            mouseX={mouseX}
                            onClick={onChamber}
                        />
                    </>
                )}
            </motion.div>
        </div>
    );
}
