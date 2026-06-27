'use client';

// WebRTC voice for the Sanctum's voice Halls.
//
// Topology: full MESH (every connected soul holds a direct RTCPeerConnection to
// every other). Supabase Realtime is the signalling + roster layer — one channel
// per voice Hall ("voice_<id>"):
//   * PRESENCE  — whoever is *connected* tracks themselves; everyone subscribed
//                 sees the roster (so the sidebar can show who's in a Hall even
//                 if you haven't joined).
//   * BROADCAST — SDP offers/answers and ICE candidates, addressed peer-to-peer.
//
// No SFU, no extra server, no new keys. Mesh is the right call for the small
// voice rooms this community will have; for very large rooms an SFU (LiveKit/
// Daily) would be the upgrade path. NAT traversal uses public STUN; add a TURN
// server later for users behind symmetric NATs.

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useArchiveStore } from '@/lib/store/useArchiveStore';
import { useSoulStore } from '@/lib/store/useSoulStore';
import { canViewChannel, isArchitect } from '@/lib/archive/access';

export interface VoiceParticipant {
    id: string;
    name: string;
    avatar?: string;
    muted?: boolean;
}

interface VoiceAPI {
    activeVoiceId: string | null;
    connecting: boolean;
    muted: boolean;
    deafened: boolean;
    participantsByChannel: Record<string, VoiceParticipant[]>;
    speakingIds: Set<string>;
    error: string | null;
    join: (channelId: string) => void;
    leave: () => void;
    toggleMute: () => void;
    toggleDeafen: () => void;
}

const VoiceContext = createContext<VoiceAPI | null>(null);

export const useVoice = (): VoiceAPI => {
    const ctx = useContext(VoiceContext);
    if (!ctx) throw new Error('useVoice must be used within VoiceProvider');
    return ctx;
};

const ICE_CONFIG: RTCConfiguration = {
    iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
};

interface SignalPayload {
    kind: 'offer' | 'answer' | 'ice';
    from: string;
    to: string;
    data: any;
}

