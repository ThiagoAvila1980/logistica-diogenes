import { redirect } from "next/navigation";
import { Package2 } from "lucide-react";
import { PageHeading } from "@/components/dashboard/page-heading";
import { ProductsPanel } from "@/components/reports/products-panel";
import { getSession } from "@/lib/auth/session";
import { getProductsReportPayload } from "@/lib/data/products-report";

export default async function ProductsReportPage() {
  const session = await getSession();
  if (!session || !session.roles.includes("admin")) {
    redirect("/unauthorized");
  }

  const payload = await getProductsReportPayload();

  return (
    <div className="space-y-4">
      <PageHeading
        title="Análise de Produtos"
        description="Distribuição dos vãos por cor, tipo de vidro, tipo de envidraçamento e ambiente — identifique os produtos mais solicitados."
        icon={Package2}
      />
      <ProductsPanel payload={payload} />
    </div>
  );
}
