import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main-content"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <p className="text-sm font-medium text-foreground/60">404</p>
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="max-w-md text-foreground/70">
        A página que você procura não existe ou foi movida.
      </p>
      <Link
        href="/"
        className="rounded-full bg-foreground px-6 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
      >
        Voltar ao início
      </Link>
    </main>
  );
}
