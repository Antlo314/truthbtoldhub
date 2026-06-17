'use client';

const TUTORIALS: Record<string, { title: string; body: string }> = {
    roam: { title: 'Roam the Cavern', body: 'Drag the joystick or use WASD to move. Find Truth\'s Hut at the center of the world.' },
    interact: { title: 'Interact', body: 'Walk near a portal, cave, or NPC and tap the prompt that appears.' },
    satchel: { title: 'Your Satchel', body: 'Tap the gem icon to view relics, scrolls, and equipped gear.' },
    forge: { title: 'Truth\'s Forge', body: 'Inside the Hut, open the forge to smelt weapons from gathered ore.' },
    combat: { title: 'Combat', body: 'Shades will hunt you. Strike with ATTACK. Path abilities appear when you\'ve learned them.' },
};

interface Props {
    id: keyof typeof TUTORIALS;
    onDismiss: () => void;
}

export default function TutorialOverlay({ id, onDismiss }: Props) {
    const t = TUTORIALS[id];
    if (!t) return null;
    return (
        <div className="absolute inset-x-4 bottom-36 z-40 pointer-events-auto animate-fade-in">
            <div className="max-w-md mx-auto glass-panel rounded-2xl p-4 border border-aether-gold/25">
                <p className="text-[9px] font-black uppercase tracking-[0.35em] text-aether-gold">{t.title}</p>
                <p className="font-ritual text-sm text-white/85 mt-1.5 leading-relaxed">{t.body}</p>
                <button onClick={onDismiss} className="mt-3 text-[10px] font-black uppercase tracking-widest text-aether-gold hover:text-white">
                    Got it →
                </button>
            </div>
        </div>
    );
}

export const TUTORIAL_IDS = Object.keys(TUTORIALS) as (keyof typeof TUTORIALS)[];