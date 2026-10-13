/**
 * How the plain's events move quests along. Pure: takes progress, returns
 * the new progress plus what to tell the player. The experience applies
 * the result to the store and shows the words.
 */
import { PICKUP_LABEL, npc, type NpcId, type PickupKind } from './plain';
import { currentStep, questAvailable, questsOf, QUESTS, type EnemyKind, type Quest, type QuestProgress, type WorldProgress } from './quests';
import type { Discipline } from './disciplines';

export type QuestEvent =
    | { kind: 'visit'; place: string }
    | { kind: 'gather'; item: PickupKind }
    | { kind: 'meditated'; place: string }
    | { kind: 'talk'; npc: NpcId }
    | { kind: 'kill'; enemy: EnemyKind }
    | { kind: 'practice'; discipline: Discipline };

export type QuestOutcome = {
    /** quests whose progress changed, with the new record */
    changed: { quest: Quest; progress: QuestProgress }[];
    /** quests that just finished — rewards are due */
    completed: Quest[];
    /** a quest this talk started */
    started: Quest | null;
    /** lines to show, in order */
    lines: string[];
    /** short toasts */
    toasts: string[];
};

const empty = (): QuestOutcome => ({ changed: [], completed: [], started: null, lines: [], toasts: [] });

function advance(q: Quest, p: QuestProgress, out: QuestOutcome) {
    const step = p.step + 1;
    const done = step >= q.steps.length;
    const next: QuestProgress = { step: done ? q.steps.length - 1 : step, done, n: done ? undefined : {} };
    out.changed.push({ quest: q, progress: next });
    if (done) out.completed.push(q);
    else out.toasts.push(q.steps[step].text);
}

/** Is this active quest waiting on the given place? */
function wantsPlace(q: Quest, w: WorldProgress, place: string): boolean {
    const s = currentStep(q, w);
    if (!s) return false;
    if (s.kind === 'visit') return s.place === place;
    if (s.kind === 'visitAll') return s.places.includes(place);
    return false;
}

