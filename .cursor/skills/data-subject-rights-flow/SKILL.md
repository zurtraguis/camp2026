---
name: data-subject-rights-flow
description: Fluxo de atendimento aos direitos do titular (LGPD art. 18) — acesso, retificação, portabilidade, exclusão, anonimização, oposição. Define SLA, automação e auditoria.
---

# data-subject-rights-flow

## Quando usar

- Fase 14 (Compliance) ao implementar endpoints de GDPR/LGPD.
- Antes de lançamento que processe dados pessoais.

## Direitos cobertos (LGPD art. 18)

| Direito                  | Endpoint sugerido                | SLA legal   |
|--------------------------|----------------------------------|-------------|
| Confirmação              | `GET  /privacy/me/exists`        | 15 dias     |
| Acesso                   | `GET  /privacy/me/data`          | 15 dias     |
| Retificação              | `PATCH /privacy/me/data`         | 15 dias     |
| Anonimização/Exclusão    | `DELETE /privacy/me/data`        | 15 dias     |
| Portabilidade            | `GET  /privacy/me/export`        | 15 dias     |
| Informação compartilham. | `GET  /privacy/me/recipients`    | 15 dias     |
| Revogação consentimento  | `POST /privacy/me/consent/revoke`| imediato    |
| Oposição                 | `POST /privacy/me/objection`     | 15 dias     |

## Fluxo padrão

1. **Autenticação reforçada** do titular (2FA + token de uso único).
2. **Geração de ticket** com prazo legal e aviso ao DPO.
3. **Validação de identidade** (anti-fraude).
4. **Execução** (automatizada quando possível) com **soft-delete + período de graça** de 30 dias para reversão antes de hard-delete.
5. **Notificação** ao titular do cumprimento.
6. **Audit log** imutável (campo `actor`, `action`, `target`, `ts`, `hash_prev`).

## Pontos críticos

- Backups: documentar política de purga (não basta deletar de prod; replicar nos DRs).
- Sub-processadores: cascatear pedidos via DPA.
- Logs operacionais: anonimizar antes de retenção > 90 dias.
- Casos especiais: criança/adolescente (ECA), dados sensíveis (LGPD art. 11).

## Schema sugerido

```ts
model DataSubjectRequest {
  id           String   @id @default(cuid())
  userId       String
  type         RequestType
  status       RequestStatus
  createdAt    DateTime @default(now())
  dueAt        DateTime
  resolvedAt   DateTime?
  resolution   String?
  auditLog     AuditLog[]
}
```
