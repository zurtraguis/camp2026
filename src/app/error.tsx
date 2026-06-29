"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO: reportar para observabilidade (Sentry, etc.)
    console.error(error);
  }, [error]);

  return (
    <main
      id="main-content"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center"
    >
      <h1 className="text-2xl font-bold">Algo deu errado</h1>
      <p className="max-w-md text-foreground/70">
        Ocorreu um erro inesperado. Tente novamente; se o problema persistir,
        contate o suporte.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-foreground px-6 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90"
      >
        Tentar novamente
      </button>
    </main>
  );
}
