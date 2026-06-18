'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
    ArrowLeft,
    BookOpen,
    Upload,
    Eye,
    Download,
    Trash2,
    Loader2,
    X,
    FileText,
    FileAudio,
    FileArchive,
    File as FileIcon,
    Image as ImageIcon,
    type LucideIcon,
} from 'lucide-react';
import { isAdminEmail } from '@/lib/adminEmails';

const BUCKET = 'library';

interface LibraryDoc {
    id: string;
    title: string;
    description: string | null;
    category: string;
    file_path: string;
    file_name: string | null;
    file_type: string | null;
    file_size: number | null;
    created_at: string;
}

function iconFor(type: string | null, name: string | null): LucideIcon {
    const t = `${type ?? ''} ${name ?? ''}`.toLowerCase();
    if (t.includes('pdf')) return FileText;
    if (/(image|png|jpe?g|gif|webp|svg|avif)/.test(t)) return ImageIcon;
    if (/(audio|mp3|wav|ogg|m4a|flac)/.test(t)) return FileAudio;
    if (/(zip|rar|7z|tar|gz)/.test(t)) return FileArchive;
    if (/(doc|text|word|rtf|md|txt|epub)/.test(t)) return FileText;
    return FileIcon;
}

function fmtSize(bytes: number | null): string {
    if (bytes == null) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let n = bytes;
    let i = 0;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return `${n.toFixed(i > 0 && n < 10 ? 1 : 0)} ${units[i]}`;
}

function fmtDate(iso: string): string {
    try {
        return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return '';
    }
}

