"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Menu, X, Phone } from "lucide-react";
import clsx from "clsx";

const links = [
  { label: "Serviços", href: "#servicos" },
  { label: "Galeria", href: "#galeria" },
  { label: "Sobre", href: "#sobre" },
  { label: "Contato", href: "#contato" },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleNavClick = () => setOpen(false);

  return (
    <>
      <header
        className={clsx(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
          scrolled
            ? "glass shadow-lg shadow-black/90"
            : ""
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
          {/* Logo */}
          <a href="#" className="flex items-center gap-3 shrink-0">
            <Image
              src="/logo-icon.png"
              alt="Diogenes Envidraçamentos"
              width={576}
              height={576}
              className="h-10 w-10 md:h-12 md:w-12 object-contain shrink-0"
              priority
            />
            <span className="hidden sm:block font-heading text-white font-semibold text-sm leading-tight">
              DIOGENES<br />
              <span className="text-[#c8a96e] text-xs font-normal tracking-widest">
                ENVIDRAÇAMENTOS
              </span>
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-8">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-sm text-white/80 hover:text-[#c8a96e] transition-colors duration-200 tracking-wide uppercase font-medium"
              >
                {l.label}
              </a>
            ))}
          </nav>

          {/* CTA desktop */}
          <a
            href="https://wa.me/5567999995943"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden md:flex items-center gap-2 bg-[#c8a96e] hover:bg-[#e8c98e] text-[#060d1a] px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <Phone size={14} />
            Solicitar Orçamento
          </a>

          {/* Mobile hamburger */}
          <button
            onClick={() => setOpen(!open)}
            className="md:hidden text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={clsx(
          "fixed inset-0 z-40 md:hidden transition-all duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      >
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
        <div
          className={clsx(
            "absolute top-0 right-0 h-full w-72 glass shadow-2xl transition-transform duration-300 flex flex-col pt-20 px-6 gap-2",
            open ? "translate-x-0" : "translate-x-full"
          )}
        >
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={handleNavClick}
              className="text-white/90 hover:text-[#c8a96e] py-3 text-base font-medium border-b border-white/10 transition-colors"
            >
              {l.label}
            </a>
          ))}
          <a
            href="https://wa.me/5567999995943"
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleNavClick}
            className="mt-6 flex items-center justify-center gap-2 bg-[#c8a96e] text-[#060d1a] px-4 py-3 rounded-full font-semibold text-sm"
          >
            <Phone size={16} />
            Solicitar Orçamento
          </a>
        </div>
      </div>
    </>
  );
}
