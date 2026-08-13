'use client';

/**
 * Truth.OS glyph set — bespoke, chunky, game-grade icons.
 *
 * Line icons read as "admin dashboard"; games use solid forms with weight and
 * internal depth so they stay legible at 16px and feel physical at 56px. Every
 * glyph here is drawn on a 24×24 grid from solid shapes, with a lighter plane
 * for the lit face and a darker plane for the shadowed one. They inherit
 * `currentColor`, so one glyph works on any accent tile.
 *
 * Original artwork — no third-party assets, no attribution obligations.
 */
import type { ReactElement } from 'react';
import type { OsAppId } from './truthOsStore';

/** Lit face — sits on top-left surfaces */
const LIT = { fill: '#fff', fillOpacity: 0.42 } as const;
/** Shadowed face — bottom-right surfaces and recesses */
const DARK = { fill: '#000', fillOpacity: 0.28 } as const;

type Glyph = () => ReactElement;

/* ── glyphs ─────────────────────────────────────────────── */

const Truth: Glyph = () => (
    <>
        <path
            fill="currentColor"
            d="M12 1.6 14.5 8 21 10.5 14.5 13 12 19.4 9.5 13 3 10.5 9.5 8Z"
        />
        <circle cx="12" cy="10.5" r="2.6" {...DARK} />
        <circle cx="12" cy="10.5" r="1.3" {...LIT} />
        <path {...LIT} d="M12 1.6 14.5 8 12 10.5 9.5 8Z" />
        <circle cx="18.6" cy="17.4" r="1.5" fill="currentColor" />
        <circle cx="6" cy="19" r="1" fill="currentColor" fillOpacity={0.7} />
    </>
);

const Updates: Glyph = () => (
    <>
        <rect x="2.5" y="4" width="15" height="16" rx="1.8" fill="currentColor" />
        <path fill="currentColor" fillOpacity={0.75} d="M17.5 8h3a1.5 1.5 0 0 1 1.5 1.5v8.7a1.8 1.8 0 0 1-3.6 0Z" />
        <rect x="4.6" y="6.2" width="10.8" height="4.4" rx="0.8" {...LIT} />
        <rect x="4.6" y="12.2" width="10.8" height="1.5" rx="0.75" {...DARK} />
        <rect x="4.6" y="15" width="10.8" height="1.5" rx="0.75" {...DARK} />
        <rect x="4.6" y="17.8" width="7" height="1.5" rx="0.75" {...DARK} />
    </>
);

const Ledger: Glyph = () => (
    <>
        <path fill="currentColor" d="M3 4.4c2.6-1.1 5.4-1.1 8.2 0v15.2c-2.8-1.1-5.6-1.1-8.2 0Z" />
        <path fill="currentColor" fillOpacity={0.8} d="M21 4.4c-2.6-1.1-5.4-1.1-8.2 0v15.2c2.8-1.1 5.6-1.1 8.2 0Z" />
        <path {...LIT} d="M3 4.4c2.6-1.1 5.4-1.1 8.2 0v3.1c-2.8-1.1-5.6-1.1-8.2 0Z" />
        <rect x="11.2" y="3.6" width="1.6" height="16.8" rx="0.8" {...DARK} />
        <path {...DARK} d="M14.4 8.6c1.5-.5 3-.6 4.5-.3v1.5c-1.5-.3-3-.2-4.5.3Z" />
        <path {...DARK} d="M14.4 12c1.5-.5 3-.6 4.5-.3v1.5c-1.5-.3-3-.2-4.5.3Z" />
    </>
);

const Soul: Glyph = () => (
    <>
        <path
            fill="currentColor"
            d="M12 1.8c4 4.6 6.6 7.6 6.6 11.2A6.6 6.6 0 0 1 5.4 13C5.4 9.4 8 6.4 12 1.8Z"
        />
        <path {...LIT} d="M12 1.8c1.6 1.9 2.9 3.4 3.9 4.8-1 2-2.5 3-3.9 3.2Z" />
        <path
            {...DARK}
            d="M12 11.4c2.1 2.4 3.4 4 3.4 5.8a3.4 3.4 0 0 1-6.8 0c0-1.8 1.3-3.4 3.4-5.8Z"
        />
    </>
);

