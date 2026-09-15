"use client";

import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui";

/* ────────────────────────────────────────────────────────────────────────────
 * Folhas de quarto — UMA POR QUARTO, para pregar na porta.
 *
 * Quebra página por quarto (break-after), porque cada folha vai para uma porta
 * diferente. O líder aparece destacado no topo, antes da lista: é a primeira
 * coisa que quem chega ao quarto precisa saber.
 *
 * Portal no <body>: na impressão os irmãos somem e sobra só o documento, em
 * preto sobre branco — mesma técnica do relatório de saúde e da intercessão.
 * ──────────────────────────────────────────────────────────────────────── */

const subscribeNoop = () => () => {};

export interface FolhaQuarto {
  id: string;
  titulo: string;
  lider: string | null;
  membros: { id: string; nome: string; idade: number; tribo: string | null }[];
}

const PRINT_CSS = `
  #quartos-print-doc { display: none; }

  @media print {
    @page { size: A4; margin: 16mm 14mm; }
    body > *:not(#quartos-print-doc) { display: none !important; }
    body { background: #fff !important; }

    #quartos-print-doc {
      display: block !important;
      color: #111;
      font-family: var(--font-inter), system-ui, sans-serif;
      font-size: 13px;
      line-height: 1.5;
    }
    .folha { break-after: page; }
    .folha:last-child { break-after: auto; }

    .evento { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; color: #555; }
    .quarto { font-size: 44px; font-weight: 800; margin: 2px 0 12px; line-height: 1; }

    .lider {
      border: 2px solid #111; padding: 10px 14px; margin-bottom: 18px;
      break-inside: avoid;
    }
    .lider small { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: #555; }
    .lider strong { display: block; font-size: 22px; }

    ol { margin: 0; padding-left: 22px; }
    li { margin-bottom: 7px; font-size: 15px; }
    .meta { color: #555; font-size: 11px; margin-left: 6px; }

    .rodape {
      margin-top: 22px; padding-top: 6px; border-top: 1px solid #ccc;
      font-size: 9.5px; color: #555; display: flex; justify-content: space-between;
    }
  }
`;

export function FolhasQuartos({
  folhas,
  geradoEm,
}: {
  folhas: FolhaQuarto[];
  geradoEm: string;
}) {
  const montado = useSyncExternalStore(subscribeNoop, () => true, () => false);

  const doc = (
    <div id="quartos-print-doc" aria-hidden="true">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      {folhas.map((f) => (
        <section key={f.id} className="folha">
          <p className="evento">Acampamento RAIZ 2026 · Alojamento</p>
          <h1 className="quarto">{f.titulo}</h1>

          {f.lider && (
            <div className="lider">
              <small>Líder do quarto</small>
              <strong>{f.lider}</strong>
            </div>
          )}

          <ol>
            {f.membros.map((m) => (
              <li key={m.id}>
                {m.nome}
                <span className="meta">
                  {m.idade} anos{m.tribo ? ` · ${m.tribo}` : ""}
                </span>
              </li>
            ))}
          </ol>

          <div className="rodape">
            <span>
              {f.membros.length} {f.membros.length === 1 ? "pessoa" : "pessoas"}
            </span>
            <span>Gerado em {geradoEm}</span>
          </div>
        </section>
      ))}
    </div>
  );

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>
        Imprimir folhas (uma por quarto)
      </Button>
      {montado && createPortal(doc, document.body)}
    </>
  );
}
