import type { Metadata } from "next";
import { Inter, Anton, Oswald } from "next/font/google";
import "./globals.css";
import { WebVitals } from "./web-vitals";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin"],
  display: "swap",
});

const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ??
  "http://localhost:3000";
const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "Acampamento RAIZ 2026";
const defaultDescription =
  "Inscrições do Acampamento RAIZ 2026 — três dias de imersão para adolescentes (12 a 19 anos). Todo fruto revela uma raiz.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description: defaultDescription,
  alternates: {
    canonical: "./",
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: "./",
    siteName: appName,
    title: appName,
    description: defaultDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: appName,
    description: defaultDescription,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${inter.variable} ${anton.variable} ${oswald.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-background"
        >
          Pular para o conteúdo
        </a>
        {children}
        <WebVitals />
      </body>
    </html>
  );
}