const Arcade: Glyph = () => (
    <>
        <rect x="1.6" y="6.6" width="20.8" height="11.6" rx="4.4" fill="currentColor" />
        <rect x="1.6" y="6.6" width="20.8" height="5" rx="4" {...LIT} />
        <rect x="4.7" y="11" width="4.6" height="1.7" rx="0.85" {...DARK} />
        <rect x="6.15" y="9.55" width="1.7" height="4.6" rx="0.85" {...DARK} />
        <circle cx="16.4" cy="11" r="1.5" {...DARK} />
        <circle cx="19" cy="13.6" r="1.5" {...DARK} />
        <circle cx="13.8" cy="13.6" r="1.5" {...DARK} />
    </>
);

const Offering: Glyph = () => (
    <>
        <path fill="currentColor" d="M2.6 12.6h18.8c0 4.3-3.4 7.6-7.6 7.6h-3.6c-4.2 0-7.6-3.3-7.6-7.6Z" />
        <rect x="1.6" y="11" width="20.8" height="2.6" rx="1.3" {...LIT} />
        <path {...DARK} d="M6 14.8h12c-.6 2.2-2.6 3.8-5 3.8h-2c-2.4 0-4.4-1.6-5-3.8Z" />
        <path fill="currentColor" d="M12 2.2c1.9 2.2 3 3.5 3 5a3 3 0 1 1-6 0c0-1.5 1.1-2.8 3-5Z" />
        <path {...LIT} d="M12 2.2c.8.9 1.4 1.6 1.8 2.2-.5.9-1.2 1.4-1.8 1.5Z" />
    </>
);

const Visions: Glyph = () => (
    <>
        <path
            fill="currentColor"
            d="M12 4.4c5 0 9.2 3.4 10.8 7.6C21.2 16.2 17 19.6 12 19.6S2.8 16.2 1.2 12C2.8 7.8 7 4.4 12 4.4Z"
        />
        <circle cx="12" cy="12" r="4.6" {...DARK} />
        <circle cx="12" cy="12" r="2.4" {...LIT} />
        <path {...LIT} d="M12 4.4c3.6 0 6.9 1.8 8.9 4.4-2.4-1.4-5.4-2.2-8.9-2.2s-6.5.8-8.9 2.2C5.1 6.2 8.4 4.4 12 4.4Z" />
    </>
);

const LibraryG: Glyph = () => (
    <>
        <rect x="2.4" y="5" width="4.4" height="15" rx="1.2" fill="currentColor" />
        <rect x="7.6" y="3.4" width="4.4" height="16.6" rx="1.2" fill="currentColor" fillOpacity={0.85} />
        <rect
            x="13.4"
            y="6.6"
            width="4.4"
            height="13.4"
            rx="1.2"
            fill="currentColor"
            transform="rotate(-11 15.6 13.3)"
        />
        <rect x="2.4" y="5" width="4.4" height="3" rx="1.2" {...LIT} />
        <rect x="7.6" y="3.4" width="4.4" height="3" rx="1.2" {...LIT} />
        <rect x="3.2" y="12" width="2.8" height="1.4" rx="0.7" {...DARK} />
        <rect x="8.4" y="10.6" width="2.8" height="1.4" rx="0.7" {...DARK} />
    </>
);

