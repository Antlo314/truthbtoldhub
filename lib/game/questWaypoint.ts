import type { GameCharacter } from '@/lib/store/useGameStore';
import { QUESTS, questsAvailable, objectiveMet } from '@/lib/game/quests';
import { buildOverworld, TILE, type POI } from '@/lib/game/overworld';

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
        }

        if (!targetPoi) continue;
        const c = poiCenter(targetPoi);
        return { questId: q.id, title: q.title, worldX: c.x, worldY: c.y, poiName: targetPoi.name };
    }
    return null;
}