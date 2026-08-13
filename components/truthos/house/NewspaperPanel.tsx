'use client';

/**
 * The Daily Word — morning paper from live RSS.
 * One lead, two columns of briefs, three desks. Paper stock, not a feed dump.
 */
import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { useMarkPaperRead } from './usePaperWaiting';

type Feeds = {
    breaking?: string[];
    finance?: string[];
    geopolitics?: string[];
    health?: string[];
    error?: string;
};

function clean(line: string): string {
    return line
        .replace(/^[^\w"'(]+/, '')
        .replace(/^(BREAKING|FINANCE|GEO-POLITICS|HEALTH):\s*/i, '')
        .trim();
}

const DEAD_FEED = /real-?time updates currently unavailable|check back later/i;

function headlines(lines: string[] | undefined): string[] {
    return (lines ?? []).map(clean).filter((h) => h && !DEAD_FEED.test(h));
}

const DESKS: { key: keyof Feeds; label: string }[] = [
    { key: 'geopolitics', label: 'World' },
    { key: 'finance', label: 'Markets' },
    { key: 'health', label: 'Body' },
];

export default function NewspaperPanel({ onClose }: { onClose: () => void }) {
    const [feeds, setFeeds] = useState<Feeds | null>(null);
    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [nonce, setNonce] = useState(0);
    const markRead = useMarkPaperRead();

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
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
    const edition = useMemo(
        () => Math.floor((today.getTime() - Date.UTC(2026, 0, 1)) / 86_400_000) + 1,
        [today],
    );

    const breaking = headlines(feeds?.breaking);
    const lead = breaking[0] ?? null;
    const briefs = breaking.slice(1, 7);
    const drop = lead?.charAt(0) ?? '';
    const rest = lead?.slice(1) ?? '';

    return (
        <div
            className="h-full flex flex-col min-h-[280px] text-[#2a2218]"
            style={{
                background: '#f3ead4',
                backgroundImage:
                    'linear-gradient(180deg, rgba(255,255,255,0.35), transparent 28%), repeating-linear-gradient(0deg, transparent, transparent 27px, rgba(42,34,24,0.035) 28px)',
            }}
        >
            <header className="shrink-0 px-5 pt-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                    <p className="text-[10px] tracking-[0.38em] uppercase text-[#7a6a52] font-medium">
                        {dateLine}
                    </p>
                    <button
                        type="button"
                        onClick={() => {
                            onClose();
                            sacredUi.click();
                        }}
                        className="shrink-0 w-9 h-9 rounded-full border border-[#2a2218]/20 flex items-center justify-center hover:bg-[#2a2218]/8 touch-manipulation"
                        aria-label="Put the paper down"
                    >
                        <X size={14} />
                    </button>
                </div>
                <div className="text-center mt-1 mb-2">
                    <p className="text-[9px] tracking-[0.52em] uppercase text-[#9a8460]">The Sanctum</p>
                    <h1
                        className="mt-1 text-[2rem] sm:text-[2.45rem] leading-none font-semibold text-[#1c1610]"
                        style={{ fontFamily: 'var(--font-ritual, Palatino, "Palatino Linotype", "Book Antiqua", serif)' }}
                    >
                        The Daily Word
                    </h1>
                    <div className="mt-2 flex items-center gap-3 justify-center">
                        <span className="h-px w-10 bg-[#2a2218]/25" />
                        <p className="text-[10px] tracking-[0.28em] uppercase text-[#7a6a52]">
                            Morning edition · No. {edition}
                        </p>
                        <span className="h-px w-10 bg-[#2a2218]/25" />
                    </div>
                </div>
                <div className="h-[2px] bg-[#2a2218]" />
                <div className="h-px bg-[#2a2218] mt-[3px]" />
            </header>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-6">
                {loading && (
                    <p className="text-center text-[13px] text-[#7a6a52] py-14 italic">
                        The press is running…
                    </p>
                )}

                {!loading && failed && (
                    <div className="py-10 text-center max-w-sm mx-auto">
                        <p
                            className="text-xl font-semibold leading-snug"
                            style={{ fontFamily: 'Palatino, "Palatino Linotype", serif' }}
                        >
                            The wire is quiet this hour.
                        </p>
                        <p className="mt-3 text-[13.5px] leading-relaxed text-[#5c5140]">
                            No dispatches reached the house. The paper will print again when the line
                            comes back.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setNonce((n) => n + 1);
                                sacredUi.click();
                            }}
                            className="mt-5 inline-flex items-center gap-2 px-4 py-2 border border-[#2a2218]/30 text-[12px] tracking-wide hover:bg-[#2a2218]/6 min-h-[40px] touch-manipulation"
                        >
                            <RefreshCw size={12} /> Try the wire
                        </button>
                    </div>
                )}

                {!loading && !failed && !lead && (
                    <p className="text-center text-[13px] text-[#7a6a52] py-14 italic">
                        No dispatches came over the wire this morning.
                    </p>
                )}

                {!loading && !failed && lead && (
                    <>
                        <article className="pt-1 pb-5 border-b border-[#2a2218]/20">
                            <p className="text-[10px] tracking-[0.34em] uppercase text-[#8b2e2e] font-semibold mb-2">
                                The lead
                            </p>
                            <h2
                                className="text-[1.45rem] sm:text-[1.7rem] leading-[1.22] font-semibold text-[#1c1610]"
                                style={{ fontFamily: 'Palatino, "Palatino Linotype", "Book Antiqua", serif' }}
                            >
                                <span className="float-left text-[3.4rem] leading-[0.8] pr-2 pt-1 font-semibold">
                                    {drop}
                                </span>
                                {rest}
                            </h2>
                        </article>

                        {briefs.length > 0 && (
                            <section className="py-4 border-b border-[#2a2218]/20">
                                <p className="text-[10px] tracking-[0.32em] uppercase text-[#7a6a52] mb-3">
                                    Also this morning
                                </p>
                                <ul className="columns-1 sm:columns-2 gap-8">
                                    {briefs.map((h, i) => (
                                        <li
                                            key={i}
                                            className="break-inside-avoid mb-3 text-[14px] leading-[1.45] pl-3 border-l border-[#2a2218]/25"
                                        >
                                            {h}
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        )}

                        <section className="grid sm:grid-cols-3 gap-6 pt-4">
                            {DESKS.map((d) => {
                                const items = headlines(feeds?.[d.key] as string[]).slice(0, 4);
                                if (!items.length) return null;
                                return (
                                    <div key={d.key}>
                                        <p className="text-[10px] tracking-[0.32em] uppercase text-[#7a6a52] pb-1.5 mb-2.5 border-b border-[#2a2218]/25">
                                            {d.label}
                                        </p>
                                        <ul className="space-y-2.5">
                                            {items.map((h, i) => (
                                                <li key={i} className="text-[13.5px] leading-[1.45]">
                                                    {h}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                );
                            })}
                        </section>

                        <p className="mt-8 pt-3 border-t border-[#2a2218]/15 text-[10px] tracking-wide text-[#8a7b64] text-center leading-relaxed">
                            Public wires · BBC World · CNBC · Defense One · NYT Health
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
