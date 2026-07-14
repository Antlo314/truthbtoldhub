/**
 * Hub / Truth.OS / Arcade audio — Howler-based with cinematic fades & ducking.
 * Assets live in /public/audio/hub/{music,sfx}/
 */
import { Howl } from 'howler';
import { unlockAudio } from '@/lib/game/sfx';

const MUSIC = '/audio/hub/music';
const SFX = '/audio/hub/sfx';

export type HubMusicId =
    | 'house_ambient_main'
    | 'house_bedroom_night'
    | 'house_living_arcade_glow'
    | 'house_library_dust'
    | 'house_studio_pulse'
    | 'house_hearth_warm'
    | 'truthos_boot_theme'
    | 'truthos_desktop_idle'
    | 'arcade_lobby'
    | 'arcade_serpent'
    | 'arcade_tetra'
    | 'arcade_veil'
    | 'soul_mirror_reflect'
    | 'offering_sustain';

export type HubSfxId =
    | 'ui_click'
    | 'ui_hover'
    | 'ui_open'
    | 'ui_close'
    | 'ui_success'
    | 'ui_error'
    | 'ui_type'
    | 'os_boot_blip'
    | 'os_boot_ready'
    | 'os_window_open'
    | 'os_window_close'
    | 'os_start_menu'
    | 'house_footstep_wood'
    | 'house_footstep_rug'
    | 'house_jump_land'
    | 'house_interact_ring'
    | 'house_use_e'
    | 'door_front_touch'
    | 'door_soon'
    | 'mirror_approach'
    | 'mirror_open'
    | 'computer_boot'
    | 'computer_hum_loop'
    | 'tv_static_soft'
    | 'arcade_controller_pickup'
    | 'arcade_start'
    | 'book_pull'
    | 'book_place'
    | 'library_open'
    | 'fire_crackle_loop'
    | 'studio_key'
    | 'hall_arch_pass'
    | 'map_offline'
    | 'arcade_eat'
    | 'arcade_die'
    | 'arcade_line_clear'
    | 'arcade_hard_drop'
    | 'arcade_rotate'
    | 'arcade_jump'
    | 'arcade_coin'
    | 'arcade_pause'
    | 'peer_join'
    | 'peer_leave'
    | 'admin_publish'
    | 'admin_delete';

type MusicMeta = { src: string; volume: number; fadeIn: number; fadeOut: number; loop?: boolean };
type SfxMeta = { src: string; volume: number; loop?: boolean };

const MUSIC_META: Record<HubMusicId, MusicMeta> = {
    house_ambient_main: { src: `${MUSIC}/house_ambient_main.mp3`, volume: 0.3, fadeIn: 2800, fadeOut: 2200 },
    house_bedroom_night: { src: `${MUSIC}/house_bedroom_night.mp3`, volume: 0.26, fadeIn: 2400, fadeOut: 2000 },
    house_living_arcade_glow: { src: `${MUSIC}/house_living_arcade_glow.mp3`, volume: 0.24, fadeIn: 2200, fadeOut: 1800 },
    house_library_dust: { src: `${MUSIC}/house_library_dust.mp3`, volume: 0.26, fadeIn: 2400, fadeOut: 2000 },
    house_studio_pulse: { src: `${MUSIC}/house_studio_pulse.mp3`, volume: 0.24, fadeIn: 2000, fadeOut: 1800 },
    house_hearth_warm: { src: `${MUSIC}/house_hearth_warm.mp3`, volume: 0.26, fadeIn: 2400, fadeOut: 2000 },
    truthos_boot_theme: { src: `${MUSIC}/truthos_boot_theme.mp3`, volume: 0.32, fadeIn: 400, fadeOut: 900, loop: false },
    truthos_desktop_idle: { src: `${MUSIC}/truthos_desktop_idle.mp3`, volume: 0.18, fadeIn: 2000, fadeOut: 1600 },
    arcade_lobby: { src: `${MUSIC}/arcade_lobby.mp3`, volume: 0.34, fadeIn: 1200, fadeOut: 1000 },
    arcade_serpent: { src: `${MUSIC}/arcade_serpent.mp3`, volume: 0.32, fadeIn: 800, fadeOut: 700 },
    arcade_tetra: { src: `${MUSIC}/arcade_tetra.mp3`, volume: 0.32, fadeIn: 800, fadeOut: 700 },
    arcade_veil: { src: `${MUSIC}/arcade_veil.mp3`, volume: 0.36, fadeIn: 600, fadeOut: 600 },
    soul_mirror_reflect: { src: `${MUSIC}/soul_mirror_reflect.mp3`, volume: 0.28, fadeIn: 1600, fadeOut: 1400 },
    offering_sustain: { src: `${MUSIC}/offering_sustain.mp3`, volume: 0.26, fadeIn: 1600, fadeOut: 1400 },
};

