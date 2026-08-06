'use client';

/**
 * The living cinema surface — plays HOUSE_FILMS via VideoTexture.
 * Shared selection lives in houseUiStore (panel + screen stay in sync).
 *
 * Renders at its local origin so the parent decides where it hangs —
 * today that is the Cinema Grove screen in WorldDestinations.
 */
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { getHouseFilm, HOUSE_FILMS } from '@/lib/truthos/houseCinemaFilms';
import { useHouseUi } from './houseUiStore';

export default function CinemaScreen({
    w = 2.15,
    h = 1.3,
    low = false,
}: {
    w?: number;
    h?: number;
    low?: boolean;
}) {
    const filmId = useHouseUi((s) => s.cinemaFilmId);
    const playing = useHouseUi((s) => s.cinemaPlaying);
    const meshRef = useRef<THREE.Mesh>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const texRef = useRef<THREE.VideoTexture | null>(null);

    const film = useMemo(() => getHouseFilm(filmId) ?? HOUSE_FILMS[0], [filmId]);

    useEffect(() => {
        if (typeof document === 'undefined') return;
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.playsInline = true;
        video.muted = false;
        video.loop = true;
        video.preload = 'auto';
        video.setAttribute('playsinline', 'true');
        videoRef.current = video;

        const tex = new THREE.VideoTexture(video);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = false;
        texRef.current = tex;

        if (meshRef.current) {
            const mat = meshRef.current.material as THREE.MeshBasicMaterial;
            mat.map = tex;
            mat.needsUpdate = true;
        }

        return () => {
            try {
                video.pause();
                video.removeAttribute('src');
                video.load();
            } catch {
                /* */
            }
            tex.dispose();
            videoRef.current = null;
            texRef.current = null;
        };
    }, []);

    // Load / switch film
    useEffect(() => {
        const video = videoRef.current;
        const tex = texRef.current;
        if (!video || !film) return;
        const next = film.src;
        if (video.getAttribute('src') !== next) {
            video.src = next;
            video.load();
        }
        if (playing) {
            void video.play().catch(() => {
                // Autoplay may require mute once; retry muted then unmute
                video.muted = true;
                void video.play().then(() => {
                    video.muted = false;
                }).catch(() => {
                    /* user gesture needed — panel Play handles it */
                });
            });
        } else {
            video.pause();
        }
        if (tex) tex.needsUpdate = true;
    }, [film, playing, film?.src]);

    useFrame(() => {
        const tex = texRef.current;
        const video = videoRef.current;
        if (tex && video && !video.paused && !video.ended) {
            tex.needsUpdate = true;
        }
    });

    return (
        <group>
            {/* Bezel is the parent's job — this is the active surface */}
            <mesh ref={meshRef}>
                <planeGeometry args={[w, h]} />
                <meshBasicMaterial
                    color={filmId && playing ? '#ffffff' : '#1a1030'}
                    toneMapped={false}
                    side={THREE.FrontSide}
                />
            </mesh>
            {/* Screen light spills onto the benches while a film runs */}
            {!low && playing && (
                <pointLight position={[0, 0, 2.4]} intensity={2.6} color="#bcd4ff" distance={12} decay={2} />
            )}
            {/* Soft idle glow when nothing is playing */}
            {!playing && (
                <mesh position={[0, 0, -0.01]}>
                    <planeGeometry args={[w * 0.98, h * 0.98]} />
                    <meshStandardMaterial
                        color="#0a0a12"
                        emissive="#7c3aed"
                        emissiveIntensity={low ? 0.35 : 0.55}
                        toneMapped={false}
                    />
                </mesh>
            )}
        </group>
    );
}
