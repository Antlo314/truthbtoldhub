// Shared helpers for The Archive (community) — kept in one place so every
// component renders roles, gates, reactions and timestamps consistently.
//
// SECURITY NOTE: every "can*" helper here is for UI affordance ONLY. The
// authoritative gate is the database (community_schema.sql RLS + the
// can_view_channel / can_post_channel / is_sanctum_admin predicates). Never
// rely on these to keep data safe — only to decide what to show/enable.

import { isAdminEmail } from '@/lib/adminEmails';
import type { ArchiveChannel, ArchiveReaction } from '@/lib/store/useArchiveStore';

export const DEFAULT_AVATAR =
    'https://fveosuladewjtqoqhdbl.supabase.co/storage/v1/object/public/cineworks/default_avatar.png';

// An Architect is identified by a verified, JWT-signed admin email.
export function isArchitect(email?: string | null): boolean {
    return isAdminEmail(email);
}

// Quick-reaction palette shown in the message hover bar.
export const QUICK_EMOJI = ['🙏', '🔥', '✨', '❤️', '👁️', '💯', '😂', '🕊️'] as const;

export interface ChannelGateCtx {
    isArchitect: boolean;
    isSupporter: boolean;
    isChatBanned: boolean;
}

// Mirror of can_view_channel() — decides whether to render a hall in the list.
export function canViewChannel(channel: Pick<ArchiveChannel, 'access'>, ctx: ChannelGateCtx): boolean {
    if (ctx.isArchitect) return true;
    switch (channel.access) {
        case 'supporters': return ctx.isSupporter;
        case 'architects': return false;
        case 'everyone':
        default: return true;
    }
}

// Mirror of can_post_channel() — decides whether the composer is enabled.
export function canPostChannel(channel: Pick<ArchiveChannel, 'access' | 'locked'>, ctx: ChannelGateCtx): boolean {
    if (ctx.isArchitect) return true;
    if (!canViewChannel(channel, ctx)) return false;
    if (ctx.isChatBanned) return false;
    return !channel.locked;
}

export interface AccessBadge {
    label: string;
    className: string;
}

// Visual badge for a gated / locked hall, or null for an open one.
export function accessBadge(channel: Pick<ArchiveChannel, 'access' | 'locked'>): AccessBadge | null {
    if (channel.access === 'architects') {
        return { label: 'Architects', className: 'text-red-400 border-red-500/30 bg-red-500/10' };
    }
    if (channel.access === 'supporters') {
        return { label: 'Supporters', className: 'text-aether-gold border-aether-gold/30 bg-aether-gold/10' };
    }
    if (channel.locked) {
        return { label: 'Read-only', className: 'text-zinc-400 border-white/10 bg-white/5' };
    }
    return null;
}

// Role → display label + colour (members sidebar groups by these).
export function roleColor(role?: string): string {
    switch (role) {
        case 'Admin': return 'text-aether-gold';
        case 'Moderator': return 'text-aether-cyan';
        default: return 'text-zinc-300';
    }
}

export function roleLabel(role?: string): string {
    switch (role) {
        case 'Admin': return 'Architects';
        case 'Moderator': return 'Sentinels';
        default: return 'Souls';
    }
}

// Tier → accent colour, reused on profile chips / name colouring.
export function tierColor(tier?: string): string {
    switch (tier) {
        case 'Architect': return 'text-red-400';
        case 'Sovereign': return 'text-aether-violet';
        default: return 'text-aether-gold';
    }
}

export interface GroupedReaction {
    emoji: string;
    count: number;
    mine: boolean;
}

// Collapse a flat reaction list into {emoji, count, mine} chips.
export function groupReactions(list: ArchiveReaction[] | undefined, myId?: string): GroupedReaction[] {
    if (!list || list.length === 0) return [];
    const map = new Map<string, GroupedReaction>();
    for (const r of list) {
        const g = map.get(r.emoji) || { emoji: r.emoji, count: 0, mine: false };
        g.count += 1;
        if (myId && r.user_id === myId) g.mine = true;
        map.set(r.emoji, g);
    }
    return Array.from(map.values());
}

// Compact relative time ("just now", "5m", "3h", "2d", else a date).
export function relativeTime(iso: string): string {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';
    const secs = Math.floor((Date.now() - then) / 1000);
    if (secs < 30) return 'just now';
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d`;
    return new Date(iso).toLocaleDateString();
}

// "Online" / "last seen 3h ago" string from a last_seen_at timestamp.
export function presenceLabel(isOnline: boolean, lastSeenAt?: string | null): string {
    if (isOnline) return 'Online now';
    if (!lastSeenAt) return 'Offline';
    return `Last seen ${relativeTime(lastSeenAt)}`;
}

// Order halls within a category by position then name.
export function sortChannels(channels: ArchiveChannel[]): ArchiveChannel[] {
    return [...channels].sort((a, b) => {
        const pa = a.position ?? 0;
        const pb = b.position ?? 0;
        if (pa !== pb) return pa - pb;
        return a.name.localeCompare(b.name);
    });
}

// Group halls into ordered categories for the sidebar.
export function groupChannelsByCategory(channels: ArchiveChannel[]): { category: string; channels: ArchiveChannel[] }[] {
    const sorted = sortChannels(channels);
    const order: string[] = [];
    const buckets: Record<string, ArchiveChannel[]> = {};
    for (const c of sorted) {
        const cat = c.category || 'The Commons';
        if (!buckets[cat]) { buckets[cat] = []; order.push(cat); }
        buckets[cat].push(c);
    }
    return order.map((category) => ({ category, channels: buckets[category] }));
}
