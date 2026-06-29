"use client";

import { rebalanceAction } from "@/app/admin/actions";
import { Button } from "@/components/ui";

export function RebalanceForm() {
  return (
    <details className="rounded-xl border border-danger/30 bg-danger/5 p-4">
      <summary className="cursor-pointer select-none font-condensed text-sm uppercase tracking-wide text-danger">
        Rebalancear tribos (ação destrutiva)
      </summary>
      <div className="mt-4 space-y-4">
        <p className="text-sm text-muted">
          Esta ação reatribui <strong className="text-creme">todos os campistas</strong> às
          tribos usando o algoritmo snake draft offline (por gênero, por ordem de
          idade). As atribuições atuais serão substituídas. Esta operação é{" "}
          <strong className="text-danger">irreversível</strong> sem backup manual.
        </p>
        <form
          action={rebalanceAction}
          onSubmit={(e) => {
            const ok = window.confirm(
              "Tem certeza? Isso reatribuirá TODOS os campistas às tribos. Confirme apenas se souber o que está fazendo.",
            );
            if (!ok) e.preventDefault();
          }}
        >
          <Button type="submit" variant="danger" size="sm">
            Rebalancear agora
          </Button>
        </form>
      </div>
    </details>
  );
}
