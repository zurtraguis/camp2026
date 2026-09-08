"use client";

import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui";

/* ────────────────────────────────────────────────────────────────────────────
 * Folhas de intercessão — UMA POR COORDENADOR.
 *
 * O ponto da impressão aqui é diferente do relatório de saúde: aquele é um
 * documento só, que flui por várias páginas. Este precisa QUEBRAR entre
 * coordenadores, porque cada folha vai para a mão de uma pessoa diferente —
 * duas listas na mesma folha significa recortar no meio ou entregar errado.
 *
 * Por isso `break-after: page` em cada bloco, e não `break-inside: avoid`.
 *
 * Renderizado por portal como filho direto do <body>: na impressão os irmãos
 * somem com display:none e sobra só o documento, em preto sobre branco.
 * ──────────────────────────────────────────────────────────────────────── */

const subscribeNoop = () => () => {};

export interface FolhaCoordenador {
  id: string;
  nome: string;
  campistas: { id: string; nome: string; tribo: string | null }[];
}

const PRINT_CSS = `
  #intercessao-print-doc { display: none; }

  @media print {
    @page { size: A4; margin: 16mm 14mm; }
    body > *:not(#intercessao-print-doc) { display: none !important; }
    body { background: #fff !important; }

    #intercessao-print-doc {
      display: block !important;
      color: #111;
      font-family: var(--font-inter), system-ui, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* Cada coordenador na sua folha. A última não força página em branco. */
    .folha { break-after: page; }
    .folha:last-child { break-after: auto; }

    .cabecalho {
      border-bottom: 2px solid #111;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }
    .evento {
      font-size: 10px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #555;
    }
    .titulo { font-size: 21px; font-weight: 700; margin: 4px 0 2px; }
    .coordenador { font-size: 16px; }
    .coordenador strong { font-size: 19px; }

    .versiculo {
      font-style: italic;
      color: #444;
      margin: 0 0 16px;
      font-size: 11.5px;
    }

    ol { margin: 0; padding-left: 22px; }
    li { margin-bottom: 10px; break-inside: avoid; }
    .nome { font-size: 14px; font-weight: 600; }
    .tribo { font-size: 10.5px; color: #555; margin-left: 6px; }
    .linha-anotacao {
      border-bottom: 1px dotted #bbb;
      height: 15px;
      margin-top: 4px;
    }

    .vazio { color: #666; font-style: italic; }

    .rodape {
      margin-top: 20px;
      padding-top: 6px;
      border-top: 1px solid #ccc;
      font-size: 9.5px;
      color: #555;
      display: flex;
      justify-content: space-between;
    }
  }
`;

export function FolhasImpressao({
  folhas,
  geradoEm,
}: {
  folhas: FolhaCoordenador[];
  geradoEm: string;
}) {
  // Só monta o portal no cliente; no servidor não há document.
  const montado = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  const doc = (
    <div id="intercessao-print-doc" aria-hidden="true">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />
      {folhas.map((f) => (
        <section key={f.id} className="folha">
          <header className="cabecalho">
            <p className="evento">Acampamento RAIZ 2026 · Intercessão</p>
            <h1 className="titulo">Por quem você vai orar</h1>
            <p className="coordenador">
              Coordenador(a): <strong>{f.nome}</strong>
            </p>
          </header>

          <p className="versiculo">
            &quot;Orando em todo tempo com toda oração e súplica no Espírito, e
            para isso vigiando com toda perseverança.&quot; — Efésios 6.18
          </p>

          {f.campistas.length === 0 ? (
            <p className="vazio">
              Nenhum campista atribuído ainda a este coordenador.
            </p>
          ) : (
            <ol>
              {f.campistas.map((c) => (
                <li key={c.id}>
                  <span className="nome">{c.nome}</span>
                  {c.tribo && <span className="tribo">tribo {c.tribo}</span>}
                  {/* Espaço para anotar o que orar por cada um. */}
                  <div className="linha-anotacao" />
                  <div className="linha-anotacao" />
                </li>
              ))}
            </ol>
          )}

          <div className="rodape">
            <span>
              {f.campistas.length}{" "}
              {f.campistas.length === 1 ? "adolescente" : "adolescentes"}
            </span>
            <span>Gerado em {geradoEm}</span>
          </div>
        </section>
      ))}
    </div>
  );

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => window.print()}
      >
        Imprimir folhas (uma por coordenador)
      </Button>
      {montado && createPortal(doc, document.body)}
    </>
  );
}
