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
        quality={90}
      />

      {/* Overlay: escurece as bordas e cria bolsão escuro centralizado para legibilidade do texto */}
      <div className="absolute inset-0 bg-bg-deep/50" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_45%,color-mix(in_srgb,var(--color-bg-deep)_55%,transparent)_0%,transparent_100%)]" />
      <div className="absolute inset-0 bg-linear-to-b from-bg-deep/60 via-transparent to-bg-deep/70" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 sm:px-6 max-w-4xl mx-auto">

        {/* Logo: ícone com transparência + nome em texto — integra com qualquer fundo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
          className="flex flex-col items-center mb-8 gap-3"
        >
          <div
            role="img"
            aria-label="Diogenes Envidraçamentos"
            className="logo-icon-gold h-20 w-20 md:h-24 md:w-24 drop-shadow-2xl"
          />
          <div className="flex flex-col items-center gap-0.5">
            <span className="font-heading text-white font-bold tracking-[0.25em] text-xl md:text-2xl leading-none drop-shadow-lg">
              DIOGENES
            </span>
            <span className="text-gold tracking-[0.35em] text-[10px] md:text-xs font-medium uppercase">
              Envidraçamentos Especiais
            </span>
          </div>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="font-heading text-white leading-tight mb-5 drop-shadow-lg text-[clamp(2rem,5.5vw,4rem)]"
        >
          A sofisticação dos<br />
          <span className="text-gold">envidraçamentos</span>
          <br />a seu alcance.
        </motion.h1>

        {/* Sub text */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.65 }}
          className="text-white/75 text-base sm:text-lg max-w-xl mx-auto leading-relaxed mb-10"
        >
          Sacadas, boxes, espelhos e muito mais —<br className="hidden sm:block" />
          com elegância e precisão em Campo Grande–MS.
        </motion.p>
        
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50"
      >
        <span className="text-[10px] uppercase tracking-widest">Descubra mais</span>
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
        >
          <ChevronDown size={18} />
        </motion.div>
      </motion.div>
    </section>
  );
}
