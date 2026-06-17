import type { GameCharacter } from '@/lib/store/useGameStore';
import { QUESTS, QUESTS_ENABLED, questsAvailable, objectiveMet } from '@/lib/game/quests';
import { buildOverworld, TILE, type POI } from '@/lib/game/overworld';
import { isDestinationUnlocked, activeDestinationFocus } from '@/lib/game/progression';


export interface QuestWaypoint {
    questId: string;
    title: string;
    worldX: number;
    worldY: number;
    poiName: string;
}

const DEST_TO_POI: Record<string, string> = {
    dest_eden: 'dest_eden',
    dest_fair: 'dest_fair',
    dest_giza: 'dest_giza',
    dest_kolbrin: 'dest_kolbrin',
    dest_emerald: 'dest_emerald',
};

function poiCenter(poi: POI) {
    return { x: (poi.x + 0.5) * TILE, y: (poi.y + 0.5) * TILE };
}

/** First active (unclaimed, unmet) quest target for waypoint UI. */
export function activeQuestWaypoint(character: GameCharacter): QuestWaypoint | null {
    if (!QUESTS_ENABLED) return null;
    const focus = activeDestinationFocus(character);
    const ow = buildOverworld();
    const pois = ow.pois;

    for (const q of QUESTS) {
        if (character.questsClaimed.includes(q.id)) continue;
        const giverPoi = pois.find((p) => p.id === q.giver);
        const available = giverPoi && questsAvailable(q.giver, character).some((aq) => aq.id === q.id);
        if (!available) continue;
        if (objectiveMet(q, character)) continue;

        let targetPoi: POI | undefined = giverPoi;
        const o = q.objective;
        if (o.kind === 'clear' && DEST_TO_POI[o.destId]) {
            targetPoi = pois.find((p) => p.id === DEST_TO_POI[o.destId]) || giverPoi;
        } else if (o.kind === 'solve') {
            const puzzleDest = o.puzzleId.replace('puz_', 'dest_');
            targetPoi = pois.find((p) => p.id === puzzleDest) || giverPoi;
        } else if (o.kind === 'minigame' || o.kind === 'materials' || o.kind === 'discovered' || o.kind === 'discoveredAll' || o.kind === 'discoveredCount') {
            const destId = q.destId;
            if (destId && DEST_TO_POI[destId]) {
                targetPoi = pois.find((p) => p.id === DEST_TO_POI[destId]) || giverPoi;
            }
        } else if (o.kind === 'collect') {
            const poiId = q.destId ? DEST_TO_POI[q.destId] : undefined;
            if (poiId) targetPoi = pois.find((p) => p.id === poiId) || giverPoi;
        }

        if (!targetPoi) continue;
        if (!isDestinationUnlocked(targetPoi.id, character)) continue;
        if (focus && targetPoi.id !== focus && !targetPoi.id.startsWith('npc_')) {
            // Prefer quests on the current age in the chain
            const focusQuests = QUESTS.filter((fq) => {
                const giver = pois.find((p) => p.id === fq.giver);
                if (fq.objective.kind === 'clear') return fq.objective.destId === focus;
                if (fq.objective.kind === 'solve') return fq.objective.puzzleId.replace('puz_', 'dest_') === focus;
                return giver && (giver.id === focus || giver.id.startsWith('npc_'));
            });
            if (focusQuests.length > 0 && !focusQuests.some((fq) => fq.id === q.id)) continue;
        }
        const c = poiCenter(targetPoi);
        return { questId: q.id, title: q.title, worldX: c.x, worldY: c.y, poiName: targetPoi.name };
    }
    return null;
}

/**
 * Quest-independent "go here next" objective — always available, even with
 * QUESTS_ENABLED off. Steers an unarmed soul to the Hut to forge, then to the
 * next unlocked-incomplete destination, else back to the Hut. This is the only
 * persistent wayfinding the roaming player gets, so it never returns null while
 * a Hut exists.
 */
export function focusWaypoint(character: GameCharacter): QuestWaypoint | null {
    const ow = buildOverworld();
    const hut = ow.pois.find((p) => p.type === 'hut');

    const atHut = (title: string): QuestWaypoint | null => {
        if (!hut) return null;
        const c = poiCenter(hut);
        return { questId: 'objective', title, worldX: c.x, worldY: c.y, poiName: hut.name };
    };

    // Unarmed → the first real objective is forging at the Hut.
    if (!character.equipped.weapon) return atHut('Forge your first weapon');

    const focus = activeDestinationFocus(character);
    if (focus) {
        const poi = ow.pois.find((p) => p.id === focus);
        if (poi) {
            const c = poiCenter(poi);
            return { questId: 'objective', title: `Seek ${poi.name}`, worldX: c.x, worldY: c.y, poiName: poi.name };
        }
    }

    return atHut("Return to Truth's Hut");
}