const Archive: Glyph = () => (
    <>
        <circle cx="12" cy="7.4" r="3.6" fill="currentColor" />
        <path fill="currentColor" d="M12 12.2c3.5 0 6.4 2.2 6.4 4.9v2.7H5.6v-2.7c0-2.7 2.9-4.9 6.4-4.9Z" />
        <circle cx="4.8" cy="9.4" r="2.6" fill="currentColor" fillOpacity={0.68} />
        <circle cx="19.2" cy="9.4" r="2.6" fill="currentColor" fillOpacity={0.68} />
        <path fill="currentColor" fillOpacity={0.55} d="M4.8 13c1 0 2 .2 2.8.6-1 1-1.6 2.2-1.6 3.5v2.7H1v-2.4c0-2.4 1.7-4.4 3.8-4.4Z" />
        <path fill="currentColor" fillOpacity={0.55} d="M19.2 13c-1 0-2 .2-2.8.6 1 1 1.6 2.2 1.6 3.5v2.7H23v-2.4c0-2.4-1.7-4.4-3.8-4.4Z" />
        <circle cx="12" cy="6.4" r="1.8" {...LIT} />
    </>
);

const FilesG: Glyph = () => (
    <>
        <path fill="currentColor" d="M2.4 6.2a2 2 0 0 1 2-2h4.4l2.2 2.4h8.6a2 2 0 0 1 2 2v9.2a2 2 0 0 1-2 2H4.4a2 2 0 0 1-2-2Z" />
        <path {...DARK} d="M2.4 9.4h19.2v8.4a2 2 0 0 1-2 2H4.4a2 2 0 0 1-2-2Z" />
        <path {...LIT} d="M2.4 6.2a2 2 0 0 1 2-2h4.4l2.2 2.4H2.4Z" />
        <rect x="5" y="12" width="8" height="1.5" rx="0.75" {...LIT} />
    </>
);

const CalculatorG: Glyph = () => (
    <>
        <rect x="3.6" y="1.8" width="16.8" height="20.4" rx="2.6" fill="currentColor" />
        <rect x="5.8" y="4" width="12.4" height="4.4" rx="1.2" {...DARK} />
        <rect x="6.8" y="5.4" width="6" height="1.6" rx="0.8" {...LIT} />
        {[0, 1, 2].map((r) =>
            [0, 1, 2].map((c) => (
                <rect
                    key={`${r}-${c}`}
                    x={5.9 + c * 4.1}
                    y={10.2 + r * 3.5}
                    width="3"
                    height="2.6"
                    rx="0.9"
                    {...LIT}
                />
            )),
        )}
    </>
);

const PaintG: Glyph = () => (
    <>
        <path
            fill="currentColor"
            d="M12 2.4c5.6 0 10 3.8 10 8.4 0 3-2.2 4.6-4.6 4.6h-1.8c-1.2 0-2 .8-2 1.8 0 .5.2.9.5 1.3.3.4.5.8.5 1.3 0 1-.9 1.8-2.2 1.8-5.6 0-10.4-4.3-10.4-9.6S6.4 2.4 12 2.4Z"
        />
        <path {...LIT} d="M12 2.4c4.2 0 7.8 2.1 9.3 5.1-2-1.6-5.3-2.7-9.3-2.7s-7.3 1.1-9.3 2.7C4.2 4.5 7.8 2.4 12 2.4Z" />
        <circle cx="7.4" cy="8.6" r="1.7" {...DARK} />
        <circle cx="12" cy="6.8" r="1.7" {...DARK} />
        <circle cx="16.6" cy="8.6" r="1.7" {...DARK} />
        <circle cx="6.4" cy="14" r="1.7" {...DARK} />
    </>
);

const NotepadG: Glyph = () => (
    <>
        <path fill="currentColor" d="M4.6 3.4a2 2 0 0 1 2-2h7.2l5.6 5.6v13.6a2 2 0 0 1-2 2H6.6a2 2 0 0 1-2-2Z" />
        <path {...LIT} d="M13.8 1.4 19.4 7h-4.6a1 1 0 0 1-1-1Z" />
        <rect x="7.2" y="10" width="9.6" height="1.6" rx="0.8" {...DARK} />
        <rect x="7.2" y="13.4" width="9.6" height="1.6" rx="0.8" {...DARK} />
        <rect x="7.2" y="16.8" width="6" height="1.6" rx="0.8" {...DARK} />
    </>
);

