/**
 * Concatena classes condicionalmente (sem dependências).
 * Se precisar de merge inteligente de utilitários Tailwind (resolver conflitos),
 * troque por `clsx` + `tailwind-merge`.
 */
export function cn(
  ...classes: Array<string | false | null | undefined>
): string {
  return classes.filter(Boolean).join(" ");
}