/** SFX sit ~50% under typical music beds (music 0.24–0.36) — subtle, not competing */
const SFX_META: Record<HubSfxId, SfxMeta> = {
    ui_click: { src: `${SFX}/ui_click.mp3`, volume: 0.18 },
    ui_hover: { src: `${SFX}/ui_hover.mp3`, volume: 0.08 },
    ui_open: { src: `${SFX}/ui_open.mp3`, volume: 0.16 },
    ui_close: { src: `${SFX}/ui_close.mp3`, volume: 0.15 },
    ui_success: { src: `${SFX}/ui_success.mp3`, volume: 0.2 },
    ui_error: { src: `${SFX}/ui_error.mp3`, volume: 0.18 },
    ui_type: { src: `${SFX}/ui_type.mp3`, volume: 0.1 },
    os_boot_blip: { src: `${SFX}/os_boot_blip.mp3`, volume: 0.16 },
    os_boot_ready: { src: `${SFX}/os_boot_ready.mp3`, volume: 0.2 },
    os_window_open: { src: `${SFX}/os_window_open.mp3`, volume: 0.15 },
    os_window_close: { src: `${SFX}/os_window_close.mp3`, volume: 0.14 },
    os_start_menu: { src: `${SFX}/os_start_menu.mp3`, volume: 0.15 },
    house_footstep_wood: { src: `${SFX}/house_footstep_wood.mp3`, volume: 0.12 },
    house_footstep_rug: { src: `${SFX}/house_footstep_rug.mp3`, volume: 0.1 },
    house_jump_land: { src: `${SFX}/house_jump_land.mp3`, volume: 0.18 },
    house_interact_ring: { src: `${SFX}/house_interact_ring.mp3`, volume: 0.16 },
    house_use_e: { src: `${SFX}/house_use_e.mp3`, volume: 0.18 },
    door_front_touch: { src: `${SFX}/door_front_touch.mp3`, volume: 0.2 },
    door_soon: { src: `${SFX}/door_soon.mp3`, volume: 0.18 },
    mirror_approach: { src: `${SFX}/mirror_approach.mp3`, volume: 0.14 },
    mirror_open: { src: `${SFX}/mirror_open.mp3`, volume: 0.2 },
    computer_boot: { src: `${SFX}/computer_boot.mp3`, volume: 0.18 },
    computer_hum_loop: { src: `${SFX}/computer_hum_loop.mp3`, volume: 0.05, loop: true },
    tv_static_soft: { src: `${SFX}/tv_static_soft.mp3`, volume: 0.04, loop: true },
    arcade_controller_pickup: { src: `${SFX}/arcade_controller_pickup.mp3`, volume: 0.2 },
    arcade_start: { src: `${SFX}/arcade_start.mp3`, volume: 0.22 },
    book_pull: { src: `${SFX}/book_pull.mp3`, volume: 0.16 },
    book_place: { src: `${SFX}/book_place.mp3`, volume: 0.15 },
    library_open: { src: `${SFX}/library_open.mp3`, volume: 0.18 },
    fire_crackle_loop: { src: `${SFX}/fire_crackle_loop.mp3`, volume: 0.07, loop: true },
    studio_key: { src: `${SFX}/studio_key.mp3`, volume: 0.12 },
    hall_arch_pass: { src: `${SFX}/hall_arch_pass.mp3`, volume: 0.14 },
    map_offline: { src: `${SFX}/map_offline.mp3`, volume: 0.16 },
    arcade_eat: { src: `${SFX}/arcade_eat.mp3`, volume: 0.16 },
    arcade_die: { src: `${SFX}/arcade_die.mp3`, volume: 0.2 },
    arcade_line_clear: { src: `${SFX}/arcade_line_clear.mp3`, volume: 0.2 },
    arcade_hard_drop: { src: `${SFX}/arcade_hard_drop.mp3`, volume: 0.16 },
    arcade_rotate: { src: `${SFX}/arcade_rotate.mp3`, volume: 0.12 },
    arcade_jump: { src: `${SFX}/arcade_jump.mp3`, volume: 0.15 },
    arcade_coin: { src: `${SFX}/arcade_coin.mp3`, volume: 0.16 },
    arcade_pause: { src: `${SFX}/arcade_pause.mp3`, volume: 0.14 },
    peer_join: { src: `${SFX}/peer_join.mp3`, volume: 0.16 },
    peer_leave: { src: `${SFX}/peer_leave.mp3`, volume: 0.14 },
    admin_publish: { src: `${SFX}/admin_publish.mp3`, volume: 0.2 },
    admin_delete: { src: `${SFX}/admin_delete.mp3`, volume: 0.16 },
};

