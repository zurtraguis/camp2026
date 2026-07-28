import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
    "http://localhost:3000";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /inscricao/[code] expõe nome do campista, valor e Pix a quem tem o
        // código — não pode virar resultado de busca. /admin idem.
        disallow: ["/dashboard", "/api/", "/admin", "/inscricao/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
