import { avatarOffscreen } from '@/components/game/AvatarCanvas';
import type { AvatarConfig } from '@/lib/game/avatar';

// ============================================================
//  OVERWORLD NPCs — bespoke avatar configs, predominantly
//  African American with a few mixed-race elders among them.
// ============================================================

export const NPC_AVATARS: Record<string, AvatarConfig> = {
    // The Gardener — elder keeper, deep brown skin, locs, green robe
    npc_gardener: {
        build: 'masc', skin: 8, hairStyle: 'locs', hairColor: 0, face: 'beard',
        top: 1, bottom: 0, boots: 0, outfit: 'robe',
    },
    // Mabel Hart — chronicler, medium-brown skin, braids, amber dress
    npc_mabel: {
        build: 'fem', skin: 6, hairStyle: 'braids', hairColor: 0, face: 'calm',
        top: 4, bottom: 6, boots: 1, outfit: 'dress',
    },
    // Hana — warrior-scholar, dark skin, afro, teal vest
    npc_hana: {
        build: 'fem', skin: 9, hairStyle: 'afro', hairColor: 0, face: 'keen',
        top: 5, bottom: 0, boots: 2, outfit: 'vest',
    },
    // Eli — mixed-race scribe, lighter brown skin, short hair, purple robe
    npc_eli: {
        build: 'masc', skin: 4, hairStyle: 'short', hairColor: 2, face: 'goatee',
        top: 4, bottom: 6, boots: 1, outfit: 'robe',
    },
    // Sister Mara — relic scholar, deep skin, locs, crimson tunic
    npc_mara: {
        build: 'fem', skin: 10, hairStyle: 'locs', hairColor: 0, face: 'calm',
        top: 2, bottom: 6, boots: 0, outfit: 'tunic',
    },
};

const frameCache = new Map<string, HTMLCanvasElement>();

export function npcOffscreen(npcId: string): HTMLCanvasElement {
    const cfg = NPC_AVATARS[npcId];
    if (!cfg) throw new Error(`Unknown NPC: ${npcId}`);
    const key = `${npcId}:down:0`;
    let frame = frameCache.get(key);
    if (!frame) {
        frame = avatarOffscreen(cfg, 0, 'down');
        frameCache.set(key, frame);
    }
    return frame;
}