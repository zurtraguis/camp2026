import { NextResponse } from "next/server";

// Health check leve para o orquestrador (Portainer/Traefik/Docker HEALTHCHECK).
// NÃO toca no banco de propósito: responde "o processo Next está de pé".
// Para um readiness check com DB, criar /health/ready separado.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(
    { status: "ok", service: "acamp2026", ts: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
