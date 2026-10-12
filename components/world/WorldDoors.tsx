'use client';

/**
 * The world, behind its two doors: the Aether Plain outside and the Lair
 * within. Walking up to the Lair's gate on the plain takes you in at the
 * Overlook; the Overlook's door takes you back out onto the road. Truth.OS
 * hosts this (and so does /world on its own).
 */
import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import HouseLoadBar from '@/components/truthos/house/HouseLoadBar';
import { savePose } from '@/components/truthos/house/housePose';
import { PLAIN_SPAWN, savePlainPose } from '@/lib/world/plainPose';
import { hubAudio } from '@/lib/truthos/hubAudio';

const PlainExperience = dynamic(() => import('./PlainExperience'), {
    ssr: false,
    loading: () => <HouseLoadBar label="Walking out onto the plain" />,
});
const HouseExperience = dynamic(() => import('@/components/truthos/house/HouseExperience'), {
    ssr: false,
    loading: () => <HouseLoadBar label="Entering the Lair" />,
});

export type WorldPlace = 'plain' | 'lair';

/** Inside the Overlook, a few steps in from the door, facing the house */
const LAIR_ENTRY = { x: 0, z: 57.5, yaw: 0, pitch: 0 };

export default function WorldDoors({ initial = 'plain', onReturnToTerminal }: { initial?: WorldPlace; onReturnToTerminal: () => void }) {
    const [place, setPlace] = useState<WorldPlace>(initial);
    const [fading, setFading] = useState(false);

    // the world has its own sound switch (pause menu); the site's floating one stands down
    useEffect(() => {
        document.documentElement.dataset.world = '1';
        return () => {
            document.documentElement.dataset.world = '';
        };
    }, []);

    const go = useCallback((next: WorldPlace) => {
        setFading(true);
        hubAudio.playSfx('door_front_touch', { volume: 0.3 });
        window.setTimeout(() => {
            if (next === 'lair') savePose(LAIR_ENTRY);
            else savePlainPose({ ...PLAIN_SPAWN });
            setPlace(next);
            window.setTimeout(() => setFading(false), 380);
        }, 420);
    }, []);

    return (
        <div className="relative h-full w-full">
            {place === 'plain' ? (
                <PlainExperience key="plain" onReturnToTerminal={onReturnToTerminal} onEnterLair={() => go('lair')} />
            ) : (
                <HouseExperience key="lair" disableOsBoot onReturnToTerminal={onReturnToTerminal} onExitToWorld={() => go('plain')} />
            )}
            <div className={`pointer-events-none fixed inset-0 z-[120] bg-black transition-opacity duration-400 ${fading ? 'opacity-100' : 'opacity-0'}`} />
        </div>
    );
}
