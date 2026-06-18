export const dynamic = "force-dynamic";

export function HEAD() {
  return new Response(null, { status: 200 });
}

export function GET() {
  return new Response("ok", { status: 200 });
}
