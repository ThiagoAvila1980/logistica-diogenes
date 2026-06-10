"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <Image
        src="/images/sacada-hd.webp"
        alt="Sacada de vidro premium"
        fill
        className="object-cover object-center"
        priority
        quality={75}
      />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#060d1a]/70 via-[#0d2060]/50 to-[#060d1a]/90" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#060d1a]/40 via-transparent to-[#060d1a]/40" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 max-w-5xl mx-auto">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="flex justify-center mb-8"
        >
          <Image
            src="/logotipo.png"
            alt="Diogenes Envidraçamentos"
            width={674}
            height={574}
            className="h-24 md:h-32 lg:h-40 w-auto max-w-[min(90vw,420px)] object-contain drop-shadow-2xl"
            priority
            unoptimized
          />
        </motion.div>

        {/* Tag line */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="text-[#c8a96e] uppercase tracking-[0.3em] text-xs sm:text-sm font-medium mb-4"
        >
          Envidraçamentos Especiais
        </motion.p>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.5 }}
          className="font-heading text-white leading-tight mb-6"
          style={{ fontSize: "clamp(2rem, 6vw, 4.5rem)" }}
        >
          A sofisticação dos<br />
          <span className="text-[#c8a96e]">envidraçamentos</span>
          <br />a seu alcance.
        </motion.h1>

        {/* Sub text */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.8 }}
          className="text-white/70 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
        >
          Transformamos espaços com vidros de alto padrão. Sacadas, boxes,
          espelhos e muito mais — com elegância e precisão em Campo Grande–MS.
        </motion.p>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40"
      >
        <span className="text-xs uppercase tracking-widest">Descubra mais</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        >
          <ChevronDown size={20} />
        </motion.div>
      </motion.div>
    </section>
  );
}
