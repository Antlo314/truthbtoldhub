'use client';

/**
 * The fight on a phone: Strike (tap for the combo, it chains), Heavy,
 * Dodge, Guard (hold, with the Shield of Faith) and Pray — stacked above
 * the Use / Jump column so a thumb finds them without leaving the right
 * edge.
 */
import { Swords, Hammer, Wind, Shield, HandHeart, Sun } from 'lucide-react';
import { combatInput, type CombatCmd } from '@/lib/world/combatInput';

function Pad({ label, size, onDown, onUp, children, tone = 'plain' }: { label: string; size: number; onDown: () => void; onUp?: () => void; children: React.ReactNode; tone?: 'plain' | 'gold' | 'sky' }) {
    return (
        <button
            type="button"
            data-house-action
            aria-label={label}
            onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDown();
            }}
            onPointerUp={(e) => {
                e.preventDefault();
                onUp?.();
            }}
            onPointerCancel={() => onUp?.()}
            onPointerLeave={() => onUp?.()}
            className={`flex flex-col items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-transform active:scale-90 ${
                tone === 'gold' ? 'border-amber-300/60 bg-gradient-to-br from-amber-300/80 to-orange-600/80 text-black' : tone === 'sky' ? 'border-sky-300/50 bg-sky-500/25 text-sky-50' : 'border-white/20 bg-black/50 text-white/90'
            }`}
            style={{ width: size, height: size, touchAction: 'none' }}
        >
            {children}
            <span className="mt-0.5 text-[7px] font-bold uppercase tracking-widest opacity-70">{label}</span>
        </button>
    );
}

export default function CombatPad({ visible, hasShield, hasLight }: { visible: boolean; hasShield: boolean; hasLight: boolean }) {
    if (!visible) return null;
    const push = (c: CombatCmd) => () => combatInput.push(c);
    return (
        <div className="fixed right-3 z-[47] flex flex-col items-end gap-2" style={{ bottom: 'calc(10.6rem + env(safe-area-inset-bottom, 0px))' }}>
            <div className="flex items-end gap-2">
                {hasLight && (
                    <Pad label="Light" size={44} onDown={push('burst')} tone="sky">
                        <Sun className="h-4 w-4" />
                    </Pad>
                )}
                <Pad label="Pray" size={44} onDown={push('pray')}>
                    <HandHeart className="h-4 w-4" />
                </Pad>
            </div>
            <div className="flex items-end gap-2">
                {hasShield && (
                    <Pad label="Guard" size={48} onDown={() => (combatInput.block = true)} onUp={() => (combatInput.block = false)}>
                        <Shield className="h-4 w-4" />
                    </Pad>
                )}
                <Pad label="Dodge" size={50} onDown={push('roll')}>
                    <Wind className="h-4 w-4" />
                </Pad>
                <Pad label="Heavy" size={50} onDown={push('heavy')}>
                    <Hammer className="h-4 w-4" />
                </Pad>
                <Pad label="Strike" size={66} onDown={push('light')} tone="gold">
                    <Swords className="h-6 w-6" />
                </Pad>
            </div>
        </div>
    );
}
