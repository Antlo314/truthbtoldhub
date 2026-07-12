'use client';

import { motion } from 'framer-motion';
import { DURATION, EASE } from '@/lib/design/motion';

/**
 * Threshold page transition — soft rise into place.
 * No filter/blur (blur re-anchors position:fixed modals to this wrapper).
 */
export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.988 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{
                duration: DURATION.threshold,
                ease: EASE.breath,
            }}
            className="flex-1 w-full min-h-0"
        >
            {children}
        </motion.div>
    );
}
