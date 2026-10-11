'use client';

/**
 * The Cinema's screen — never blank.
 *
 * Two layers. Underneath, always, the film's poster (the same texture
 * path every framed picture in the lair uses). In front, the moving
 * picture — shown only once a frame has been seen to carry real picture,
 * so a film still buffering, a codec the browser refuses, or a GPU that
 * cannot take video frames leaves the poster showing, never a black wall.
 *
 * The film reaches the GPU through a 2D canvas, not a VideoTexture. Some
 * renderers (software GL, some blocklisted laptop GPUs) upload video
 * frames as solid black while the film is plainly playing; a canvas is
 * the same upload every poster already survives. Each new video frame is
 * drawn once into the canvas, and a tiny probe canvas samples the first
 * frames until one is bright enough to be picture rather than black.
 *
 * Three states, decided a few times a second from the store and where
 * you stand:
 *
 *   FILM     a film was chosen in the Cinema panel and is playing. While
 *            the panel is open the panel has the sound and the wall plays
 *            in step, muted; close the panel and the wall picks up where
 *            the panel left off, with sound that fades with distance and
 *            ducks the music bed while you are in the room.
 *   ATTRACT  nothing chosen, but you are near: the house reel loops,
 *            muted, so walking in you find a picture already moving.
 *   IDLE     you are far away (or on a phone): the poster, lit.
 */
import { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { getHouseFilm, HOUSE_FILMS } from '@/lib/truthos/houseCinemaFilms';
import { hubAudio } from '@/lib/truthos/hubAudio';
import { useHouseUi } from './houseUiStore';
import { getWalkerPose } from './walkerPose';
import { SCREEN } from './homeMap';

const FALLBACK_POSTER = '/assets/cutscenes/cutscene-world-crossroads.jpg';
/** The reel that loops when nobody has chosen */
const ATTRACT_ID = 'title';
/** Start the attract loop within this many metres of the screen */
const ATTRACT_NEAR = 30;
/** A frame whose mean channel is under this is "black" — keep the poster */
const BLACK = 7;
/** Full volume inside this, silent beyond FADE_FAR */
const FADE_NEAR = 10;
const FADE_FAR = 34;

function PosterPlane({ url, w, h }: { url: string; w: number; h: number }) {
    const tex = useTexture(url);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return (
        <mesh>
            <planeGeometry args={[w, h]} />
            <meshBasicMaterial map={tex} color="#b4b4b4" toneMapped={false} />
        </mesh>
    );
}

export default function CinemaScreen({ w = 2.15, h = 1.3, low = false }: { w?: number; h?: number; low?: boolean }) {
    const filmId = useHouseUi((s) => s.cinemaFilmId);
    const film = getHouseFilm(filmId) ?? getHouseFilm(ATTRACT_ID) ?? HOUSE_FILMS[0];
    const posterUrl = film?.poster ?? FALLBACK_POSTER;

    const videoMesh = useRef<THREE.Mesh>(null);
    const videoMat = useRef<THREE.MeshBasicMaterial>(null);
    /** The src whose frames have been seen to carry picture */
    const proven = useRef<string | null>(null);
    const lastDrawn = useRef(-1);
    const probeTick = useRef(0);
    const light = useRef<THREE.PointLight>(null);

    const video = useMemo(() => {
        if (typeof document === 'undefined') return null;
        const v = document.createElement('video');
        v.crossOrigin = 'anonymous';
        v.playsInline = true;
        v.setAttribute('playsinline', 'true');
        v.loop = true;
        v.muted = true;
        v.preload = 'auto';
        return v;
    }, []);
    /** The frame canvas the screen samples, and the probe that checks frames are not black */
    const frame = useMemo(() => {
        if (typeof document === 'undefined') return null;
        const canvas = document.createElement('canvas');
        canvas.width = low ? 854 : 1280;
        canvas.height = low ? 480 : 720;
        const ctx = canvas.getContext('2d', { alpha: false });
        const probe = document.createElement('canvas');
        probe.width = 8;
        probe.height = 8;
        const pctx = probe.getContext('2d', { willReadFrequently: true });
        if (!ctx || !pctx) return null;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return { canvas, ctx, pctx };
    }, [low]);
    const videoTex = useMemo(() => {
        if (!frame) return null;
        const t = new THREE.CanvasTexture(frame.canvas);
        t.colorSpace = THREE.SRGBColorSpace;
        t.minFilter = THREE.LinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        return t;
    }, [frame]);

    const tick = useRef(0);
    const wasPanelOpen = useRef(false);
    const lastDuck = useRef(0);
    /** A source the browser refused — never ask for it again this session */
    const refused = useRef(new Set<string>());

    useEffect(() => {
        if (!video) return;
        const onError = () => {
            const src = video.getAttribute('src');
            if (src) refused.current.add(src);
        };
        video.addEventListener('error', onError);
        return () => {
            video.removeEventListener('error', onError);
            try {
                video.pause();
                video.removeAttribute('src');
                video.load();
            } catch {
                /* */
            }
            videoTex?.dispose();
        };
    }, [video, videoTex]);

    useFrame((_, dt) => {
        const st = useHouseUi.getState();
        const chosen = getHouseFilm(st.cinemaFilmId);
        const attractFilm = getHouseFilm(ATTRACT_ID) ?? HOUSE_FILMS[0];
        const p = getWalkerPose();
        const dist = Math.hypot(p.x - SCREEN.x, p.z - SCREEN.z);
        const panelOpen = st.panel === 'cinema';
        const mode: 'film' | 'attract' | 'idle' = st.cinemaPlaying && chosen ? 'film' : !low && dist < ATTRACT_NEAR ? 'attract' : 'idle';
        const playing = mode === 'film' ? chosen : chosen ?? attractFilm;

        tick.current += dt;
        if (video && tick.current > 0.2) {
            tick.current = 0;
            const want = mode === 'idle' || !playing || refused.current.has(playing.src) ? null : playing.src;
            if (want && video.getAttribute('src') !== want) {
                video.src = want;
                video.load();
            }
            if (!want) {
                if (!video.paused) video.pause();
            } else {
                const mute = mode === 'attract' || panelOpen || hubAudio.isMuted();
                video.muted = mute;
                const vol = Math.max(0, Math.min(1, 1 - (dist - FADE_NEAR) / (FADE_FAR - FADE_NEAR)));
                video.volume = mute ? 0 : vol;
                // The panel was just closed: take the film from where the panel had it
                if (mode === 'film' && wasPanelOpen.current && !panelOpen && st.cinemaTime > 0 && Math.abs(video.currentTime - st.cinemaTime) > 0.6) {
                    try {
                        video.currentTime = st.cinemaTime;
                    } catch {
                        /* not seekable yet */
                    }
                }
                if (video.paused) {
                    void video.play().catch(() => {
                        // Sound refused without a gesture — play muted rather than not at all
                        video.muted = true;
                        void video.play().catch(() => {});
                    });
                }
                // A film with sound in the room: hold the music bed down under it
                if (!mute && vol > 0.4 && performance.now() - lastDuck.current > 1000) {
                    lastDuck.current = performance.now();
                    hubAudio.duck(1500, 0.25);
                }
            }
            wasPanelOpen.current = panelOpen;
        }

        // Copy each new video frame into the canvas once; prove the first bright one
        const src = video?.getAttribute('src') ?? null;
        if (proven.current && proven.current !== src) proven.current = null;
        const running = !!video && !!frame && !!src && mode !== 'idle' && video.readyState >= 2 && !video.paused && video.currentTime > 0.05;
        if (running && video && frame && videoTex && video.currentTime !== lastDrawn.current) {
            lastDrawn.current = video.currentTime;
            try {
                frame.ctx.drawImage(video, 0, 0, frame.canvas.width, frame.canvas.height);
                videoTex.needsUpdate = true;
                probeTick.current += dt;
                if (proven.current !== src && probeTick.current > 0.25) {
                    probeTick.current = 0;
                    frame.pctx.drawImage(video, 0, 0, 8, 8);
                    const px = frame.pctx.getImageData(0, 0, 8, 8).data;
                    let sum = 0;
                    for (let i = 0; i < px.length; i += 4) sum += px[i] + px[i + 1] + px[i + 2];
                    if (sum / (64 * 3) > BLACK) proven.current = src;
                }
            } catch {
                // A frame the page may not read (tainted) or draw — the poster stays
                if (src) refused.current.add(src);
            }
        }
        // The moving picture covers the poster only once it has shown real picture
        const live = running && proven.current === src;
        if (videoMesh.current) videoMesh.current.visible = live;
        if (videoMat.current) videoMat.current.color.setScalar(mode === 'film' ? 1 : 0.82);
        if (light.current) light.current.intensity = live ? (mode === 'film' ? 2.6 : 1.4) : 0.6;
    });

    return (
        <group>
            <Suspense
                fallback={
                    <mesh>
                        <planeGeometry args={[w, h]} />
                        <meshBasicMaterial color="#1a1428" toneMapped={false} />
                    </mesh>
                }
            >
                <PosterPlane url={posterUrl} w={w} h={h} />
            </Suspense>
            {videoTex && (
                <mesh ref={videoMesh} position={[0, 0, 0.01]} visible={false}>
                    <planeGeometry args={[w, h]} />
                    <meshBasicMaterial ref={videoMat} map={videoTex} toneMapped={false} />
                </mesh>
            )}
            {/* The screen's light falls on the front rows; it never dims with the day */}
            <pointLight ref={light} position={[0, 0, 3.2]} intensity={0.6} color="#c8d8ff" distance={18} decay={2} userData={{ noLampDim: true }} />
        </group>
    );
}