/** Append the download response-modifier to a signed URL (forces save-as). */
function withDownload(url: string, name: string | null): string {
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}download=${encodeURIComponent(name || '')}`;
}

export default function LibraryClient() {
    const router = useRouter();

    const [docs, setDocs] = useState<LibraryDoc[]>([]);
    const [urls, setUrls] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAdmin, setIsAdmin] = useState(false);

    const [activeCat, setActiveCat] = useState('All');

    // Upload form (admin only)
    const [showUpload, setShowUpload] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('General');
    const [file, setFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    async function load() {
        setLoading(true);
        const { data, error: err } = await supabase
            .from('library_documents')
            .select('*')
            .order('created_at', { ascending: false });
        if (err) setError(err.message);
        const rows = (data as LibraryDoc[]) ?? [];
        setDocs(rows);

        // Files live in a PRIVATE bucket — mint short-lived signed URLs that
        // logged-in members can open. (Re-signed on every load.)
        if (rows.length) {
            const { data: signed } = await supabase.storage
                .from(BUCKET)
                .createSignedUrls(rows.map((r) => r.file_path), 28800); // 8 hours
            const map: Record<string, string> = {};
            (signed ?? []).forEach((s, i) => { if (s?.signedUrl) map[rows[i].id] = s.signedUrl; });
            setUrls(map);
        } else {
            setUrls({});
        }
        setLoading(false);
    }

    useEffect(() => {
        load();
        supabase.auth.getSession().then(({ data }) => {
            setIsAdmin(isAdminEmail(data.session?.user?.email));
        });
    }, []);

    const categories = useMemo(() => {
        const set = new Set<string>();
        for (const d of docs) set.add(d.category || 'General');
        return ['All', ...Array.from(set).sort()];
    }, [docs]);

    const visible = activeCat === 'All' ? docs : docs.filter((d) => (d.category || 'General') === activeCat);

    async function handleUpload(e: React.FormEvent) {
        e.preventDefault();
        if (!file || !title.trim() || uploading) return;
        setUploading(true);
        setError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const uid = session?.user?.id ?? null;
            const safeName = file.name.replace(/[^\w.\-]+/g, '_');
            const path = `${Date.now()}_${safeName}`;

            const { error: upErr } = await supabase.storage
                .from(BUCKET)
                .upload(path, file, { contentType: file.type || undefined, upsert: false });
            if (upErr) throw upErr;

            const { error: insErr } = await supabase.from('library_documents').insert({
                title: title.trim(),
                description: description.trim() || null,
                category: category.trim() || 'General',
                file_path: path,
                file_name: file.name,
                file_type: file.type || null,
                file_size: file.size,
                uploaded_by: uid,
            });
            if (insErr) {
                // Don't leave an orphaned object if the metadata insert was rejected.
                await supabase.storage.from(BUCKET).remove([path]);
                throw insErr;
            }

            setTitle('');
            setDescription('');
            setFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            setShowUpload(false);
            await load();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed.');
        } finally {
            setUploading(false);
        }
    }

    async function handleDelete(doc: LibraryDoc) {
        if (!window.confirm(`Remove "${doc.title}" from the Library?`)) return;
        setError(null);
        try {
            // Delete the metadata row first — if that fails (e.g. not authorized),
            // the file stays intact and no broken/linkless card is left behind.
            const { error: delErr } = await supabase.from('library_documents').delete().eq('id', doc.id);
            if (delErr) throw delErr;
            const { error: rmErr } = await supabase.storage.from(BUCKET).remove([doc.file_path]);
            if (rmErr) console.warn('Library file orphaned (row removed):', rmErr.message);
            setDocs((d) => d.filter((x) => x.id !== doc.id));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed.');
        }
    }

    return (
        <div className="relative min-h-[100dvh] bg-black text-white overflow-x-hidden">
            <div className="grain-overlay pointer-events-none" />
            <div
                className="pointer-events-none fixed inset-0"
                style={{ background: 'radial-gradient(120% 70% at 50% -10%, rgba(251,191,36,0.10), transparent 60%)' }}
            />

            <div className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6 pb-24"
                style={{ paddingTop: 'calc(1rem + env(safe-area-inset-top))' }}>

                {/* Header */}
                <header className="flex items-center gap-3 py-4">
                    <button
                        onClick={() => {
                            if (typeof window !== 'undefined' && window.history.length > 1) router.back();
                            else router.push('/');
                        }}
                        className="p-2.5 rounded-full bg-black/45 border border-white/10 text-zinc-200 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                        aria-label="Go back"
                    >
                        <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="grid place-items-center w-10 h-10 rounded-xl border border-[#fbbf24]/30 bg-[#fbbf24]/10 shrink-0">
                            <BookOpen className="w-5 h-5 text-[#fbbf24]" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="font-ritual text-2xl sm:text-3xl font-black uppercase tracking-tight gold-shimmer leading-none">
                                The Library
                            </h1>
                            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-400 mt-1">
                                Scrolls & documents · study and carry forward
                            </p>
                        </div>
                    </div>
                </header>

                {error && (
                    <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 flex items-start gap-2">
                        <X className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="min-w-0 break-words">{error}</span>
                    </div>
                )}

                {/* Admin upload */}
                {isAdmin && (
                    <div className="mb-6">
                        {!showUpload ? (
                            <button
                                onClick={() => setShowUpload(true)}
                                className="flex items-center gap-2 px-5 py-3 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] text-black transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}
                            >
                                <Upload className="w-4 h-4" />
                                Upload a document
                            </button>
                        ) : (
                            <form
                                onSubmit={handleUpload}
                                className="rounded-2xl border border-[#fbbf24]/20 bg-white/[0.03] p-4 sm:p-5 space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <h2 className="font-ritual text-lg text-white">New document</h2>
                                    <button type="button" onClick={() => setShowUpload(false)} className="p-1.5 rounded-full hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]/70" aria-label="Cancel">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Title"
                                    aria-label="Document title"
                                    required
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white font-ritual tracking-wide focus:outline-none focus:border-[#fbbf24]/60 focus-visible:ring-1 focus-visible:ring-[#fbbf24]/40 transition-colors"
                                />
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Description (optional)"
                                    aria-label="Document description"
                                    rows={2}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#fbbf24]/60 focus-visible:ring-1 focus-visible:ring-[#fbbf24]/40 transition-colors resize-none"
                                />
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <input
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        placeholder="Category"
                                        aria-label="Category"
                                        list="library-categories"
                                        className="sm:w-44 bg-black/50 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-[#fbbf24]/60 focus-visible:ring-1 focus-visible:ring-[#fbbf24]/40 transition-colors"
                                    />
                                    <datalist id="library-categories">
                                        {categories.filter((c) => c !== 'All').map((c) => <option key={c} value={c} />)}
                                    </datalist>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                                        required
                                        aria-label="Choose a file to upload"
                                        className="flex-1 text-sm text-zinc-300 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-[#fbbf24]/15 file:text-[#fbbf24] hover:file:bg-[#fbbf24]/25 file:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]/40 rounded-lg"
                                    />
                                </div>
                                <div className="flex items-center gap-3 pt-1">
                                    <button
                                        type="submit"
                                        disabled={uploading || !file || !title.trim()}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-[11px] font-black uppercase tracking-[0.2em] text-black transition-transform active:scale-[0.98] disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                        style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}
                                    >
                                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                        {uploading ? 'Uploading…' : 'Add to Library'}
                                    </button>
                                    {file && <span className="text-[11px] text-zinc-500 truncate">{file.name} · {fmtSize(file.size)}</span>}
                                </div>
                            </form>
                        )}
                    </div>
                )}

                {/* Category filter */}
                {categories.length > 2 && (
                    <div className="flex flex-wrap gap-2 mb-5">
                        {categories.map((c) => (
                            <button
                                key={c}
                                onClick={() => setActiveCat(c)}
                                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-[0.15em] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                                    activeCat === c
                                        ? 'border-[#fbbf24]/60 bg-[#fbbf24]/15 text-[#fbbf24]'
                                        : 'border-white/10 text-zinc-400 hover:text-zinc-200 hover:border-white/20'
                                }`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                )}

                {/* Documents */}
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-zinc-500">
                        <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                ) : visible.length === 0 ? (
                    <div className="flex flex-col items-center text-center py-20 px-4">
                        <div className="grid place-items-center w-14 h-14 rounded-2xl border border-[#fbbf24]/20 bg-[#fbbf24]/[0.06] mb-4">
                            <BookOpen className="w-6 h-6 text-[#fbbf24]/70" />
                        </div>
                        <p className="text-sm text-zinc-400 italic leading-relaxed max-w-sm">
                            {docs.length === 0
                                ? 'The shelves are bare. Documents added here will appear for members to study.'
                                : 'No documents in this category yet.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {visible.map((doc) => {
                            const Icon = iconFor(doc.file_type, doc.file_name);
                            const url = urls[doc.id];
                            return (
                                <article
                                    key={doc.id}
                                    className="group relative flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-[#fbbf24]/25 transition-colors"
                                >
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="grid place-items-center w-11 h-11 rounded-xl border border-[#fbbf24]/25 bg-[#fbbf24]/10 shrink-0">
                                            <Icon className="w-5 h-5 text-[#fbbf24]" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <span className="inline-block text-[10px] font-black uppercase tracking-[0.18em] text-[#fbbf24]/90 mb-1">
                                                {doc.category || 'General'}
                                            </span>
                                            <h3 className="font-ritual text-[15px] text-white leading-snug break-words text-balance">
                                                {doc.title}
                                            </h3>
                                        </div>
                                    </div>

                                    {doc.description && (
                                        <p className="text-xs text-zinc-400 leading-relaxed break-words text-pretty mb-3 line-clamp-3">
                                            {doc.description}
                                        </p>
                                    )}

                                    <div className="mt-auto pt-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-zinc-400">
                                        {doc.file_size ? <span className="tabular-nums">{fmtSize(doc.file_size)}</span> : null}
                                        {doc.file_size ? <span>·</span> : null}
                                        <span>{fmtDate(doc.created_at)}</span>
                                    </div>

                                    <div className="mt-3 flex items-center gap-2">
                                        {url ? (
                                            <>
                                                <a
                                                    href={url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    aria-label={`View ${doc.title}`}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-white/10 text-zinc-200 hover:border-[#fbbf24]/40 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                                >
                                                    <Eye className="w-3.5 h-3.5" /> View
                                                </a>
                                                <a
                                                    href={withDownload(url, doc.file_name)}
                                                    aria-label={`Download ${doc.title}`}
                                                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest text-black transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fbbf24]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                                    style={{ background: 'linear-gradient(135deg,#fcd34d 0%,#b45309 100%)' }}
                                                >
                                                    <Download className="w-3.5 h-3.5" /> Get
                                                </a>
                                            </>
                                        ) : (
                                            <span className="flex-1 text-center py-2 text-[10px] uppercase tracking-widest text-zinc-600">Unavailable</span>
                                        )}
                                        {isAdmin && (
                                            <button
                                                onClick={() => handleDelete(doc)}
                                                className="p-2 rounded-lg border border-white/10 text-zinc-500 hover:text-red-400 hover:border-red-500/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/70 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                                                aria-label={`Delete ${doc.title}`}
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
