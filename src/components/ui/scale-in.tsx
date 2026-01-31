"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";

interface ScaleInProps extends Omit<HTMLMotionProps<"div">, "children"> {
    children: ReactNode;
    delay?: number;
}

export function ScaleIn({ children, delay = 0, className, ...props }: ScaleInProps) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
                duration: 0.3,
                delay,
                ease: [0.34, 1.56, 0.64, 1], // Subtle bounce
            }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
}
