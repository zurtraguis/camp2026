"use client";

import { Button } from "@/components/ui";

/**
 * Imprimir a lista para levar ao acampamento. Client component porque
 * window.print() não existe no servidor; some da própria impressão.
 */
export function ImprimirButton() {
  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={() => window.print()}
      className="print:hidden"
    >
      Imprimir lista
    </Button>
  );
}