export function applyEvent(w: WorldProgress, ev: QuestEvent): QuestOutcome {
    const out = empty();
    if (ev.kind === 'visit') {
        for (const q of QUESTS) {
            const p = w.quests[q.id];
            if (!p || p.done) continue;
            if (!wantsPlace(q, w, ev.place)) continue;
            const s = q.steps[p.step];
            if (s.kind === 'visit') {
                advance(q, p, out);
            } else if (s.kind === 'visitAll') {
                const n = { ...(p.n ?? {}) };
                if (n[ev.place]) continue;
                n[ev.place] = 1;
                const have = s.places.filter((pl) => n[pl]).length;
                if (have >= s.places.length) advance(q, p, out);
                else {
                    out.changed.push({ quest: q, progress: { ...p, n } });
                    out.toasts.push(`${q.name} · ${have} of ${s.places.length}`);
                }
            }
        }
        return out;
    }
    if (ev.kind === 'kill') {
        for (const q of QUESTS) {
            const p = w.quests[q.id];
            if (!p || p.done) continue;
            const s = q.steps[p.step];
            if (s.kind !== 'kill' || s.enemy !== ev.enemy) continue;
            const n = { ...(p.n ?? {}) };
            n[ev.enemy] = (n[ev.enemy] ?? 0) + 1;
            if (n[ev.enemy] >= s.n) advance(q, p, out);
            else {
                out.changed.push({ quest: q, progress: { ...p, n } });
                out.toasts.push(`${q.name} · ${n[ev.enemy]} of ${s.n}`);
            }
        }
        return out;
    }
    if (ev.kind === 'practice') {
        for (const q of QUESTS) {
            const p = w.quests[q.id];
            if (!p || p.done) continue;
            const s = q.steps[p.step];
            if (s.kind === 'practice' && s.discipline === ev.discipline) advance(q, p, out);
        }
        return out;
    }
    if (ev.kind === 'meditated') {
        for (const q of QUESTS) {
            const p = w.quests[q.id];
            if (!p || p.done) continue;
            const s = q.steps[p.step];
            if (s.kind === 'meditate' && s.place === ev.place) advance(q, p, out);
        }
        return out;
    }
    if (ev.kind === 'gather') {
        for (const q of QUESTS) {
            const p = w.quests[q.id];
            if (!p || p.done) continue;
            const s = q.steps[p.step];
            if (s.kind !== 'gather' || s.item !== ev.item) continue;
            const n = { ...(p.n ?? {}) };
            n[ev.item] = (n[ev.item] ?? 0) + 1;
            if (n[ev.item] >= s.n) {
                // the items stay "held" through the next deliver/talk step
                const step = p.step + 1;
                const done = step >= q.steps.length;
                const next: QuestProgress = { step: done ? q.steps.length - 1 : step, done, n };
                out.changed.push({ quest: q, progress: next });
                if (done) out.completed.push(q);
                else out.toasts.push(q.steps[step].text);
            } else {
                out.changed.push({ quest: q, progress: { ...p, n } });
                out.toasts.push(`${PICKUP_LABEL[ev.item]} · ${n[ev.item]} of ${s.n}`);
            }
        }
        return out;
    }
    // talk
    const who = npc(ev.npc);
    // 1. a quest waiting on this soul (turn-in or hand-over)
    for (const q of QUESTS) {
        const p = w.quests[q.id];
        if (!p || p.done) continue;
        const s = q.steps[p.step];
        if ((s.kind === 'talk' || s.kind === 'deliver') && s.npc === ev.npc) {
            const willFinish = p.step + 1 >= q.steps.length;
            if (s.kind === 'deliver') out.lines.push(`${who.name} takes the ${PICKUP_LABEL[s.item].toLowerCase()} from your hands.`);
            if (willFinish) out.lines.push(...q.done);
            else if (s.kind === 'talk') out.lines.push(...q.done.slice(0, 1));
            advance(q, p, out);
            return out;
        }
    }
    // 2. something to offer
    for (const q of questsOf(ev.npc)) {
        if (!questAvailable(q, w)) continue;
        out.started = q;
        out.lines.push(...q.offer);
        return out;
    }
    // 3. a quest in progress from this giver — a nudge
    for (const q of questsOf(ev.npc)) {
        const p = w.quests[q.id];
        if (!p || p.done) continue;
        const s = q.steps[p.step];
        out.lines.push(s.text + '.');
        return out;
    }
    // 4. nothing doing
    const idle = who.idle;
    out.lines.push(idle[Math.floor(Math.random() * idle.length)]);
    return out;
}

/** What marker a soul should carry over its head */
export function markerFor(id: NpcId, w: WorldProgress): 'offer' | 'turnin' | null {
    for (const q of QUESTS) {
        const p = w.quests[q.id];
        if (!p || p.done) continue;
        const s = q.steps[p.step];
        if ((s.kind === 'talk' || s.kind === 'deliver') && s.npc === id) return 'turnin';
    }
    for (const q of questsOf(id)) if (questAvailable(q, w)) return 'offer';
    return null;
}

/** Where the active quests point — for the compass and the map */
export type QuestTarget = { questId: string; label: string; place?: string; npc?: NpcId; item?: PickupKind; enemy?: EnemyKind };
export function questTargets(w: WorldProgress): QuestTarget[] {
    const out: QuestTarget[] = [];
    for (const q of QUESTS) {
        const s = currentStep(q, w);
        if (!s) continue;
        if (s.kind === 'visit' || s.kind === 'meditate') out.push({ questId: q.id, label: s.text, place: s.place });
        else if (s.kind === 'visitAll') {
            const p = w.quests[q.id];
            const left = s.places.filter((pl) => !p?.n?.[pl]);
            out.push({ questId: q.id, label: s.text, place: left[0] });
        } else if (s.kind === 'talk' || s.kind === 'deliver') out.push({ questId: q.id, label: s.text, npc: s.npc });
        else if (s.kind === 'gather') out.push({ questId: q.id, label: s.text, item: s.item });
        else if (s.kind === 'kill') out.push({ questId: q.id, label: s.text, enemy: s.enemy });
    }
    return out;
}
