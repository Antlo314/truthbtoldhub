'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { ArchiveChannel } from '@/lib/store/useArchiveStore';
import { X, Hash, Volume2, Lock, Trash2, Loader2, Save } from 'lucide-react';

interface ChannelAdminModalProps {
    workspaceId: string;
    channel?: ArchiveChannel | null; // null/undefined => create new
    defaultCategory?: string;
    onClose: () => void;
    onSaved: () => void; // parent refetches
}

const ACCESS_OPTIONS: { value: 'everyone' | 'supporters' | 'architects'; label: string; hint: string }[] = [
    { value: 'everyone', label: 'Everyone', hint: 'Every soul may read & post' },
    { value: 'supporters', label: 'Supporters', hint: 'Only supporters (and Architects)' },
    { value: 'architects', label: 'Architects', hint: 'Hidden from all but Architects' },
];

export default function ChannelAdminModal({ workspaceId, channel, defaultCategory, onClose, onSaved }: ChannelAdminModalProps) {
    const isEdit = !!channel;
    const [name, setName] = useState(channel?.name || '');
    const [category, setCategory] = useState(channel?.category || defaultCategory || 'The Commons');
    const [topic, setTopic] = useState(channel?.topic || '');
    const [type, setType] = useState<'text' | 'voice'>(channel?.type || 'text');
    const [access, setAccess] = useState<'everyone' | 'supporters' | 'architects'>(channel?.access || 'everyone');
    const [locked, setLocked] = useState(!!channel?.locked);
    const [position, setPosition] = useState<number>(channel?.position ?? 50);
    const [slowmode, setSlowmode] = useState<number>(channel?.slowmode_seconds ?? 0);
    const [busy, setBusy] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const cleanName = (v: string) => v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-_]/g, '').slice(0, 32);

    const save = async () => {
        const finalName = cleanName(name);
        if (!finalName) { setError('A hall needs a name.'); return; }
        setBusy(true);
        setError(null);
        const payload = {
            workspace_id: workspaceId,
            name: finalName,
            category: category.trim() || 'The Commons',
            topic: topic.trim() || null,
            type,
            access,
            locked,
            position,
            slowmode_seconds: type === 'text' ? slowmode : 0,
        };
        try {
            if (isEdit && channel) {
                const { error } = await supabase.from('archive_channels').update(payload).eq('id', channel.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('archive_channels').insert(payload);
                if (error) throw error;
            }
            onSaved();
            onClose();
        } catch (e: any) {
            console.error('save hall failed', e);
            setError(e?.message || 'Could not save. Architect power required.');
        } finally {
            setBusy(false);
        }
    };

    const remove = async () => {
        if (!channel) return;
        setBusy(true);
        try {
            const { error } = await supabase.from('archive_channels').delete().eq('id', channel.id);
            if (error) throw error;
            onSaved();
            onClose();
        } catch (e: any) {
            console.error('delete hall failed', e);
            setError(e?.message || 'Could not delete.');
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-md glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
                    <h3 className="font-ritual text-lg tracking-widest uppercase text-white gold-shimmer">
                        {isEdit ? 'Edit Hall' : 'Forge a Hall'}
                    </h3>
                    <button onClick={onClose} className="p-1.5 rounded-full bg-white/5 text-zinc-400 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Name */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">Hall Name</label>
                        <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-aether-gold/40 transition-colors">
                            {type === 'voice' ? <Volume2 className="w-4 h-4 text-zinc-500" /> : <Hash className="w-4 h-4 text-zinc-500" />}
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="the-path"
                                className="flex-1 bg-transparent text-sm text-white font-mono focus:outline-none placeholder:text-zinc-700"
                            />
                        </div>
                        <p className="mt-1 text-[8px] font-mono uppercase tracking-widest text-zinc-600">Saved as #{cleanName(name) || 'name'}</p>
                    </div>

                    {/* Category + Type */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">Category</label>
                            <input
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                placeholder="The Commons"
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-aether-gold/40 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">Type</label>
                            <div className="flex bg-black/40 border border-white/10 rounded-xl p-1">
                                {(['text', 'voice'] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setType(t)}
                                        className={`flex-1 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors ${type === t ? 'bg-aether-gold text-black' : 'text-zinc-400 hover:text-white'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Topic */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">Topic</label>
                        <input
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="What is this hall for?"
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-aether-gold/40 transition-colors"
                        />
                    </div>

                    {/* Access */}
                    <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">Who may enter</label>
                        <div className="space-y-1.5">
                            {ACCESS_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setAccess(opt.value)}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-left transition-colors ${access === opt.value ? 'border-aether-gold/40 bg-aether-gold/10' : 'border-white/10 bg-black/40 hover:border-white/20'}`}
                                >
                                    <span className={`text-[11px] font-bold uppercase tracking-widest ${access === opt.value ? 'text-aether-gold' : 'text-zinc-300'}`}>{opt.label}</span>
                                    <span className="text-[8px] font-mono uppercase tracking-wide text-zinc-500">{opt.hint}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Locked + position + slowmode */}
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setLocked((v) => !v)}
                            className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-colors ${locked ? 'border-aether-gold/40 bg-aether-gold/10 text-aether-gold' : 'border-white/10 bg-black/40 text-zinc-400 hover:text-white'}`}
                        >
                            <Lock className="w-3.5 h-3.5" /> {locked ? 'Read-only' : 'Open posting'}
                        </button>
                        <div>
                            <label className="block text-[8px] font-black uppercase tracking-widest text-zinc-500 mb-1">Order</label>
                            <input
                                type="number"
                                value={position}
                                onChange={(e) => setPosition(parseInt(e.target.value) || 0)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-aether-gold/40 transition-colors"
                            />
                        </div>
                    </div>

                    {type === 'text' && (
                        <div>
                            <label className="block text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">Slowmode (seconds between messages)</label>
                            <input
                                type="number"
                                min={0}
                                value={slowmode}
                                onChange={(e) => setSlowmode(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-aether-gold/40 transition-colors"
                            />
                        </div>
                    )}

                    {error && <p className="text-[10px] font-mono uppercase tracking-widest text-red-400">{error}</p>}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-white/5">
                    {isEdit ? (
                        confirmDelete ? (
                            <button onClick={remove} disabled={busy} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-300">
                                <Trash2 className="w-3.5 h-3.5" /> Confirm purge
                            </button>
                        ) : (
                            <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-red-400">
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                        )
                    ) : <span />}

                    <button
                        onClick={save}
                        disabled={busy}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-aether-gold text-black font-black text-[10px] uppercase tracking-widest hover:bg-aether-gold-soft transition-colors disabled:opacity-50"
                    >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {isEdit ? 'Save Hall' : 'Forge Hall'}
                    </button>
                </div>
            </div>
        </div>
    );
}
