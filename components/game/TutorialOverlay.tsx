'use client';

const TUTORIALS: Record<string, { title: string; body: string }> = {
    roam: { title: 'Roam the Cavern', body: 'Drag the joystick (or WASD) to move. Begin at Truth\'s Hut in the center — forge a weapon, then walk the glowing portals to gather their relics on the way back to the Source.' },
    interact: { title: 'Interact', body: 'Near a portal, cave, or an NPC marked with "!", a prompt appears — tap it to enter or speak. The souls at the edges hand out the missions that sharpen you.' },
    satchel: { title: 'Your Satchel', body: 'Tap the Satchel bag (top right) to view relics, scrolls, tonics, and equipped gear — and to see your total combat blessing before a fight.' },
    forge: { title: 'Truth\'s Forge', body: 'Inside the Hut, open the forge to smelt weapons from gathered ore.' },
    combat: { title: 'Combat', body: 'Shades will hunt you. STRIKE swings toward where you last moved; DODGE grants a breath of untouchable speed. Watch for the white wind-up rings — everything they throw can be dodged.' },
};

interface Props {
    id: keyof typeof TUTORIALS;
    onDismiss: () => void;
    /** Suppress every intro walkthrough so they never flood on load again. */
    onNeverShow?: () => void;
}

export default function TutorialOverlay({ id, onDismiss, onNeverShow }: Props) {
    const t = TUTORIALS[id];
    if (!t) return null;
    return (
        <div
            className="absolute inset-x-4 z-40 pointer-events-auto animate-fade-in"
            style={{ bottom: 'calc(11rem + env(safe-area-inset-bottom))' }}
        >
            <div className="max-w-md mx-auto glass-panel rounded-2xl p-4 border border-aether-gold/25">
                <p className="text-[9px] font-black uppercase tracking-[0.35em] text-aether-gold">{t.title}</p>
                <p className="font-ritual text-sm text-white/85 mt-1.5 leading-relaxed">{t.body}</p>
                <div className="mt-3 flex items-center justify-between gap-4">
                    <button onClick={onDismiss} className="text-[10px] font-black uppercase tracking-widest text-aether-gold hover:text-white">
                        Got it →
                    </button>
                    {onNeverShow && (
                        <button
                            onClick={onNeverShow}
                            className="text-[9px] font-bold uppercase tracking-widest text-white/40 hover:text-white/75 transition-colors"
                        >
                            Never show again
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export const TUTORIAL_IDS = Object.keys(TUTORIALS) as (keyof typeof TUTORIALS)[];