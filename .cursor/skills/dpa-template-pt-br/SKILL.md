---
name: dpa-template-pt-br
description: Data Processing Agreement template em PT-BR + EN para LGPD/GDPR. Cláusulas de sub-processamento, transferência internacional, segurança, breach notification e direitos do titular.
---

# dpa-template-pt-br

## Quando usar

- Fase 15 (DPA) em track `enterprise`.
- Onboarding de novo cliente B2B/SaaS.
- Onboarding de novo sub-processador.

## Estrutura mínima

1. **Definições** — controlador, operador, sub-operador, dados pessoais, titular.
2. **Objeto** — finalidades autorizadas e categorias de dados.
3. **Duração** — alinhada ao contrato principal + período de retenção pós-término.
4. **Obrigações do operador** —
   - Processar apenas conforme instruções documentadas
   - Garantir confidencialidade dos colaboradores
   - Implementar medidas técnicas e organizacionais (ISO 27001 / SOC 2 ref.)
5. **Sub-processamento** — lista atualizada + 30 dias de aviso prévio para alteração.
6. **Transferência internacional** — SCCs (Standard Contractual Clauses) quando aplicável.
7. **Direitos dos titulares** — operador assiste o controlador em <72h.
8. **Notificação de incidente** — operador notifica controlador em <24h da ciência.
9. **Auditoria** — direito do controlador de auditar operador (1×/ano).
10. **Devolução/exclusão** — ao término, devolver ou excluir dados em <30 dias.

## Templates

- `docs/templates/15_DPA.md` — versão PT-BR padrão
- Apêndice A: lista de sub-processadores
- Apêndice B: medidas técnicas e organizacionais
- Apêndice C: SCCs (se transferência internacional)

## Pontos críticos

- Cláusula penal por descumprimento (sugerido: 5-10% do contrato anual)
- Foro: domicílio do controlador (LGPD) ou cláusula arbitral
- Idioma prevalente: PT-BR
