import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="font-heading text-3xl text-white">Página não encontrada</h1>
      <Link href="/" className="text-[#c8a96e] hover:underline">
        Voltar ao início
      </Link>
    </main>
  );
}
