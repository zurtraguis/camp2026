# Trilhas (Tracks) — Harness 3.0

Single source of truth: `scripts/track-resolver.mjs`.

A **trilha** controla quais fases do VibeCoding são **obrigatórias** para fechar o ciclo. Soluções pequenas/side-projects usam `lite`; SaaS B2B usa `standard`; produtos regulados (saúde, finanças, governo) usam `enterprise`.

Definida em `.harness-config.json` campo `track`. Trocada via `/init-stack --track=<x>` ou edição manual.

## Tabela autoritativa

| #  | Fase                          | lite | standard | enterprise |
|----|-------------------------------|:----:|:--------:|:----------:|
| 00 | Validation                    | ✓    | ✓        | ✓          |
| 01 | PRD                           | ✓    | ✓        | ✓          |
| 02 | Monetization                  | –    | ✓        | ✓          |
| 03 | Research                      | –    | ✓        | ✓          |
| 04 | Market & References           | –    | ✓        | ✓          |
| 05 | Design                        | ✓    | ✓        | ✓          |
| 06 | Specification                 | ✓    | ✓        | ✓          |
| 07 | Implementation                | ✓    | ✓        | ✓          |
| 08 | Security                      | ✓    | ✓        | ✓          |
| 09 | Tests                         | ✓    | ✓        | ✓          |
| 10 | Debug                         | ✓    | ✓        | ✓          |
| 11 | UX Audit                      | –    | ✓        | ✓          |
| 12 | Threat Model                  | –    | ✓        | ✓          |
| 13 | Release Readiness             | ✓    | ✓        | ✓          |
| 14 | Compliance (LGPD/GDPR/SOC2)   | –    | –        | ✓          |
| 15 | DPA / Pen-test                | –    | –        | ✓          |

Legenda: ✓ = exigida (gate); – = não aplica (skip).

## Como cada trilha se comporta

### `lite`
- 9 fases obrigatórias.
- Pula research/marketing/UX-audit/threat-model.
- Recomendada para: side-projects, MVPs internos, protótipos.
- Snapshots automáticos: **off** por default.

### `standard` (default)
- 14 fases obrigatórias.
- Inclui validação de mercado, UX-audit e threat model.
- Recomendada para: SaaS público, produtos comerciais B2B/B2C.
- Snapshots automáticos: **on** ao fechar fase.

### `enterprise`
- 16 fases obrigatórias (inclui 14 + 15).
- Adiciona compliance (LGPD/GDPR/SOC2) e pen-test/DPA antes do release.
- Recomendada para: saúde, finanças, governo, B2B regulado.
- Snapshots automáticos: **on**.
- Templates extras: `docs/templates/14_COMPLIANCE.md`, `docs/templates/15_DPA.md`.

## Hooks que respeitam trilha

- `enforce-skills.sh` — não bloqueia gate de fase pulada na trilha.
- `verify-docs.sh` — valida apenas fases ativas.
- `harness-status.mjs` — mostra trilha no banner.

## Trocar de trilha

Editar `.harness-config.json`:
```json
{ "track": "enterprise" }
```

Ou via CLI:
```bash
node scripts/harness-config.mjs set track enterprise
```

> Aviso: trocar de `enterprise` para `lite` **não apaga** docs já preenchidos (14/15 ficam intactos), apenas remove os gates obrigatórios.
