'use client';

/**
 * The Aether Plain — the open world outside the Lair.
 *
 * Live souls share it over their own presence room; the plain's people
 * hand out quests; walking, finding, gathering and keeping still raise a
 * level and a title that live on the character, so they follow the soul
 * across devices. The Lair's door is a gate on the plain, and Truth.OS is
 * one button away.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';
import { useGameStore } from '@/lib/store/useGameStore';
import { hubAudio } from '@/lib/truthos/hubAudio';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { joinHousePresence, SAY_MAX, type HousePeer, type HousePresenceApi } from '@/lib/truthos/housePresence';
import { wireFromAvatar } from '@/components/truthos/house/vesselLook';
import { EMOTES } from '@/components/truthos/house/Vessel';
import { setWalkerState } from '@/components/truthos/house/walkerPose';
import { useHouseUi } from '@/components/truthos/house/houseUiStore';
import { hydrateLookFeel } from '@/components/truthos/house/HousePause';
import HouseMobileControls from '@/components/truthos/house/HouseMobileControls';
import HouseLoadBar from '@/components/truthos/house/HouseLoadBar';
import { useHouseImmersion } from '@/components/truthos/house/useHouseImmersion';
import { getSky } from '@/components/truthos/house/DayNightCycle';
import type { Hotspot } from '@/components/truthos/house/houseMap';
import { useClientDevice } from '@/components/truthos/engine/useClientDevice';
import { LAKE, LANDMARKS, regionAt } from '@/lib/world/terrain';
import { CAIRNS, NPCS, npc, PICKUP_LABEL, pickups, type NpcId, type PickupKind } from '@/lib/world/plain';
import { EMPTY_WORLD, levelFor, QUESTS, titleFor, wantedItems, type Quest, type WorldProgress } from '@/lib/world/quests';
import { applyEvent, markerFor, type QuestEvent, type QuestOutcome } from '@/lib/world/questLogic';
import { PLAIN_SPAWN } from '@/lib/world/plainPose';
import { startAmbience, stopAmbience, updateAmbience } from '@/lib/world/ambience';
import { npcPosition, type NpcMarker } from './Npcs';
import type { PlainHotspot } from './PlainController';
import PlainHud, { type HudToast } from './PlainHud';
import PlainDialogue, { type Dialogue } from './PlainDialogue';
import PlainPause from './PlainPause';
import { FullMap, MiniMap } from './PlainMap';
import { loadPlainView, savePlainView } from './plainView';
import { holdInbox } from '@/lib/archive/inbox';
import { isSoulId, sendWhisper } from '@/lib/archive/whisper';

const PlainCanvas = dynamic(() => import('./PlainCanvas'), {
    ssr: false,
    loading: () => <HouseLoadBar label="Walking out onto the plain" />,
});

export const PLAIN_CHANNEL = 'truthos-plain-v1';

const GATE = { x: 0, z: 63.4, r: 2.6 };
const NPC_R = 3.4;
const PICK_R = 1.8;
const CAIRN_R = 4.5;
const CIRCLE = { x: -200, z: 50, r: 5 };
const SIGNS: { x: number; z: number; lines: string[] }[] = [
    { x: 3, z: 160, lines: ['THE CROSSROADS', 'North — the Lair Gate.  West — the Old Pier and the Still Water.', 'East — up the Rise to the Summit Shrine.  South — the Wildflower Fields.'] },
    { x: -3, z: 96, lines: ['The Lair Gate is behind you. The Crossroads lie ahead, where every road meets.'] },
    { x: 42, z: 24, lines: ['PINE HOLLOW — north, round the house.', 'Mind the dark; the lantern-keeper lights the way.'] },
];
const DISCOVER_XP = 20;
const CAIRN_XP = 10;

function ensureGuestId(): string {
    try {
        const existing = localStorage.getItem('tbth-house-guest-id');
        if (existing) return existing;
        const id = 'guest-' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem('tbth-house-guest-id', id);
        return id;
    } catch {
        return 'guest-' + Math.random().toString(36).slice(2, 10);
    }
}

export default function PlainExperience({
    onReturnToTerminal,
    onEnterLair,
}: {
    onReturnToTerminal: () => void;
    onEnterLair: () => void;
}) {
    const character = useGameStore((s) => s.character);
    const loadFromCloud = useGameStore((s) => s.loadFromCloud);
    const world: WorldProgress = character.world ?? EMPTY_WORLD;
    const { device } = useClientDevice();
    const isMobile = device === 'mobile';
    const paused = useHouseUi((s) => s.paused);
    const setPaused = useHouseUi((s) => s.setPaused);
    const toggleView = useHouseUi((s) => s.toggleView);
    const setView = useHouseUi((s) => s.setView);
    const playEmote = useHouseUi((s) => s.playEmote);
    const emote = useHouseUi((s) => s.emote);
    const emoteAt = useHouseUi((s) => s.emoteAt);

    const [guest, setGuest] = useState(true);
    const [authOpen, setAuthOpen] = useState(false);
    const [sceneReady, setSceneReady] = useState(false);
    const [canvasError, setCanvasError] = useState<string | null>(null);
    const [hotspot, setHotspot] = useState<PlainHotspot | null>(null);
    const hotspotRef = useRef<PlainHotspot | null>(null);
    hotspotRef.current = hotspot;
    const [peers, setPeers] = useState<HousePeer[]>([]);
    const [presenceKey, setPresenceKey] = useState('');
    const presence = useRef<HousePresenceApi | null>(null);
    const selfId = useRef('');
    const [saidBy, setSaidBy] = useState<Record<string, string>>({});
    const sayTimers = useRef<Record<string, number>>({});
    const [composing, setComposing] = useState(false);
    const [draft, setDraft] = useState('');
    const [selfSaid, setSelfSaid] = useState<string | null>(null);
    const selfSayTimer = useRef<number | undefined>(undefined);
    const [dialogue, setDialogue] = useState<Dialogue | null>(null);
    const [mapOpen, setMapOpen] = useState(false);
    const [toasts, setToasts] = useState<HudToast[]>([]);
    const toastId = useRef(1);
    const [meditate, setMeditate] = useState<number | null>(null);
    const meditateT = useRef(0);
    const hinted = useRef(new Set<string>());
    /** a whisper being written to a live soul on the plain */
    const [whisperTo, setWhisperTo] = useState<{ id: string; name: string } | null>(null);
    const [whisperDraft, setWhisperDraft] = useState('');
    const [whisperBusy, setWhisperBusy] = useState(false);
    /** the last whisper that reached you out here, for a moment, with Reply */
    const [heard, setHeard] = useState<{ fromId: string; from: string; text: string; at: number } | null>(null);
    const peersRef = useRef<HousePeer[]>([]);
    peersRef.current = peers;
    const guestRef = useRef(true);
    guestRef.current = guest;

    const uiLocked = authOpen || paused || !!dialogue || mapOpen || !!whisperTo;
    const { shellRef, requestPointerLock } = useHouseImmersion({ enabled: true, mobile: isMobile, uiLocked });

    /* ── toasts ─────────────────────────────────────────────── */
    const toast = useCallback((text: string, tone: HudToast['tone'] = 'info', ms = 3600) => {
        const id = toastId.current++;
        setToasts((t) => [...t.slice(-4), { id, text, tone }]);
        window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
    }, []);

    /* ── mount: audio, view, panels ─────────────────────────── */
    useEffect(() => {
        hubAudio.unlock();
        hubAudio.stopMusic(1400);
        startAmbience();
        hydrateLookFeel();
        setView(loadPlainView());
        useHouseUi.getState().closePanel();
        setPaused(false);
        return () => {
            stopAmbience();
        };
    }, [setView, setPaused]);

    // Back from pause: take the mouse again
    const wasLocked = useRef(false);
    useEffect(() => {
        if (uiLocked) {
            wasLocked.current = true;
            return;
        }
        if (wasLocked.current && !isMobile) {
            wasLocked.current = false;
            requestPointerLock();
        }
    }, [uiLocked, isMobile, requestPointerLock]);

    /* ── whispers find you out here too ──────────────────────── */
    useEffect(() => {
        const release = holdInbox((w) => {
            setHeard({ fromId: w.fromId, from: w.from, text: w.text, at: Date.now() });
            hubAudio.playSfx('ui_open', { volume: 0.25 });
        });
        return release;
    }, []);
    useEffect(() => {
        if (!heard) return;
        const t = window.setTimeout(() => setHeard(null), 9000);
        return () => window.clearTimeout(t);
    }, [heard]);

    /* ── who you are ─────────────────────────────────────────── */
    useEffect(() => {
        const gid = ensureGuestId();
        selfId.current = gid;
        setPresenceKey(gid);
        let cancelled = false;
        supabase.auth
            .getSession()
            .then(({ data }) => {
                if (cancelled || !data.session) return;
                setGuest(false);
                selfId.current = data.session.user.id;
                setPresenceKey(data.session.user.id);
                void loadFromCloud();
            })
            .catch(() => {});
        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            if (session) {
                setGuest(false);
                setAuthOpen(false);
                selfId.current = session.user.id;
                setPresenceKey(session.user.id);
                void loadFromCloud();
            } else {
                const g = ensureGuestId();
                selfId.current = g;
                setPresenceKey(g);
                setGuest(true);
            }
        });
        return () => {
            cancelled = true;
            sub.subscription.unsubscribe();
        };
    }, [loadFromCloud]);

    const showSaid = useCallback((id: string, text: string) => {
        setSaidBy((prev) => ({ ...prev, [id]: text }));
        window.clearTimeout(sayTimers.current[id]);
        sayTimers.current[id] = window.setTimeout(() => {
            setSaidBy((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }, 6500);
    }, []);

    const displayName = character.name?.trim() || (guest ? 'Guest' : 'Soul');

    /* ── presence: the plain's own room ──────────────────────── */
    useEffect(() => {
        if (!presenceKey) return;
        let dead = false;
        joinHousePresence(
            presenceKey,
            {
                name: displayName,
                aura: character.appearance?.aura || '#a78bfa',
                ...wireFromAvatar(character.avatar),
                x: PLAIN_SPAWN.x,
                y: 0,
                z: PLAIN_SPAWN.z,
                yaw: PLAIN_SPAWN.yaw,
            },
            (list) => {
                if (dead) return;
                setPeers(list.filter((p) => p.id !== presenceKey));
            },
            (said) => {
                if (dead) return;
                showSaid(said.id, said.text);
                hubAudio.peerJoined();
            },
            PLAIN_CHANNEL,
        ).then((api) => {
            if (dead) {
                void api?.leave();
                return;
            }
            presence.current = api;
        });
        return () => {
            dead = true;
            void presence.current?.leave();
            presence.current = null;
            setPeers([]);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [presenceKey]);

    const onPose = useCallback(
        (p: { x: number; y: number; z: number; yaw: number }) => {
            presence.current?.track({
                name: displayName,
                aura: character.appearance?.aura || '#a78bfa',
                ...wireFromAvatar(character.avatar),
                ...p,
                emote,
                emoteAt: emote ? Date.now() - (performance.now() - emoteAt) : 0,
                sit: 0,
                lv: levelFor(character.world?.xp ?? 0),
            });
        },
        [character, displayName, emote, emoteAt],
    );

    useEffect(() => {
        setWalkerState({ talking: composing || !!selfSaid || !!dialogue });
    }, [composing, selfSaid, dialogue]);

    const liveCount = peers.filter((p) => p.kind === 'live').length;
    const prevLive = useRef(0);
    useEffect(() => {
        if (liveCount > prevLive.current) {
            hubAudio.peerJoined();
            if (prevLive.current === 0 && liveCount > 0) toast(`${liveCount === 1 ? 'Another soul is' : `${liveCount} souls are`} on the plain`, 'info');
        } else if (liveCount < prevLive.current && prevLive.current > 0) hubAudio.peerLeft();
        prevLive.current = liveCount;
    }, [liveCount, toast]);

    const doEmote = useCallback(
        (id: string) => {
            playEmote(id);
            setWalkerState({ emote: id, emoteAt: performance.now() });
        },
        [playEmote],
    );

    /* ── quests: apply an outcome to the store ───────────────── */
    const applyOutcome = useCallback(
        (out: QuestOutcome) => {
            const st = useGameStore.getState();
            for (const c of out.changed) st.worldSetQuest(c.quest.id, c.progress);
            for (const t of out.toasts) toast(t, 'quest');
            for (const q of out.completed) {
                const before = levelFor(useGameStore.getState().character.world?.xp ?? 0);
                const xp = st.worldGainXp(q.xp);
                if (q.skillPoints > 0) st.claimQuest(`plain:${q.id}`, q.skillPoints);
                sacredUi.access();
                toast(`Quest complete · ${q.name} · +${q.xp} xp${q.skillPoints ? ` · +${q.skillPoints} skill point` : ''}`, 'xp', 5200);
                const after = levelFor(xp);
                if (after > before) {
                    hubAudio.playSfx('ui_success', { volume: 0.3 });
                    toast(`Level ${after} · ${titleFor(after)}`, 'level', 6000);
                }
            }
        },
        [toast],
    );

    const fire = useCallback(
        (ev: QuestEvent) => {
            const w = useGameStore.getState().character.world ?? EMPTY_WORLD;
            const out = applyEvent(w, ev);
            if (out.changed.length || out.completed.length) applyOutcome(out);
            return out;
        },
        [applyOutcome],
    );

    const gainXp = useCallback(
        (n: number, why: string) => {
            const st = useGameStore.getState();
            const before = levelFor(st.character.world?.xp ?? 0);
            const xp = st.worldGainXp(n);
            toast(`${why} · +${n} xp`, 'find');
            const after = levelFor(xp);
            if (after > before) toast(`Level ${after} · ${titleFor(after)}`, 'level', 6000);
        },
        [toast],
    );

    /* ── the cheap loop: discovery, pickups, stillness, sound ── */
    const tickAcc = useRef(0);
    const onTick = useCallback(
        (x: number, z: number, speed: number, dt: number) => {
            tickAcc.current += dt;
            // stillness is timed every frame so it is exact
            const w = useGameStore.getState().character.world ?? EMPTY_WORLD;
            const wantsStill = QUESTS.some((q) => {
                const p = w.quests[q.id];
                return p && !p.done && q.steps[p.step]?.kind === 'meditate';
            });
            if (wantsStill && Math.hypot(x - CIRCLE.x, z - CIRCLE.z) < CIRCLE.r) {
                if (speed < 0.15) meditateT.current += dt;
                else meditateT.current = 0;
                const need = 12;
                if (meditateT.current >= need) {
                    meditateT.current = 0;
                    setMeditate(null);
                    fire({ kind: 'meditated', place: 'circle' });
                } else if (tickAcc.current >= 0.2) setMeditate(meditateT.current / need);
            } else if (meditateT.current !== 0 || tickAcc.current >= 0.2) {
                meditateT.current = 0;
                setMeditate((m) => (m === null ? m : null));
            }
            if (tickAcc.current < 0.2) return;
            const step = tickAcc.current;
            tickAcc.current = 0;

            // places
            for (const l of LANDMARKS) {
                if (l.id === 'cairns') continue;
                const r = l.r > 40 ? l.r * 0.7 : l.r;
                if (Math.hypot(x - l.x, z - l.z) > r) continue;
                if (useGameStore.getState().worldFound(l.id)) gainXp(DISCOVER_XP, `Found ${l.name}`);
                fire({ kind: 'visit', place: l.id });
            }
            for (const c of CAIRNS) {
                if (Math.hypot(x - c.x, z - c.z) > CAIRN_R) continue;
                const st = useGameStore.getState();
                if (st.worldFound(c.id)) {
                    gainXp(CAIRN_XP, 'A cairn on the Rise');
                    if (st.worldFound('cairns')) toast('The Four Cairns', 'find');
                }
                fire({ kind: 'visit', place: c.id });
            }
            // pickups
            const found = useGameStore.getState().character.world?.found ?? [];
            const wanted = wantedItems(useGameStore.getState().character.world ?? EMPTY_WORLD);
            for (const p of pickups()) {
                if (Math.hypot(x - p.x, z - p.z) > PICK_R) continue;
                if (found.includes(`p:${p.id}`)) continue;
                if (!wanted.has(p.kind)) {
                    if (!hinted.current.has(p.kind)) {
                        hinted.current.add(p.kind);
                        toast(`${PICKUP_LABEL[p.kind]} — someone on the plain will ask for these.`, 'info', 4200);
                    }
                    continue;
                }
                if (!useGameStore.getState().worldFound(`p:${p.id}`)) continue;
                hubAudio.playSfx('arcade_coin', { volume: 0.22, rate: 1.1 });
                fire({ kind: 'gather', item: p.kind });
            }
            // sound
            const reg = regionAt(x, z);
            const lakeD = Math.hypot(x - LAKE.x, z - LAKE.z) - LAKE.r;
            updateAmbience(step, {
                daylight: getSky().daylight,
                exposure: reg === 'hollow' ? 0.35 : reg === 'rise' ? 1.2 : 1,
                water: Math.max(0, Math.min(1, 1 - lakeD / 40)),
                hollow: reg === 'hollow',
            });
        },
        [fire, gainXp, toast],
    );

    /* ── what is near enough to use ──────────────────────────── */
    const findHotspot = useCallback((x: number, z: number): PlainHotspot | null => {
        if (Math.hypot(x - GATE.x, z - GATE.z) < GATE.r) return { id: 'gate', kind: 'gate', label: 'The Lair', hint: 'Enter the house', x: GATE.x, z: GATE.z };
        let best: PlainHotspot | null = null;
        let bd = NPC_R;
        for (const n of NPCS) {
            const p = npcPosition(n.id);
            const d = Math.hypot(x - p.x, z - p.z);
            if (d < bd) {
                bd = d;
                best = { id: n.id, kind: 'npc', label: n.name, hint: `Talk to ${n.name}`, x: p.x, z: p.z };
            }
        }
        if (best) return best;
        // a live soul at arm's length: whisper to them
        let near: HousePeer | null = null;
        let nd = 2.8;
        for (const p of peersRef.current) {
            if (p.kind !== 'live') continue;
            const d = Math.hypot(x - p.x, z - p.z);
            if (d < nd) {
                nd = d;
                near = p;
            }
        }
        if (near) {
            const canWhisper = isSoulId(near.id) && !guestRef.current;
            return { id: `peer:${near.id}`, kind: 'peer', label: near.name, hint: canWhisper ? `Whisper to ${near.name}` : guestRef.current ? 'Sign in to whisper' : `${near.name} is a guest`, x: near.x, z: near.z };
        }
        for (let i = 0; i < SIGNS.length; i++) {
            const s = SIGNS[i];
            if (Math.hypot(x - s.x, z - s.z) < 2.6) return { id: `sign${i}`, kind: 'place', label: 'Signpost', hint: 'Read', x: s.x, z: s.z };
        }
        return null;
    }, []);

    const markers = useMemo(() => {
        const m: Partial<Record<NpcId, NpcMarker>> = {};
        for (const n of NPCS) m[n.id] = markerFor(n.id, world);
        return m;
    }, [world]);
    const taken = useMemo(() => new Set(world.found.filter((f) => f.startsWith('p:')).map((f) => f.slice(2))), [world.found]);
    const wanted = useMemo<Set<PickupKind>>(() => wantedItems(world), [world]);

    /* ── using things ────────────────────────────────────────── */
    const activate = useCallback(
        (h: PlainHotspot) => {
            sacredUi.click();
            doEmote('interact');
            if (h.kind === 'gate') {
                onEnterLair();
                return;
            }
            if (h.kind === 'peer') {
                const id = h.id.slice(5);
                if (guestRef.current) setAuthOpen(true);
                else if (isSoulId(id)) {
                    setWhisperDraft('');
                    setWhisperTo({ id, name: h.label });
                }
                return;
            }
            if (h.kind === 'place') {
                const s = SIGNS[Number(h.id.slice(4))];
                if (s) setDialogue({ name: 'Signpost', title: 'Carved into the wood', aura: '#d6be96', lines: s.lines });
                return;
            }
            const who = npc(h.id as NpcId);
            const out = fire({ kind: 'talk', npc: who.id });
            setDialogue({ name: who.name, title: who.title, aura: who.aura, lines: out.lines.length ? out.lines : ['…'], offer: out.started });
        },
        [doEmote, fire, onEnterLair],
    );
    const tryInteract = useCallback(() => {
        const h = hotspotRef.current;
        if (h && !uiLocked) activate(h);
    }, [activate, uiLocked]);

    const accept = useCallback(
        (q: Quest) => {
            useGameStore.getState().worldSetQuest(q.id, { step: 0, done: false, n: {} });
            sacredUi.access();
            toast(`New quest · ${q.name}`, 'quest', 4200);
            toast(q.steps[0].text, 'quest', 5200);
            setDialogue(null);
        },
        [toast],
    );

    /* ── keys ────────────────────────────────────────────────── */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
            if (dialogue) return;
            if (whisperTo) return;
            if (e.code === 'Escape') {
                if (mapOpen) setMapOpen(false);
                else setPaused(!useHouseUi.getState().paused);
                return;
            }
            if (e.code === 'KeyM' && !authOpen && !composing) {
                e.preventDefault();
                setMapOpen((v) => !v);
                return;
            }
            if (uiLocked) return;
            if (e.code === 'Enter' && !composing) {
                e.preventDefault();
                setComposing(true);
                return;
            }
            if (composing) return;
            if (e.code === 'KeyR' && heard && !guestRef.current) {
                e.preventDefault();
                setWhisperDraft('');
                setWhisperTo({ id: heard.fromId, name: heard.from });
                setHeard(null);
                return;
            }
            if (e.code === 'KeyE' && hotspotRef.current) {
                activate(hotspotRef.current);
                return;
            }
            if (e.code === 'KeyV') {
                toggleView();
                savePlainView(useHouseUi.getState().view);
                return;
            }
            if (/^Digit[1-4]$/.test(e.code)) {
                const key = e.code.slice(5);
                const id = Object.keys(EMOTES).find((k) => EMOTES[k].key === key);
                if (id) doEmote(id);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [dialogue, whisperTo, mapOpen, authOpen, composing, uiLocked, activate, toggleView, doEmote, setPaused, heard]);

    const showHud = !authOpen && !paused && !mapOpen;
    // HouseMobileControls speaks the house's hotspot type; it only reads the label
    const mobileHotspot = hotspot ? ({ id: 'computer', label: hotspot.kind === 'npc' ? `Talk · ${hotspot.label}` : hotspot.label } as unknown as Hotspot) : null;

    return (
        <div
            ref={shellRef}
            className="relative w-full select-none overflow-hidden bg-black"
            style={{ height: '100dvh', minHeight: '100vh', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="fixed inset-0 z-0">
                <ErrorBoundary onError={setCanvasError}>
                    <PlainCanvas
                        locked={uiLocked}
                        mobile={isMobile}
                        peers={peers}
                        selfId={presenceKey}
                        avatar={character.avatar}
                        aura={character.appearance?.aura || '#a78bfa'}
                        saidBy={saidBy}
                        markers={markers}
                        taken={taken}
                        wanted={wanted}
                        findHotspot={findHotspot}
                        onHotspot={setHotspot}
                        onPose={onPose}
                        onInteractRequest={tryInteract}
                        onTick={onTick}
                        onReady={() => setSceneReady(true)}
                    />
                </ErrorBoundary>
            </div>
            {!sceneReady && !canvasError && <HouseLoadBar label="Walking out onto the plain" />}
            {canvasError && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black p-6 text-center">
                    <div className="max-w-md space-y-3" data-allow-select>
                        <p className="font-mono text-sm text-red-400">3D failed to start</p>
                        <p className="break-all text-xs text-white/50">{canvasError}</p>
                        <div className="flex justify-center gap-2">
                            <button type="button" className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white" onClick={() => window.location.reload()}>
                                Reload
                            </button>
                            <button type="button" className="rounded-lg border border-amber-300/40 px-4 py-2 text-sm text-amber-100" onClick={onReturnToTerminal}>
                                Truth.OS
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} onSuccess={() => setAuthOpen(false)} dismissLabel="Keep walking as guest" />

            <PlainHud
                visible={showHud}
                compact={isMobile}
                world={world}
                liveCount={liveCount}
                toasts={toasts}
                meditate={meditate}
                onOpenOs={onReturnToTerminal}
                onMap={() => setMapOpen(true)}
                guest={guest}
                onSignIn={() => setAuthOpen(true)}
            />
            <MiniMap world={world} markers={markers} peers={peers} visible={showHud && !isMobile && !dialogue} />
            <FullMap open={mapOpen} onClose={() => setMapOpen(false)} world={world} markers={markers} peers={peers} />

            {/* what is in reach */}
            {showHud && hotspot && !dialogue && !isMobile && (
                <div className="pointer-events-none fixed inset-x-0 bottom-[22%] z-[50] flex justify-center px-4">
                    <p className="rounded-2xl border border-amber-300/40 bg-black/70 px-4 py-2 text-[13px] text-amber-50 shadow-xl backdrop-blur-md">
                        <span className="mr-2 rounded-md border border-white/25 px-1.5 py-0.5 font-mono text-[11px] text-white/80">E</span>
                        {hotspot.hint}
                    </p>
                </div>
            )}

            <HouseMobileControls hotspot={mobileHotspot} onInteract={tryInteract} visible={showHud && isMobile && !dialogue} />

            <PlainDialogue dialogue={dialogue} onClose={() => setDialogue(null)} onAccept={accept} />

            {composing && (
                <div className="fixed inset-x-0 bottom-24 z-[58] flex justify-center px-4">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            const text = draft.trim().slice(0, SAY_MAX);
                            setDraft('');
                            setComposing(false);
                            if (!text) return;
                            presence.current?.say(text);
                            showSaid(selfId.current, text);
                            setSelfSaid(text);
                            window.clearTimeout(selfSayTimer.current);
                            selfSayTimer.current = window.setTimeout(() => setSelfSaid(null), 6500);
                        }}
                        className="w-full max-w-lg"
                    >
                        <input
                            autoFocus
                            value={draft}
                            maxLength={SAY_MAX}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Escape') {
                                    setDraft('');
                                    setComposing(false);
                                }
                            }}
                            placeholder="Say something to everyone near…"
                            className="w-full rounded-2xl border border-emerald-400/40 bg-black/85 px-4 py-3 text-sm text-white outline-none backdrop-blur-md placeholder:text-white/35 focus:border-emerald-400/70"
                        />
                    </form>
                </div>
            )}
            {whisperTo && (
                <div className="fixed inset-x-0 bottom-24 z-[66] flex justify-center px-4">
                    <form
                        onSubmit={async (e) => {
                            e.preventDefault();
                            if (whisperBusy || !whisperDraft.trim()) return;
                            setWhisperBusy(true);
                            const r = await sendWhisper(whisperTo.id, whisperDraft);
                            setWhisperBusy(false);
                            if (r.ok) {
                                toast(`Whispered to ${whisperTo.name}`, 'info');
                                setWhisperTo(null);
                                setWhisperDraft('');
                            } else toast(r.error, 'info', 4500);
                        }}
                        className="w-full max-w-lg rounded-2xl border border-violet-300/40 bg-black/85 p-3 backdrop-blur-md"
                    >
                        <p className="mb-2 px-1 text-[11px] uppercase tracking-[0.16em] text-violet-200/80">Whisper to {whisperTo.name} · only they will see it</p>
                        <input
                            autoFocus
                            value={whisperDraft}
                            maxLength={2000}
                            onChange={(e) => setWhisperDraft(e.target.value)}
                            onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Escape') {
                                    setWhisperTo(null);
                                    setWhisperDraft('');
                                }
                            }}
                            placeholder="Write a whisper…"
                            className="w-full rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/35 focus:border-violet-300/60"
                        />
                        <div className="mt-2 flex justify-end gap-2">
                            <button type="button" onClick={() => setWhisperTo(null)} className="min-h-[38px] rounded-xl px-3 text-[13px] text-white/60 hover:text-white">
                                Cancel
                            </button>
                            <button type="submit" disabled={whisperBusy || !whisperDraft.trim()} className="min-h-[38px] rounded-xl border border-violet-300/50 bg-violet-400/15 px-4 text-[13px] text-violet-50 disabled:opacity-40">
                                {whisperBusy ? 'Sending…' : 'Whisper'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
            {heard && !whisperTo && (
                <div className="fixed left-3 z-[60] max-w-[min(340px,80vw)] rounded-2xl border border-violet-300/40 bg-black/80 p-3 shadow-2xl backdrop-blur-md" style={{ bottom: `calc(${isMobile ? '13rem' : '1rem'} + env(safe-area-inset-bottom, 0px))` }}>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-violet-200/80">Whisper from {heard.from}</p>
                    <p className="mt-1 line-clamp-3 text-[13px] text-white/90">{heard.text}</p>
                    {!guest && (
                        <button
                            type="button"
                            onClick={() => {
                                setWhisperDraft('');
                                setWhisperTo({ id: heard.fromId, name: heard.from });
                                setHeard(null);
                            }}
                            className="mt-2 rounded-lg border border-violet-300/40 px-3 py-1.5 text-[12px] text-violet-100"
                        >
                            Reply{isMobile ? '' : ' · R'}
                        </button>
                    )}
                </div>
            )}
            {selfSaid && !composing && (
                <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[57] flex justify-center px-4">
                    <p className="max-w-lg rounded-2xl border border-white/20 bg-black/75 px-4 py-2 text-center text-sm text-white/90 backdrop-blur-md">{selfSaid}</p>
                </div>
            )}
            {/* a speak button for phones, where there is no Enter key */}
            {showHud && isMobile && !composing && !dialogue && (
                <button
                    type="button"
                    onClick={() => setComposing(true)}
                    className="fixed z-[56] rounded-full border border-emerald-400/40 bg-black/60 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-emerald-100 backdrop-blur-md"
                    style={{ right: '0.75rem', top: 'calc(3.3rem + env(safe-area-inset-top, 0px))' }}
                >
                    Speak
                </button>
            )}

            <PlainPause mobile={isMobile} world={world} guest={guest} onSignIn={() => setAuthOpen(true)} onMap={() => setMapOpen(true)} onLair={onEnterLair} onTerminal={onReturnToTerminal} />
        </div>
    );
}

class ErrorBoundary extends React.Component<{ children: React.ReactNode; onError: (m: string) => void }, { err: string | null }> {
    state = { err: null as string | null };
    static getDerivedStateFromError(e: Error) {
        return { err: e?.message || 'Unknown WebGL error' };
    }
    componentDidCatch(e: Error) {
        this.props.onError(e?.message || 'Unknown WebGL error');
    }
    render() {
        if (this.state.err) return null;
        return this.props.children;
    }
}
