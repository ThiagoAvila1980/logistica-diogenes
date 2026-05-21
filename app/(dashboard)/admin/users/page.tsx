import { getUsersForAdmin } from "@/actions/user-admin-actions";
import { UserAdminPanel } from "@/components/admin/user-admin-panel";
import { Users } from "lucide-react";
import { getSession } from "@/lib/auth/session";

export default async function AdminUsersPage() {
  const [users, session] = await Promise.all([
    getUsersForAdmin(),
    getSession(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Usuários</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Gerencie contas internas, papéis e acesso ao sistema.
      </p>
      <UserAdminPanel
        users={users}
        currentUserId={session?.userId ?? ""}
      />
    </div>
  );
}
