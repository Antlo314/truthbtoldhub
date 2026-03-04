'use client';

import React, { useEffect, useRef } from 'react';

interface GenerativeIdenticonProps {
    idString: string;
    size?: number;
    className?: string;
}

export default function GenerativeIdenticon({ idString, size = 32, className = '' }: GenerativeIdenticonProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Simple hash function for the seed
        let hash = 0;
        for (let i = 0; i < idString.length; i++) {
            hash = idString.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Pseudo-random generator based on hash
        const rng = () => {
            hash = Math.sin(hash) * 10000;
            return hash - Math.floor(hash);
        };

        const drawIdenticon = () => {
            const width = size;
            const height = size;
            const cx = width / 2;
            const cy = height / 2;

            ctx.clearRect(0, 0, width, height);

            // Base glow/color palette generated from hash
            const hue1 = Math.floor(rng() * 360);
            const hue2 = (hue1 + 180) % 360;

            // Background
            ctx.fillStyle = `hsl(${hue1}, 20%, 10%)`;
            ctx.fillRect(0, 0, width, height);

            // Draw geometric patterns
            const numShapes = Math.floor(rng() * 4) + 3; // 3 to 6 shapes

            for (let i = 0; i < numShapes; i++) {
                ctx.beginPath();

                const shapeType = rng();
                const radius = (rng() * cx * 0.8) + (cx * 0.2);

                if (shapeType > 0.6) {
                    // Circle
                    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                } else if (shapeType > 0.3) {
                    // Polygon
                    const sides = Math.floor(rng() * 5) + 3;
                    const rotation = rng() * Math.PI * 2;
                    for (let s = 0; s < sides; s++) {
                        const angle = rotation + (s * (Math.PI * 2) / sides);
                        if (s === 0) ctx.moveTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
                        else ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
                    }
                    ctx.closePath();
                } else {
                    // Cross/Lines
                    const lineWidth = rng() * 4 + 1;
                    const rotation = rng() * Math.PI;
                    ctx.moveTo(cx - Math.cos(rotation) * radius, cy - Math.sin(rotation) * radius);
                    ctx.lineTo(cx + Math.cos(rotation) * radius, cy + Math.sin(rotation) * radius);
                    ctx.lineWidth = lineWidth;
                }

                // Stroke or Fill
                if (rng() > 0.5) {
                    ctx.fillStyle = `hsla(${rng() > 0.5 ? hue1 : hue2}, ${70 + rng() * 30}%, ${40 + rng() * 40}%, ${0.3 + rng() * 0.5})`;
                    ctx.fill();
                } else {
                    ctx.strokeStyle = `hsla(${rng() > 0.5 ? hue1 : hue2}, ${70 + rng() * 30}%, ${50 + rng() * 40}%, ${0.5 + rng() * 0.5})`;
                    ctx.lineWidth = rng() * 2 + 1;
                    ctx.stroke();
                }
            }

            // Central core
            ctx.beginPath();
            ctx.arc(cx, cy, cx * 0.15, 0, Math.PI * 2);
            ctx.fillStyle = `hsl(${hue1}, 100%, 80%)`;
            ctx.shadowColor = `hsl(${hue1}, 100%, 50%)`;
            ctx.shadowBlur = 10;
            ctx.fill();
            ctx.shadowBlur = 0; // Reset
        };

        drawIdenticon();

    }, [idString, size]);

    return (
        <canvas
            ref={canvasRef}
            width={size}
            height={size}
            className={`rounded-full border border-white/10 shadow-[0_0_10px_rgba(255,255,255,0.1)] ${className}`}
        />
    );
}
