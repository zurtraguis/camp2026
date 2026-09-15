/**
 * Quartos do alojamento e líder de cada quarto.
 *
 * O líder não é gravado: é o mais velho entre os membros ATUAIS, calculado aqui
 * na leitura. Se ele for desativado ou mudar de quarto, o próximo mais velho
 * assume sozinho — ninguém precisa lembrar de atualizar.
 */

import { requireAdmin } from "@/lib/auth";
import { listarQuartos, listarSemQuarto } from "@/lib/quartos.service";
import { liderDoQuarto, GENERO_LABEL, type Genero } from "@/lib/quartos";
import { TRIBO_META, type TriboId } from "@/lib/tribos";
import { Callout, Card } from "@/components/ui";
import { GerarQuartosForm, EncaixarForm } from "./QuartosForms";
import { FolhasQuartos, type FolhaQuarto } from "./FolhasQuartos";

export const metadata = { title: "Quartos" };

export default async function QuartosPage() {
  await requireAdmin();

  const [quartosRaw, semQuarto] = await Promise.all([
    listarQuartos(),
    listarSemQuarto(),
  ]);

  const quartos = quartosRaw.map((q) => {
    const membros = q.campers.map((c) => ({
      ...c,
      gender: c.gender as Genero,
    }));
    const lider = liderDoQuarto(membros);
    // Líder primeiro, depois do mais velho ao mais novo — é a ordem em que a
    // lista é lida na porta.
    const ordenados = [...membros].sort(
      (a, b) =>
        Number(b.id === lider?.id) - Number(a.id === lider?.id) ||
        a.birthDate.getTime() - b.birthDate.getTime(),
    );
    return {
      id: q.id,
      gender: q.gender as Genero,
      numero: q.number,
      capacidade: q.capacity,
      titulo: `${GENERO_LABEL[q.gender as Genero]} ${q.number}`,
      lider,
      membros: ordenados,
    };
  });

  const capacidadeAtual = quartos[0]?.capacidade ?? null;
  const porGenero = (g: Genero) => quartos.filter((q) => q.gender === g);
  const nomeTribo = (t: string | null) =>
    t ? (TRIBO_META[t as TriboId]?.nome ?? null) : null;

  const folhas: FolhaQuarto[] = quartos.map((q) => ({
    id: q.id,
    titulo: q.titulo,
    lider: q.lider?.fullName ?? null,
    membros: q.membros.map((m) => ({
      id: m.id,
      nome: m.fullName,
      idade: m.ageAtCamp,
      tribo: nomeTribo(m.tribo),
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
          <h1 className="font-display text-3xl text-creme">Quartos</h1>
          <p className="mt-1 text-sm text-muted">
            Alojamento por quarto — o líder de cada um é o mais velho
          </p>
        </div>
        {quartos.length > 0 && <FolhasQuartos folhas={folhas} geradoEm={geradoEm} />}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 border-b border-border pb-2 font-condensed text-xs uppercase tracking-widest text-muted">
            {quartos.length > 0 ? "Gerar de novo" : "Gerar quartos"}
          </h2>
          <GerarQuartosForm
            capacidadeAtual={capacidadeAtual}
            jaTemQuartos={quartos.length > 0}
          />
          <p className="mt-3 text-xs text-muted">
            Cada quarto recebe um dos mais velhos, em vez de juntar por idade —
            senão o quarto dos mais novos teria um líder de 12 anos. As idades
            ficam equilibradas e os quartos com tamanhos parecidos.
          </p>
        </Card>

        {quartos.length > 0 && (
          <Card>
            <h2 className="mb-4 border-b border-border pb-2 font-condensed text-xs uppercase tracking-widest text-muted">
              Chegou gente depois?
            </h2>
            {semQuarto.length > 0 ? (
              <EncaixarForm
                capacidade={capacidadeAtual ?? 6}
                semQuarto={semQuarto.length}
              />
            ) : (
              <p className="text-sm text-muted">Todo mundo já tem quarto.</p>
            )}
          </Card>
        )}
      </div>

      {quartos.length > 0 && semQuarto.length > 0 && (
        <Callout tone="warning" title={`${semQuarto.length} campista(s) sem quarto`}>
          {semQuarto.map((s) => s.fullName).join(", ")}.
        </Callout>
      )}

      {(["MALE", "FEMALE"] as const).map((g) =>
        porGenero(g).length === 0 ? null : (
          <section key={g} aria-label={GENERO_LABEL[g]} className="space-y-4">
            <h2 className="font-display text-xl text-creme">
              {GENERO_LABEL[g]} ({porGenero(g).length} quartos ·{" "}
              {porGenero(g).reduce((s, q) => s + q.membros.length, 0)} pessoas)
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {porGenero(g).map((q) => (
                <Card key={q.id} className="space-y-3">
                  <div className="flex items-baseline justify-between gap-2 border-b border-border pb-2">
                    <h3 className="font-display text-lg text-creme">{q.titulo}</h3>
                    <span
                      className={`font-condensed text-xs uppercase tracking-wide ${
                        q.membros.length > q.capacidade ? "text-danger" : "text-muted"
                      }`}
                    >
                      {q.membros.length}/{q.capacidade}
                    </span>
                  </div>

                  {q.lider ? (
                    <div className="rounded-lg border border-verde-limao/30 bg-verde-limao/5 px-3 py-2">
                      <p className="font-condensed text-[10px] uppercase tracking-widest text-muted">
                        Líder do quarto
                      </p>
                      <p className="font-semibold text-verde-limao">{q.lider.fullName}</p>
                      <p className="text-xs text-muted">
                        {q.lider.ageAtCamp} anos · nascido(a) em{" "}
                        {q.lider.birthDate.toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm italic text-muted">Quarto vazio.</p>
                  )}

                  <ol className="list-inside list-decimal space-y-1 text-sm text-creme">
                    {q.membros
                      .filter((m) => m.id !== q.lider?.id)
                      .map((m) => (
                        <li key={m.id}>
                          {m.fullName}
                          <span className="ml-1 text-xs text-muted">
                            {m.ageAtCamp}a
                            {nomeTribo(m.tribo) ? ` · ${nomeTribo(m.tribo)}` : ""}
                          </span>
                        </li>
                      ))}
                  </ol>
                </Card>
              ))}
            </div>
          </section>
        ),
      )}

      {quartos.length === 0 && (
        <Callout tone="info" title="Nenhum quarto gerado ainda">
          Informe quantas pessoas cabem por quarto e clique em gerar. Meninos e
          meninas vão para quartos separados, e o líder de cada quarto é o mais
          velho.
        </Callout>
      )}
    </div>
  );
}
