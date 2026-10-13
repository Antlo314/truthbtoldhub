'use client';

/**
 * The Aether Plain — the open world outside the Lair.
 *
 * Live souls share it over their own presence room. The plain's people hand
 * out quests, Lydia keeps a stall, the poor wait by the roads. Creatures
 * fight back. Strength comes the way Matthew 6 says it does — prayer,
 * fasting and alms, best done in secret — and with level, skills and the
 * armour of God. Progress lives on the character (game_state), so it
 * follows the soul across devices. The Lair's door is a gate on the plain,
 * and Truth.OS is one button away.
 */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';
import { useGameStore } from '@/lib/store/useGameStore';
import { hubAudio } from '@/lib/truthos/hubAudio';
import { sacredUi } from '@/lib/game/sacredUiSfx';
import { joinHousePresence, SAY_MAX, type HousePeer, type HousePresenceApi } from '@/lib/truthos/housePresence';
import { wireFromAvatar } from '@/components/truthos/house/vesselLook';
import { EMOTES } from '@/components/truthos/house/Vessel';
import { getWalkerPose, setWalkerState } from '@/components/truthos/house/walkerPose';
import { useHouseUi } from '@/components/truthos/house/houseUiStore';
import { hydrateLookFeel } from '@/components/truthos/house/HousePause';
import HouseMobileControls from '@/components/truthos/house/HouseMobileControls';
import HouseLoadBar from '@/components/truthos/house/HouseLoadBar';
import { useHouseImmersion } from '@/components/truthos/house/useHouseImmersion';
import { getSky } from '@/components/truthos/house/DayNightCycle';
import { useWorldTime, type Weather } from '@/components/truthos/house/worldTime';
import type { Hotspot } from '@/components/truthos/house/houseMap';
import { useClientDevice } from '@/components/truthos/engine/useClientDevice';
import { CIRCLE_C, LAKE, LANDMARKS, regionAt } from '@/lib/world/terrain';
import { CAIRNS, FIXTURES, NPCS, npc, PICKUP_LABEL, pickups, type NpcId, type PickupKind } from '@/lib/world/plain';
import { EMPTY_WORLD, levelFor, QUESTS, titleFor, wantedItems, type EnemyKind, type Quest, type WorldProgress } from '@/lib/world/quests';
import { applyEvent, markerFor, type QuestEvent, type QuestOutcome } from '@/lib/world/questLogic';
import { PLAIN_SPAWN } from '@/lib/world/plainPose';
import { startAmbience, stopAmbience, updateAmbience } from '@/lib/world/ambience';
import { ITEMS, STARTING_BAG, item, type EquipSlot } from '@/lib/world/items';
import { skill } from '@/lib/world/skills';
import { deriveStats, has } from '@/lib/world/stats';
import {
    ANOINT_WINDOW,
    discLevel,
    discipline,
    FALL_COIN_LOSS,
    FAST_SECONDS,
    FAST_XP,
    GIVE_XP_DAILY_CAP,
    GIVE_XP_PER_COIN,
    GIVING_THANKS,
    KINGDOM_VERSE,
    PRAYER_XP,
    SECRET_RADIUS,
    watchId,
    type Discipline,
} from '@/lib/world/disciplines';
import { ENEMIES } from '@/lib/world/enemies';
import { healPlayer, onCombat, player, restorePlayer, setAction } from '@/lib/world/combat';
import { sfx } from '@/lib/world/sfx';
import { npcPosition, type NpcMarker } from './Npcs';
import type { PlainHotspot } from './PlainController';
import PlainHud, { type HudToast } from './PlainHud';
import PlainDialogue, { type Dialogue } from './PlainDialogue';
import PlainPause from './PlainPause';
import { FullMap, MiniMap } from './PlainMap';
import { loadPlainView, savePlainView } from './plainView';
import Journal, { type JournalTab } from './Journal';
import { DeathScreen, GivePanel, PrayerOverlay, ShopPanel } from './PlainPanels';
import CombatPad from './CombatPad';
import { plainRain, plainWind } from './PlainWeather';
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
const CIRCLE = { x: CIRCLE_C.x, z: CIRCLE_C.z, r: 5 };
const SIGN_LINES = [
    ['THE CROSSROADS', 'North — the Lair Gate.  West — the Old Pier and the Still Water.', 'East — up the Rise to the Summit Shrine.  South — the Wildflower Fields.', 'Lydia keeps her stall here.'],
    ['The Lair Gate is behind you. The Crossroads lie ahead, where every road meets.', 'Bartimaeus sits by this road. He cannot see you, but he hears you.'],
    ['PINE HOLLOW — north, round the house.', 'Wolves and spore-kin. Pray before you go in.'],
];
const SIGNS = FIXTURES.filter((f) => f.kind === 'signpost').map((f, i) => ({ x: f.x, z: f.z, lines: SIGN_LINES[i] ?? ['A signpost.'] }));
const DISCOVER_XP = 20;
const CAIRN_XP = 10;

