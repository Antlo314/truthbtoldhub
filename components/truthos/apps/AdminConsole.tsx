'use client';

/**
 * Quick Admin Console for Architects (iamwhoiambook@gmail.com, etc.)
 * Fast post / pin / list — no full hut-admin page required for daily updates.
 */
import { useCallback, useEffect, useState } from 'react';
import {
    createBulletin,
    fetchBulletins,
    updateBulletin,
    deleteBulletin,
    announceInSanctum,
    type Bulletin,
} from '@/lib/game/hut';
import { sacredUi } from '@/lib/game/sacredUiSfx';

export default function AdminConsole() {
    const [rows, setRows] = useState<Bulletin[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [pinned, setPinned] = useState(false);
    const [announce, setAnnounce] = useState(true);
    const [posting, setPosting] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            setRows(await fetchBulletins(20));
        } catch {
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const post = async () => {
        if (!title.trim() || !body.trim()) {
            setMsg('Title and body required.');
            return;
        }
        setPosting(true);
        setMsg(null);
        try {
            const today = new Date().toISOString().slice(0, 10);
            await createBulletin({
                title: title.trim(),
                body: body.trim(),
                pinned,
                published_at: today,
            });
            if (announce) {
                try {
                    await announceInSanctum(`📢 ${title.trim()}\n${body.trim().slice(0, 280)}`);
                } catch {
                    /* hall optional */
                }
            }
            setTitle('');
            setBody('');
            setPinned(false);
            sacredUi.access();
            setMsg('Published.');
            await refresh();
        } catch (e) {
            setMsg(e instanceof Error ? e.message : 'Post failed');
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="h-full overflow-y-auto bg-[#0f1115] text-zinc-200 text-sm">
            <div className="sticky top-0 z-10 px-4 py-3 border-b border-white/10 bg-[#12151c]">
                <p className="text-[10px] uppercase tracking-[0.3em] font-mono text-rose-400/90">Admin Console</p>
                <p className="text-white font-semibold mt-0.5">Quick updates</p>
            </div>

            <div className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-2">
                    <a
                        href="/hut-admin"
                        onClick={() => sacredUi.click()}
                        className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-center text-[11px] hover:bg-white/[0.08]"
                    >
                        Full console
                    </a>
                    <a
                        href="/archive"
                        onClick={() => sacredUi.click()}
                        className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-center text-[11px] hover:bg-white/[0.08]"
                    >
                        Hall
                    </a>
                    <a
                        href="/library"
                        onClick={() => sacredUi.click()}
                        className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-center text-[11px] hover:bg-white/[0.08]"
                    >
                        Library
                    </a>
                </div>

                <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3 space-y-2">
                    <p className="text-[10px] uppercase tracking-widest text-rose-300/80 font-mono">New dispatch</p>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Title"
                        maxLength={120}
                        className="w-full rounded-lg bg-black/50 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-400/40"
                    />
                    <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Body — what should people know?"
                        rows={4}
                        className="w-full rounded-lg bg-black/50 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-rose-400/40 resize-y min-h-[96px]"
                    />
                    <div className="flex flex-wrap gap-3 text-[11px]">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
                            Pin
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} />
                            Announce in Hall
                        </label>
                    </div>
                    <button
                        type="button"
                        disabled={posting}
                        onClick={() => void post()}
                        className="w-full py-2.5 rounded-lg bg-rose-500 text-white text-[12px] font-semibold uppercase tracking-wider disabled:opacity-50 hover:bg-rose-400"
                    >
                        {posting ? 'Publishing…' : 'Publish update'}
                    </button>
                    {msg && (
                        <p className={`text-[11px] font-mono ${msg === 'Published.' ? 'text-emerald-400' : 'text-amber-300'}`}>
                            {msg}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-widest text-white/40 font-mono">Recent</p>
                        <button
                            type="button"
                            onClick={() => void refresh()}
                            className="text-[10px] text-white/40 hover:text-white uppercase tracking-wider"
                        >
                            Refresh
                        </button>
                    </div>
                    {loading && <p className="text-xs text-white/30 font-mono">loading…</p>}
                    {!loading && rows.length === 0 && (
                        <p className="text-xs text-white/40">No bulletins yet.</p>
                    )}
                    <ul className="space-y-2">
                        {rows.map((r) => (
                            <li
                                key={r.id}
                                className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-sm text-white font-medium truncate">
                                            {r.pinned && <span className="text-amber-400 mr-1">📌</span>}
                                            {r.title}
                                        </p>
                                        <p className="text-[11px] text-white/40 line-clamp-2 mt-0.5">{r.body}</p>
                                    </div>
                                    <div className="flex flex-col gap-1 shrink-0">
                                        <button
                                            type="button"
                                            className="text-[9px] uppercase tracking-wider text-white/40 hover:text-amber-300"
                                            onClick={async () => {
                                                await updateBulletin(r.id, { pinned: !r.pinned });
                                                void refresh();
                                            }}
                                        >
                                            {r.pinned ? 'Unpin' : 'Pin'}
                                        </button>
                                        <button
                                            type="button"
                                            className="text-[9px] uppercase tracking-wider text-red-400/70 hover:text-red-300"
                                            onClick={async () => {
                                                if (!confirm('Delete this update?')) return;
                                                await deleteBulletin(r.id);
                                                void refresh();
                                            }}
                                        >
                                            Del
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
