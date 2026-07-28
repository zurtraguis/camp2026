import { redirect } from "next/navigation";

/**
 * A fila de revisão de comprovantes foi absorvida por /admin/em-aberto (que
 * também cobre cobrança, baixa manual e troca de forma). Esta rota só existe
 * para não quebrar links/favoritos antigos.
 */
export default function PagamentosPage(): never {
  redirect("/admin/em-aberto");
}