const AccountG: Glyph = () => (
    <>
        <circle cx="12" cy="7.6" r="4.6" fill="currentColor" />
        <path fill="currentColor" d="M12 13.8c4.6 0 8.4 2.9 8.4 6.4v1.4H3.6v-1.4c0-3.5 3.8-6.4 8.4-6.4Z" />
        <circle cx="12" cy="6.4" r="2.4" {...LIT} />
        <path {...DARK} d="M12 13.8c1.5 0 3 .3 4.3.9-1.2 1.2-2.7 1.9-4.3 1.9s-3.1-.7-4.3-1.9c1.3-.6 2.8-.9 4.3-.9Z" />
    </>
);

const SettingsG: Glyph = () => (
    <>
        {Array.from({ length: 8 }).map((_, i) => (
            <rect
                key={i}
                x="10.6"
                y="0.8"
                width="2.8"
                height="6"
                rx="1.1"
                fill="currentColor"
                transform={`rotate(${i * 45} 12 12)`}
            />
        ))}
        <circle cx="12" cy="12" r="7.4" fill="currentColor" />
        <circle cx="12" cy="12" r="7.4" {...LIT} />
        <circle cx="12" cy="12" r="5.6" fill="currentColor" />
        <circle cx="12" cy="12" r="2.8" {...DARK} />
    </>
);

const AdminG: Glyph = () => (
    <>
        <path fill="currentColor" d="M12 1.6 20.8 4.6v7c0 5-3.7 9.4-8.8 10.8C6.9 21 3.2 16.6 3.2 11.6v-7Z" />
        <path {...LIT} d="M12 1.6 20.8 4.6v7c0 .5 0 1-.1 1.5C17.5 11 14.8 10.2 12 10.2Z" />
        <path {...DARK} d="m11 14.9-2.5-2.5-1.6 1.6L11 18l6.1-6.1-1.6-1.6Z" />
    </>
);

const ChamberG: Glyph = () => (
    <>
        <path fill="currentColor" d="M3.6 10.6a8.4 8.4 0 0 1 16.8 0v11.2H3.6Z" />
        <path {...DARK} d="M6.6 10.8a5.4 5.4 0 0 1 10.8 0v11H6.6Z" />
        <path fill="currentColor" fillOpacity={0.9} d="M8.8 11a3.2 3.2 0 0 1 6.4 0v10.8H8.8Z" />
        <path {...LIT} d="M3.6 10.6a8.4 8.4 0 0 1 8.4-8.4v2.8a5.6 5.6 0 0 0-5.6 5.6Z" />
        <circle cx="13.8" cy="16.2" r="1" {...DARK} />
    </>
);

const TerminalG: Glyph = () => (
    <>
        <rect x="1.6" y="3.4" width="20.8" height="17.2" rx="2.8" fill="currentColor" />
        <rect x="1.6" y="3.4" width="20.8" height="4" rx="2.6" {...LIT} />
        <circle cx="4.8" cy="5.4" r="0.85" {...DARK} />
        <circle cx="7.4" cy="5.4" r="0.85" {...DARK} />
        <path
            {...DARK}
            d="m6.6 10.4 3.6 3.1-3.6 3.1-1.3-1.5 1.9-1.6-1.9-1.6Z"
        />
        <rect x="11.6" y="15" width="6.4" height="1.8" rx="0.9" {...DARK} />
    </>
);

