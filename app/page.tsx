import { getSession } from "@/lib/auth/session";
import { RouteBootstrap } from "@/components/navigation/route-bootstrap";

export default async function HomePage() {
  const session = await getSession();

  return <RouteBootstrap session={session} />;
}
