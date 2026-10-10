"use client";
import Image from "next/image";
import { motion } from "framer-motion";

export function BrandMark({ size = 44, animated = false }: { size?: number; animated?: boolean }) {
  return <motion.span className="brand-mark"
    initial={animated ? { opacity: 0, y: 12, rotateY: -12 } : false}
    animate={{ opacity: 1, y: 0, rotateY: 0 }}
    transition={{ duration: .75, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ y: -2, rotateZ: 3, scale: 1.045 }}
    style={{ width: size, height: size }}>
    <Image src="/brand/ariadne.webp" alt="" width={size} height={size} preload={animated} />
  </motion.span>;
}