const howlCache = new Map<string, Howl>();

function getHowl(src: string, loop: boolean): Howl {
    const key = `${src}|${loop ? 1 : 0}`;
    let h = howlCache.get(key);
    if (!h) {
        h = new Howl({
            src: [src],
            loop,
            volume: 0,
            html5: true,
            preload: true,
        });
        howlCache.set(key, h);
    }
    return h;
}

export type HouseZone =
    | 'main'
    | 'bedroom'
    | 'living'
    | 'library'
    | 'studio'
    | 'hearth'
    | 'os'
    | 'arcade'
    | 'soul'
    | 'offering';

function zoneMusic(zone: HouseZone): HubMusicId {
    switch (zone) {
        case 'bedroom':
            return 'house_bedroom_night';
        case 'living':
            return 'house_living_arcade_glow';
        case 'library':
            return 'house_library_dust';
        case 'studio':
            return 'house_studio_pulse';
        case 'hearth':
            return 'house_hearth_warm';
        case 'os':
            return 'truthos_desktop_idle';
        case 'arcade':
            return 'arcade_lobby';
        case 'soul':
            return 'soul_mirror_reflect';
        case 'offering':
            return 'offering_sustain';
        default:
            return 'house_ambient_main';
    }
}

/** Zone from world position (expanded house) */
export function zoneFromPose(x: number, z: number): HouseZone {
    if (z > 3.5) return 'bedroom';
    if (x < -6.5) return 'library';
    if (x > 6.5 && z < -5.5) return 'studio';
    if (x > 6.5) return 'living'; // east wing shares bright living bed if not studio
    if (z < -1.5 && Math.abs(x) < 6) return 'living';
    if (Math.hypot(x - 0, z - -11.4) < 5) return 'hearth';
    return 'main';
}

class HubAudioController {
    private music: Howl | null = null;
    private musicId: HubMusicId | null = null;
    private ambient = new Map<string, Howl>();
    private muted = false;
    private master = 1;
    private unlocked = false;
    private duckTimer: ReturnType<typeof setTimeout> | null = null;
    private lastFootAt = 0;
    private lastZone: HouseZone | null = null;
    private zoneHoldUntil = 0;
    private approachCooldown = new Map<string, number>();

    private ensure() {
        if (this.unlocked || typeof window === 'undefined') return;
        unlockAudio();
        this.unlocked = true;
    }

    setMuted(m: boolean) {
        this.muted = m;
        if (m) {
            this.stopMusic(400);
            this.stopAllAmbient(300);
        }
    }

    isMuted() {
        return this.muted;
    }

    setMaster(v: number) {
        this.master = Math.max(0, Math.min(1, v));
        if (this.music && this.musicId) {
            const base = MUSIC_META[this.musicId].volume * this.master;
            this.music.volume(base);
        }
    }

    unlock() {
        this.ensure();
    }

    // ── Music ─────────────────────────────────────────────
    playMusic(id: HubMusicId, opts?: { fadeMs?: number; force?: boolean }) {
        if (typeof window === 'undefined' || this.muted) return;
        this.ensure();
        const meta = MUSIC_META[id];
        if (!meta) return;
        if (this.musicId === id && this.music?.playing() && !opts?.force) return;

        const next = getHowl(meta.src, meta.loop !== false);
        const fadeIn = opts?.fadeMs ?? meta.fadeIn;
        const target = meta.volume * this.master;

        if (this.music && this.music !== next) {
            const prev = this.music;
            const out = opts?.fadeMs ?? (this.musicId ? MUSIC_META[this.musicId].fadeOut : 1400);
            const from = prev.volume();
            prev.fade(from, 0, out);
            setTimeout(() => {
                if (this.music !== prev) prev.stop();
            }, out + 60);
        }

        const from = next.playing() ? next.volume() : 0;
        if (!next.playing()) {
            next.volume(0);
            next.play();
        }
        next.fade(from, target, fadeIn);
        this.music = next;
        this.musicId = id;
    }

