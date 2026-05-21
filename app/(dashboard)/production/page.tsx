import { ModuleIndexPage } from "@/components/modules/module-stub";

export default function ProductionIndexPage() {
  return (
    <ModuleIndexPage
      title="Plano de corte"
      description="Perfis, vidros, acessórios e checklist de embalagem."
      basePath="/production"
      filter={(s) =>
        s === "cortes" || s === "embalagem" || s === "acessorios_plano"
      }
    />
  );
}
