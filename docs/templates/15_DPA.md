# 15 — DPA / Pen-test

> Template enterprise. Obrigatório quando `.harness-config.json.track = "enterprise"`.

## Parte 1 — Data Processing Agreement (DPA)

### 1.1 Status do DPA

- DPA-modelo da empresa publicado em: [URL ou ref]
- Versão atual: [preencher]
- Última revisão jurídica: [data] — por: [nome/escritório]

### 1.2 DPAs assinados com processadores

| Processador  | Função          | DPA assinado em | Versão | Notes |
|-------------|-----------------|-----------------|--------|-------|
| [ex: AWS]   | Hosting         | [data]          | [v]    |       |
| [ex: Stripe]| Pagamentos      | [data]          | [v]    |       |
| [ex: Sentry]| Monitoring      | [data]          | [v]    |       |

### 1.3 DPAs solicitados por clientes (B2B)

- Processo de assinatura documentado: [S/N — link ao runbook]
- Tempo médio de resposta a request de DPA: [preencher]
- Contrato-padrão revisado: [data / responsável]

## Parte 2 — Pen-test (Penetration Test)

### 2.1 Empresa contratada

- Empresa: [preencher]
- Certificações: [OSCP, CREST, etc.]
- Data do teste: [preencher]
- Escopo: [Web / API / Infra / Mobile]

### 2.2 Severidade dos achados

| Severidade   | Quantidade | Resolvidos | Pendentes |
|-------------|-----------:|-----------:|----------:|
| Critical    | [n]        | [n]        | [n]       |
| High        | [n]        | [n]        | [n]       |
| Medium      | [n]        | [n]        | [n]       |
| Low         | [n]        | [n]        | [n]       |
| Informational| [n]       | [n]        | [n]       |

### 2.3 Achados Critical/High pendentes

[Listar com ID, descrição, plano de mitigação e prazo. Critical/High pendentes bloqueiam release enterprise.]

### 2.4 Re-teste

- Re-teste após mitigações: [data prevista / executada]
- Confirmação de resolução: [S/N — anexar relatório]

## Parte 3 — Bug bounty (opcional)

- Programa ativo: [S/N]
- Plataforma: [HackerOne, Bugcrowd, etc.]
- Escopo público: [S/N]
- Recompensa máxima documentada: [preencher]

## 4. Veredito

- [ ] **APROVADO** — DPA assinados e nenhum Critical/High pendente.
- [ ] **APROVADO COM RISCO** — pendências documentadas em ADR.
- [ ] **BLOQUEADO** — pendências críticas bloqueiam release.

Decisão: [GO | GO WITH RISK | NO-GO]

Aprovador: [nome / segurança / jurídico] — [data]
