"use client";

import Image from "next/image";
import { motion, type Variants } from "framer-motion";

const services = [
  {
    title: "Sacadas de Vidro",
    description:
      "Fechamentos e guarda-corpos em vidro temperado que ampliam a luminosidade e a elegância dos seus espaços ao ar livre.",
    image: "/images/sacada.webp",
    tag: "Alta Demanda",
  },
  {
    title: "Box de Banheiro",
    description:
      "Boxes em vidro temperado com perfis de alta qualidade. Do modelo simples ao premium com design frameless.",
    image: "/images/box01.webp",
    tag: "Mais Vendido",
  },
  {
    title: "Espelhos Especiais",
    description:
      "Espelhos decorativos e funcionais sob medida para banheiros, salas, halls e ambientes comerciais.",
    image: "/images/espelho.webp",
    tag: "Sofisticação",
  },
  {
    title: "Bancadas de Vidro",
    description:
      "Bancadas em vidro temperado ou laminado que conferem leveza e modernidade a cozinhas, banheiros e escritórios.",
    image: "/images/bancada.webp",
    tag: "Exclusivo",
  },
  {
    title: "Fachadas & Divisórias",
    description:
      "Fachadas envidraçadas e divisórias de ambientes em vidro para residências, lojas e espaços corporativos.",
    image: "/images/fachada-vidro-01.webp",
    tag: "Corporativo",
  },
  {
    title: "Portas & Janelas",
    description:
      "Portas pivotantes, de correr e janelas em vidro temperado com acabamento premium e máxima segurança.",
    image: "/images/imagem-01.webp",
    tag: "Segurança",
  },
];

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

export default function Services() {
  return (
    <section id="servicos" className="py-24 px-4 sm:px-6 bg-[#060d1a]">
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
            O que oferecemos
          </p>
          <h2 className="font-heading text-white text-3xl sm:text-4xl md:text-5xl section-title">
            Nossos Serviços
          </h2>
          <p className="text-white/60 mt-6 max-w-xl mx-auto text-base leading-relaxed">
            Trabalhamos com os melhores materiais e técnicas para transformar
            qualquer ambiente com elegância e segurança.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {services.map((service, i) => (
            <motion.div
              key={service.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={cardVariants}
              className="group relative overflow-hidden rounded-[var(--radius-card)] glass hover:border-[#c8a96e]/40 transition-all duration-500 hover:-translate-y-1 hover:shadow-xl hover:shadow-[#1a4db5]/20"
            >
              {/* Image */}
              <div className="relative h-52 overflow-hidden">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#060d1a] via-transparent to-transparent" />

                {/* Tag */}
                <span className="absolute top-3 right-3 bg-[#c8a96e]/90 text-[#060d1a] text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-full">
                  {service.tag}
                </span>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-heading text-white text-xl mb-2 group-hover:text-[#c8a96e] transition-colors">
                  {service.title}
                </h3>
                <p className="text-white/60 text-sm leading-relaxed">
                  {service.description}
                </p>

                <a
                  href="https://wa.me/5567999995943"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-4 text-[#4a8fe8] hover:text-[#c8a96e] text-sm font-medium transition-colors"
                >
                  Solicitar orçamento →
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