const MediaG: Glyph = () => (
    <>
        <rect x="1.6" y="3.6" width="20.8" height="16.8" rx="2.6" fill="currentColor" />
        <rect x="1.6" y="3.6" width="3.6" height="16.8" {...DARK} />
        <rect x="18.8" y="3.6" width="3.6" height="16.8" {...DARK} />
        {[0, 1, 2, 3].map((i) => (
            <rect key={`l${i}`} x="2.6" y={5.2 + i * 4} width="1.6" height="2.4" rx="0.5" {...LIT} />
        ))}
        {[0, 1, 2, 3].map((i) => (
            <rect key={`r${i}`} x="19.8" y={5.2 + i * 4} width="1.6" height="2.4" rx="0.5" {...LIT} />
        ))}
        <path {...LIT} d="m10 8.4 6 3.6-6 3.6Z" />
    </>
);

const PhotosG: Glyph = () => (
    <>
        <rect x="2" y="4" width="20" height="16" rx="2.6" fill="currentColor" />
        <circle cx="8" cy="9.4" r="2.1" {...LIT} />
        <path {...DARK} d="M2 16.6 8.8 11l4.4 4.2 3.4-2.8L22 17.6v-.2a2.6 2.6 0 0 1-2.6 2.6H4.6A2.6 2.6 0 0 1 2 17.4Z" />
        <path {...LIT} d="M2 6.6A2.6 2.6 0 0 1 4.6 4h14.8A2.6 2.6 0 0 1 22 6.6Z" />
    </>
);

const ClockG: Glyph = () => (
    <>
        <circle cx="12" cy="12" r="10.2" fill="currentColor" />
        <circle cx="12" cy="12" r="10.2" {...LIT} />
        <circle cx="12" cy="12" r="8.2" fill="currentColor" />
        <rect x="11.1" y="5.6" width="1.9" height="7.2" rx="0.95" {...DARK} />
        <rect x="11.1" y="11.1" width="6.2" height="1.9" rx="0.95" {...DARK} />
        <circle cx="12" cy="12" r="1.3" {...LIT} />
    </>
);

const TaskmgrG: Glyph = () => (
    <>
        <rect x="2" y="4" width="20" height="16" rx="2.6" fill="currentColor" />
        <rect x="2" y="4" width="20" height="3.4" rx="2.4" {...LIT} />
        <rect x="4.8" y="13.4" width="3" height="4.2" rx="1" {...DARK} />
        <rect x="9.2" y="10.4" width="3" height="7.2" rx="1" {...DARK} />
        <rect x="13.6" y="12" width="3" height="5.6" rx="1" {...DARK} />
        <rect x="18" y="9" width="3" height="8.6" rx="1" {...DARK} />
    </>
);

const BrowserG: Glyph = () => (
    <>
        <circle cx="12" cy="12" r="10.2" fill="currentColor" />
        <path {...LIT} d="M12 1.8a10.2 10.2 0 0 1 8.9 5.2H3.1A10.2 10.2 0 0 1 12 1.8Z" />
        <ellipse cx="12" cy="12" rx="4.3" ry="10.2" {...DARK} />
        <rect x="1.8" y="11" width="20.4" height="2" rx="1" {...DARK} />
        <circle cx="12" cy="12" r="10.2" fill="none" stroke="#000" strokeOpacity={0.22} strokeWidth="1.4" />
    </>
);

const MusicG: Glyph = () => (
    <>
        <path fill="currentColor" d="M9.6 4.2 20 2v3.6L9.6 7.8Z" />
        <rect x="8" y="4.4" width="2" height="12.4" rx="1" fill="currentColor" />
        <rect x="18.4" y="2.2" width="2" height="10.6" rx="1" fill="currentColor" />
        <ellipse cx="6" cy="17.4" rx="4" ry="3.2" fill="currentColor" />
        <ellipse cx="16.4" cy="13.4" rx="4" ry="3.2" fill="currentColor" />
        <ellipse cx="6" cy="16.6" rx="2.4" ry="1.8" {...DARK} />
        <ellipse cx="16.4" cy="12.6" rx="2.4" ry="1.8" {...DARK} />
        <path {...LIT} d="M9.6 4.2 20 2v1.5L9.6 5.7Z" />
    </>
);

