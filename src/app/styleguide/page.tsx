import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Style Guide",
  description: "Design system component preview",
};

export default function StyleguidePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-12 p-8">
      <header>
        <h1 className="text-3xl font-bold">Style Guide</h1>
        <p className="mt-2 text-foreground/60">
          Design system preview — populated during Phase 1D (Design).
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Typography</h2>
        <div className="space-y-2">
          <p className="text-4xl font-bold">Heading 1 — The quick brown fox</p>
          <p className="text-3xl font-semibold">Heading 2 — The quick brown fox</p>
          <p className="text-2xl font-medium">Heading 3 — The quick brown fox</p>
          <p className="text-xl">Heading 4 — The quick brown fox</p>
          <p className="text-base">Body text — The quick brown fox jumps over the lazy dog.</p>
          <p className="text-sm text-foreground/60">Caption — The quick brown fox jumps over the lazy dog.</p>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Colors</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="space-y-2">
            <div className="h-16 rounded-lg bg-foreground" />
            <p className="text-xs">Foreground</p>
          </div>
          <div className="space-y-2">
            <div className="h-16 rounded-lg bg-background border border-foreground/10" />
            <p className="text-xs">Background</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Components</h2>
        <p className="text-foreground/60">
          Components will be added here after shadcn/ui initialization and Phase 1D design tokens.
        </p>
      </section>
    </div>
  );
}