const WEATHER_NOTE: Record<Weather, string> = {
    clear: 'The sky clears.',
    cloudy: 'Clouds gather over the plain.',
    overcast: 'The sky closes over.',
    rain: 'Rain on the plain — the mire stirs, slimes rise from the shallows.',
    fog: 'Fog rolls in. Shades walk in fog, even by day.',
};

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

const upd = (fn: (w: WorldProgress) => WorldProgress) => useGameStore.getState().worldUpdate(fn);
const cur = () => useGameStore.getState().character.world ?? EMPTY_WORLD;
const today = () => useWorldTime.getState().day;
const addBag = (bag: Record<string, number> | undefined, id: string, n: number) => {
    const next = { ...(bag ?? {}) };
    next[id] = Math.max(0, (next[id] ?? 0) + n);
    if (next[id] === 0) delete next[id];
    return next;
};

export default function PlainExperience({ onReturnToTerminal, onEnterLair }: { onReturnToTerminal: () => void; onEnterLair: () => void }) {
    const character = useGameStore((s) => s.character);
    const loadFromCloud = useGameStore((s) => s.loadFromCloud);
    const world: WorldProgress = character.world ?? EMPTY_WORLD;
    const stats = useMemo(() => deriveStats(world), [world]);
    const { device } = useClientDevice();
    const isMobile = device === 'mobile';
    const paused = useHouseUi((s) => s.paused);
    const setPaused = useHouseUi((s) => s.setPaused);
    const toggleView = useHouseUi((s) => s.toggleView);
    const setView = useHouseUi((s) => s.setView);
    const playEmote = useHouseUi((s) => s.playEmote);
    const requestRecenter = useHouseUi((s) => s.requestRecenter);
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
    const [whisperTo, setWhisperTo] = useState<{ id: string; name: string } | null>(null);
    const [whisperDraft, setWhisperDraft] = useState('');
    const [whisperBusy, setWhisperBusy] = useState(false);
    const [heard, setHeard] = useState<{ fromId: string; from: string; text: string; at: number } | null>(null);
    const peersRef = useRef<HousePeer[]>([]);
    peersRef.current = peers;
    const guestRef = useRef(true);
    guestRef.current = guest;

    const [journal, setJournal] = useState<JournalTab | null>(null);
    const [shopOpen, setShopOpen] = useState(false);
    const [giveTo, setGiveTo] = useState<NpcId | null>(null);
    const [fallen, setFallen] = useState<{ lost: number } | null>(null);
    const [praying, setPraying] = useState(false);
    const [secretHere, setSecretHere] = useState(true);
    const [fastLeft, setFastLeft] = useState<number | null>(null);
    const playAcc = useRef(0);

    const uiLocked = authOpen || paused || !!dialogue || mapOpen || !!whisperTo || !!journal || shopOpen || !!giveTo || !!fallen;
    const { shellRef, requestPointerLock } = useHouseImmersion({ enabled: true, mobile: isMobile, uiLocked });

    /* ── toasts ─────────────────────────────────────────────── */
    const toast = useCallback((text: string, tone: HudToast['tone'] = 'info', ms = 3600) => {
        const id = toastId.current++;
        setToasts((t) => [...t.slice(-4), { id, text, tone }]);
        window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), ms);
    }, []);

    /* ── the soul's numbers reach the fight ─────────────────── */
    useLayoutEffect(() => {
        player.stats = stats;
        if (player.hp > stats.maxHp) player.hp = stats.maxHp;
        if (player.stamina > stats.maxStamina) player.stamina = stats.maxStamina;
    }, [stats]);
    useLayoutEffect(() => {
        player.stats = deriveStats(cur());
        restorePlayer();
    }, []);

    /* ── a fresh soul walks out with a staff, bread and water ─ */
    useEffect(() => {
        if (world.started) return;
        upd((w) => ({
            ...w,
            started: true,
            bag: { ...STARTING_BAG, ...(w.bag ?? {}) },
            equip: { weapon: 'staff_shepherd', ...(w.equip ?? {}) },
            belt: w.belt ?? ['bread', 'water', null, null],
            coins: w.coins ?? 12,
        }));
    }, [world.started]);

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
            // the Lair has no fights: leave the plain's action behind
            setAction(null);
            setWalkerState({ action: null, combat: false });
            // the fasting clock keeps what it counted
            const acc = playAcc.current;
            if (acc > 0) upd((w) => ({ ...w, playS: (w.playS ?? 0) + acc }));
            playAcc.current = 0;
        };
    }, [setView, setPaused]);

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

    /* ── the weather tells you when it turns ────────────────── */
    useEffect(() => {
        let last = useWorldTime.getState().weather;
        return useWorldTime.subscribe((s) => {
            if (s.weather === last) return;
            last = s.weather;
            toast(WEATHER_NOTE[s.weather], s.weather === 'rain' || s.weather === 'fog' ? 'warn' : 'info', 4200);
        });
    }, [toast]);

    /* ── whispers find you out here ─────────────────────────── */
    useEffect(() => {
        const release = holdInbox((w) => {
            setHeard({ fromId: w.fromId, from: w.from, text: w.text, at: Date.now() });
            sfx('uiOpen');
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
            { name: displayName, aura: character.appearance?.aura || '#a78bfa', ...wireFromAvatar(character.avatar), x: PLAIN_SPAWN.x, y: 0, z: PLAIN_SPAWN.z, yaw: PLAIN_SPAWN.yaw },
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
            const act = player.action;
            presence.current?.track({
                name: displayName,
                aura: character.appearance?.aura || '#a78bfa',
                ...wireFromAvatar(character.avatar),
                ...p,
                emote,
                emoteAt: emote ? Date.now() - (performance.now() - emoteAt) : 0,
                sit: 0,
                lv: stats.level,
                // what the body is doing, in wall-clock so peers can age it
                act: act,
                actAt: act ? Date.now() - (performance.now() - player.actionAt) : 0,
                wp: stats.weapon,
                shd: stats.hasShield ? 1 : 0,
            });
        },
        [character, displayName, emote, emoteAt, stats],
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

    /** No live soul (and, for prayer, no person of the plain) within reach */
    const inSecret = useCallback((countNpcs: boolean) => {
        const p = getWalkerPose();
        for (const peer of peersRef.current) if (peer.kind === 'live' && Math.hypot(peer.x - p.x, peer.z - p.z) < SECRET_RADIUS) return false;
        if (countNpcs) {
            for (const n of NPCS) {
                const q = npcPosition(n.id);
                if (Math.hypot(q.x - p.x, q.z - p.z) < SECRET_RADIUS * 0.6) return false;
            }
        }
        return true;
    }, []);

    /* ── experience and levels ───────────────────────────────── */
    const gainXp = useCallback(
        (n: number, why?: string) => {
            const before = levelFor(cur().xp);
            const after = levelFor(cur().xp + n);
            upd((w) => ({ ...w, xp: (w.xp || 0) + n }));
            if (why) toast(`${why} · +${n} xp`, 'find');
            if (after > before) {
                sfx('levelUp');
                toast(`Level ${after} · ${titleFor(after)} — more grace to spend in your skills`, 'level', 6000);
                restorePlayer();
            }
        },
        [toast],
    );

    /* ── quests ──────────────────────────────────────────────── */
    const applyOutcome = useCallback(
        (out: QuestOutcome) => {
            const st = useGameStore.getState();
            for (const c of out.changed) st.worldSetQuest(c.quest.id, c.progress);
            for (const t of out.toasts) toast(t, 'quest');
            for (const q of out.completed) {
                if (q.skillPoints > 0) st.claimQuest(`plain:${q.id}`, q.skillPoints);
                if (q.coins || q.items) {
                    upd((w) => {
                        let bag = w.bag;
                        for (const [id, n] of Object.entries(q.items ?? {})) bag = addBag(bag, id, n);
                        return { ...w, bag, coins: (w.coins ?? 0) + (q.coins ?? 0) };
                    });
                }
                sfx('questDone');
                const extras = [q.coins ? `${q.coins} denarii` : '', ...Object.keys(q.items ?? {}).map((id) => item(id)?.name ?? id)].filter(Boolean).join(' · ');
                toast(`Quest complete · ${q.name}${extras ? ` · ${extras}` : ''}`, 'xp', 5200);
                gainXp(q.xp);
            }
        },
        [toast, gainXp],
    );

    const fire = useCallback(
        (ev: QuestEvent) => {
            const out = applyEvent(cur(), ev);
            if (out.changed.length || out.completed.length) applyOutcome(out);
            return out;
        },
        [applyOutcome],
    );

    /* ── the disciplines of Matthew 6 ────────────────────────── */
    const practiced = useCallback(
        (d: Discipline) => {
            const day = today();
            let kingdomNow = false;
            upd((w) => {
                const pr = w.practiced?.day === day ? { ...w.practiced } : { day };
                const had = !!(pr.prayer && pr.fasting && pr.giving);
                pr[d] = true;
                kingdomNow = !had && !!(pr.prayer && pr.fasting && pr.giving);
                return { ...w, practiced: pr };
            });
            fire({ kind: 'practice', discipline: d });
            if (kingdomNow) {
                sfx('levelUp');
                toast(KINGDOM_VERSE, 'level', 8000);
                gainXp(60);
            }
        },
        [fire, gainXp, toast],
    );

    const gainDisc = useCallback(
        (d: Discipline, n: number) => {
            const before = discLevel(cur().disc?.[d] ?? 0);
            upd((w) => ({ ...w, disc: { ...(w.disc ?? {}), [d]: (w.disc?.[d] ?? 0) + n } }));
            const after = discLevel(cur().disc?.[d] ?? 0);
            if (after > before) {
                sfx('levelUp');
                toast(`${discipline(d).name} deepens · level ${after} — ${discipline(d).grants.split(' — ')[0].toLowerCase()} grows`, 'level', 5500);
            }
        },
        [toast],
    );

    const onPrayed = useCallback(() => {
        const s = player.stats;
        const secret = inSecret(true);
        const { day, hour } = useWorldTime.getState();
        const watch = watchId(day, hour);
        const w = cur();
        if (s) {
            healPlayer(s.maxHp * 0.4);
            player.stamina = s.maxStamina;
            player.spirit = Math.min(s.maxSpirit, player.spirit + 20);
        }
        if (has(w, 'deliver_us')) player.deliverUntil = performance.now() + 180000;
        if (w.prayedWatch === watch) {
            toast('You have prayed this watch already. It still restores you.', 'info', 4200);
            return;
        }
        upd((x) => ({ ...x, prayedWatch: watch }));
        gainDisc('prayer', PRAYER_XP * (secret ? 2 : 1));
        toast(secret ? 'Prayed in secret — “thy Father which seeth in secret shall reward thee openly.”' : 'Prayed — it counts. In secret, it counts double.', secret ? 'level' : 'info', 5200);
        if (has(w, 'daily_bread') && hour >= 5 && hour < 9) {
            upd((x) => ({ ...x, bag: addBag(x.bag, 'bread', 1) }));
            toast('Give us this day our daily bread — a loaf is in your bag.', 'find', 4500);
        }
        practiced('prayer');
    }, [gainDisc, inSecret, practiced, toast]);

    const playSeconds = () => (cur().playS ?? 0) + playAcc.current;

    const beginFast = useCallback(() => {
        if (cur().fast) return;
        upd((w) => ({ ...w, fast: { startedAt: (w.playS ?? 0) + playAcc.current, secret: false } }));
        sfx('prayStart');
        toast('You begin to fast. Water is allowed. Anoint your head with oil now, and it is kept in secret.', 'quest', 6000);
        setJournal(null);
    }, [toast]);

    const breakFast = useCallback(() => {
        if (!cur().fast) return;
        upd((w) => ({ ...w, fast: null }));
        toast('You broke the fast. Begin again when you are ready.', 'info');
    }, [toast]);

    const completeFast = useCallback(() => {
        const f = cur().fast;
        if (!f) return;
        upd((w) => ({ ...w, fast: null }));
        gainDisc('fasting', FAST_XP * (f.secret ? 2 : 1));
        sfx('prayDone');
        toast(f.secret ? 'The fast is kept, in secret — “thy Father, which seeth in secret, shall reward thee openly.”' : 'The fast is kept. Anointed next time, it counts double.', 'level', 6500);
        practiced('fasting');
    }, [gainDisc, practiced, toast]);

    const give = useCallback(
        (gift: { coins?: number; item?: string }) => {
            const w = cur();
            let worth = 0;
            if (gift.coins) {
                if ((w.coins ?? 0) < gift.coins) return;
                worth = gift.coins;
                upd((x) => ({ ...x, coins: (x.coins ?? 0) - gift.coins!, heaven: (x.heaven ?? 0) + gift.coins! }));
            } else if (gift.item) {
                if ((w.bag?.[gift.item] ?? 0) <= 0) return;
                worth = Math.max(2, item(gift.item)?.price ?? 2);
                upd((x) => ({ ...x, bag: addBag(x.bag, gift.item!, -1), heaven: (x.heaven ?? 0) + worth }));
            }
            if (!worth) return;
            const secret = inSecret(false);
            const day = today();
            const used = w.givenDay?.day === day ? w.givenDay.xp : 0;
            const room = Math.max(0, GIVE_XP_DAILY_CAP - used);
            const xp = Math.min(room, worth * GIVE_XP_PER_COIN * (secret ? 2 : 1));
            upd((x) => ({ ...x, givenDay: { day, xp: used + xp } }));
            if (xp > 0) gainDisc('giving', xp);
            sfx('give');
            toast(`${GIVING_THANKS[Math.floor(Math.random() * GIVING_THANKS.length)]}${xp === 0 ? ' (Giving has deepened all it can today — the treasure still counts.)' : ''}`, secret ? 'level' : 'find', 5200);
            practiced('giving');
        },
        [gainDisc, inSecret, practiced, toast],
    );

    /* ── what you carry ──────────────────────────────────────── */
    const consume = useCallback(
        (id: string) => {
            const d = item(id);
            const w = cur();
            if (!d || (w.bag?.[id] ?? 0) <= 0 || player.dead) return;
            const s = player.stats;
            if (d.kind === 'food') {
                if (w.fast) {
                    sfx('deny');
                    toast('You are fasting. Water is allowed; food would break the fast (Journal → Break the fast).', 'warn', 4500);
                    return;
                }
                if (s && player.hp >= s.maxHp && !d.breath) {
                    sfx('deny');
                    toast('You are not hungry.', 'info');
                    return;
                }
                const mul = has(w, 'daily_bread') ? 1.4 : 1;
                if (d.heal) healPlayer(d.heal * mul);
                if (d.hot) player.hot = { left: d.hot * mul, perS: (d.hot * mul) / 8 };
                if (d.breath && s) player.stamina = Math.min(s.maxStamina, player.stamina + d.breath);
                setAction('eat');
                sfx('eat');
            } else if (d.kind === 'drink') {
                if (s) player.stamina = s.maxStamina;
                sfx('drink');
            } else if (d.kind === 'oil') {
                const f = w.fast;
                if (f && !f.secret && playSeconds() - f.startedAt <= ANOINT_WINDOW) {
                    upd((x) => ({ ...x, fast: x.fast ? { ...x.fast, secret: true } : x.fast }));
                    toast('Anointed. “That thou appear not unto men to fast.” The fast is kept in secret.', 'level', 5200);
                } else if (f && !f.secret) {
                    toast('Too late in the fast to hide it — anoint at the start next time. You feel refreshed all the same.', 'info', 4500);
                } else {
                    toast('Anointed. Your spirit lifts.', 'find');
                }
                if (s) player.spirit = s.maxSpirit;
                sfx('prayStart');
            } else return;
            upd((x) => ({ ...x, bag: addBag(x.bag, id, -1) }));
        },
        [toast],
    );

    const takeFromBelt = useCallback(
        (slot: number) => {
            const id = cur().belt?.[slot];
            if (id) consume(id);
        },
        [consume],
    );

    const equip = useCallback(
        (id: string) => {
            const d = item(id);
            if (!d?.slot) return;
            upd((w) => ({ ...w, equip: { ...(w.equip ?? {}), [d.slot!]: id } }));
            sfx('equip');
            toast(`${d.name}${d.slot === 'weapon' ? ' in hand' : ' on'}`, 'info');
        },
        [toast],
    );
    const unequip = useCallback((slot: EquipSlot) => {
        upd((w) => {
            const e = { ...(w.equip ?? {}) };
            delete e[slot];
            return { ...w, equip: e };
        });
        sfx('equip');
    }, []);
    const setBelt = useCallback((slot: number, id: string | null) => {
        upd((w) => {
            const b = [...(w.belt ?? [null, null, null, null])];
            // one slot per item
            for (let i = 0; i < 4; i++) if (b[i] === id) b[i] = null;
            b[slot] = id;
            return { ...w, belt: b };
        });
    }, []);
    const learn = useCallback(
        (id: string) => {
            const n = skill(id);
            const s = deriveStats(cur());
            if (!n || s.graceFree < n.cost) return;
            upd((w) => ({ ...w, skills: Array.from(new Set([...(w.skills ?? []), id])) }));
            sfx('levelUp');
            toast(`Learned ${n.name}`, 'level');
        },
        [toast],
    );

    /* ── Lydia ───────────────────────────────────────────────── */
    const discount = has(world, 'cheerful') ? 0.2 : 0;
    const buy = useCallback(
        (id: string, price: number) => {
            if ((cur().coins ?? 0) < price) return;
            upd((w) => ({ ...w, coins: (w.coins ?? 0) - price, bag: addBag(w.bag, id, 1) }));
            sfx('coin');
            const d = item(id);
            toast(`Bought ${d?.name ?? id}${d?.slot ? ' — put it on from your bag' : ''}`, 'info');
        },
        [toast],
    );
    const sell = useCallback((id: string) => {
        const price = ITEMS[id]?.sell ?? 0;
        if (!price || (cur().bag?.[id] ?? 0) <= 0) return;
        upd((w) => ({ ...w, coins: (w.coins ?? 0) + price, bag: addBag(w.bag, id, -1) }));
        sfx('coin');
    }, []);

    /* ── the fight reports in ────────────────────────────────── */
    useEffect(() => {
        return onCombat((e) => {
            if (e.type === 'kill') {
                const def = ENEMIES[e.kind as EnemyKind];
                const w = cur();
                const [lo, hi] = def.coins;
                let coins = lo + Math.floor(Math.random() * (hi - lo + 1));
                if (has(w, 'cheerful')) coins = Math.round(coins * 1.5);
                const loot: string[] = [];
                for (const l of def.loot) if (Math.random() < l.chance) loot.push(l.item);
                upd((x) => {
                    let bag = x.bag;
                    for (const id of loot) bag = addBag(bag, id, 1);
                    return { ...x, bag, coins: (x.coins ?? 0) + coins, kills: { ...(x.kills ?? {}), [e.kind]: (x.kills?.[e.kind] ?? 0) + 1 } };
                });
                const bits = [loot.map((id) => item(id)?.name).join(', '), coins ? `${coins} denarii` : ''].filter(Boolean).join(' · ');
                toast(`${def.name} falls${bits ? ` · ${bits}` : ''}`, 'find', 3200);
                if (coins) sfx('coin', { volume: 0.6 });
                gainXp(def.xp);
                fire({ kind: 'kill', enemy: e.kind as EnemyKind });
            } else if (e.type === 'death') {
                const w = cur();
                const lost = has(w, 'store_up') ? 0 : Math.floor((w.coins ?? 0) * FALL_COIN_LOSS);
                upd((x) => ({ ...x, coins: (x.coins ?? 0) - lost, deaths: (x.deaths ?? 0) + 1 }));
                setFallen({ lost });
            }
        });
    }, [fire, gainXp, toast]);

    const rise = useCallback(() => {
        restorePlayer();
        requestRecenter();
        setFallen(null);
        sfx('prayDone');
    }, [requestRecenter]);

    // the heart pounds when vitality is low
    useEffect(() => {
        const t = setInterval(() => {
            const s = player.stats;
            if (!s || player.dead) return;
            if (player.hp / s.maxHp < 0.25) sfx('heartbeat', { volume: 0.8 });
        }, 1100);
        return () => clearInterval(t);
    }, []);

    // praying? and is it in secret? (for the overlay and the alms sheet)
    useEffect(() => {
        const t = setInterval(() => {
            setPraying(player.action === 'pray');
            setSecretHere(inSecret(player.action === 'pray'));
            const f = cur().fast;
            setFastLeft(f ? Math.max(0, FAST_SECONDS - (playSeconds() - f.startedAt)) : null);
        }, 400);
        return () => clearInterval(t);
    }, [inSecret]);

    /* ── the cheap loop: discovery, pickups, stillness, the clock, sound ── */
    const tickAcc = useRef(0);
    const flushAcc = useRef(0);
    const onTick = useCallback(
        (x: number, z: number, speed: number, dt: number) => {
            tickAcc.current += dt;
            playAcc.current += dt;
            flushAcc.current += dt;
            // the fasting clock is saved every few seconds, and checked
            if (flushAcc.current > 5) {
                flushAcc.current = 0;
                const acc = playAcc.current;
                playAcc.current = 0;
                upd((w) => ({ ...w, playS: (w.playS ?? 0) + acc }));
                const f = cur().fast;
                if (f && (cur().playS ?? 0) - f.startedAt >= FAST_SECONDS) completeFast();
            }
            // stillness is timed every frame so it is exact
            const w = cur();
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
            const found = cur().found ?? [];
            const wanted = wantedItems(cur());
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
                sfx('pickup');
                fire({ kind: 'gather', item: p.kind });
            }
            const reg = regionAt(x, z);
            const lakeD = Math.hypot(x - LAKE.x, z - LAKE.z) - LAKE.r;
            updateAmbience(step, {
                daylight: getSky().daylight,
                exposure: reg === 'hollow' ? 0.35 : reg === 'rise' ? 1.2 : 1,
                water: Math.max(0, Math.min(1, 1 - lakeD / 40)),
                hollow: reg === 'hollow',
                rain: plainRain(),
                wind: plainWind(),
            });
        },
        [fire, gainXp, toast, completeFast],
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
                const hint = n.role === 'merchant' ? `Trade with ${n.name}` : n.role === 'poor' ? `Give alms to ${n.name}` : `Talk to ${n.name}`;
                best = { id: n.id, kind: 'npc', label: n.name, hint, x: p.x, z: p.z };
            }
        }
        if (best) return best;
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

    const hasFood = ['bread', 'fish', 'figs', 'honey', 'water'].some((id) => (world.bag?.[id] ?? 0) > 0);
    const markers = useMemo(() => {
        const m: Partial<Record<NpcId, NpcMarker>> = {};
        for (const n of NPCS) {
            const q = markerFor(n.id, world);
            m[n.id] = q ?? (n.role === 'merchant' ? 'shop' : n.role === 'poor' && ((world.coins ?? 0) > 0 || hasFood) ? 'alms' : null);
        }
        return m;
    }, [world, hasFood]);
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
            // quest business first, whoever they are
            const pending = markerFor(who.id, cur());
            if (!pending && who.role === 'merchant') {
                sfx('uiOpen');
                setShopOpen(true);
                return;
            }
            if (!pending && who.role === 'poor') {
                sfx('uiOpen');
                setGiveTo(who.id);
                return;
            }
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
            sfx('questNew');
            toast(`New quest · ${q.name}`, 'quest', 4200);
            toast(q.steps[0].text, 'quest', 5200);
            setDialogue(null);
        },
        [toast],
    );

    const closeSheets = useCallback(() => {
        setJournal(null);
        setShopOpen(false);
        setGiveTo(null);
        sfx('uiClose');
    }, []);

    /* ── keys ────────────────────────────────────────────────── */
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const tag = (e.target as HTMLElement)?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;
            if (dialogue || whisperTo || fallen) return;
            const sheet = journal || shopOpen || giveTo;
            if (e.code === 'Escape') {
                if (sheet) closeSheets();
                else if (mapOpen) setMapOpen(false);
                else setPaused(!useHouseUi.getState().paused);
                return;
            }
            // the journal: Tab, I, K, J — the same key closes its tab
            const jt: Record<string, JournalTab> = { Tab: 'soul', KeyI: 'bag', KeyK: 'skills', KeyJ: 'quests' };
            if (jt[e.code] && !authOpen && !composing && !paused) {
                e.preventDefault();
                if (journal === jt[e.code]) closeSheets();
                else {
                    sfx('uiOpen');
                    setShopOpen(false);
                    setGiveTo(null);
                    setJournal(jt[e.code]);
                }
                return;
            }
            if (e.code === 'KeyM' && !authOpen && !composing && !sheet) {
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
                const n = Number(e.code.slice(5));
                if (e.shiftKey) {
                    const id = Object.keys(EMOTES).find((k) => EMOTES[k].key === String(n));
                    if (id) doEmote(id);
                } else takeFromBelt(n - 1);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [dialogue, whisperTo, fallen, journal, shopOpen, giveTo, mapOpen, authOpen, composing, paused, uiLocked, heard, activate, toggleView, doEmote, setPaused, closeSheets, takeFromBelt]);

    const showHud = !authOpen && !paused && !mapOpen && !journal && !fallen;
    const mobileHotspot = hotspot ? ({ id: 'computer', label: hotspot.kind === 'npc' ? hotspot.hint.split(' ')[0] + ' · ' + hotspot.label : hotspot.label } as unknown as Hotspot) : null;
    const gear = useMemo(() => ({ weapon: stats.weapon, shield: stats.hasShield }), [stats.weapon, stats.hasShield]);
    const fastingInfo = world.fast && fastLeft !== null ? { left: fastLeft, secret: world.fast.secret } : null;
    const kingdom = !!(world.practiced && world.practiced.day === useWorldTime.getState().day && world.practiced.prayer && world.practiced.fasting && world.practiced.giving);
    const giveNpc = giveTo ? npc(giveTo) : null;

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
                        world={world}
                        gear={gear}
                        onPrayed={onPrayed}
                        onDenied={(why) => toast(why, 'warn', 2400)}
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
                stats={stats}
                name={displayName}
                liveCount={liveCount}
                toasts={toasts}
                meditate={meditate}
                fasting={fastingInfo}
                kingdom={kingdom}
                onOpenOs={onReturnToTerminal}
                onMap={() => setMapOpen(true)}
                onJournal={(t) => {
                    sfx('uiOpen');
                    setJournal(t);
                }}
                onUseBelt={takeFromBelt}
            />
            <MiniMap world={world} markers={markers} peers={peers} visible={showHud && !isMobile && !dialogue} />
            <FullMap open={mapOpen} onClose={() => setMapOpen(false)} world={world} markers={markers} peers={peers} />

            {showHud && hotspot && !dialogue && !isMobile && (
                <div className="pointer-events-none fixed inset-x-0 bottom-[19%] z-[50] flex justify-center px-4">
                    <p className="rounded-2xl border border-amber-300/40 bg-black/70 px-4 py-2 text-[13px] text-amber-50 shadow-xl backdrop-blur-md">
                        <span className="mr-2 rounded-md border border-white/25 px-1.5 py-0.5 font-mono text-[11px] text-white/80">E</span>
                        {hotspot.hint}
                    </p>
                </div>
            )}

            <HouseMobileControls hotspot={mobileHotspot} onInteract={tryInteract} visible={showHud && isMobile && !dialogue} />
            <CombatPad visible={showHud && isMobile && !dialogue && !whisperTo} hasShield={stats.hasShield} hasLight={has(world, 'the_light')} />

            <PrayerOverlay praying={praying && showHud} secret={secretHere} />
            <PlainDialogue dialogue={dialogue} onClose={() => setDialogue(null)} onAccept={accept} />
            <Journal
                open={!!journal}
                tab={journal ?? 'soul'}
                setTab={(t) => setJournal(t)}
                onClose={closeSheets}
                world={world}
                stats={stats}
                fastLeft={fastLeft}
                kingdom={kingdom}
                compact={isMobile}
                actions={{ onUse: consume, onEquip: equip, onUnequip: unequip, onBelt: setBelt, onLearn: learn, onBeginFast: beginFast, onBreakFast: breakFast }}
            />
            <ShopPanel
                open={shopOpen}
                onClose={closeSheets}
                coins={world.coins ?? 0}
                bag={world.bag ?? {}}
                worn={new Set(Object.values(world.equip ?? {}).filter(Boolean) as string[])}
                discount={discount}
                onBuy={buy}
                onSell={sell}
            />
            <GivePanel
                to={giveNpc ? { name: giveNpc.name, title: giveNpc.title, line: giveNpc.idle[Math.floor((Date.now() / 60000) % giveNpc.idle.length)] } : null}
                onClose={closeSheets}
                coins={world.coins ?? 0}
                bag={world.bag ?? {}}
                secret={secretHere}
                onGive={give}
            />
            <DeathScreen fallen={!!fallen} coinsLost={fallen?.lost ?? 0} onRise={rise} />

            {composing && (
                <div className="fixed inset-x-0 bottom-28 z-[58] flex justify-center px-4">
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
                <div className="fixed inset-x-0 bottom-28 z-[66] flex justify-center px-4">
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
                            } else toast(r.error, 'warn', 4500);
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
                <div className="fixed right-3 z-[60] max-w-[min(340px,80vw)] rounded-2xl border border-violet-300/40 bg-black/80 p-3 shadow-2xl backdrop-blur-md" style={{ top: `calc(${isMobile ? '14rem' : '18rem'} + env(safe-area-inset-top, 0px))` }}>
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
                <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[57] flex justify-center px-4">
                    <p className="max-w-lg rounded-2xl border border-white/20 bg-black/75 px-4 py-2 text-center text-sm text-white/90 backdrop-blur-md">{selfSaid}</p>
                </div>
            )}
            {showHud && isMobile && !composing && !dialogue && (
                <button
                    type="button"
                    onClick={() => setComposing(true)}
                    className="fixed z-[56] rounded-full border border-emerald-400/40 bg-black/60 px-3 py-2 text-[11px] uppercase tracking-[0.14em] text-emerald-100 backdrop-blur-md"
                    style={{ right: '0.75rem', top: 'calc(5.6rem + env(safe-area-inset-top, 0px))' }}
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
