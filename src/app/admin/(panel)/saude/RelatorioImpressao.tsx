"use client";

import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui";

/* ────────────────────────────────────────────────────────────────────────────
 * Documento de impressão do relatório de saúde.
 *
 * Imprimir a PÁGINA não servia: sai o tema escuro (gasta tinta e fica
 * ilegível), o menu do admin, os botões, e cada campista vira um cartão solto
 * que quebra no meio da folha. Aqui é um DOCUMENTO próprio, renderizado por
 * portal como filho direto do <body> — mesmo truque do carnê: os irmãos somem
 * com display:none e o relatório flui por quantas páginas precisar.
 *
 * Decisões de papel: A4, tinta preta sobre branco, campista nunca partido
 * entre páginas (break-inside: avoid), cabeçalho repetido no topo de cada
 * folha e aviso de confidencialidade no rodapé — o papel circula na mão da
 * equipe e precisa dizer o que é.
 * ──────────────────────────────────────────────────────────────────────── */

const subscribeNoop = () => () => {};

export interface FichaSaude {
  id: string;
  nome: string;
  idade: number;
  codigo: string;
  tribo: string | null;
  responsavel: string | null;
  telefone: string | null;
  alergias: string | null;
  medicamentos: string | null;
  restricoes: string | null;
  condicoes: string | null;
  observacoes: string | null;
  flags: string[];
}

export interface RelatorioImpressaoProps {
  fichas: FichaSaude[];
  totalInscritos: number;
  geradoEm: string;
}

const PRINT_CSS = `
  #saude-print-doc { display: none; }

  @media print {
    @page { size: A4; margin: 14mm 12mm; }
    body > *:not(#saude-print-doc) { display: none !important; }
    body { background: #fff !important; }

    #saude-print-doc {
      display: block !important;
      color: #111;
      font-family: var(--font-inter), system-ui, sans-serif;
      font-size: 10.5px;
      line-height: 1.4;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    #saude-print-doc .sp-head {
      border-bottom: 2.5px solid #111;
      padding-bottom: 8px;
      margin-bottom: 4px;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
    }
    #saude-print-doc .sp-title {
      font-family: var(--font-oswald), system-ui, sans-serif;
      font-size: 17px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin: 0;
    }
    #saude-print-doc .sp-sub {
      font-size: 9.5px;
      color: #444;
      margin: 2px 0 0;
    }
    #saude-print-doc .sp-meta { font-size: 9px; color: #444; text-align: right; }

    /* Aviso de confidencialidade: o papel circula, precisa se identificar. */
    #saude-print-doc .sp-aviso {
      border: 1.5px solid #111;
      padding: 6px 8px;
      margin: 8px 0 12px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    #saude-print-doc .sp-ficha {
      break-inside: avoid;
      page-break-inside: avoid;
      border: 1px solid #999;
      border-left: 4px solid #111;
      padding: 7px 9px;
      margin-bottom: 7px;
    }
    #saude-print-doc .sp-ficha-top {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px dotted #bbb;
      padding-bottom: 4px;
      margin-bottom: 5px;
    }
    #saude-print-doc .sp-nome {
      font-family: var(--font-oswald), system-ui, sans-serif;
      font-size: 13px;
      font-weight: 700;
      text-transform: uppercase;
    }
    #saude-print-doc .sp-ident { font-size: 9px; color: #444; }
    #saude-print-doc .sp-contato { font-size: 9.5px; text-align: right; white-space: nowrap; }
    #saude-print-doc .sp-contato strong { font-size: 11px; }

    #saude-print-doc .sp-flags { margin-bottom: 5px; }
    #saude-print-doc .sp-flag {
      display: inline-block;
      border: 1px solid #111;
      padding: 1px 5px;
      margin: 0 4px 3px 0;
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
    }

    #saude-print-doc .sp-campo { margin-bottom: 4px; }
    #saude-print-doc .sp-rot {
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #333;
    }
    /* Alergia é o que mata: destaque de verdade, não sutileza de tela. */
    #saude-print-doc .sp-campo-critico { background: #f2f2f2; padding: 3px 5px; border-left: 3px solid #111; }
    #saude-print-doc .sp-val { white-space: pre-wrap; }

    #saude-print-doc .sp-rodape {
      margin-top: 10px;
      padding-top: 6px;
      border-top: 1px solid #999;
      font-size: 8.5px;
      color: #444;
      text-align: center;
    }
    #saude-print-doc .sp-vazio { font-style: italic; color: #555; }
  }
`;

function Campo({
  rotulo,
  valor,
  critico,
}: {
  rotulo: string;
  valor: string | null;
  critico?: boolean;
}) {
  if (!valor) return null;
  return (
    <div className={`sp-campo ${critico ? "sp-campo-critico" : ""}`}>
      <span className="sp-rot">{rotulo}: </span>
      <span className="sp-val">{valor}</span>
    </div>
  );
}

export function RelatorioImpressao({
  fichas,
  totalInscritos,
  geradoEm,
}: RelatorioImpressaoProps) {
  const noCliente = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );

  const doc = (
    <>
      <style>{PRINT_CSS}</style>
      <div id="saude-print-doc">
        <div className="sp-head">
          <div>
            <p className="sp-title">Relatório de Saúde</p>
            <p className="sp-sub">
              Acampamento RAIZ 2026 · 25 a 27 de setembro
            </p>
          </div>
          <div className="sp-meta">
            <div>{fichas.length} com informação de saúde</div>
            <div>{totalInscritos} inscritos ao todo</div>
            <div>Gerado em {geradoEm}</div>
          </div>
        </div>

        <div className="sp-aviso">
          Confidencial — dados sensíveis de saúde de menores (LGPD art. 11).
          Uso restrito à equipe de saúde e à liderança. Destrua após o
          acampamento.
        </div>

        {fichas.length === 0 ? (
          <p className="sp-vazio">
            Nenhuma informação de saúde declarada até o momento.
          </p>
        ) : (
          fichas.map((f) => (
            <div key={f.id} className="sp-ficha">
              <div className="sp-ficha-top">
                <div>
                  <div className="sp-nome">{f.nome}</div>
                  <div className="sp-ident">
                    {f.idade} anos · {f.codigo}
                    {f.tribo ? ` · ${f.tribo}` : ""}
                  </div>
                </div>
                {f.telefone && (
                  <div className="sp-contato">
                    <div>{f.responsavel ?? "Responsável"}</div>
                    <strong>{f.telefone}</strong>
                  </div>
                )}
              </div>

              {f.flags.length > 0 && (
                <div className="sp-flags">
                  {f.flags.map((flag) => (
                    <span key={flag} className="sp-flag">
                      {flag}
                    </span>
                  ))}
                </div>
              )}

              <Campo rotulo="Alergias" valor={f.alergias} critico />
              <Campo rotulo="Medicamentos" valor={f.medicamentos} critico />
              <Campo rotulo="Restrições alimentares" valor={f.restricoes} />
              <Campo rotulo="Condições crônicas" valor={f.condicoes} />
              <Campo rotulo="Observações" valor={f.observacoes} />
            </div>
          ))
        )}

        <div className="sp-rodape">
          Acampamento RAIZ 2026 — documento interno. Em emergência, ligue para o
          responsável indicado na ficha.
        </div>
      </div>
    </>
  );

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => window.print()}
        className="print:hidden"
      >
        Imprimir relatório
      </Button>
      {noCliente ? createPortal(doc, document.body) : null}
    </>
  );
}
