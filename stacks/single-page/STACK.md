# Stack: single-page

Estado: **Beta**. Apresentação institucional de página única, sem formulário de captura (alias de `landing` sem lead-gen).

## Quando usar

- Página de portfólio, currículo, "link in bio".
- Site institucional minimalista com 1 página + âncoras.
- `project_type=single-page`.

## Stack técnico

Igual a `landing`, mas:

- Sem form handler.
- Pode optar por Astro em vez de Next.js (ADR no `/design`).
- Conteúdo direto no JSX (sem MDX, sem CMS).

## Skills priorizadas

- `frontend-design`
- `tailwind-design-system`
- `responsive-design`
- `ux-writing`
- `accessibility-audit`
- `theme-factory`
- `canvas-design` (para hero art opcional)

## Gates específicos

- Lighthouse ≥ 95 todas as categorias.
- WCAG 2.2 AA.

## Gates skippados

- `/monetization-check`, `/content-model`, `/seo` (opcional).
