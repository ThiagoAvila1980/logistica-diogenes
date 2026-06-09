"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Shield, Star, Wrench, Clock } from "lucide-react";

const differentials = [
  { icon: Shield, title: "Materiais Certificados", desc: "Vidros temperados e laminados com laudos técnicos e garantia." },
  { icon: Star, title: "Alto Padrão", desc: "Acabamentos premium para projetos residenciais e comerciais exigentes." },
  { icon: Wrench, title: "Instalação Especializada", desc: "Equipe técnica treinada para instalações precisas e seguras." },
  { icon: Clock, title: "Pontualidade", desc: "Compromisso com prazos e entrega de projetos no tempo combinado." },
];

export default function About() {
  return (
    <section id="sobre" className="py-24 px-4 sm:px-6 bg-[#060d1a]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Image side */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative order-2 md:order-1"
          >
            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-[#1a4db5]/30">
              <Image
                src="/images/compromisso.webp"
                alt="Compromisso com qualidade"
                width={700}
                height={520}
                className="w-full h-auto object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060d1a]/50 to-transparent" />
            </div>

            {/* Stats badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="absolute -bottom-6 -right-4 md:-right-8 glass rounded-2xl p-5 shadow-xl"
            >
              <p className="font-heading text-[#c8a96e] text-4xl font-bold leading-none">15+</p>
              <p className="text-white/70 text-xs mt-1 leading-tight">Anos de<br />experiência</p>
            </motion.div>

            {/* Decorative accent */}
            <div className="absolute -top-4 -left-4 w-24 h-24 border border-[#c8a96e]/20 rounded-2xl -z-10" />
            <div className="absolute -top-8 -left-8 w-24 h-24 border border-[#4a8fe8]/10 rounded-2xl -z-10" />
          </motion.div>

          {/* Text side */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="order-1 md:order-2"
          >
            <p className="text-[#c8a96e] uppercase tracking-[0.3em] text-xs font-medium mb-3">
              Quem somos
            </p>
            <h2 className="font-heading text-white text-3xl sm:text-4xl lg:text-5xl leading-tight mb-6">
              Referência em<br />
              <span className="text-[#4a8fe8]">Envidraçamentos</span><br />
              Especiais
            </h2>

            <p className="text-white/70 text-base leading-relaxed mb-4">
              A <strong className="text-white">Diogenes Envidraçamentos</strong> nasceu da paixão por transformar
              espaços com a elegância e a transparência do vidro. Sediada em Campo
              Grande–MS, atendemos clientes residenciais e comerciais que buscam
              qualidade sem concessões.
            </p>
            <p className="text-white/70 text-base leading-relaxed mb-10">
              Com mais de 15 anos de experiência no mercado, nossa equipe combina
              técnica apurada e materiais de ponta para entregar projetos que
              superam expectativas — do projeto ao acabamento final.
            </p>

            {/* Differentials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {differentials.map((d, i) => (
                <motion.div
                  key={d.title}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }}
                  className="flex gap-3 items-start"
                >
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-[#1a4db5]/20 border border-[#4a8fe8]/20 flex items-center justify-center">
                    <d.icon size={16} className="text-[#4a8fe8]" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold mb-0.5">{d.title}</p>
                    <p className="text-white/50 text-xs leading-relaxed">{d.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
