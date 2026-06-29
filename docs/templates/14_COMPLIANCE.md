# 14 — Compliance (LGPD / GDPR / SOC2)

> Template enterprise. Obrigatório quando `.harness-config.json.track = "enterprise"`.

## Resumo executivo

[preencher: 2–3 linhas. Quais regulações aplicam-se? Qual o jurisdição-alvo? Há DPO? Há revisor jurídico externo?]

## 1. Mapeamento de dados pessoais

| Categoria             | Campo / Tabela | Base legal | Retenção | Crítico? |
|----------------------|---------------|-----------|----------|----------|
| Identificação        | [preencher]   | [preencher] | [preencher] | [S/N]    |
| Comportamento        | [preencher]   | [preencher] | [preencher] | [S/N]    |
| Sensível (saúde/etc) | [preencher]   | [preencher] | [preencher] | [S/N]    |

## 2. Direitos dos titulares (LGPD/GDPR)

- [ ] Acesso aos dados (Art. 18 LGPD / Art. 15 GDPR) — endpoint/UI: [preencher]
- [ ] Correção (Art. 18 LGPD / Art. 16 GDPR) — endpoint/UI: [preencher]
- [ ] Eliminação (Art. 18 LGPD / Art. 17 GDPR) — fluxo: [preencher]
- [ ] Portabilidade (Art. 18 LGPD / Art. 20 GDPR) — formato: [preencher]
- [ ] Revogação de consentimento — fluxo: [preencher]
- [ ] Tempo médio de resposta documentado (SLA): [preencher]

## 3. Bases legais

[preencher: para cada categoria de dado, justificar consent, contract, legal_obligation, vital_interest, public_interest ou legitimate_interest.]

## 4. Transferência internacional

- Hosts/processadores fora da jurisdição: [listar]
- Mecanismo de transferência: [SCC, BCR, adequacy decision, etc.]
- DPA assinado com cada processador: [referência ao doc 15]

## 5. SOC2 (apenas se aplicável)

- Controles SOC2 mapeados em: [referência]
- Auditor: [preencher]
- Cobertura: [Security / Availability / Confidentiality / Processing Integrity / Privacy]

## 6. Subprocessadores

| Provedor      | Função                  | Localização | DPA | Sub-processadores notificados? |
|--------------|-------------------------|-------------|-----|--------------------------------|
| [ex: AWS]    | Hosting                 | [região]    | [link]| [S/N]                         |
| [ex: Stripe] | Pagamentos              | [região]    | [link]| [S/N]                         |

## 7. Política de privacidade

- URL pública: [preencher]
- Última revisão: [data]
- Aprovador jurídico: [nome / ref]
- Linguagem clara (CNIL guidelines): [S/N]

## 8. Treinamento e governança

- DPO designado: [nome / ref]
- Frequência de treinamento de equipe em LGPD/GDPR: [trimestral/semestral/anual]
- Procedimento de incidente de dados (Art. 48 LGPD): referência ao runbook em `docs/OPS02_RUNBOOK.md`

## 9. Veredito

- [ ] **APROVADO** — todos os gates acima cobertos.
- [ ] **APROVADO COM RISCO** — gaps mapeados em ADR `docs/decisions/`.
- [ ] **BLOQUEADO** — gaps críticos impedem release.

Decisão: [GO | GO WITH RISK | NO-GO]

Aprovador: [nome] — [data]
