import type { ReactNode } from "react";
import { SiteHeader } from "@/components/raiz/SiteHeader";
import { SiteFooter } from "@/components/raiz/SiteFooter";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main-content" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
