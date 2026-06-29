---
name: security-audit
description: >-
  Conduz auditoria de segurança ponta-a-ponta antes de cada release: SBOM,
  dependency CVEs, secret scan, headers/CSP, OWASP Top 10 manual, threat surface.
  Use antes de /release, ao ativar /security-audit ou ao introduzir nova
  superfície de ataque (auth, payments, file upload, externos).
version: 1.0.0
---

# Security Audit

Skill de orquestração para auditoria de segurança alinhada com `docs/08_SECURITY.md` e `docs/12_THREAT_MODEL.md`.

## Quando usar

- Antes de `/release` (gate obrigatório).
- Após adicionar nova dependência crítica (auth, crypto, payments, parser de input externo).
- Trimestralmente como ritual.
- Em resposta a CVE conhecido em dependência usada.

## Patterns reusados

- `secrets-management` — segredos no env, rotação, ausência em commits.
- `auth-implementation-patterns` — fluxos auth, sessão, MFA.
- `k8s-security-policies` — quando deploy via K8s.
- `top 100 web vulnerabilities reference` (web-excellence) — checklist OWASP.

## Roteiro

### 1. Inventário (SBOM)

```bash
npm audit --omit=dev --json > .audit/npm-audit.json
npx --yes @cyclonedx/cyclonedx-npm --output-file .audit/sbom.json
```

Anotar:
- Vulnerabilidades **High/Critical** com CVE e versão de fix.
- Pacotes com 0 manutenção (>2 anos sem release) em path crítico.

### 2. Secret scan

```bash
npx --yes gitleaks detect --redact --report-path=.audit/gitleaks.json --no-banner
```

Bloqueio: zero achados High. Achados Medium → ADR de aceite explícito.

### 3. Headers / CSP (apenas web)

Verificar em `next.config.ts` (ou framework equivalente):
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Content-Security-Policy` sem `unsafe-inline`/`unsafe-eval`
- `X-Frame-Options: DENY` ou `frame-ancestors 'none'`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` mínimo (camera, microphone, geolocation negados por padrão)

### 4. OWASP Top 10 manual

Para cada item, registrar status (✅ aplicado / ⚠️ parcial / ❌ pendente) com evidência:

| # | Item | Status | Evidência |
|---|---|---|---|
| A01 | Broken Access Control | | |
| A02 | Cryptographic Failures | | |
| A03 | Injection | | |
| A04 | Insecure Design | | |
| A05 | Security Misconfiguration | | |
| A06 | Vulnerable Components | | (ver §1) |
| A07 | Authentication Failures | | |
| A08 | Software/Data Integrity | | |
| A09 | Logging/Monitoring | | |
| A10 | SSRF | | |

### 5. Saída

Atualizar `docs/08_SECURITY.md`:
- Sumário executivo (zero High/Critical, ou risco residual aceito).
- Tabela OWASP preenchida.
- Lista de CVEs com plano (fix imediato / aguardar upstream / mitigação compensatória).
- Decisão: GATE OK | GATE COM RESSALVAS | GATE BLOQUEADO.

Cruzar com `docs/12_THREAT_MODEL.md` (atualizar se nova superfície).

## Hard stops

- Não fechar gate com vuln **Critical** sem patch ou mitigação validada.
- Não silenciar achado de gitleaks sem rotação do segredo.
- Não fazer `/release` se §5 = GATE BLOQUEADO.

## Próximo passo

- `/observability-setup` (verificar que logging cobre tentativas de exploração)
- `/release` (se gate OK)
