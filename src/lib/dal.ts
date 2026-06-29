import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";

/**
 * Data Access Layer (DAL) — fonte única de verdade para sessão/usuário.
 *
 * `import "server-only"` gera erro de build se este módulo for importado em um
 * Client Component. Padrão recomendado pela doc Next.js (Data Security): a
 * autorização NUNCA deve depender só do middleware (CVE-2025-29927) — verifique
 * a sessão também em Server Components, Server Actions e Route Handlers.
 *
 * Integração: defina o cookie `SESSION_COOKIE` no seu provider de auth.
 * Até lá, `getCurrentUser()` retorna null (fail-closed) e `requireUser()`
 * redireciona rotas protegidas para /login.
 */
export const SESSION_COOKIE = "session_token";

export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const session = await db.session.findUnique({
      where: { sessionToken: token },
      include: { user: true },
    });
    if (!session || session.expires.getTime() < Date.now()) return null;
    return session.user;
  } catch {
    // Sem DB / token inválido → trata como não autenticado (fail-closed).
    return null;
  }
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
