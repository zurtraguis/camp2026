---
id: cmd-snapshot
title: Snapshot — checkpoint de fase via git tag
category: ops
model: haiku
skills:
  - using-superpowers
  - git-advanced-workflows
---

# `/snapshot <subcomando> [args]` — Checkpoint determinístico de fase

Wrapper humano para `scripts/snapshot.mjs`. Cria/restaura snapshots determinísticos por fase usando tags git `phase-NN-<slug>-<YYYYMMDD-HHMM>`.

## Subcomandos

- `create <NN>` — gera tag para a fase NN (00..15). Stage automático de `docs/` se houver mudanças.
- `list [--phase=NN]` — lista snapshots existentes. Sem args, mostra todos.
- `rollback <tag>` — restaura `docs/` e `src/` ao estado da tag. Requer working tree limpo (ou `--force`).
- `diff <tag>` — diffstat entre a tag e HEAD.

## Pré-condições

- Diretório é repositório git (`git init` se ausente).
- `.harness-config.json` presente (gerado pelo `harness-init.sh`).
- `snapshots.enabled` em `.harness-config.json` é `true` (default).

## Auto-snapshot

Quando `snapshots.auto_on_phase_close=true` (default), o hook `phase-doc-sync.sh` chama `snapshot create` automaticamente ao detectar fase marcada como ✅ Concluído em `docs/DOCS_INDEX.md`.

## Exemplos

```bash
# Após fechar fase 06:
node scripts/snapshot.mjs create 06

# Listar snapshots da fase 06:
node scripts/snapshot.mjs list --phase=06

# Voltar para um snapshot anterior:
node scripts/snapshot.mjs rollback phase-06-specification-20260427-1530

# Diff contra HEAD:
node scripts/snapshot.mjs diff phase-06-specification-20260427-1530
```

## Telemetria

Eventos `snapshot.create` e `snapshot.rollback` são gravados em `.harness/events.jsonl` com `meta: {tag, phase}`.

## Notas operacionais

- Rollback restaura apenas `docs/` e `src/` — não toca `node_modules`, `.env`, ou builds.
- Sem `--force`, rollback aborta se houver mudanças não commitadas.
- A tag é assinada com `git tag -a` e mensagem padrão `Snapshot fase NN (slug) em ts`.
