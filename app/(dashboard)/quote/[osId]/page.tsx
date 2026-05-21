import { ModuleOsPage } from "@/components/modules/module-stub";

type Props = { params: Promise<{ osId: string }> };

export default async function QuoteOsPage({ params }: Props) {
  const { osId } = await params;
  return <ModuleOsPage osId={osId} title="Orçamento" />;
}
