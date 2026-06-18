'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
    Bulletin,
    DispatchMedia,
    fetchBulletins,
    fetchMedia,
    createBulletin,
    updateBulletin,
    deleteBulletin,
    uploadMedia,
    deleteMedia,
    getArchitectStatus,
    formatBytes,
} from '@/lib/game/hut';
import {
    ArrowLeft, Megaphone, FileText, Film, Music, Image as ImageIcon, Link2,
    Pin, PinOff, Trash2, Edit3, Upload, Loader2, Plus, ShieldAlert, ScrollText, X, Eye, Feather,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

const KIND_ICON = { pdf: FileText, video: Film, audio: Music, image: ImageIcon, link: Link2 } as const;
const CATEGORIES = ['General', 'Prophecy', 'History', 'Science', 'Scripture', 'Mission', 'Frequency'];

export default function HutAdminPage() {
    const [mounted, setMounted] = useState(false);
    const [auth, setAuth] = useState<{ signedIn: boolean; isArchitect: boolean; email: string | null } | null>(null);
    const [tab, setTab] = useState<'compose' | 'bulletins' | 'shelf'>('compose');

    const [bulletins, setBulletins] = useState<Bulletin[]>([]);
    const [media, setMedia] = useState<DispatchMedia[]>([]);
    const [loading, setLoading] = useState(true);

    // compose state
    const today = new Date().toISOString().slice(0, 10);
    const [editId, setEditId] = useState<string | null>(null);
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [pinned, setPinned] = useState(false);
    const [pubDate, setPubDate] = useState(today);
    const [posting, setPosting] = useState(false);
    const [msg, setMsg] = useState<string | null>(null);

    // the Quill — Gemini draft assistant
    const [quillTopic, setQuillTopic] = useState('');
    const [quilling, setQuilling] = useState(false);

    // media state
    const [mTitle, setMTitle] = useState('');
    const [mDesc, setMDesc] = useState('');
    const [mCat, setMCat] = useState('General');
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const [query, setQuery] = useState('');

    const refresh = useCallback(async () => {
        setLoading(true);
        const [b, m] = await Promise.all([fetchBulletins(), fetchMedia()]);
        setBulletins(b);
        setMedia(m);
        setLoading(false);
    }, []);

    useEffect(() => {
        setMounted(true);
        getArchitectStatus().then((a) => {
            setAuth(a);
            if (a.isArchitect) refresh();
            else setLoading(false);
        });
    }, [refresh]);

    const flash = (m: string) => {
        setMsg(m);
        setTimeout(() => setMsg(null), 3000);
    };

    const resetCompose = () => {
        setEditId(null);
        setTitle('');
        setBody('');
        setPinned(false);
        setPubDate(today);
    };

    // Ask Gemini (server-side, Architect-gated) to draft the Word in Truth's
    // voice; it fills the title/body for you to edit and post.
    const draftWithQuill = async () => {
        if (!quillTopic.trim()) return flash('Give the Quill a topic.');
        setQuilling(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { flash('Session expired — sign in again.'); return; }
            const res = await fetch('/api/quill', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
                body: JSON.stringify({ topic: quillTopic, kind: 'bulletin' }),
            });
            const data = await res.json();
            if (!res.ok) { flash(data.error || 'The Quill faltered.'); return; }
            if (data.title) setTitle(data.title);
            if (data.body) setBody(data.body);
            flash('The Quill has drafted a word — edit it, then post.');
        } catch {
            flash('The Quill could not reach the well.');
        } finally {
            setQuilling(false);
        }
    };

    const post = async () => {
        if (!title.trim()) return flash('A dispatch needs a title.');
        setPosting(true);
        try {
            if (editId) {
                await updateBulletin(editId, { title, body, pinned, published_at: pubDate });
                flash('Dispatch updated.');
            } else {
                await createBulletin({ title, body, pinned, published_at: pubDate });
                flash('Dispatch posted to the Hut.');
            }
            resetCompose();
            await refresh();
            setTab('bulletins');
        } catch (e: any) {
            flash(e.message || 'Failed.');
        } finally {
            setPosting(false);
        }
    };

    const editBulletin = (b: Bulletin) => {
        setEditId(b.id);
        setTitle(b.title);
        setBody(b.body);
        setPinned(b.pinned);
        setPubDate(b.published_at);
        setTab('compose');
    };

    const removeBulletin = async (id: string) => {
        if (!confirm('Remove this dispatch?')) return;
        try {
            await deleteBulletin(id);
            await refresh();
        } catch (e: any) {
            flash(e.message);
        }
    };

    const togglePin = async (b: Bulletin) => {
        try {
            await updateBulletin(b.id, { pinned: !b.pinned });
            await refresh();
        } catch (e: any) {
            flash(e.message);
        }
    };

    const doUpload = async () => {
        if (!file) return flash('Choose a file first.');
        setUploading(true);
        try {
            await uploadMedia(file, { title: mTitle, description: mDesc, category: mCat });
            flash('Dispatch added to the shelf.');
            setMTitle('');
            setMDesc('');
            setFile(null);
            if (fileRef.current) fileRef.current.value = '';
            await refresh();
        } catch (e: any) {
            flash(e.message);
        } finally {
            setUploading(false);
        }
    };

    const removeMedia = async (item: DispatchMedia) => {
        if (!confirm('Remove this dispatch from the shelf?')) return;
        try {
            await deleteMedia(item);
            await refresh();
        } catch (e: any) {
            flash(e.message);
        }
    };

    if (!mounted) return <div className="min-h-screen bg-void" />;

    // ---- access gate ----
    if (!auth?.isArchitect) {
        return (
            <main className="min-h-screen bg-void text-white flex flex-col items-center justify-center text-center px-6">
                <div className="grain-overlay" />
                <ShieldAlert className="w-10 h-10 text-red-500 mb-4" />
                <h1 className="font-ritual text-2xl gold-shimmer mb-2">Architect Console</h1>
                <p className="text-zinc-500 text-sm max-w-sm mb-6">
                    {auth?.signedIn ? 'Only an Architect may tend Truth’s Hut.' : 'Sign in as an Architect to tend the Hut.'}
                </p>
                <Link href="/world" className="text-xs uppercase tracking-[0.3em] text-aether-gold hover:text-white">↺ Return to the world</Link>
            </main>
        );
    }

    const totalSize = media.reduce((s, m) => s + (m.size_bytes || 0), 0);
    const latest = bulletins[0];
    const filteredBulletins = bulletins.filter((b) => (b.title + b.body).toLowerCase().includes(query.toLowerCase()));
    const filteredMedia = media.filter((m) => (m.title + m.description + m.category).toLowerCase().includes(query.toLowerCase()));

    return (
        <main className="min-h-screen bg-void text-white relative">
            <div className="grain-overlay" />
            <div className="relative z-10 max-w-5xl mx-auto px-4 md:px-6 py-8 pb-24">
                {/* header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <Link href="/world" className="p-2 rounded-full bg-white/5 border border-white/10 text-zinc-400 hover:text-white">
                            <ArrowLeft className="w-4 h-4" />
                        </Link>
                        <div>
                            <p className="text-[9px] tracking-[0.4em] uppercase text-aether-gold/70">Truth's Hut</p>
                            <h1 className="font-ritual text-2xl md:text-3xl font-black gold-shimmer leading-none">Architect Console</h1>
                        </div>
                    </div>
                </div>

                {/* stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                    {[
                        { icon: Megaphone, label: 'Dispatches', val: bulletins.length },
                        { icon: ScrollText, label: 'Shelf Items', val: media.length },
                        { icon: Upload, label: 'Storage', val: formatBytes(totalSize) },
                        { icon: Pin, label: 'Latest', val: latest ? latest.published_at : '—' },
                    ].map(({ icon: Icon, label, val }) => (
                        <div key={label} className="glass bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-aether-gold/10 border border-aether-gold/20 flex items-center justify-center text-aether-gold shrink-0">
                                <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[8px] uppercase tracking-widest text-zinc-500">{label}</p>
                                <p className="text-sm font-black text-white truncate">{val}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* tabs */}
                <div className="flex gap-6 border-b border-white/10 mb-6">
                    {([['compose', 'Compose'], ['bulletins', 'Dispatches'], ['shelf', 'Dispatch Shelf']] as const).map(([id, label]) => (
                        <button
                            key={id}
                            onClick={() => setTab(id)}
                            className={`pb-3 text-[11px] uppercase tracking-[0.2em] font-bold relative transition-colors ${tab === id ? 'text-aether-gold' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            {label}
                            {tab === id && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-aether-gold shadow-[0_0_10px_rgba(251,191,36,0.6)]" />}
                        </button>
                    ))}
                </div>

                {msg && (
                    <div className="mb-5 px-4 py-2.5 rounded-xl bg-aether-gold/10 border border-aether-gold/30 text-[11px] text-aether-gold font-mono tracking-wide">
                        {msg}
                    </div>
                )}

                {/* ---------- COMPOSE ---------- */}
                {tab === 'compose' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            {/* The Quill — Gemini drafts the Word in Truth's voice */}
                            <div className="glass bg-aether-gold/[0.04] border border-aether-gold/20 rounded-2xl p-4 space-y-3">
                                <div className="flex items-center gap-2 text-aether-gold">
                                    <Feather className="w-4 h-4" />
                                    <span className="text-[10px] uppercase tracking-[0.2em] font-black">The Quill · draft in Truth's voice</span>
                                </div>
                                <textarea
                                    value={quillTopic}
                                    onChange={(e) => setQuillTopic(e.target.value)}
                                    placeholder="What should today's Word be about? A theme, a verse, a truth to unveil…"
                                    rows={2}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white leading-relaxed focus:outline-none focus:border-aether-gold resize-none"
                                />
                                <button
                                    onClick={draftWithQuill}
                                    disabled={quilling}
                                    className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.25em] text-aether-gold border border-aether-gold/40 hover:bg-aether-gold/10 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {quilling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Feather className="w-4 h-4" />}
                                    {quilling ? 'The Quill is writing…' : 'Draft with the Quill'}
                                </button>
                                <p className="text-[9px] text-zinc-500 leading-relaxed">The Quill suggests; you edit and post. Drafts come from Gemini — review every word before publishing.</p>
                            </div>

                            <div className="flex items-center justify-between">
                                <h2 className="text-xs uppercase tracking-widest font-black text-zinc-400">{editId ? 'Edit Dispatch' : 'New Daily Dispatch'}</h2>
                                {editId && (
                                    <button onClick={resetCompose} className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-white flex items-center gap-1">
                                        <X className="w-3 h-3" /> New
                                    </button>
                                )}
                            </div>
                            <input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Dispatch title…"
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-base text-white font-ritual focus:outline-none focus:border-aether-gold"
                            />
                            <textarea
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Truth's word for the day… (line breaks preserved)"
                                rows={9}
                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white leading-relaxed focus:outline-none focus:border-aether-gold resize-none"
                            />
                            <div className="flex flex-wrap items-center gap-4">
                                <label className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-zinc-400 cursor-pointer">
                                    <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="accent-amber-500" />
                                    <Pin className="w-3.5 h-3.5" /> Pin to top
                                </label>
                                <label className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-zinc-400">
                                    Date
                                    <input type="date" value={pubDate} onChange={(e) => setPubDate(e.target.value)} className="bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-white" />
                                </label>
                            </div>
                            <button
                                onClick={post}
                                disabled={posting}
                                className="w-full py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}
                            >
                                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                {editId ? 'Update Dispatch' : 'Post Dispatch'}
                            </button>
                        </div>

                        {/* live preview */}
                        <div>
                            <div className="flex items-center gap-2 mb-3 text-zinc-500">
                                <Eye className="w-3.5 h-3.5" />
                                <span className="text-[10px] uppercase tracking-widest font-black">How souls will see it</span>
                            </div>
                            <div className="glass-panel rounded-3xl p-6 border border-[rgba(251,191,36,0.2)]">
                                <p className="text-[10px] tracking-[0.4em] uppercase text-aether-gold/70 mb-1">Truth's Hut</p>
                                <h3 className="font-ritual text-2xl gold-shimmer mb-4">The Daily Dispatch</h3>
                                <div className="glass bg-white/[0.03] border border-white/10 rounded-2xl p-5">
                                    <p className="text-[9px] font-mono uppercase tracking-widest text-aether-gold/60 mb-2 flex items-center gap-2">
                                        {pinned && <Pin className="w-3 h-3" />} {pubDate} · From Truth
                                    </p>
                                    <p className="font-ritual text-white/90 leading-relaxed whitespace-pre-wrap">
                                        {title && <span className="block text-aether-gold font-bold mb-1">{title}</span>}
                                        {body || <span className="text-zinc-600 italic">…the word will appear here.</span>}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ---------- BULLETINS ---------- */}
                {tab === 'bulletins' && (
                    <div className="space-y-3">
                        <input
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search dispatches…"
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-aether-gold mb-2"
                        />
                        {loading ? (
                            <div className="text-center py-10 text-zinc-600"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
                        ) : filteredBulletins.length === 0 ? (
                            <div className="text-center py-12 text-zinc-600 text-xs uppercase tracking-widest">No dispatches yet — compose the first.</div>
                        ) : (
                            filteredBulletins.map((b) => (
                                <div key={b.id} className="glass bg-white/[0.03] border border-white/10 rounded-2xl p-5 group">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                {b.pinned && <Pin className="w-3.5 h-3.5 text-aether-gold shrink-0" />}
                                                <h3 className="font-ritual text-lg text-white truncate">{b.title}</h3>
                                            </div>
                                            <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500 mt-0.5">{b.published_at}</p>
                                            <p className="text-xs text-zinc-400 mt-2 line-clamp-2 whitespace-pre-wrap">{b.body}</p>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button onClick={() => togglePin(b)} title={b.pinned ? 'Unpin' : 'Pin'} className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-aether-gold">
                                                {b.pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                                            </button>
                                            <button onClick={() => editBulletin(b)} title="Edit" className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-white">
                                                <Edit3 className="w-3.5 h-3.5" />
                                            </button>
                                            <button onClick={() => removeBulletin(b.id)} title="Delete" className="p-2 rounded-lg bg-white/5 border border-white/10 text-zinc-400 hover:text-red-500">
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* ---------- DISPATCH SHELF ---------- */}
                {tab === 'shelf' && (
                    <div className="space-y-6">
                        <div className="glass bg-white/[0.03] border border-white/10 rounded-2xl p-5 space-y-4">
                            <h2 className="text-xs uppercase tracking-widest font-black text-zinc-400 flex items-center gap-2"><Upload className="w-4 h-4 text-aether-gold" /> Upload to the Shelf</h2>
                            <div
                                onClick={() => fileRef.current?.click()}
                                className="border-2 border-dashed border-white/15 hover:border-aether-gold/40 rounded-2xl p-6 text-center cursor-pointer transition-colors"
                            >
                                <input ref={fileRef} type="file" className="hidden" accept=".pdf,.mp4,.webm,.mov,.mp3,.wav,.ogg,.m4a,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                                <Upload className="w-6 h-6 mx-auto text-zinc-500 mb-2" />
                                <p className="text-sm text-white">{file ? file.name : 'Choose a PDF, video, audio, or image'}</p>
                                <p className="text-[10px] text-zinc-500 mt-1">{file ? formatBytes(file.size) : 'tap to browse'}</p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <input value={mTitle} onChange={(e) => setMTitle(e.target.value)} placeholder="Title" className="bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-aether-gold" />
                                <select value={mCat} onChange={(e) => setMCat(e.target.value)} className="bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-aether-gold">
                                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <input value={mDesc} onChange={(e) => setMDesc(e.target.value)} placeholder="Short description" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-aether-gold" />
                            <button onClick={doUpload} disabled={uploading || !file} className="w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.3em] text-black flex items-center justify-center gap-2 disabled:opacity-40" style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}>
                                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Add Dispatch
                            </button>
                        </div>

                        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the shelf…" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-aether-gold" />

                        {loading ? (
                            <div className="text-center py-10 text-zinc-600"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
                        ) : filteredMedia.length === 0 ? (
                            <div className="text-center py-12 text-zinc-600 text-xs uppercase tracking-widest">The shelf is empty.</div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {filteredMedia.map((m) => {
                                    const Icon = KIND_ICON[m.kind] || Link2;
                                    return (
                                        <div key={m.id} className="glass bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-aether-gold/10 border border-aether-gold/20 flex items-center justify-center text-aether-gold shrink-0">
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h3 className="text-sm font-bold text-white truncate">{m.title}</h3>
                                                <p className="text-[9px] font-mono uppercase tracking-widest text-zinc-500">{m.kind} · {m.category} · {formatBytes(m.size_bytes)}</p>
                                                {m.description && <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{m.description}</p>}
                                                <div className="flex items-center gap-3 mt-2">
                                                    <a href={m.url} target="_blank" rel="noreferrer" className="text-[10px] uppercase tracking-widest text-aether-gold hover:text-white">Open ↗</a>
                                                    <button onClick={() => removeMedia(m)} className="text-[10px] uppercase tracking-widest text-zinc-500 hover:text-red-500 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Remove</button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
