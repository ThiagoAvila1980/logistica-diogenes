"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn } from "lucide-react";

const images = [
  { src: "/images/sacada-hd.webp", alt: "Sacada envidraçada de alto padrão" },
  { src: "/images/box-premium-01.webp", alt: "Box banheiro com mármore" },
  { src: "/images/sacada-web-01.webp", alt: "Sacada de vidro contemporânea" },
  { src: "/images/imagem-03.webp", alt: "Envidraçamento residencial" },
  { src: "/images/box-simples-01.webp", alt: "Box de banheiro moderno" },
  { src: "/images/sacada-02.webp", alt: "Sacada envidraçada moderna" },
  { src: "/images/fachada-vidro-01.webp", alt: "Fachada corporativa envidraçada" },
  { src: "/images/sacada-web-02.webp", alt: "Sacada de vidro com guarda-corpo" },
  { src: "/images/imagem-04.webp", alt: "Vidraçaria especial" },
  { src: "/images/box-premium-02.webp", alt: "Box premium com iluminação" },
  { src: "/images/sacada-com-fundo.webp", alt: "Sacada de vidro com vista panorâmica" },
  { src: "/images/fachada-vidro-02.webp", alt: "Fachada de vidro reflexiva" },
  { src: "/images/divisoria-01.webp", alt: "Divisória em vidro para escritório" },
  { src: "/images/imagem-05.webp", alt: "Box de banheiro premium" },
  { src: "/images/sacada-web-03.webp", alt: "Varanda com envidraçamento especial" },
  { src: "/images/imagem-01.webp", alt: "Projeto de envidraçamento" },
  { src: "/images/fachada-vidro-03.webp", alt: "Fachada de vidro moderna" },
  { src: "/images/compromisso.webp", alt: "Qualidade e compromisso" },
];

export default function Gallery() {
  const [selected, setSelected] = useState<null | { src: string; alt: string }>(null);

  return (
    <section id="galeria" className="py-24 px-4 sm:px-6 bg-[#0a101f]">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <p className="text-[#c8a96e] uppercase tracking-[0.3em] text-xs font-medium mb-3">
            Nosso portfólio
          </p>
          <h2 className="font-heading text-white text-3xl sm:text-4xl md:text-5xl section-title">
            Galeria de Projetos
          </h2>
          <p className="text-white/60 mt-6 max-w-xl mx-auto text-base leading-relaxed">
            Cada projeto é único. Veja como transformamos espaços com vidros de
            alto padrão.
          </p>
        </motion.div>

        {/* Masonry grid */}
        <div
          className="columns-1 sm:columns-2 md:columns-3 gap-4 space-y-4"
          style={{ columnGap: "1rem" }}
        >
          {images.map((img, i) => (
            <motion.div
              key={img.src}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-30px" }}
              transition={{ delay: (i % 3) * 0.1, duration: 0.5 }}
              className="break-inside-avoid mb-4 group relative overflow-hidden rounded-lg cursor-pointer"
              onClick={() => setSelected(img)}
            >
              <div className="relative w-full">
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060d1a]/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <div className="flex items-center gap-2 text-white text-sm">
                    <ZoomIn size={16} />
                    <span>{img.alt}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selected && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={() => setSelected(null)}
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute top-4 right-4 text-white/70 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            >
              <X size={28} />
            </button>
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative max-w-5xl max-h-[90vh] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={selected.src}
                alt={selected.alt}
                width={1200}
                height={800}
                className="w-full h-auto max-h-[85vh] object-contain rounded-lg shadow-2xl"
              />
              <p className="text-center text-white/60 text-sm mt-3">{selected.alt}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
