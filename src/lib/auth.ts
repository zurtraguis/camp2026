import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/dal";

/** Auth de credenciais para o painel admin (hash em @/lib/password). */
export { hashPassword, verifyPassword } from "@/lib/password";

const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12h

/** Cria sessão para o usuário e define o cookie httpOnly. */
export async function createSession(userId: string): Promise<void> {
  const token =
    globalThis.crypto?.randomUUID?.() ??
    Math.random().toString(36).slice(2) + Date.now().toString(36);
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({ data: { sessionToken: token, userId, expires } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { sessionToken: token } }).catch(() => {});
    jar.delete(SESSION_COOKIE);
  }
}

/** Usuário admin/staff da sessão atual (fail-closed). */
export const getAdmin = cache(async () => {
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
    return null;
  }
});

export async function requireAdmin() {
  const user = await getAdmin();
  if (!user || (user.role !== "ADMIN" && user.role !== "STAFF")) {
    redirect("/admin/login");
  }
  return user;
}
