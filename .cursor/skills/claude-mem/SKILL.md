---
name: claude-mem
description: >-
  Memória persistente entre sessões. Salva, carrega e organiza decisões, padrões,
  preferências e contexto do projeto em arquivos de memória estruturados. Use quando
  pedir /claude-mem, "lembre disso", "salvar contexto", "o que você lembra sobre X",
  "carregar memória", ou quando iniciar uma nova sessão e precisar de continuidade.
version: 1.0.0
---

# claude-mem — Memória Persistente Entre Sessões

## Papel

Sistema de memória persistente que garante continuidade entre sessões de desenvolvimento.
Salva contexto relevante, carrega memórias anteriores e organiza o conhecimento acumulado do projeto.

---

## Diretório de Memória

As memórias são salvas em `conductor/memory/` com a seguinte estrutura:

```
conductor/memory/
├── INDEX.md          # Índice de todos os tópicos de memória
├── decisions.md      # Decisões arquiteturais e técnicas
├── patterns.md       # Padrões e convenções confirmadas
├── preferences.md    # Preferências do usuário e do projeto
├── context.md        # Contexto de trabalho atual
├── stack.md          # Stack tecnológica e dependências-chave
└── sessions/
    └── YYYY-MM-DD.md # Log resumido de cada sessão
```

---

## Comandos

### `/claude-mem save <tópico>`
Salva informação relevante na memória persistente.

**Protocolo:**
1. Identificar categoria: decisão / padrão / preferência / contexto / stack
2. Verificar se já existe entrada sobre o tópico (evitar duplicatas)
3. Atualizar ou criar entrada no arquivo correto
4. Atualizar INDEX.md se necessário

### `/claude-mem load`
Carrega toda a memória relevante para a sessão atual.

**Protocolo:**
1. Ler INDEX.md para mapear tópicos disponíveis
2. Ler decisions.md, patterns.md, preferences.md
3. Ler context.md para estado de trabalho atual
4. Apresentar resumo ao usuário: "Aqui está o que lembro desta sessão..."

### `/claude-mem load <tópico>`
Carrega memória específica sobre um tópico.

### `/claude-mem list`
Lista todos os tópicos de memória disponíveis.

### `/claude-mem forget <tópico>`
Remove ou atualiza entrada de memória desatualizada.

### `/claude-mem summary`
Gera resumo do estado atual do projeto a partir das memórias.

---

## Regras de Memória

### O que SALVAR
- Decisões arquiteturais com rationale
- Padrões de código confirmados em múltiplas interações
- Preferências do usuário para workflow, ferramentas, comunicação
- Soluções para problemas recorrentes
- Caminhos de arquivos importantes e estrutura do projeto
- Variáveis de ambiente e configurações críticas

### O que NÃO salvar
- Contexto específico de sessão (tarefa atual, estado temporário)
- Informações incompletas ou não verificadas
- Código completo (apenas padrões e decisões)
- Duplicatas de memórias existentes

---

## Protocolo de Início de Sessão

Ao começar uma nova sessão:

```markdown
## Memória Carregada

**Projeto:** [nome]
**Última sessão:** [data]
**Stack:** [resumo tech stack]
**Decisões ativas:** [lista resumida]
**Padrões vigentes:** [lista resumida]
**Contexto anterior:** [onde parou]

Pronto para continuar. O que vamos fazer hoje?
```

---

## Protocolo de Fim de Sessão

Ao encerrar uma sessão:

1. Identificar decisões tomadas durante a sessão
2. Identificar padrões descobertos ou confirmados
3. Atualizar context.md com estado atual do trabalho
4. Criar log em `sessions/YYYY-MM-DD.md`
5. Atualizar INDEX.md

**Template de log de sessão:**
```markdown
# Sessão YYYY-MM-DD

## Trabalho realizado
- ...

## Decisões tomadas
- ...

## Padrões descobertos
- ...

## Estado ao encerrar
- Arquivo em foco: ...
- Próximo passo: ...
- Bloqueios: ...
```

---

## Formato de Entradas de Memória

### decisions.md
```markdown
## [Título da Decisão] — YYYY-MM-DD
**Contexto:** Por que essa decisão foi necessária
**Decisão:** O que foi decidido
**Rationale:** Por que essa opção
**Consequências:** O que muda no projeto
```

### patterns.md
```markdown
## [Nome do Padrão]
**Descrição:** O que é o padrão
**Onde usar:** Contextos de aplicação
**Exemplo:** trecho de código ou referência
**Confirmado em:** [arquivo ou contexto]
```

### preferences.md
```markdown
## Workflow
- [preferência]

## Ferramentas
- [preferência]

## Comunicação
- [preferência]

## Código
- [preferência]
```

---

## Integração com Outros Agentes

- Ao iniciar qualquer `/skill`, carregar memória relevante primeiro
- Ao concluir qualquer `/skill`, salvar decisões e padrões novos
- O `/context-manager` usa a memória como fonte de verdade
- O `/claude-context` consulta patterns.md e stack.md para busca semântica
