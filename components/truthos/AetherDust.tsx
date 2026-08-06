'use client';

/**
 * Aether dust — the one true-3D layer under the desktop.
 *
 * A single THREE.Points cloud of gold motes drifting through an indigo
 * void: one draw call, additive blending, DPR capped at 1.5, and the
 * whole loop stops on document.hidden and prefers-reduced-motion. Raw
 * three (already a dependency) rather than react-three-fiber, because
 * mounting a reconciler under every desktop frame is a tax the shell
 * should not pay for a wallpaper.
 *
 * The camera answers the pointer with a slow lag, so the dust parallaxes
 * against the CSS aurora behind it — two layers moving at different
 * depths is what sells the void as SPACE rather than a gradient.
 */
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const COUNT = 520;
const DEPTH = 60;

export default function AetherDust({ enabled = true }: { enabled?: boolean }) {
    const host = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!enabled) return;
        const el = host.current;
        if (!el) return;
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.setClearColor(0x000000, 0);
        el.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, DEPTH * 2);
        camera.position.z = 8;

        // Soft round sprite, drawn once
        const cvs = document.createElement('canvas');
        cvs.width = cvs.height = 64;
        const g = cvs.getContext('2d')!;
        const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, 'rgba(255,236,190,1)');
        grad.addColorStop(0.4, 'rgba(251,191,36,0.55)');
        grad.addColorStop(1, 'rgba(251,191,36,0)');
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 64);
        const sprite = new THREE.CanvasTexture(cvs);

        const positions = new Float32Array(COUNT * 3);
        const speeds = new Float32Array(COUNT);
        for (let i = 0; i < COUNT; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 44;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 26;
            positions[i * 3 + 2] = -Math.random() * DEPTH;
            speeds[i] = 0.14 + Math.random() * 0.5;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({
            size: 0.34,
            map: sprite,
            transparent: true,
            opacity: 0.75,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            color: 0xfbbf24,
        });
        const points = new THREE.Points(geo, mat);
        points.frustumCulled = false;
        scene.add(points);

        // A second, farther, indigo layer — depth without a second geometry:
        // same buffer, different material, scaled group.
        const far = new THREE.Points(geo, new THREE.PointsMaterial({
            size: 0.2,
            map: sprite,
            transparent: true,
            opacity: 0.35,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
            color: 0x818cf8,
        }));
        far.scale.setScalar(1.8);
        far.frustumCulled = false;
        scene.add(far);

        let px = 0;
        let py = 0;
        const onMove = (e: PointerEvent) => {
            px = (e.clientX / window.innerWidth - 0.5) * 2;
            py = (e.clientY / window.innerHeight - 0.5) * 2;
        };
        window.addEventListener('pointermove', onMove, { passive: true });

        const size = () => {
            const w = el.clientWidth || 1;
            const h = el.clientHeight || 1;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        };
        size();
        window.addEventListener('resize', size);

        let raf = 0;
        const clock = new THREE.Clock();
        const tick = () => {
            raf = requestAnimationFrame(tick);
            const dt = Math.min(clock.getDelta(), 0.05);
            const arr = geo.attributes.position.array as Float32Array;
            for (let i = 0; i < COUNT; i++) {
                // Motes rise toward the viewer and recycle into the deep
                arr[i * 3 + 2] += speeds[i] * dt;
                if (arr[i * 3 + 2] > 6) arr[i * 3 + 2] = -DEPTH;
            }
            geo.attributes.position.needsUpdate = true;
            // Lagged parallax — the void answers the hand, slowly
            camera.position.x += (px * 1.6 - camera.position.x) * dt * 1.4;
            camera.position.y += (-py * 1.0 - camera.position.y) * dt * 1.4;
            camera.lookAt(0, 0, -10);
            renderer.render(scene, camera);
        };

        const onVis = () => {
            if (document.hidden) {
                cancelAnimationFrame(raf);
                raf = 0;
            } else if (!raf) {
                clock.getDelta();
                raf = requestAnimationFrame(tick);
            }
        };
        document.addEventListener('visibilitychange', onVis);
        if (!document.hidden) raf = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(raf);
            document.removeEventListener('visibilitychange', onVis);
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('resize', size);
            geo.dispose();
            mat.dispose();
            (far.material as THREE.Material).dispose();
            sprite.dispose();
            renderer.dispose();
            el.removeChild(renderer.domElement);
        };
    }, [enabled]);

    if (!enabled) return null;
    return <div ref={host} aria-hidden className="pointer-events-none absolute inset-0" />;
}
