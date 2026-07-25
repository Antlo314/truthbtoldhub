'use client';

/**
 * The morning paper — a real front page built from live RSS.
 *
 * Pulls the existing /api/ticker feed (BBC World, CNBC, Defense One, NYT
 * Health — all free public RSS) and lays it out as newsprint: masthead with
 * today's date, a lead story, then columns by desk. Edition is keyed to the
 * calendar day, so the paper genuinely changes each morning.
 *
 * Fails soft: if the network is down the paper still prints, with an honest
 * "wire is down" notice rather than an empty page or invented headlines.
 */
import { useEffect, useMemo, useState } from 'react';
import { Newspaper, RefreshCw, X } from 'lucide-react';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { useMarkPaperRead } from './usePaperWaiting';

type Feeds = {
    breaking?: string[];
    finance?: string[];
    geopolitics?: string[];
    health?: string[];
    error?: string;
};

/** The API prefixes each line with an emoji + desk label; strip it for print */
function clean(line: string): string {
    return line
        .replace(/^[^\w"'(]+/, '')
        .replace(/^(BREAKING|FINANCE|GEO-POLITICS|HEALTH):\s*/i, '')
        .trim();
}

/**
 * When a feed is unreachable the API substitutes a placeholder line. Printing
 * that as a headline would read as a real story about nothing, so a dead desk
 * is dropped from the paper entirely instead.
 */
const DEAD_FEED = /real-?time updates currently unavailable|check back later/i;

function headlines(lines: string[] | undefined): string[] {
    return (lines ?? []).map(clean).filter((h) => h && !DEAD_FEED.test(h));
}

const DESKS: { key: keyof Feeds; label: string; accent: string }[] = [
    { key: 'geopolitics', label: 'World', accent: 'text-amber-800' },
    { key: 'finance', label: 'Markets', accent: 'text-emerald-800' },
    { key: 'health', label: 'Health', accent: 'text-rose-800' },
];

export default function NewspaperPanel({ onClose }: { onClose: () => void }) {
    const [feeds, setFeeds] = useState<Feeds | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [nonce, setNonce] = useState(0);
    const markRead = useMarkPaperRead();

    // Opening the paper is what marks the edition read — the flag drops
    useEffect(() => {
        markRead();
    }, [markRead]);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        setFailed(false);
        fetch('/api/ticker')
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then((d: Feeds) => {
                if (!alive) return;
                setFeeds(d);
                setFailed(!!d.error);
            })
            .catch(() => alive && setFailed(true))
            .finally(() => alive && setLoading(false));
        return () => {
            alive = false;
        };
    }, [nonce]);

    const today = useMemo(() => new Date(), []);
    const dateLine = today.toLocaleDateString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    // Edition number advances one per day since launch — a paper has a number
    const edition = useMemo(
        () => Math.floor((today.getTime() - Date.UTC(2026, 0, 1)) / 86_400_000) + 1,
        [today],
    );

    const breaking = headlines(feeds?.breaking);
    const lead = breaking[0] ?? null;

    return (
        <div className="h-full flex flex-col bg-[#efe7d6] text-[#241f18] min-h-[280px]">
            {/* Masthead */}
            <div className="shrink-0 px-4 pt-3 pb-2 border-b-2 border-[#241f18]">
                <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 text-center">
                        <p className="text-[9px] uppercase tracking-[0.42em] text-[#6b5f4c]">
                            The Sanctum
                        </p>
                        <h1
                            className="text-2xl sm:text-3xl font-black tracking-tight leading-none"
                            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
                        >
                            THE DAILY WORD
                        </h1>
                        <p className="text-[9px] uppercase tracking-[0.22em] text-[#6b5f4c] mt-1">
                            {dateLine} · No. {edition}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            sacredUi.click();
                        }}
                        className="shrink-0 w-9 h-9 rounded-lg border border-[#241f18]/25 flex items-center justify-center hover:bg-[#241f18]/10 touch-manipulation"
                        aria-label="Put the paper down"
                    >
                        <X size={15} />
                    </button>
                </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
                {loading && (
                    <p className="text-center text-[12px] text-[#6b5f4c] py-10 font-mono">
                        the press is running…
                    </p>
                )}

                {!loading && failed && (
                    <div className="border border-[#241f18]/25 bg-[#e4d9c2] p-4 text-center">
                        <Newspaper size={20} className="mx-auto mb-2 opacity-60" />
                        <p className="text-[13px] font-semibold">The wire is down.</p>
                        <p className="text-[11px] text-[#6b5f4c] mt-1 leading-relaxed">
                            No dispatches reached the house this morning. The paper prints
                            again when the connection returns.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setNonce((n) => n + 1);
                                sacredUi.click();
                            }}
                            className="mt-3 inline-flex items-center gap-1.5 px-3 py-2 border border-[#241f18]/35 text-[11px] font-semibold hover:bg-[#241f18]/10 min-h-[38px] touch-manipulation"
                        >
                            <RefreshCw size={12} /> Try the wire again
                        </button>
                    </div>
                )}

                {!loading && !failed && !breaking.length && (
                    <p className="text-center text-[12px] text-[#6b5f4c] py-10">
                        No dispatches came over the wire this morning.
                    </p>
                )}

                {!loading && !failed && breaking.length > 0 && (
                    <>
                        {/* Lead story */}
                        {lead && (
                            <div className="border-b border-[#241f18]/25 pb-3 mb-3">
                                <p className="text-[9px] uppercase tracking-[0.3em] text-[#8a2b2b] font-bold">
                                    Breaking
                                </p>
                                <h2
                                    className="text-lg sm:text-xl font-bold leading-snug mt-1"
                                    style={{ fontFamily: 'Georgia, serif' }}
                                >
                                    {lead}
                                </h2>
                            </div>
                        )}

                        {/* Remaining breaking, set as a column of briefs */}
                        {breaking.length > 1 && (
                            <div className="mb-4">
                                <p className="text-[9px] uppercase tracking-[0.28em] text-[#6b5f4c] font-bold border-b border-[#241f18]/20 pb-1 mb-2">
                                    Also this morning
                                </p>
                                <ul className="space-y-1.5 sm:columns-2 sm:gap-5">
                                    {breaking.slice(1, 7).map((h, i) => (
                                        <li
                                            key={i}
                                            className="text-[12px] leading-snug break-inside-avoid pl-3 relative"
                                        >
                                            <span className="absolute left-0 top-[0.42em] w-1 h-1 rounded-full bg-[#241f18]/50" />
                                            {h}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* Desks */}
                        <div className="grid sm:grid-cols-3 gap-4">
                            {DESKS.map((d) => {
                                const items = headlines(feeds?.[d.key] as string[]).slice(0, 4);
                                if (!items.length) return null;
                                return (
                                    <div key={d.key}>
                                        <p
                                            className={`text-[9px] uppercase tracking-[0.28em] font-bold border-b border-[#241f18]/20 pb-1 mb-2 ${d.accent}`}
                                        >
                                            {d.label}
                                        </p>
                                        <ul className="space-y-2">
                                            {items.map((h, i) => (
                                                <li key={i} className="text-[11.5px] leading-snug">
                                                    {h}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                        </div>

                        <p className="mt-5 pt-2 border-t border-[#241f18]/20 text-[9px] text-[#6b5f4c] text-center leading-relaxed">
                            Wire copy from public feeds — BBC World, CNBC, Defense One and
                            NYT Health. Headlines are reproduced as filed.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
