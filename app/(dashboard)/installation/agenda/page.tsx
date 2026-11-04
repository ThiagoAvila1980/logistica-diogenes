import { getSession } from "@/lib/auth/session";
import { canViewAllOrders } from "@/lib/auth/permissions";
import { listInstallationAgendaVaos } from "@/lib/data/installation-agenda";
import {
  getSaoPauloIsoDate,
  groupVaosByInstaller,
  groupVaosByOrder,
  resolveAgendaDate,
} from "@/lib/installation/agenda";
import { InstallationAgenda } from "@/components/installation/installation-agenda";

type SearchParams = Promise<{ date?: string }>;

export default async function InstallationAgendaPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getSession();
  const roles = session?.roles ?? [];
  const viewAll = canViewAllOrders(roles);
  const { date: dateParam } = await searchParams;

  const todayIso = getSaoPauloIsoDate();
  const selectedDate = resolveAgendaDate(dateParam, todayIso);
  const installerIdFilter = !viewAll && session ? session.userId : undefined;

  const dayVaos = await listInstallationAgendaVaos({
    isoDate: selectedDate,
    installerId: installerIdFilter,
  });
  const groups = viewAll
    ? groupVaosByInstaller(dayVaos)
    : [
        {
          installerId: session?.userId ?? null,
          installerName: null,
          orders: groupVaosByOrder(dayVaos),
        },
      ];

  return (
    <InstallationAgenda
      selectedDate={selectedDate}
      todayIso={todayIso}
      groups={groups}
      groupByInstaller={viewAll}
      dayVaoCount={dayVaos.length}
    />
  );
}
