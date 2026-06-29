# 01_MARKET_AND_REFERENCES.md — Pesquisa de Mercado e Referências

> **Skills:** `/using-superpowers` `/market` `/brainstorming` `/architecture-decision-records`  
> **Prompt pack:** `12_PROMPT_PACKS.md` → Fase 1c  
> **Responsável:** Tech Lead  
> **Depende de:** `00_VALIDATION.md` (GO) + `02_PRD.md`  
> **Gate de saída:** 4 frentes concluídas + consolidação aprovada como base para Fase 1D e Fase 2

Status: DRAFT  
Data: [preencher]  
Autor: [preencher]

> **Regra:** Nenhuma linha de código antes da conclusão desta etapa.  
> Este documento é a base oficial para decisões de arquitetura, escopo e priorização do backlog.

---

## Pré-requisitos

- `docs/00_VALIDATION.md` — veredito GO confirmado
- `docs/02_PRD.md` — proposta de valor e escopo definidos

---

## 1. Repositórios e Soluções Open-Source

### 1.1 Projetos com proposta idêntica ou semelhante

| Repositório / Projeto | Proposta | Stars / Forks | Última atividade | Licença | Uso comercial |
|---|---|---|---|---|---|
| | | | | | |

**Critérios de qualidade:** stars, forks, frequência de commits, issues abertas/fechadas, releases nos últimos 12 meses.

### 1.2 Bibliotecas e pacotes reutilizáveis

| Pacote | Finalidade | Downloads / uso | Manutenção | Licença | CVE conhecidos |
|---|---|---|---|---|---|
| | | | | | |

### 1.3 Ferramentas de suporte (CLI, SDKs, integrações)

| Ferramenta | Tipo | Uso no projeto | Licença comercial |
|---|---|---|---|
| | | | |

### 1.4 Licenças — Compatibilidade com Uso Comercial

| Licença | Uso comercial | Copyleft | Observação |
|---|---|---|---|
| MIT | ✅ Sim | Não | Máxima liberdade; pode fechar código |
| Apache 2.0 | ✅ Sim | Não (patentes) | Similar ao MIT com proteção de patente |
| GPL | ⚠️ Condicional | Sim | Derivados devem ser GPL — código aberto |
| AGPL | ⚠️ Condicional | Sim | + obrigação em uso em rede |
| BSL | ⚠️ Depende | Após período | Livre até certo limite; depois pago |

> ⛔ **Regra:** não incorporar GPL/AGPL em produto proprietário fechado sem assessoria jurídica.

### 1.5 Resumo OSS — Aprovados para Uso

| Status | Item | Tipo | Justificativa |
|---|---|---|---|
| ✅ Aprovado | | | |
| ❌ Rejeitado | | | Motivo: |

---

## 2. Análise de Concorrentes e Referências de Mercado

### 2.1 Concorrentes Diretos e Indiretos

| Produto | Funcionalidades principais | Diferenciais | Pontos fracos | Preço / modelo |
|---|---|---|---|---|
| | | | | |

### 2.2 O que Replicar ou Superar

- Pontos fortes dos concorrentes que devemos replicar:
  -
- Pontos que precisamos superar:
  -

### 2.3 Oportunidades de Diferenciação

- Lacunas e fraquezas dos concorrentes que podemos explorar:
  -

### 2.4 Integrações e Ecossistema

| Concorrente | Integrações / parceiros | Relevância para nosso escopo |
|---|---|---|
| | | |

### 2.5 Modelos de Precificação

| Modelo | Concorrentes que usam | Prós | Contras |
|---|---|---|---|
| Freemium | | | |
| Por assento | | | |
| Por uso | | | |
| Open-core | | | |

**Decisão de posicionamento:**

---

## 3. Comunidades e Feedback Real de Usuários

### 3.1 Fóruns e Comunidades

| Fonte | Tópicos relevantes | Dores recorrentes |
|---|---|---|
| Reddit | | |
| Hacker News | | |
| Discord/Telegram | | |

### 3.2 Plataformas de Avaliação

| Plataforma | Produto analisado | Reclamações recorrentes | Features mais pedidas |
|---|---|---|---|
| Product Hunt | | | |
| G2 / Capterra | | | |

### 3.3 Issues Públicas de Concorrentes OSS

| Repositório | Problemas recorrentes | Oportunidade para nossa solução |
|---|---|---|
| | | |

### 3.4 Stack Overflow / Comunidades Dev

- Dificuldades técnicas comuns no domínio que nossa solução resolve nativamente:
  -

---

## 4. Consolidação e Tomada de Decisão

### 4.1 Ferramentas e Bibliotecas Aprovadas

| Item | Tipo | Justificativa | ADR |
|---|---|---|---|
| | | | ADR-00X |

### 4.2 Funcionalidades Confirmadas para o Escopo Inicial

| Funcionalidade | Fonte da demanda | Prioridade (P0/P1/P2) |
|---|---|---|
| | | |

### 4.3 Funcionalidades Descartadas ou Adiadas

| Funcionalidade | Decisão | Justificativa |
|---|---|---|
| | Descartada / Adiada | |

### 4.4 Oportunidades de Diferenciação

-

### 4.5 Riscos e Pontos de Atenção

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| | | | |

### 4.6 Decisões de Arquitetura Impactadas

- [Decisões derivadas desta pesquisa — referenciar em `decisions/`]

---

## Gate de Saída

- [ ] Seções 1 a 4 preenchidas com base em pesquisa real
- [ ] Lista de ferramentas/bibliotecas aprovadas documentada
- [ ] Escopo inicial confirmado/descartado com justificativa
- [ ] Riscos e oportunidades registrados
- [ ] ADRs criados para decisões de arquitetura impactadas
- [ ] Aprovado como base para Fase 1D (Design) e Fase 2 (Spec)

---

## Impacto em Segurança e UX
> Preencher mesmo quando "sem impacto" — obrigatório pelo processo.

- Segurança:
- UX:

---

## Histórico de Atualizações

| Data | Alteração | Autor |
|---|---|---|
| | Criação do documento | |
