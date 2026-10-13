/**
 * What a vessel carries and wears that the rigged kit does not include:
 * the staves and the Sword of the Spirit in the right hand, the Shield of
 * Faith on the left forearm, and locs for those who wear them (Truth).
 *
 * Everything is built procedurally and placed by the body's own anatomy
 * at rest — the forearm's line, the thumb's direction, the head's centre —
 * measured in the body's root space and then re-expressed in the bone's
 * frame. So a staff sits in the fist and swings with the sword clips no
 * matter how the rig's bones happen to be oriented.
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type VesselGear = {
    weapon?: string | null;
    shield?: boolean;
    locs?: boolean;
};

export const gearKey = (g?: VesselGear) => (g ? `${g.weapon ?? ''}|${g.shield ? 1 : 0}|${g.locs ? 1 : 0}` : '');

const v = () => new THREE.Vector3();

function bonePos(root: THREE.Object3D, name: string, out: THREE.Vector3): THREE.Vector3 | null {
    const b = root.getObjectByName(name);
    if (!b) return null;
    return out.setFromMatrixPosition(b.matrixWorld);
}

/**
 * Parent `obj` (whose matrix is given in the root's space) to `bone`, so
 * it sits exactly there at rest and follows the bone when it moves.
 */
function attach(root: THREE.Object3D, bone: THREE.Object3D, obj: THREE.Object3D, inRoot: THREE.Matrix4) {
    const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
    const boneInRoot = new THREE.Matrix4().multiplyMatrices(rootInv, bone.matrixWorld);
    const local = new THREE.Matrix4().copy(boneInRoot).invert().multiply(inRoot);
    local.decompose(obj.position, obj.quaternion, obj.scale);
    bone.add(obj);
}

/** A matrix placing +Y along `axis` at `at` (cylinders and staves are built along +Y) */
function alongY(at: THREE.Vector3, axis: THREE.Vector3): THREE.Matrix4 {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), axis.clone().normalize());
    return new THREE.Matrix4().compose(at, q, new THREE.Vector3(1, 1, 1));
}

/* ── the weapons, built along +Y with the grip at the origin ─────── */

function mat(color: string, opts: Partial<THREE.MeshStandardMaterialParameters> = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...opts });
}

function staff(kind: string): THREE.Group {
    const g = new THREE.Group();
    const wood = kind === 'staff_oak' ? mat('#5b3a1e', { roughness: 0.8 }) : kind === 'staff_iron' ? mat('#4a3424') : mat('#8a6239', { roughness: 0.85 });
    const r = kind === 'staff_oak' ? 0.026 : 0.022;
    // forward of the fist 1.05 m, behind it 0.42 m
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r, 1.47, 8), wood);
    shaft.position.y = (1.05 - 0.42) / 2;
    g.add(shaft);
    if (kind === 'staff_iron') {
        const iron = mat('#9ca3af', { metalness: 0.8, roughness: 0.35 });
        for (const y of [1.05, -0.42]) {
            const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.35, r * 1.35, 0.14, 8), iron);
            cap.position.y = y - Math.sign(y) * 0.05;
            g.add(cap);
        }
    }
    // the shepherd's crook
    if (kind === 'staff_shepherd' || !kind) {
        const crook = new THREE.Mesh(new THREE.TorusGeometry(0.09, r * 0.85, 6, 14, Math.PI * 1.2), wood);
        crook.position.set(0.09, 1.05, 0);
        crook.rotation.z = -Math.PI * 0.1;
        g.add(crook);
    }
    return g;
}

function swordOfTheSpirit(): THREE.Group {
    const g = new THREE.Group();
    const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.86, 0.012),
        new THREE.MeshStandardMaterial({ color: '#fff7dc', emissive: '#fde68a', emissiveIntensity: 1.6, metalness: 0.6, roughness: 0.2, toneMapped: false }),
    );
    blade.position.y = 0.12 + 0.43;
    g.add(blade);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.039, 0.1, 4), blade.material);
    tip.position.y = 0.12 + 0.86 + 0.05;
    tip.rotation.y = Math.PI / 4;
    g.add(tip);
    const gold = mat('#d4a017', { metalness: 0.9, roughness: 0.3 });
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.03, 0.04), gold);
    guard.position.y = 0.11;
    g.add(guard);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.2, 8), mat('#3b2412'));
    grip.position.y = 0.0;
    g.add(grip);
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 6), gold);
    pommel.position.y = -0.11;
    g.add(pommel);
    const glow = new THREE.PointLight('#ffe7a3', 0.8, 3.5, 2);
    glow.position.y = 0.6;
    g.add(glow);
    return g;
}

export function buildWeapon(id: string): THREE.Group {
    return id === 'sword_spirit' ? swordOfTheSpirit() : staff(id);
}

function shieldOfFaith(): THREE.Group {
    const g = new THREE.Group();
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.035, 28), mat('#e9e3d1', { roughness: 0.6 }));
    g.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.022, 6, 28), mat('#c9a227', { metalness: 0.85, roughness: 0.3 }));
    rim.rotation.x = Math.PI / 2;
    g.add(rim);
    // a gold cross on the face
    const crossMat = mat('#c9a227', { metalness: 0.85, roughness: 0.3, emissive: '#5a4300', emissiveIntensity: 0.4 });
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.4), crossMat);
    a.position.y = 0.025;
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.02, 0.06), crossMat);
    b.position.set(0, 0.025, -0.05);
    g.add(a, b);
    return g;
}

/* ── locs ───────────────────────────────────────────────────────── */

