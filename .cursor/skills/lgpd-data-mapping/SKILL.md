---
name: lgpd-data-mapping
description: Inventário de dados pessoais conforme LGPD/GDPR — fluxo de coleta, finalidade, base legal, retenção e compartilhamento. Usar na Fase 14 (Compliance) e antes de qualquer feature que processe dados pessoais.
---

# lgpd-data-mapping

## Quando usar

- Início da Fase 14 (Compliance Audit) em track `enterprise`.
- Sempre que adicionar coleta nova de dado pessoal (email, telefone, geolocalização, biometria, comportamental).
- Auditorias periódicas (trimestrais).

## Saídas esperadas

1. **ROPA** (Record of Processing Activities) com colunas:
   - Atividade · Finalidade · Base legal (LGPD art. 7) · Categoria de dados · Categoria de titulares · Destinatários · Transferência internacional · Retenção · Medidas de segurança
2. **Mapa de dados sensíveis** (saúde, biometria, criança/adolescente, raça, opinião política).
3. **Lista de sub-processadores** com finalidade e localidade.

## Bases legais comuns (LGPD)

- **Consentimento** (art. 7º, I) — exige opt-in granular, revogável.
- **Execução de contrato** (art. 7º, V) — cobre processamento direto necessário ao serviço.
- **Legítimo interesse** (art. 7º, IX) — exige LIA (Legitimate Interest Assessment).
- **Cumprimento de obrigação legal** (art. 7º, II) — auditoria fiscal, AML.

## Checklist mínimo

- [ ] Toda coleta tem finalidade explícita documentada
- [ ] Base legal consciente (não default a "consentimento")
- [ ] Retenção definida (não "indefinida")
- [ ] Pipeline de exclusão por solicitação do titular
- [ ] Logs de acesso a dados sensíveis
- [ ] DPIA completa para dados sensíveis ou perfis automatizados

## Templates relacionados

- `docs/templates/14_COMPLIANCE.md`
- `dpa-template-pt-br` (skill irmã)
- `data-subject-rights-flow` (skill irmã)
