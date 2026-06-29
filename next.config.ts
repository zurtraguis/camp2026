import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Raiz explícita do projeto — evita inferência errada do Turbopack quando há
// lockfiles fora do projeto (ex.: em $HOME).
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // Build standalone para o container Docker/Portainer: gera
  // `.next/standalone/server.js` (Node server auto-suficiente, sem `next start`).
  // Convive com o caminho legado OpenNext/Cloudflare (wrangler.jsonc), que
  // ignora esta opção ao rodar `opennextjs-cloudflare build`.
  output: "standalone",
  turbopack: { root: projectRoot },
  // Prisma 7 + Turbopack (Next 16): evita "Cannot find module .prisma/client/default"
  serverExternalPackages: ["@prisma/client", "pg"],
  // Hardening: remove o header X-Powered-By
  poweredByHeader: false,
  // Formatos de imagem modernos por padrão (perf/LCP)
  images: { formats: ["image/avif", "image/webp"] },
  async headers() {
    const headers = [...securityHeaders];
    if (process.env.NODE_ENV === "production") {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
      // CSP estática (substitui a CSP por nonce do proxy, removido por causa do
      // Cloudflare Workers, que não suporta middleware/proxy Node no Next 16).
      headers.push({
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' https://js.stripe.com",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https: blob:",
          "font-src 'self' data:",
          "connect-src 'self' https://api.stripe.com https://*.stripe.com https://*.supabase.co",
          "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
          "upgrade-insecure-requests",
        ].join("; "),
      });
    }
    return [
      {
        source: "/:path*",
        headers,
      },
    ];
  },
};

export default nextConfig;
