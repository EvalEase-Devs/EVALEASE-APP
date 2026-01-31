"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { ReactNode } from "react";

interface SlideInProps extends Omit<HTMLMotionProps<"div">, "children"> {
    children: ReactNode;
    delay?: number;
    direction?: "left" | "right" | "up" | "down";
}

export function SlideIn({
    children,
    delay = 0,
    direction = "up",
    className,
    ...props
}: SlideInProps) {
    const directionOffset = {
        left: { x: -20, y: 0 },
        right: { x: 20, y: 0 },
        up: { x: 0, y: 20 },
        down: { x: 0, y: -20 },
    };

    return (
        <motion.div
            initial={{ opacity: 0, ...directionOffset[direction] }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{
                duration: 0.4,
                delay,
                ease: "easeOut",
            }}
            className={className}
            {...props}
        >
            {children}
        </motion.div>
    );
}
