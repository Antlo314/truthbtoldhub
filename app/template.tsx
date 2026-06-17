'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
    // OMEGA-Tier physical page transitions — a dimensional jump on every route.
    // IMPORTANT: framer leaves `filter: blur(0px)` as a persistent inline style,
    // and a non-`none` filter establishes a containing block that re-anchors any
    // position:fixed descendant (AuthModal, restart dialogs) to this wrapper
    // instead of the viewport. Once the entrance settles we animate the filter to
    // `none` so full-screen modals center correctly.
    const [settled, setSettled] = useState(false);
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)', y: 20 }}
            animate={{ opacity: 1, scale: 1, filter: settled ? 'none' : 'blur(0px)', y: 0 }}
            transition={{
                duration: 0.8,
                ease: [0.22, 1, 0.36, 1]
            }}
            onAnimationComplete={() => setSettled(true)}
            className="flex-1 w-full"
        >
            {children}
        </motion.div>
    );
}