export function VoiceProvider({ children }: { children: React.ReactNode }) {
    const { activeWorkspaceId, channels } = useArchiveStore();
    const { user, profile } = useSoulStore();

    const [activeVoiceId, setActiveVoiceId] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [muted, setMuted] = useState(false);
    const [deafened, setDeafened] = useState(false);
    const [participantsByChannel, setParticipantsByChannel] = useState<Record<string, VoiceParticipant[]>>({});
    const [speakingIds, setSpeakingIds] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    // --- Mutable refs (handlers are attached once, so they read live state here) ---
    const chans = useRef<Map<string, any>>(new Map());            // channelId -> supabase channel
    const pcs = useRef<Map<string, RTCPeerConnection>>(new Map()); // peerId -> connection
    const localStream = useRef<MediaStream | null>(null);
    const audioEls = useRef<Map<string, HTMLAudioElement>>(new Map());
    const analysers = useRef<Map<string, AnalyserNode>>(new Map());
    const audioCtx = useRef<AudioContext | null>(null);
    const speakTimer = useRef<any>(null);

    const activeVoiceRef = useRef<string | null>(null);
    const mutedRef = useRef(false);
    const deafenedRef = useRef(false);
    const myIdRef = useRef<string | undefined>(undefined);
    const meRef = useRef<{ name: string; avatar?: string; email?: string; isSupporter?: boolean }>({ name: 'Soul' });
    const connectingRef = useRef(false);
    const audioContainer = useRef<HTMLDivElement | null>(null);

    useEffect(() => { activeVoiceRef.current = activeVoiceId; }, [activeVoiceId]);
    useEffect(() => { mutedRef.current = muted; }, [muted]);
    useEffect(() => { deafenedRef.current = deafened; }, [deafened]);
    useEffect(() => { myIdRef.current = user?.id; }, [user?.id]);
    useEffect(() => {
        meRef.current = {
            name: profile?.display_name || profile?.username || 'Soul',
            avatar: profile?.avatar_url,
            email: user?.email,
            isSupporter: !!profile?.is_supporter,
        };
    }, [profile?.display_name, profile?.username, profile?.avatar_url, profile?.is_supporter, user?.email]);

    // Hidden container that holds the remote <audio> elements (cleaner lifecycle
    // than appending straight to <body>; removed wholesale on unmount).
    useEffect(() => {
        const div = document.createElement('div');
        div.style.display = 'none';
        div.setAttribute('aria-hidden', 'true');
        document.body.appendChild(div);
        audioContainer.current = div;
        return () => { div.remove(); audioContainer.current = null; };
    }, []);

    const voiceChannelIds = (activeWorkspaceId ? (channels[activeWorkspaceId] || []) : [])
        .filter((c) => c.type === 'voice')
        .map((c) => c.id);

    // ---- signalling helpers ----
    const sendSignal = useCallback((channelId: string, payload: SignalPayload) => {
        chans.current.get(channelId)?.send({ type: 'broadcast', event: 'signal', payload });
    }, []);

    const ensureAudioContext = useCallback(() => {
        if (!audioCtx.current) {
            const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
            if (Ctx) audioCtx.current = new Ctx();
        }
        return audioCtx.current;
    }, []);

    const attachAnalyser = useCallback((id: string, stream: MediaStream) => {
        const ctx = ensureAudioContext();
        if (!ctx) return;
        try {
            const src = ctx.createMediaStreamSource(stream);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 512;
            src.connect(analyser);
            analysers.current.set(id, analyser);
        } catch { /* ignore */ }
    }, [ensureAudioContext]);

    const teardownPeer = useCallback((peerId: string) => {
        const pc = pcs.current.get(peerId);
        if (pc) { try { pc.close(); } catch { /* */ } pcs.current.delete(peerId); }
        const el = audioEls.current.get(peerId);
        if (el) { el.srcObject = null; el.remove(); audioEls.current.delete(peerId); }
        analysers.current.delete(peerId);
    }, []);

    const attachRemote = useCallback((peerId: string, stream: MediaStream) => {
        let el = audioEls.current.get(peerId);
        if (!el) {
            el = document.createElement('audio');
            el.autoplay = true;
            (el as any).playsInline = true;
            audioEls.current.set(peerId, el);
            (audioContainer.current || document.body).appendChild(el);
        }
        el.srcObject = stream;
        el.muted = deafenedRef.current;
        el.play().catch(() => { /* autoplay guarded by the join gesture */ });
        attachAnalyser(peerId, stream);
    }, [attachAnalyser]);

    const ensurePeer = useCallback((channelId: string, peerId: string, initiator: boolean) => {
        let pc = pcs.current.get(peerId);
        if (pc) return pc;
        pc = new RTCPeerConnection(ICE_CONFIG);
        localStream.current?.getTracks().forEach((t) => pc!.addTrack(t, localStream.current!));
        pc.onicecandidate = (e) => {
            if (e.candidate) sendSignal(channelId, { kind: 'ice', from: myIdRef.current!, to: peerId, data: e.candidate.toJSON() });
        };
        pc.ontrack = (e) => { if (e.streams[0]) attachRemote(peerId, e.streams[0]); };
        pc.onconnectionstatechange = () => {
            if (pc && (pc.connectionState === 'failed' || pc.connectionState === 'closed')) teardownPeer(peerId);
        };
        pcs.current.set(peerId, pc);
        if (initiator) {
            pc.createOffer()
                .then((o) => pc!.setLocalDescription(o))
                .then(() => sendSignal(channelId, { kind: 'offer', from: myIdRef.current!, to: peerId, data: pc!.localDescription }))
                .catch(() => { /* */ });
        }
        return pc;
    }, [sendSignal, attachRemote, teardownPeer]);

    const handleSignal = useCallback(async (channelId: string, payload: SignalPayload) => {
        if (!payload || payload.to !== myIdRef.current) return;
        if (activeVoiceRef.current !== channelId) return; // only react when actually in this Hall
        const { kind, from, data } = payload;
        try {
            if (kind === 'offer') {
                const pc = ensurePeer(channelId, from, false);
                await pc.setRemoteDescription(new RTCSessionDescription(data));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                sendSignal(channelId, { kind: 'answer', from: myIdRef.current!, to: from, data: pc.localDescription });
            } else if (kind === 'answer') {
                const pc = pcs.current.get(from);
                if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data));
            } else if (kind === 'ice') {
                const pc = pcs.current.get(from);
                if (pc && data) await pc.addIceCandidate(new RTCIceCandidate(data)).catch(() => { /* */ });
            }
        } catch (e) {
            console.error('voice signal error', e);
        }
    }, [ensurePeer, sendSignal]);

    // ---- speaking detection ----
    const startSpeakingDetection = useCallback(() => {
        if (speakTimer.current) return;
        const buf = new Uint8Array(256);
        speakTimer.current = setInterval(() => {
            const speaking = new Set<string>();
            analysers.current.forEach((analyser, id) => {
                try {
                    analyser.getByteTimeDomainData(buf);
                    let sum = 0;
                    for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; sum += v * v; }
                    const rms = Math.sqrt(sum / buf.length);
                    if (rms > 0.045) speaking.add(id);
                } catch { /* */ }
            });
            // a muted local soul never registers as speaking
            if (mutedRef.current && myIdRef.current) speaking.delete(myIdRef.current);
            setSpeakingIds((prev) => {
                if (prev.size === speaking.size && Array.from(speaking).every((x) => prev.has(x))) return prev;
                return speaking;
            });
        }, 180);
    }, []);

    const stopSpeakingDetection = useCallback(() => {
        if (speakTimer.current) { clearInterval(speakTimer.current); speakTimer.current = null; }
        setSpeakingIds((prev) => (prev.size ? new Set() : prev));
    }, []);

    // ---- public API ----
    const leave = useCallback(() => {
        const cid = activeVoiceRef.current;
        pcs.current.forEach((pc) => { try { pc.close(); } catch { /* */ } });
        pcs.current.clear();
        audioEls.current.forEach((el) => { el.srcObject = null; el.remove(); });
        audioEls.current.clear();
        analysers.current.clear();
        localStream.current?.getTracks().forEach((t) => t.stop());
        localStream.current = null;
        if (cid) chans.current.get(cid)?.untrack();
        stopSpeakingDetection();
        activeVoiceRef.current = null;
        setActiveVoiceId(null);
        setMuted(false); mutedRef.current = false;
        setDeafened(false); deafenedRef.current = false;
    }, [stopSpeakingDetection]);

    const join = useCallback(async (channelId: string) => {
        if (!myIdRef.current) return;
        if (activeVoiceRef.current === channelId) { leave(); return; }
        if (connectingRef.current) return; // guard against rapid re-entry

        // Access gate (defence-in-depth). Gated Halls are already hidden by RLS,
        // but Supabase Realtime channels themselves aren't RLS-gated — so never
        // let a known channel id bypass the supporter/architect/ban gate.
        const st = useArchiveStore.getState();
        let channel: any = null;
        for (const ws in st.channels) {
            const hit = st.channels[ws].find((c) => c.id === channelId);
            if (hit) { channel = hit; break; }
        }
        const ctx = {
            isArchitect: isArchitect(meRef.current.email),
            isSupporter: !!meRef.current.isSupporter,
            isChatBanned: st.bannedUserIds.has(myIdRef.current),
        };
        if (ctx.isChatBanned) { setError('You have been silenced in the Sanctum.'); return; }
        if (channel && !canViewChannel(channel, ctx)) { setError('This voice Hall is restricted.'); return; }

        if (activeVoiceRef.current) leave();
        setError(null);
        connectingRef.current = true;
        setConnecting(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            localStream.current = stream;
            setMuted(false); mutedRef.current = false;
            activeVoiceRef.current = channelId;
            setActiveVoiceId(channelId);

            const ch = chans.current.get(channelId);
            if (!ch) throw new Error('voice channel not ready');

            await ch.track({ id: myIdRef.current, name: meRef.current.name, avatar: meRef.current.avatar, muted: false });

            // I am the newcomer → I initiate an offer to everyone already here.
            const state = ch.presenceState();
            Object.keys(state).forEach((key) => {
                const meta = (state[key]?.[0] || {}) as any;
                const pid = meta.id || key;
                if (pid && pid !== myIdRef.current) ensurePeer(channelId, pid, true);
            });

            attachAnalyser(myIdRef.current!, stream);
            startSpeakingDetection();
        } catch (e) {
            console.error('voice join failed', e);
            setError('Microphone access was denied or is unavailable.');
            activeVoiceRef.current = null;
            setActiveVoiceId(null);
        } finally {
            connectingRef.current = false;
            setConnecting(false);
        }
    }, [leave, ensurePeer, attachAnalyser, startSpeakingDetection]);

    const toggleMute = useCallback(() => {
        const next = !mutedRef.current;
        mutedRef.current = next;
        setMuted(next);
        localStream.current?.getAudioTracks().forEach((t) => { t.enabled = !next; });
        const cid = activeVoiceRef.current;
        if (cid) chans.current.get(cid)?.track({ id: myIdRef.current, name: meRef.current.name, avatar: meRef.current.avatar, muted: next });
    }, []);

    const toggleDeafen = useCallback(() => {
        const next = !deafenedRef.current;
        deafenedRef.current = next;
        setDeafened(next);
        audioEls.current.forEach((el) => { el.muted = next; });
        if (next && !mutedRef.current) toggleMute(); // deafening implies muting
    }, [toggleMute]);

    // ---- reconcile one Realtime channel per voice Hall in the active workspace ----
    useEffect(() => {
        const myId = user?.id;
        if (!myId) return;

        voiceChannelIds.forEach((cid) => {
            if (chans.current.has(cid)) return;
            const ch = supabase.channel(`voice_${cid}`, { config: { presence: { key: myId }, broadcast: { self: false } } });
            ch.on('presence', { event: 'sync' }, () => {
                const state = ch.presenceState();
                const list: VoiceParticipant[] = [];
                Object.keys(state).forEach((key) => {
                    const meta = (state[key]?.[0] || {}) as any;
                    list.push({ id: meta.id || key, name: meta.name || 'Soul', avatar: meta.avatar, muted: !!meta.muted });
                });
                setParticipantsByChannel((prev) => ({ ...prev, [cid]: list }));
            });
            ch.on('presence', { event: 'leave' }, ({ key, leftPresences }: any) => {
                const pid = (leftPresences?.[0] as any)?.id || key;
                if (activeVoiceRef.current === cid && pid) teardownPeer(pid);
            });
            ch.on('broadcast', { event: 'signal' }, ({ payload }: any) => { handleSignal(cid, payload); });
            ch.subscribe();
            chans.current.set(cid, ch);
        });

        // Drop observers for halls that vanished — but never the Hall we're in.
        Array.from(chans.current.keys()).forEach((cid) => {
            if (!voiceChannelIds.includes(cid) && cid !== activeVoiceRef.current) {
                supabase.removeChannel(chans.current.get(cid));
                chans.current.delete(cid);
                setParticipantsByChannel((prev) => { const n = { ...prev }; delete n[cid]; return n; });
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [voiceChannelIds.join(','), user?.id]);

    // Teardown everything on unmount.
    useEffect(() => {
        return () => {
            leave();
            chans.current.forEach((ch) => supabase.removeChannel(ch));
            chans.current.clear();
            if (audioCtx.current) { audioCtx.current.close().catch(() => { /* */ }); audioCtx.current = null; }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const api: VoiceAPI = {
        activeVoiceId, connecting, muted, deafened, participantsByChannel, speakingIds, error,
        join, leave, toggleMute, toggleDeafen,
    };

    return <VoiceContext.Provider value={api}>{children}</VoiceContext.Provider>;
}
