import Image from "next/image";
import { MessageCircle, Mail, MapPin } from "lucide-react";
import { COMPANY_ADDRESS, GOOGLE_MAPS_URL } from "@/lib/company-contact";

const navLinks = [
  { label: "Serviços", href: "#servicos" },
  { label: "Galeria", href: "#galeria" },
  { label: "Sobre", href: "#sobre" },
  { label: "Contato", href: "#contato" },
];

const services = [
  "Sacadas de Vidro",
  "Box de Banheiro",
  "Espelhos Especiais",
  "Bancadas de Vidro",
  "Fachadas e Divisórias",
  "Portas e Janelas",
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-amber-200/30 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <Image
                src="/logotipo.png"
                alt="Diogenes Envidraçamentos"
                width={674}
                height={574}
                className="h-11 w-auto object-contain"
              />
              <div>
                <p className="font-heading text-white font-semibold text-sm">DIOGENES</p>
                <p className="text-[#c8a96e] text-[10px] tracking-widest">ENVIDRAÇAMENTOS ESPECIAIS</p>
              </div>
            </div>
            <p className="text-white/50 text-sm leading-relaxed italic">
              &ldquo;A sofisticação dos envidraçamentos a seu alcance.&rdquo;
            </p>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <h4 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">
                Navegação
              </h4>
              <ul className="space-y-2.5">
                {navLinks.map((l) => (
                  <li key={l.href}>
                    <a
                      href={l.href}
                      className="text-white/50 hover:text-[#c8a96e] text-sm transition-colors"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">
                Serviços
              </h4>
              <ul className="space-y-2.5">
                {services.map((s) => (
                  <li key={s}>
                    <a
                      href="#servicos"
                      className="text-white/50 hover:text-[#c8a96e] text-sm transition-colors"
                    >
                      {s}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white text-xs font-semibold uppercase tracking-widest mb-4">
              Contato
            </h4>
            <ul className="space-y-4">
              <li>
                <a
                  href="https://wa.me/5567999995943"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 text-white/50 hover:text-white/80 transition-colors"
                >
                  <MessageCircle size={15} className="shrink-0 mt-0.5 text-[#25D366]" />
                  <span className="text-sm">(67) 99999-5943</span>
                </a>
              </li>
              <li>
                <a
                  href="mailto:diogenesenvidracamentos@gmail.com"
                  className="flex items-start gap-3 text-white/50 hover:text-white/80 transition-colors"
                >
                  <Mail size={15} className="shrink-0 mt-0.5 text-[#4a8fe8]" />
                  <span className="text-sm break-all">diogenesenvidracamentos@gmail.com</span>
                </a>
              </li>
              <li>
                <a
                  href={GOOGLE_MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 text-white/50 hover:text-white/80 transition-colors"
                >
                  <MapPin size={15} className="shrink-0 mt-0.5 text-[#c8a96e]" />
                  <span className="text-sm leading-relaxed">
                    {COMPANY_ADDRESS.displayLines.map((line) => (
                      <span key={line} className="block">
                        {line}
                      </span>
                    ))}
                  </span>
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/30 text-xs text-center sm:text-left">
            © {year} Diogenes Envidraçamentos Especiais. Todos os direitos reservados.
          </p>
          <p className="text-white/20 text-xs">
            Campo Grande, Mato Grosso do Sul — Brasil
          </p>
        </div>
      </div>
    </footer>
  );
}
