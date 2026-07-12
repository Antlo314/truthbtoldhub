'use client';

import { useEffect, useRef, useState } from 'react';

interface TypewriterProps {
    text: string;
    speed?: number;
    reveal?: boolean;
    onDone?: () => void;
    className?: string;
}

/** Shared ritual typewriter — used in awakening dialogue and re-entry veils */
export default function Typewriter({
    text,
    speed = 18,
    reveal = false,
    onDone,
    className,
}: TypewriterProps) {
    const [n, setN] = useState(0);
    const onDoneRef = useRef(onDone);
    onDoneRef.current = onDone;
    const fired = useRef(false);

    useEffect(() => {
        fired.current = false;
        setN(0);
    }, [text]);

    useEffect(() => {
        if (reveal) {
            setN(text.length);
            return;
        }
        if (n >= text.length) return;
        const id = setTimeout(() => setN((v) => v + 1), speed);
        return () => clearTimeout(id);
    }, [n, text, reveal, speed]);

    const done = n >= text.length;
    useEffect(() => {
        if (done && !fired.current) {
            fired.current = true;
            onDoneRef.current?.();
        }
    }, [done]);

    return (
        <span className={className}>
            {text.slice(0, n)}
            {!done && <span className="awaken-caret">▌</span>}
        </span>
    );
}
