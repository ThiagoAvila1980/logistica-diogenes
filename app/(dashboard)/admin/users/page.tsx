import { getUsersForAdmin } from "@/actions/user-admin-actions";
import { UserAdminPanel } from "@/components/admin/user-admin-panel";
import { PageHeading } from "@/components/dashboard/page-heading";
import { Users } from "lucide-react";
import { getSession } from "@/lib/auth/session";

export default async function AdminUsersPage() {
  const [users, session] = await Promise.all([
    getUsersForAdmin(),
    getSession(),
  ]);

  return (
    <div className="space-y-4">
      <PageHeading
        title="Usuários"
        count={users.length}
        description="Gerencie contas internas, papéis e acesso ao sistema."
        icon={Users}
      />
      <UserAdminPanel
        users={users}
        currentUserId={session?.userId ?? ""}
      />
    </div>
  );
}
