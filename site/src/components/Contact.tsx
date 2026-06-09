"use client";

import { motion } from "framer-motion";
import { MessageCircle, Mail, MapPin, Clock } from "lucide-react";

const contacts = [
  {
    icon: MessageCircle,
    label: "WhatsApp",
    value: "(67) 99999-5943",
    href: "https://wa.me/5567999995943?text=Olá!%20Gostaria%20de%20solicitar%20um%20orçamento.",
    color: "#25D366",
    hint: "Atendimento rápido via WhatsApp",
  },
  {
    icon: Mail,
    label: "E-mail",
    value: "diogenesenvidracamentos@gmail.com",
    href: "mailto:diogenesenvidracamentos@gmail.com",
    color: "#4a8fe8",
    hint: "Envie seu projeto ou dúvida",
  },
  {
    icon: MapPin,
    label: "Endereço",
    value: "Rua Júlia Maksude, 471\nMonte Castelo, Campo Grande–MS\nCEP 79011-100",
    href: "https://maps.google.com/?q=Rua+Júlia+Maksude,+471,+Monte+Castelo,+Campo+Grande,+MS",
    color: "#c8a96e",
    hint: "Venha nos visitar",
  },
  {
    icon: Clock,
    label: "Horário",
    value: "Seg–Sex: 08h às 18h\nSáb: 08h às 12h",
    href: null,
    color: "#9b7cf0",
    hint: "Fale conosco no horário comercial",
  },
];

export default function Contact() {
  return (
    <section id="contato" className="py-24 px-4 sm:px-6 bg-[#0a101f]">
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
            Fale conosco
          </p>
          <h2 className="font-heading text-white text-3xl sm:text-4xl md:text-5xl section-title">
            Entre em Contato
          </h2>
          <p className="text-white/60 mt-6 max-w-xl mx-auto text-base leading-relaxed">
            Solicite um orçamento sem compromisso. Nossa equipe está pronta para
            transformar o seu espaço.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          {/* Contact cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contacts.map((c, i) => (
              <motion.div
                key={c.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
              >
                {c.href ? (
                  <a
                    href={c.href}
                    target={c.href.startsWith("http") ? "_blank" : undefined}
                    rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                    className="block h-full glass rounded-2xl p-6 hover:border-opacity-60 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group"
                    style={{ "--hover-color": c.color } as React.CSSProperties}
                  >
                    <ContactCardContent contact={c} />
                  </a>
                ) : (
                  <div className="h-full glass rounded-2xl p-6">
                    <ContactCardContent contact={c} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Map */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="rounded-2xl overflow-hidden glass"
          >
            <div className="p-4 border-b border-white/10">
              <p className="text-white/80 text-sm font-medium flex items-center gap-2">
                <MapPin size={14} className="text-[#c8a96e]" />
                Rua Júlia Maksude, 471 — Monte Castelo, Campo Grande–MS
              </p>
            </div>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3740.0!2d-54.62!3d-20.48!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9486e8e8dc15db6d%3A0x0!2sRua+J%C3%BAlia+Maksude%2C+471%2C+Monte+Castelo%2C+Campo+Grande%2C+MS%2C+79011-100!5e0!3m2!1spt!2sbr!4v1700000000000"
              width="100%"
              height="380"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Localização Diogenes Envidraçamentos"
              className="grayscale opacity-80 hover:grayscale-0 hover:opacity-100 transition-all duration-500"
            />

            <div className="p-4">
              <a
                href="https://maps.google.com/?q=Rua+Júlia+Maksude,+471,+Monte+Castelo,+Campo+Grande,+MS"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-[#c8a96e]/10 hover:bg-[#c8a96e]/20 text-[#c8a96e] border border-[#c8a96e]/30 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
              >
                <MapPin size={14} />
                Abrir no Google Maps
              </a>
            </div>
          </motion.div>
        </div>

        {/* CTA bottom */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mt-12 text-center"
        >
          <a
            href="https://wa.me/5567999995943?text=Olá!%20Gostaria%20de%20solicitar%20um%20orçamento%20para%20meu%20projeto."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#20b958] text-white px-10 py-4 rounded-full font-semibold text-base transition-all duration-200 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 wa-pulse"
          >
            <MessageCircle size={22} />
            Solicitar Orçamento pelo WhatsApp
          </a>
        </motion.div>
      </div>
    </section>
  );
}

function ContactCardContent({ contact }: { contact: (typeof contacts)[0] }) {
  return (
    <>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
        style={{ background: `${contact.color}18`, border: `1px solid ${contact.color}30` }}
      >
        <contact.icon size={18} style={{ color: contact.color }} />
      </div>
      <p className="text-white/50 text-xs uppercase tracking-wider mb-1">{contact.label}</p>
      <p className="text-white text-sm font-medium leading-relaxed whitespace-pre-line">
        {contact.value}
      </p>
      {contact.hint && (
        <p className="text-white/40 text-xs mt-2">{contact.hint}</p>
      )}
    </>
  );
}
