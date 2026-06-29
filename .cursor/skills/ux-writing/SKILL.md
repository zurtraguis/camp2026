---
name: ux-writing
description: Write clear, accessible interface copy — labels, buttons, errors, empty states, onboarding and microcopy. Use when crafting or reviewing product text, content models, or accessible error/help messaging.
---

# UX Writing

Craft interface text that is clear, concise, and accessible — copy is part of the UX, not decoration.

## When to Use This Skill

- Writing button labels, form labels, helper and error text
- Designing empty, loading, error and success state copy
- Onboarding flows, tooltips and inline guidance
- Defining a content model / voice & tone for a product
- Reviewing copy for accessibility (WCAG 3.3.1/3.3.3) and clarity

## Core Principles

1. **Clarity over cleverness** — the user should never have to decode a message.
2. **Action-oriented** — buttons describe the action ("Save changes", not "OK").
3. **Specific errors** — say what went wrong AND how to fix it ("Email already in use. Try signing in.").
4. **Consistent voice** — define tone once (e.g. helpful, plain) and apply everywhere.
5. **Front-load meaning** — put the important word first; users scan.
6. **Accessible** — pair color/icon with text; error text via `role="alert"` + `aria-live`.

## Checklist

- [ ] Labels are nouns; buttons are verbs
- [ ] Errors: cause + recovery, no blame, no jargon/codes
- [ ] Empty states explain value + next action
- [ ] No "click here"; link text is descriptive (SC 2.4.4)
- [ ] Sentence case, consistent terminology, numerals for data
- [ ] Localizable: avoid idioms and concatenated fragments

## Anti-patterns

- Generic "Something went wrong" with no recovery path
- Placeholder text used as the only label (fails SC 1.3.5/3.3.2)
- Microcopy that contradicts the actual system behavior
