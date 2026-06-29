# ROPA — Record of Processing Activities

> Template LGPD/GDPR. Atualize este arquivo ao introduzir nova coleta de dados pessoais.
> Track: enterprise. Veredito de fase 14 exige este artefato preenchido.

## 1. Identificação do controlador

| Campo                | Valor              |
|----------------------|--------------------|
| Razão social         | [preencher]        |
| CNPJ                 | [preencher]        |
| DPO (encarregado)    | [preencher]        |
| Email DPO            | dpo@[empresa]      |
| Endereço             | [preencher]        |

## 2. Atividades de tratamento

| ID | Atividade | Finalidade | Base legal | Categoria de dados | Categoria de titulares | Destinatários | Transferência intl. | Retenção | Medidas de segurança |
|----|-----------|------------|------------|--------------------|------------------------|---------------|---------------------|----------|----------------------|
| A01 | Cadastro de usuário | Autenticação e provimento do serviço | Execução de contrato (LGPD art. 7º, V) | Identificação (email, nome) | Usuários da plataforma | Stripe (billing), Sentry (error tracking) | EUA (Stripe, Sentry) — SCCs | Vida do contrato + 5 anos legal | TLS 1.3, encryption-at-rest, RBAC |
| A02 | Cobrança e pagamento | Faturamento | Execução de contrato | Financeiro (cartão tokenizado) | Usuários pagantes | Stripe | EUA — SCCs | 5 anos (CC) | PCI-DSS via Stripe |
| A03 | Marketing email | Comunicação promocional | Consentimento (LGPD art. 7º, I) | Identificação + comportamental | Subscribers | Resend / Postmark | EUA — SCCs | Até revogação | Opt-out por click |
| A04 | Suporte | Atendimento ao usuário | Execução de contrato | Identificação + conteúdo da conversa | Usuários | Helpscout | EUA — SCCs | 3 anos | Acesso restrito a equipe de suporte |

## 3. Sub-processadores

| Sub-processador | Finalidade | Localização | DPA assinado | Última auditoria |
|-----------------|------------|-------------|--------------|------------------|
| Stripe          | Pagamentos | EUA (CA)    | sim (link)   | YYYY-MM         |
| Vercel          | Hosting    | EUA + global| sim          | YYYY-MM         |
| Sentry          | Errors     | EUA         | sim          | YYYY-MM         |
| Resend          | Email      | EUA         | sim          | YYYY-MM         |

## 4. Transferências internacionais

Todas via SCCs (Standard Contractual Clauses) versão 2021. Cópias arquivadas em `docs/15_DPA.md` Apêndice C.

## 5. Avaliações de impacto (DPIA)

- DPIA-001: feature de perfil enriquecido (decisão automatizada) — concluída em [data].

## 6. Histórico de revisões

| Data       | Mudança                                  | Autor   |
|------------|------------------------------------------|---------|
| YYYY-MM-DD | Versão inicial                           | DPO     |

---

**Veredito**: APROVADO / GO WITH RISK / NO-GO
**Próxima auditoria**: YYYY-MM
