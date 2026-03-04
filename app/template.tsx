'use client';

import { motion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
    // OMEGA-Tier physical page transitions
    // Every page transition creates a dimensional jump effect.
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, filter: 'blur(10px)', y: 20 }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)', y: 0 }}
            transition={{
                duration: 0.8,
                ease: [0.22, 1, 0.36, 1]
            }}
            className="flex-1 w-full"
        >
            {children}
        </motion.div>
    );
}
