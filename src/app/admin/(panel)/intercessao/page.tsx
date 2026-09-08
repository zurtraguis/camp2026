/**
 * Intercessão — cada campista sob a oração de um coordenador.
 *
 * A distribuição é persistida e estável de propósito: intercessão se constrói
 * ao longo de semanas, então o padrão é só distribuir quem ainda não tem
 * coordenador. Redistribuir tudo existe, mas é decisão consciente.
 */

import { requireAdmin } from "@/lib/auth";
import {
  listarCoordenadores,
  listarCampistasParaIntercessao,
} from "@/lib/intercessao.service";
import {
  listasPorCoordenador,
  resumoIntercessao,
  type CampistaParaIntercessao,
} from "@/lib/intercessao";
import { TRIBO_META } from "@/lib/tribos";
import { Callout, Card } from "@/components/ui";
import {
  AdicionarCoordenadoresForm,
  DistribuirForm,
  RedistribuirTudoForm,
  CoordenadorForm,
} from "./IntercessaoForms";
import { FolhasImpressao, type FolhaCoordenador } from "./FolhasImpressao";

export const metadata = { title: "Intercessão" };

const nomeDaTribo = (t: string | null) =>
  t ? (TRIBO_META[t as keyof typeof TRIBO_META]?.nome ?? null) : null;

export default async function IntercessaoPage() {
  await requireAdmin();

  const [coordenadores, campistasRaw] = await Promise.all([
    listarCoordenadores(),
    listarCampistasParaIntercessao(),
  ]);

  const campistas: CampistaParaIntercessao[] = campistasRaw.map((c) => ({
    id: c.id,
    fullName: c.fullName,
    intercessorId: c.intercessorId,
  }));

  const listas = listasPorCoordenador(
    campistas,
    coordenadores.map((c) => ({ id: c.id, name: c.name })),
  );

  const idsValidos = new Set(coordenadores.map((c) => c.id));
  const pendentes = campistas.filter(
    (c) => !c.intercessorId || !idsValidos.has(c.intercessorId),
  );
  const resumo = resumoIntercessao(listas, campistas.length, pendentes.length);

  const triboPorCampista = new Map(
    campistasRaw.map((c) => [c.id, nomeDaTribo(c.tribo)]),
  );
  const folhas: FolhaCoordenador[] = listas.map((l) => ({
    id: l.coordenador.id,
    nome: l.coordenador.name,
    campistas: l.campistas.map((c) => ({
      id: c.id,
      nome: c.fullName,
      tribo: triboPorCampista.get(c.id) ?? null,
    })),
  }));

  const geradoEm = new Date().toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-creme">Intercessão</h1>
          <p className="mt-1 text-sm text-muted">
            Cada adolescente sob a oração de um coordenador
          </p>
        </div>
        {listas.length > 0 && (
          <FolhasImpressao folhas={folhas} geradoEm={geradoEm} />
        )}
      </div>

      <section aria-label="Resumo" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Resumo label="Adolescentes" valor={resumo.totalCampistas} />
        <Resumo label="Coordenadores" valor={resumo.totalCoordenadores} />
        <Resumo
          label="Por coordenador"
          valor={
            resumo.totalCoordenadores === 0
              ? "—"
              : resumo.minPorCoordenador === resumo.maxPorCoordenador
                ? `${resumo.minPorCoordenador}`
                : `${resumo.minPorCoordenador}–${resumo.maxPorCoordenador}`
          }
        />
        <Resumo
          label="Sem coordenador"
          valor={resumo.semCoordenador}
          alerta={resumo.semCoordenador > 0}
        />
      </section>

      {coordenadores.length === 0 && (
        <Callout tone="info" title="Comece cadastrando os coordenadores">
          Cole a lista de nomes abaixo — um por linha. Depois é um clique para
          distribuir os adolescentes entre eles.
        </Callout>
      )}

      {resumo.semCoordenador > 0 && coordenadores.length > 0 && (
        <Callout tone="warning" title="Há adolescentes sem coordenador">
          {resumo.semCoordenador} campista(s) ainda não estão sendo cobertos por
          ninguém. Distribua abaixo.
        </Callout>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 border-b border-border pb-2 font-condensed text-xs uppercase tracking-widest text-muted">
            Cadastrar coordenadores
          </h2>
          <AdicionarCoordenadoresForm />
        </Card>

        <Card className="space-y-4">
          <h2 className="border-b border-border pb-2 font-condensed text-xs uppercase tracking-widest text-muted">
            Distribuir
          </h2>
          <DistribuirForm pendentes={resumo.semCoordenador} />
          {coordenadores.length > 0 && <RedistribuirTudoForm />}
        </Card>
      </div>

      {listas.length > 0 && (
        <section aria-label="Listas por coordenador" className="space-y-4">
          <h2 className="font-display text-xl text-creme">
            Quem ora por quem ({listas.length} coordenadores)
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listas.map((l) => (
              <Card key={l.coordenador.id} className="space-y-2">
                <div className="flex items-start justify-between gap-2 border-b border-border pb-2">
                  <h3 className="font-display text-lg text-creme">
                    {l.coordenador.name}
                  </h3>
                  <span className="shrink-0 font-condensed text-xs uppercase tracking-wide text-muted">
                    {l.campistas.length}
                  </span>
                </div>

                {l.campistas.length === 0 ? (
                  <p className="text-sm italic text-muted">
                    Ninguém atribuído ainda.
                  </p>
                ) : (
                  <ol className="list-inside list-decimal space-y-1 text-sm text-creme">
                    {l.campistas.map((c) => (
                      <li key={c.id}>{c.fullName}</li>
                    ))}
                  </ol>
                )}

                <CoordenadorForm id={l.coordenador.id} name={l.coordenador.name} />
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Resumo({
  label,
  valor,
  alerta,
}: {
  label: string;
  valor: number | string;
  alerta?: boolean;
}) {
  return (
    <Card className="flex flex-col gap-1">
      <p className="text-xs font-condensed uppercase tracking-wide text-muted">
        {label}
      </p>
      <p
        className={`font-display text-3xl tabular-nums ${
          alerta ? "text-amarelo-sol" : "text-creme"
        }`}
      >
        {valor}
      </p>
    </Card>
  );
}