const TasksG: Glyph = () => (
    <>
        <rect x="2.4" y="2.6" width="19.2" height="18.8" rx="2.8" fill="currentColor" />
        <rect x="2.4" y="2.6" width="19.2" height="3.6" rx="2.6" {...LIT} />
        <rect x="11" y="9" width="8.4" height="1.9" rx="0.95" {...DARK} />
        <rect x="11" y="13.6" width="8.4" height="1.9" rx="0.95" {...DARK} />
        <rect x="11" y="18" width="5.4" height="1.9" rx="0.95" {...DARK} />
        <path {...LIT} d="m7.6 8.4-2.9 3.1-1.5-1.4-1 1.1 2.5 2.6 3.9-4.3Z" />
        <path {...DARK} d="M4.4 16.8h4.2v1.8H4.4Z" />
    </>
);

const JourneyG: Glyph = () => (
    <>
        <circle cx="12" cy="12" r="10.2" fill="currentColor" />
        <circle cx="12" cy="12" r="10.2" {...LIT} />
        <circle cx="12" cy="12" r="8.3" fill="currentColor" />
        <circle cx="12" cy="12" r="8.3" {...DARK} />
        {/* Needle: lit north half, shadowed south half */}
        <path {...LIT} d="M12 12 16.4 7.6 13.7 13.2Z" />
        <path fill="#fff" fillOpacity={0.75} d="M12 12 7.6 16.4 10.3 10.8Z" />
        <circle cx="12" cy="12" r="1.15" fill="currentColor" />
        {[0, 90, 180, 270].map((a) => (
            <rect
                key={a}
                x="11.5"
                y="2.5"
                width="1"
                height="1.9"
                rx="0.5"
                {...LIT}
                transform={`rotate(${a} 12 12)`}
            />
        ))}
    </>
);

const VaultG: Glyph = () => (
    <>
        {/* Pack body with a lid flap and buckles */}
        <path fill="currentColor" d="M5 9.4a5.6 5.6 0 0 1 5.6-5.6h2.8A5.6 5.6 0 0 1 19 9.4v9.4a2.8 2.8 0 0 1-2.8 2.8H7.8A2.8 2.8 0 0 1 5 18.8Z" />
        <path {...LIT} d="M8.6 4.6a5.6 5.6 0 0 1 2-.8v3.6a2 2 0 0 0 4 0V3.8c.72.15 1.4.42 2 .8v2.9a4 4 0 0 1-8 0Z" />
        <path {...DARK} d="M5 11.6h14v4.2H5Z" />
        <rect x="9.4" y="12.4" width="5.2" height="2.6" rx="0.8" {...LIT} />
        <rect x="7.2" y="17.6" width="2.2" height="1.7" rx="0.6" {...LIT} />
        <rect x="14.6" y="17.6" width="2.2" height="1.7" rx="0.6" {...LIT} />
    </>
);

/* ── registry ───────────────────────────────────────────── */

const GLYPHS: Record<OsAppId, Glyph> = {
    truth: Truth,
    updates: Updates,
    ledger: Ledger,
    soul: Soul,
    arcade: Arcade,
    offering: Offering,
    library: LibraryG,
    archive: Archive,
    files: FilesG,
    calculator: CalculatorG,
    paint: PaintG,
    notepad: NotepadG,
    account: AccountG,
    settings: SettingsG,
    admin: AdminG,
    chamber: ChamberG,
    terminal: TerminalG,
    media: MediaG,
    photos: PhotosG,
    clock: ClockG,
    taskmgr: TaskmgrG,
    browser: BrowserG,
    music: MusicG,
    tasks: TasksG,
    wall: PaintG,
    studio: MediaG,
};

export function OsGlyph({ app, size = 20 }: { app: OsAppId; size?: number }) {
    const G = GLYPHS[app] ?? Truth;
    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            aria-hidden
            focusable="false"
            className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.35)]"
        >
            <G />
        </svg>
    );
}

export function hasGlyph(app: OsAppId): boolean {
    return app in GLYPHS;
}
