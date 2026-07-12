'use client';

import DialogueBox from '@/components/sanctum/DialogueBox';

// ============================================================
//  SCENE GUIDE — Truth present in a scene. Shared DialogueBox
//  so creator, paths, and awakening share one voice vessel.
// ============================================================

export function SceneGuide({
    line,
    speaker = 'Truth',
    accent = '#fbbf24',
}: {
    line: string;
    speaker?: string;
    accent?: string;
}) {
    return (
        <DialogueBox
            speaker={speaker}
            accent={accent}
            line={line}
            spriteScale={5}
            className="max-w-xl"
        />
    );
}
