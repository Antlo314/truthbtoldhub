'use client';

/**
 * The desktop's app list — a plain vertical column, Windows-style.
 *
 * This replaces the bento tile grid. That grid gave ten destinations equal
 * visual weight, each in its own coloured pane with its own blurb, and the
 * result was a wall of competing panels on the first screen you see. A list
 * has one weight and one axis: you read down it.
 *
 * Nothing here is decorative. Each row is icon + name + a one-word hint of
 * what it is, and rows carrying live state (the house, the ledger) show that
 * value on the right instead of in a separate tile.
 *
 * It sits on the desktop layer, which the shell only renders while no window
 * is open — so windows never have to dodge it, and the desktop shortcut rail
 * takes over once you launch something. That is exactly how Windows behaves.
 */
import type { OsAppId } from './truthOsStore';
import { OsIconTile, getAppIconMeta } from './OsIcon';

export type AppRow = {
    app: OsAppId;
    /** Starts a new group. The label prints above it, once. */
    group?: string;
    /** One-word "what is this" — never a sentence */
    hint?: string;
    /** Live value, right-aligned (house stations, soul power, reel count) */
    value?: string | null;
    /** Signed-in only */
    gated?: boolean;
};

export default function OsAppList({
    rows,
    phone,
    email,
    onLaunch,
}: {
    rows: AppRow[];
    phone: boolean;
    email: string | null;
    onLaunch: (app: OsAppId) => void;
}) {
    return (
        <ul
            className={
                phone
                    ? 'grid grid-cols-1 gap-1'
                    : 'flex flex-col gap-0.5 w-[248px]'
            }
        >
            {rows.map(({ app, hint, value, gated, group }) => {
                const meta = getAppIconMeta(app);
                const locked = gated && !email;
                return (
                    <li key={app}>
                        {/* One hairline label per section. Twenty-one rows in a
                            single undifferentiated column is a list you scroll
                            past, not one you read. */}
                        {group && (
                            <p className="px-2 pt-4 pb-1 text-[8px] uppercase tracking-[0.32em] text-white/25 font-mono">
                                {group}
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={() => onLaunch(app)}
                            className="group w-full flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-left hover:bg-white/10 border border-transparent hover:border-white/12 transition-colors touch-manipulation min-h-[44px]"
                        >
                            <OsIconTile app={app} size="md" />
                            <span className="min-w-0 flex-1">
                                <span className="block text-[13px] text-white/90 group-hover:text-white leading-tight truncate">
                                    {meta.label}
                                </span>
                                {hint && (
                                    <span className="block text-[10px] text-white/40 leading-tight truncate">
                                        {locked ? 'sign in' : hint}
                                    </span>
                                )}
                            </span>
                            {value && (
                                <span className="shrink-0 text-[11px] font-mono tabular-nums text-white/55">
                                    {value}
                                </span>
                            )}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}
