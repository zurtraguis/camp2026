---
id: cmd-security-audit
title: Security Audit — gate de release
category: audit
model: opus
skills:
  - using-superpowers
  - security-audit
  - secrets-management
  - auth-implementation-patterns
  - quality/audit-security
---

# `/security-audit` — Auditoria de segurança

Roda o roteiro completo de `security-audit` e atualiza `docs/08_SECURITY.md`. Gate obrigatório antes de `/release`.

## Skills obrigatórias

- `/using-superpowers`
- `/security-audit`
- `/secrets-management`
- `/auth-implementation-patterns`
- `quality/audit-security` (skills-web-excellence)

## Saída

- `docs/08_SECURITY.md` preenchido com tabela OWASP, CVEs e decisão de gate.
- Atualização opcional em `docs/12_THREAT_MODEL.md` se nova superfície.
- Atualização em `docs/DOCS_INDEX.md`: linha 4a → status apropriado.

## Critério de aceite

- Zero vuln Critical sem mitigação.
- Zero secret detectado por gitleaks.
- OWASP Top 10 cobertos com evidência.
- `08_SECURITY.md` decisão = GATE OK ou GATE COM RESSALVAS (com plano).
