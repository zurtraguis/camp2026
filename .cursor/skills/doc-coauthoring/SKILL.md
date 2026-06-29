---
name: doc-coauthoring
description: Co-author phase documents and specs with the user iteratively — propose structure, ask targeted questions, fill templates, and keep docs in sync with code. Use when producing or updating docs/ deliverables (PRD, spec, content/catalog models).
---

# Doc Co-authoring

Produce harness phase documents collaboratively, so each doc is decision-complete and traceable to code.

## When to Use This Skill

- Filling a phase template (PRD, spec, content-model, catalog-schema, etc.)
- Turning a discussion into a structured, reviewable document
- Keeping `docs/` aligned with the implemented code (no drift)
- Driving a doc to "Definition of Done" for its phase gate

## Process

1. **Anchor on the template** — start from `docs/templates/` for the phase; never invent structure.
2. **Gather, don't guess** — ask targeted questions for each ambiguous section before writing.
3. **Draft in sections** — propose one section, confirm, move on; avoid a giant unreviewed dump.
4. **Mark gaps explicitly** — open items go under "Riscos / Suposições / Pendências", not silent TODOs.
5. **Cross-link** — reference related docs and ADRs; keep `docs/DOCS_INDEX.md` updated.
6. **Close the gate** — run the phase verifier (e.g. `bash scripts/verify-docs.sh`) before marking done.

## Quality Bar

- [ ] Every required section present and concrete (no `[preencher]` left)
- [ ] Decisions have rationale; trade-offs recorded as ADRs when relevant
- [ ] Claims match the codebase (versions, file paths, contracts)
- [ ] Owners + dates on residual risks
- [ ] Phase verifier passes (exit 0)

## Anti-patterns

- Spec-first docs that never get reconciled with the shipped code
- Copy-pasted boilerplate that doesn't reflect this project
- Closing a phase with an open gate