    stopMusic(fadeMs = 1200) {
        const h = this.music;
        if (!h) return;
        const from = h.volume();
        h.fade(from, 0, fadeMs);
        const ref = h;
        this.music = null;
        this.musicId = null;
        setTimeout(() => {
            if (this.music !== ref) ref.stop();
        }, fadeMs + 60);
    }

    /** Duck music briefly under important SFX / stings */
    duck(durationMs = 900, level = 0.35) {
        if (!this.music || !this.musicId || this.muted) return;
        const base = MUSIC_META[this.musicId].volume * this.master;
        const h = this.music;
        h.fade(h.volume(), base * level, 180);
        if (this.duckTimer) clearTimeout(this.duckTimer);
        this.duckTimer = setTimeout(() => {
            if (this.music === h && h.playing()) h.fade(h.volume(), base, 450);
        }, durationMs);
    }

    // ── SFX one-shots ─────────────────────────────────────
    playSfx(id: HubSfxId, opts?: { volume?: number; rate?: number; duck?: boolean }) {
        if (typeof window === 'undefined' || this.muted) return;
        this.ensure();
        const meta = SFX_META[id];
        if (!meta) return;
        const h = getHowl(meta.src, false);
        const vol = (opts?.volume ?? meta.volume) * this.master;
        h.rate(opts?.rate ?? 1);
        h.volume(vol);
        h.stop();
        h.play();
        // Soft attack envelope via micro fade for longer ones
        if (vol > 0.05) {
            h.fade(0, vol, 40);
        }
        if (opts?.duck) this.duck(700, 0.4);
    }

    // ── Looping ambients (layers under music) ─────────────
    setAmbient(key: string, id: HubSfxId | null, targetVol?: number) {
        if (typeof window === 'undefined') return;
        const existing = this.ambient.get(key);
        if (!id) {
            if (existing) {
                const from = existing.volume();
                existing.fade(from, 0, 900);
                setTimeout(() => {
                    if (!existing.playing()) return;
                    existing.stop();
                }, 960);
                this.ambient.delete(key);
            }
            return;
        }
        if (this.muted) return;
        this.ensure();
        const meta = SFX_META[id];
        if (!meta?.loop) return;
        const h = getHowl(meta.src, true);
        // Ensure Howler loop flag stays on (html5 loops can drop after stop)
        h.loop(true);
        const vol = (targetVol ?? meta.volume) * this.master;
        if (existing === h && h.playing()) {
            // Soft volume track without re-triggering play (avoids loop glitch)
            const cur = h.volume();
            if (Math.abs(cur - vol) > 0.02) h.volume(vol);
            return;
        }
        if (existing && existing !== h) {
            existing.fade(existing.volume(), 0, 700);
            setTimeout(() => existing.stop(), 760);
        }
        if (!h.playing()) {
            h.volume(0);
            h.play();
            h.fade(0, vol, 800);
        } else {
            h.volume(vol);
        }
        this.ambient.set(key, h);
    }

    stopAllAmbient(fadeMs = 800) {
        this.ambient.forEach((h) => {
            h.fade(h.volume(), 0, fadeMs);
            setTimeout(() => h.stop(), fadeMs + 60);
        });
        this.ambient.clear();
    }

    // ── House helpers ─────────────────────────────────────
    enterHouse() {
        this.playMusic('house_ambient_main');
        this.lastZone = 'main';
    }

    leaveHouse() {
        this.stopMusic(1600);
        this.stopAllAmbient(1000);
        this.lastZone = null;
    }

    /** Call from FP pose ~every frame throttled externally (footsteps are separate — footPlant) */
    updateHousePose(x: number, z: number, _moving: boolean, _onRug: boolean) {
        if (this.muted) return;
        const zone = zoneFromPose(x, z);
        const now = performance.now();

        // Hold zone music ~1.2s to avoid thrash at borders
        if (zone !== this.lastZone && now > this.zoneHoldUntil) {
            this.lastZone = zone;
            this.zoneHoldUntil = now + 1200;
            this.playMusic(zoneMusic(zone));
        }

        // Ambient layers — tight radii so crackle only at the real fireplace
        const fireDist = Math.hypot(x - 0, z - -11.4);
        const nearFire = fireDist < 3.6;
        // Living media wall (east) + cinema screen (east mid-room)
        const nearTv =
            Math.hypot(x - 4.55, z - -7.8) < 3.0 || Math.hypot(x - 12.5, z - 7.0) < 3.2;
        const nearDesk = Math.hypot(x - 4.8, z - 7.6) < 3.0;
        const fireVol = nearFire ? 0.04 + (1 - Math.min(1, fireDist / 3.6)) * 0.08 : 0;
        this.setAmbient('fire', nearFire ? 'fire_crackle_loop' : null, fireVol);
        this.setAmbient('tv', nearTv ? 'tv_static_soft' : null, nearTv ? 0.035 : 0);
        this.setAmbient('pc', nearDesk ? 'computer_hum_loop' : null, nearDesk ? 0.04 : 0);
    }