function locs(center: THREE.Vector3, up: THREE.Vector3, fwd: THREE.Vector3, radius: number): THREE.Group {
    const right = new THREE.Vector3().crossVectors(up, fwd).normalize();
    const geos: THREE.BufferGeometry[] = [];
    let seed = 7;
    const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
    };
    const dirOf = (theta: number, lat: number) =>
        new THREE.Vector3()
            .addScaledVector(fwd, Math.cos(theta) * Math.cos(lat))
            .addScaledVector(right, Math.sin(theta) * Math.cos(lat))
            .addScaledVector(up, Math.sin(lat));
    // rings of roots over the crown, sides and back — none across the face
    for (let ring = 0; ring < 4; ring++) {
        const lat = 0.25 + ring * 0.33;
        const count = [22, 18, 14, 8][ring];
        for (let i = 0; i < count; i++) {
            const theta = (i / count) * Math.PI * 2 + ring * 0.21;
            const t = ((theta % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            const facing = Math.cos(t);
            // the face stays clear: locs grow from the sides, the crown-back and the back
            if (facing > 0.3) continue;
            const d = dirOf(theta, lat);
            const root = center.clone().addScaledVector(d, radius * 0.98);
            const outward = new THREE.Vector3(d.x, 0, d.z).projectOnPlane(up).normalize();
            const len = 0.24 + rand() * 0.12 + (facing < -0.3 ? 0.06 : 0);
            const pts = [root];
            for (let k = 1; k <= 4; k++) {
                const f = k / 4;
                pts.push(
                    root
                        .clone()
                        .addScaledVector(outward, 0.035 + f * 0.05 + (facing > 0 ? 0.03 : 0))
                        .addScaledVector(up, -len * f + 0.02 * (1 - f))
                        .addScaledVector(right, (rand() - 0.5) * 0.02),
                );
            }
            const curve = new THREE.CatmullRomCurve3(pts);
            geos.push(new THREE.TubeGeometry(curve, 8, 0.0125 + rand() * 0.003, 5, false));
        }
    }
    const g = new THREE.Group();
    const merged = mergeGeometries(geos, false);
    for (const geo of geos) geo.dispose();
    const hairMat = new THREE.MeshStandardMaterial({ color: '#1d1510', roughness: 0.9 });
    if (merged) g.add(new THREE.Mesh(merged, hairMat));
    // a close cap so the scalp never shows between the locs
    const cap = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.04, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), hairMat);
    cap.position.copy(center);
    cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    // tilt the cap back so the hairline sits above the brow and the back runs low
    cap.rotateOnAxis(new THREE.Vector3(1, 0, 0), -0.35);
    g.add(cap);
    return g;
}

/* ── put it all on ──────────────────────────────────────────────── */

/**
 * Dress a freshly cloned vessel (at rest, not yet in the scene). The root's
 * up and forward are measured from the rig itself: spine to head is up,
 * and the vessel faces its own +Z.
 */
export function attachGear(root: THREE.Object3D, gear: VesselGear) {
    root.updateMatrixWorld(true);
    const P = (n: string) => bonePos(root, n, v());

    if (gear.weapon) {
        const hand = root.getObjectByName('hand_r');
        const h = P('hand_r');
        const lower = P('lowerarm_r');
        const thumb = P('thumb_01_r');
        const mid = P('middle_01_r');
        if (hand && h && lower && thumb && mid) {
            const along = h.clone().sub(lower).normalize();
            // the line a fist closes around runs the thumb's way, square to the forearm
            const axis = thumb.clone().sub(h).projectOnPlane(along).normalize();
            const grip = h.clone().lerp(mid, 0.85);
            const w = buildWeapon(gear.weapon);
            w.matrixAutoUpdate = true;
            attach(root, hand, w, alongY(grip, axis));
            w.traverse((o) => {
                const m = o as THREE.Mesh;
                if (m.isMesh) m.castShadow = true;
            });
        }
    }

    if (gear.shield) {
        const arm = root.getObjectByName('lowerarm_l');
        const lower = P('lowerarm_l');
        const h = P('hand_l');
        const thumb = P('thumb_01_l');
        if (arm && lower && h && thumb) {
            const along = h.clone().sub(lower).normalize();
            const t = thumb.clone().sub(h).projectOnPlane(along).normalize();
            let back = new THREE.Vector3().crossVectors(along, t).normalize();
            // the back of the forearm faces away from the body and up at rest
            const outward = new THREE.Vector3(Math.sign(h.x) || 1, 0.6, 0);
            if (back.dot(outward) < 0) back.negate();
            const at = lower.clone().lerp(h, 0.5).addScaledVector(back, 0.07);
            const s = shieldOfFaith();
            attach(root, arm, s, alongY(at, back));
            s.traverse((o) => {
                const m = o as THREE.Mesh;
                if (m.isMesh) m.castShadow = true;
            });
        }
    }

    if (gear.locs) {
        const head = root.getObjectByName('Head');
        const hp = P('Head');
        const neck = P('neck_01');
        if (head && hp && neck) {
            const up = hp.clone().sub(neck).normalize();
            const fwd = new THREE.Vector3(0, 0, 1).projectOnPlane(up).normalize();
            const center = hp.clone().addScaledVector(up, 0.105).addScaledVector(fwd, 0.01);
            const l = locs(center, up, fwd, 0.1);
            attach(root, head, l, new THREE.Matrix4());
            l.traverse((o) => {
                const m = o as THREE.Mesh;
                if (m.isMesh) m.castShadow = true;
            });
        }
    }
}
