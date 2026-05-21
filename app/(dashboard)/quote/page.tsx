import { ModuleIndexPage } from "@/components/modules/module-stub";

export default function QuoteIndexPage() {
  return (
    <ModuleIndexPage
      title="Orçamentos"
      description="Cálculo, margem e aprovação do cliente."
      basePath="/quote"
      filter={(s) =>
        s.includes("orcamento") || s === "aprovado_cliente" || s === "medicao_final"
      }
    />
  );
}