    /**
     * One foot plant only — call on bob zero-cross while grounded + actually moving.
     * No ghost steps on stop (caller must gate on speed + input).
     */
    footPlant(onRug: boolean) {
        if (this.muted) return;
        const now = performance.now();
        // Hard min gap prevents double-fire from frame jitter
        if (now - this.lastFootAt < 220) return;
        this.lastFootAt = now;
        const rate = 0.94 + Math.random() * 0.12;
        this.playSfx(onRug ? 'house_footstep_rug' : 'house_footstep_wood', {
            volume: (onRug ? 0.09 : 0.11) * (0.88 + Math.random() * 0.18),
            rate,
        });
    }

    /** One-shot approach cue (throttled per hotspot id) */
    approachHotspot(id: string) {
        const now = performance.now();
        const last = this.approachCooldown.get(id) ?? 0;
        if (now - last < 4500) return;
        this.approachCooldown.set(id, now);
        if (id === 'soul_mirror') this.playSfx('mirror_approach', { duck: true });
        else if (id === 'computer') this.playSfx('computer_boot', { volume: 0.25 });
        else if (id === 'arcade') this.playSfx('house_interact_ring');
        else if (id === 'library') this.playSfx('book_pull', { volume: 0.25 });
        else if (id === 'front_door') this.playSfx('door_front_touch', { volume: 0.3 });
        else this.playSfx('house_interact_ring', { volume: 0.28 });
    }

    useHotspot(id: string) {
        this.playSfx('house_use_e', { duck: true });
        switch (id) {
            case 'soul_mirror':
                this.playSfx('mirror_open', { duck: true });
                this.playMusic('soul_mirror_reflect');
                break;
            case 'computer':
                this.playSfx('computer_boot', { duck: true });
                break;
            case 'arcade':
                this.playSfx('arcade_controller_pickup');
                this.playSfx('arcade_start', { duck: true });
                this.playMusic('arcade_lobby');
                break;
            case 'library':
                this.playSfx('library_open', { duck: true });
                this.playSfx('book_place', { volume: 0.3 });
                break;
            case 'front_door':
                this.playSfx('door_soon', { duck: true });
                break;
            case 'wayfinder':
                this.playSfx('map_offline', { duck: true });
                break;
            case 'hall':
                this.playSfx('hall_arch_pass');
                break;
            case 'studio':
                this.playSfx('studio_key');
                this.playMusic('house_studio_pulse');
                break;
            case 'offering':
                this.playMusic('offering_sustain');
                break;
            case 'fireplace':
                this.playSfx('house_interact_ring', { volume: 0.25 });
                this.playMusic('house_hearth_warm');
                break;
            default:
                break;
        }
    }

    jumpLand() {
        this.playSfx('house_jump_land', { volume: 0.38 });
    }

    // ── Truth.OS ──────────────────────────────────────────
    osBootStart() {
        this.playMusic('truthos_boot_theme', { force: true });
        this.playSfx('os_boot_blip');
    }

    osBootReady() {
        this.playSfx('os_boot_ready', { duck: true });
        this.playMusic('truthos_desktop_idle');
    }

    osWindowOpen() {
        this.playSfx('os_window_open');
    }

    osWindowClose() {
        this.playSfx('os_window_close');
    }

    osStartMenu() {
        this.playSfx('os_start_menu');
    }

    osExitToHouse() {
        this.playMusic('house_ambient_main');
    }

    // ── Arcade ────────────────────────────────────────────
    arcadeGame(id: 'serpent' | 'tetra' | 'veil') {
        const map = { serpent: 'arcade_serpent', tetra: 'arcade_tetra', veil: 'arcade_veil' } as const;
        this.playMusic(map[id]);
        this.playSfx('arcade_start', { duck: true });
    }

    arcadeLobby() {
        this.playMusic('arcade_lobby');
    }

    // ── Multiplayer ───────────────────────────────────────
    peerJoined() {
        this.playSfx('peer_join', { duck: true });
    }

    peerLeft() {
        this.playSfx('peer_leave');
    }
}

export const hubAudio = new HubAudioController();
