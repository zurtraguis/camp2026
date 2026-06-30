import type { ReactNode } from "react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main-content" className="flex-1 bg-black">
      {children}
    </main>
  );
}
