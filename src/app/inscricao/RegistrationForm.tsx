"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useFormStatus } from "react-dom";
import {
  Button,
  Field,
  Input,
  Select,
  Textarea,
  Checkbox,
  Callout,
} from "@/components/ui";
import { TRIAGE_FLAGS, TRIAGE_FLAG_LABELS } from "@/lib/validation";
import { splitInstallments } from "@/lib/carne";
import { formatBRL, ageOn, MIN_AGE, MAX_AGE } from "@/lib/format";
import { createRegistrationAction } from "@/app/inscricao/actions";
import type { RegistrationFormState } from "@/app/inscricao/actions";

/* ─── Types ─── */
interface Props {
  priceCents: number;
  loteName: string;
  /** Quando true, a opção de cartão abre o checkout online (Stripe). Enquanto
   *  false (padrão atual), o cartão vira registro para pagamento presencial. */
  cardOnlineEnabled?: boolean;
}

/* ─── Steps ─── */
const STEPS = [
  "Campista",
  "Responsável & Consentimento",
  "Saúde & Triagem",
  "Pagamento",
] as const;

type Step = 0 | 1 | 2 | 3;

/* ─── Máscaras + validação client-side (espelha o schema Zod do servidor) ─── */
const digits = (v: string) => v.replace(/\D/g, "");
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function maskPhone(v: string) {
  const d = digits(v).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

function maskCpf(v: string) {
  return digits(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

/** Aplica máscara no input não-controlado, preservando o cursor no fim. */
function applyMask(fn: (v: string) => string) {
  return (e: ChangeEvent<HTMLInputElement>) => {
    e.target.value = fn(e.target.value);
  };
}

/** Valida os campos obrigatórios/formatados da etapa. Retorna mapa de erros. */
function validateStep(form: HTMLFormElement, step: Step): Record<string, string> {
  const el = (name: string) =>
    form.elements.namedItem(name) as
      | HTMLInputElement
      | HTMLSelectElement
      | null;
  const val = (name: string) => (el(name)?.value ?? "").trim();
  const checked = (name: string) =>
    (form.elements.namedItem(name) as HTMLInputElement | null)?.checked ?? false;
  const e: Record<string, string> = {};

  if (step === 0) {
    if (val("fullName").length < 3) e.fullName = "Informe o nome completo";
    if (!val("birthDate")) {
      e.birthDate = "Informe a data de nascimento";
    } else {
      // Trava a idade já na 1ª etapa (espelha o superRefine do servidor), para
      // não deixar o campista preencher tudo e só ser barrado no final.
      const d = new Date(val("birthDate"));
      if (Number.isNaN(d.getTime())) {
        e.birthDate = "Data inválida";
      } else {
        const age = ageOn(d);
        if (age < MIN_AGE || age > MAX_AGE)
          e.birthDate = `A inscrição é para adolescentes de ${MIN_AGE} a ${MAX_AGE} anos (idade calculada: ${age}).`;
      }
    }
    if (!val("gender")) e.gender = "Selecione o gênero";
    const ph = digits(val("phone"));
    if (ph.length < 10 || ph.length > 11)
      e.phone = "Telefone inválido — informe DDD + número";
    const cpf = digits(val("cpf"));
    if (cpf && cpf.length !== 11) e.cpf = "CPF deve ter 11 dígitos";
    const em = val("email");
    if (em && !isEmail(em)) e.email = "E-mail inválido";
    if (val("church").trim().length < 2) e.church = "Informe a igreja";
  } else if (step === 1) {
    if (val("guardianName").length < 3)
      e.guardianName = "Informe o nome do responsável";
    if (digits(val("guardianCpf")).length !== 11)
      e.guardianCpf = "CPF deve ter 11 dígitos";
    if (!val("guardianRelationship"))
      e.guardianRelationship = "Selecione o grau de parentesco";
    const gph = digits(val("guardianPhone"));
    if (gph.length < 10 || gph.length > 11)
      e.guardianPhone = "Telefone inválido — informe DDD + número";
    const gem = val("guardianEmail");
    if (gem && !isEmail(gem)) e.guardianEmail = "E-mail inválido";
    if (!checked("consentData"))
      e.consentData = "É necessário consentir o tratamento de dados";
    if (!checked("consentHealth"))
      e.consentHealth = "É necessário consentir os dados de saúde";
    if (!checked("consentActivities"))
      e.consentActivities = "É necessário autorizar a participação";
  }
  // Etapa 2 (saúde) é opcional; etapa 3 (pagamento) tem opção marcada por padrão.
  return e;
}

/* ─── Mapa campo → etapa, para reabrir a etapa certa quando o servidor
   devolve um erro de campo (ex.: CPF duplicado). ─── */
const FIELD_STEP: Record<string, Step> = {
  fullName: 0, birthDate: 0, gender: 0, cpf: 0, phone: 0, email: 0,
  shirtSize: 0, church: 0, city: 0,
  guardianName: 1, guardianCpf: 1, guardianPhone: 1, guardianEmail: 1,
  guardianRelationship: 1, consentData: 1, consentHealth: 1,
  consentActivities: 1, consentImage: 1,
  allergies: 2, medications: 2, dietaryRestrictions: 2, chronicConditions: 2,
  healthNotes: 2, triageFlags: 2, triageNotes: 2,
  paymentMethod: 3,
};

function firstStepWithError(errors: Record<string, string>): Step | null {
  let target: Step | null = null;
  for (const key of Object.keys(errors)) {
    const s = FIELD_STEP[key];
    if (s === undefined) continue;
    if (target === null || s < target) target = s;
  }
  return target;
}

/* ─── Submit button (needs useFormStatus inside the form) ─── */
function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} aria-disabled={pending}>
      {pending ? "Enviando…" : label}
    </Button>
  );
}

/* ─── Step indicator ─── */
function StepIndicator({ current }: { current: Step }) {
  return (
    <nav aria-label="Etapas do formulário" className="mb-8">
      <ol className="flex items-start justify-between gap-2">
        {STEPS.map((label, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <li
              key={label}
              className="flex flex-1 flex-col items-center gap-1"
              aria-current={active ? "step" : undefined}
            >
              <div
                className={[
                  "flex h-12 w-12 items-center justify-center rounded-full border font-display text-xl transition-colors",
                  active
                    ? "border-verde-limao bg-verde-limao text-[#0b0b0a]"
                    : done
                      ? "border-verde-limao/35 bg-verde-limao/25 text-verde-limao"
                      : "border-verde-limao/10 bg-[#242015]/80 text-creme/70",
                ].join(" ")}
                aria-hidden="true"
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={[
                  "hidden max-w-36 text-center text-[10px] font-condensed font-bold uppercase tracking-[0.16em] sm:block",
                  active ? "text-verde-limao" : "text-muted",
                ].join(" ")}
              >
                {label}
              </span>
            </li>
          );
        })}
      </ol>
      <div
        className="mt-4 h-1 overflow-hidden rounded-full bg-[#282315]"
        aria-hidden="true"
      >
        <div
          className="h-full rounded-full bg-verde-limao"
          style={{ width: "100%" }}
        />
      </div>
    </nav>
  );
}

/* ─── Main form ─── */
export function RegistrationForm({
  priceCents,
  loteName,
  cardOnlineEnabled = false,
}: Props) {
  const [state, formAction] = useActionState<RegistrationFormState, FormData>(
    createRegistrationAction,
    { ok: false },
  );

  const [step, setStep] = useState<Step>(0);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  // Forma de pagamento selecionada + parcelas do carnê (só aparece no Pix).
  const [payMethod, setPayMethod] = useState<"CARD" | "PIX">(
    cardOnlineEnabled ? "CARD" : "PIX",
  );
  const [installments, setInstallments] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
  const firstRender = useRef(true);
  // Snapshot do que foi enviado: o React reseta o <form action> após a action,
  // então repomos os valores se o servidor devolver erro (não perde o que foi
  // digitado — apenas mostra o erro).
  const lastSubmitted = useRef<FormData | null>(null);

  // Envolve a action: guarda o snapshot e delega para a action do servidor.
  function handleAction(formData: FormData) {
    lastSubmitted.current = formData;
    return formAction(formData);
  }

  // Quando o servidor devolve erros de campo, reabre a etapa do primeiro erro.
  // Ajuste de estado durante o render (padrão recomendado do React em vez de um
  // efeito com setState), com guarda por ref para rodar só uma vez por resposta.
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (!state.ok && state.errors) {
      const target = firstStepWithError(state.errors);
      if (target !== null) setStep(target);
    }
  }

  // Após a action retornar com erro, repõe no DOM os valores que o React pode
  // ter limpado ao resetar o <form action> — não perde o que foi digitado.
  useEffect(() => {
    if (state.ok || !lastSubmitted.current) return;
    const form = formRef.current;
    if (!form) return;
    for (const [name, value] of lastSubmitted.current.entries()) {
      if (typeof value !== "string") continue;
      const field = form.elements.namedItem(name);
      if (!field) continue;
      const nodes =
        field instanceof RadioNodeList ? Array.from(field) : [field];
      for (const node of nodes) {
        if (
          node instanceof HTMLInputElement &&
          (node.type === "checkbox" || node.type === "radio")
        ) {
          if (node.value === value) node.checked = true;
        } else if (
          (node instanceof HTMLInputElement ||
            node instanceof HTMLSelectElement ||
            node instanceof HTMLTextAreaElement) &&
          !node.value
        ) {
          node.value = value;
        }
      }
    }
  }, [state]);

  // Erros do servidor (após submit) + erros validados no cliente por etapa.
  const err = { ...(state.errors ?? {}), ...clientErrors };

  function goNext() {
    const form = formRef.current;
    if (form) {
      const stepErrors = validateStep(form, step);
      if (Object.keys(stepErrors).length > 0) {
        setClientErrors(stepErrors);
        // Foca o primeiro campo com erro para correção imediata (a11y).
        const first = Object.keys(stepErrors)[0];
        requestAnimationFrame(() =>
          form.querySelector<HTMLElement>(`[name="${first}"]`)?.focus(),
        );
        return;
      }
    }
    setClientErrors({});
    setStep((s) => Math.min(s + 1, 3) as Step);
  }
  function goBack() {
    setClientErrors({});
    setStep((s) => Math.max(s - 1, 0) as Step);
  }

  // Move o foco para a legenda da etapa visível ao trocar de passo (a11y:
  // evita o usuário ficar preso num botão agora oculto).
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const legend = formRef.current?.querySelector<HTMLElement>(
      "fieldset:not([hidden]) > legend",
    );
    legend?.focus({ preventScroll: true });
  }, [step]);

  /* Only show global error banner when there are errors so aria-live fires */
  const hasErrors = Object.keys(err).length > 0;
  const serverHasFieldErrors =
    !!state.errors && Object.keys(state.errors).length > 0;
  const globalMessage =
    !state.ok && state.message && !serverHasFieldErrors ? state.message : null;

  return (
    <div>
      <StepIndicator current={step} />

      {/* Anúncio de troca de etapa para leitores de tela */}
      <p className="sr-only" aria-live="polite">
        Etapa {step + 1} de {STEPS.length}: {STEPS[step]}
      </p>

      {/* Error summary */}
      <div aria-live="polite" aria-atomic="true" className="mb-4">
        {hasErrors && (
          <Callout tone="danger" title="Revise os campos destacados">
            {state.message ?? "Preencha os campos obrigatórios corretamente."}
          </Callout>
        )}
        {globalMessage && <Callout tone="danger">{globalMessage}</Callout>}
      </div>

      <form ref={formRef} action={handleAction} noValidate>
        {/* ═══════════════════════════════════
            STEP 0 — Campista
        ═══════════════════════════════════ */}
        <fieldset
          hidden={step !== 0}
          className="space-y-5"
        >
          <legend
            tabIndex={-1}
            className="mb-6 font-display text-4xl text-verde-limao outline-none sm:text-5xl"
          >
            Dados do Campista
          </legend>

          <Field
            label="Nome completo"
            htmlFor="fullName"
            required
            error={err.fullName}
          >
            <Input
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              required
              aria-required="true"
              aria-describedby={err.fullName ? "fullName-error" : undefined}
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Data de nascimento"
              htmlFor="birthDate"
              required
              hint="DD/MM/AAAA — campistas de 12 a 19 anos"
              error={err.birthDate}
            >
              <Input
                id="birthDate"
                name="birthDate"
                type="date"
                required
                aria-required="true"
                aria-describedby={
                  [err.birthDate ? "birthDate-error" : "", "birthDate-hint"]
                    .filter(Boolean)
                    .join(" ") || undefined
                }
              />
            </Field>

            <Field label="Gênero" htmlFor="gender" required error={err.gender}>
              <Select
                id="gender"
                name="gender"
                required
                aria-required="true"
                defaultValue=""
              >
                <option value="" disabled>
                  Selecione…
                </option>
                <option value="MALE">Masculino</option>
                <option value="FEMALE">Feminino</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="CPF"
              htmlFor="cpf"
              hint="Opcional"
              error={err.cpf}
            >
              <Input
                id="cpf"
                name="cpf"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                maxLength={14}
                placeholder="000.000.000-00"
                onChange={applyMask(maskCpf)}
              />
            </Field>

            <Field
              label="Telefone / WhatsApp"
              htmlFor="phone"
              required
              error={err.phone}
            >
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                aria-required="true"
                placeholder="(00) 00000-0000"
                aria-describedby={err.phone ? "phone-error" : undefined}
                onChange={applyMask(maskPhone)}
              />
            </Field>
          </div>

          <Field
            label="E-mail"
            htmlFor="email"
            hint="Opcional — para receber o comprovante"
            error={err.email}
          >
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <Field
              label="Tamanho de camiseta"
              htmlFor="shirtSize"
              required
              error={err.shirtSize}
            >
              <Select
                id="shirtSize"
                name="shirtSize"
                defaultValue=""
                required
                aria-required="true"
              >
                <option value="" disabled>
                  Selecione…
                </option>
                {(["PP", "P", "M", "G", "GG", "XG"] as const).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label="Igreja"
              htmlFor="church"
              error={err.church}
              required
              className="sm:col-span-2"
            >
              <Input
                id="church"
                name="church"
                type="text"
                maxLength={120}
                required
                aria-required="true"
              />
            </Field>
          </div>

          <Field label="Cidade" htmlFor="city" error={err.city}>
            <Input id="city" name="city" type="text" maxLength={80} />
          </Field>
        </fieldset>

        {/* ═══════════════════════════════════
            STEP 1 — Responsável & Consentimento
        ═══════════════════════════════════ */}
        <fieldset
          hidden={step !== 1}
          className="space-y-5"
        >
          <legend
            tabIndex={-1}
            className="mb-6 font-display text-4xl text-verde-limao outline-none sm:text-5xl"
          >
            Responsável Legal
          </legend>

          <Field
            label="Nome do responsável"
            htmlFor="guardianName"
            required
            error={err.guardianName}
          >
            <Input
              id="guardianName"
              name="guardianName"
              type="text"
              autoComplete="name"
              required
              aria-required="true"
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="CPF do responsável"
              htmlFor="guardianCpf"
              required
              error={err.guardianCpf}
            >
              <Input
                id="guardianCpf"
                name="guardianCpf"
                type="text"
                inputMode="numeric"
                maxLength={14}
                placeholder="000.000.000-00"
                required
                aria-required="true"
                onChange={applyMask(maskCpf)}
              />
            </Field>

            <Field
              label="Grau de parentesco"
              htmlFor="guardianRelationship"
              required
              error={err.guardianRelationship}
            >
              <Select
                id="guardianRelationship"
                name="guardianRelationship"
                required
                aria-required="true"
                defaultValue=""
              >
                <option value="" disabled>
                  Selecione…
                </option>
                <option value="pai">Pai</option>
                <option value="mae">Mãe</option>
                <option value="responsavel_legal">Responsável legal</option>
                <option value="outro">Outro</option>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Telefone do responsável"
              htmlFor="guardianPhone"
              required
              error={err.guardianPhone}
            >
              <Input
                id="guardianPhone"
                name="guardianPhone"
                type="tel"
                inputMode="tel"
                placeholder="(00) 00000-0000"
                required
                aria-required="true"
                onChange={applyMask(maskPhone)}
              />
            </Field>

            <Field
              label="E-mail do responsável"
              htmlFor="guardianEmail"
              hint="Opcional"
              error={err.guardianEmail}
            >
              <Input
                id="guardianEmail"
                name="guardianEmail"
                type="email"
                inputMode="email"
              />
            </Field>
          </div>

          {/* Autorização parental */}
          <div className="mt-6 space-y-4">
            <p className="font-display text-xl text-amarelo-sol">
              Autorização e Consentimento
            </p>

            <div className="rounded-xl border border-border bg-surface-2 p-4 text-sm text-muted/90 leading-relaxed">
              <p className="mb-2 font-semibold text-creme">
                Termo de Autorização Parental
              </p>
              <p>
                Ao assinar esta autorização, o responsável declara estar ciente de que o
                Acampamento RAIZ 2026 é um evento cristão com momentos de impacto
                emocional e espiritual intensos, cuja participação é voluntária. As
                atividades incluem piscina, esportes e dinâmicas de grupo. Em situações
                de risco à vida do adolescente ou de terceiros, a equipe poderá acionar
                socorro e não manterá sigilo absoluto. O acampamento pode realizar
                atendimento médico de emergência quando necessário.
              </p>
            </div>

            <fieldset className="space-y-3">
              <legend className="mb-3 text-sm font-semibold text-creme">
                Consentimentos LGPD (obrigatórios marcados com{" "}
                <span className="text-verde-limao">*</span>)
              </legend>

              <Checkbox
                id="consentData"
                name="consentData"
                value="on"
                label={
                  <span>
                    <span className="mr-1 text-verde-limao font-bold">*</span>
                    Consinto o tratamento dos dados pessoais do adolescente para fins
                    exclusivos de organização do acampamento, conforme a LGPD.
                  </span>
                }
                error={err.consentData}
              />

              <Checkbox
                id="consentHealth"
                name="consentHealth"
                value="on"
                label={
                  <span>
                    <span className="mr-1 text-verde-limao font-bold">*</span>
                    Consinto o tratamento dos dados sensíveis de saúde para fins de
                    segurança e cuidado durante o evento.
                  </span>
                }
                error={err.consentHealth}
              />

              <Checkbox
                id="consentActivities"
                name="consentActivities"
                value="on"
                label={
                  <span>
                    <span className="mr-1 text-verde-limao font-bold">*</span>
                    Autorizo a participação do adolescente em todas as atividades do
                    acampamento, incluindo piscina, esportes e atendimento médico de
                    emergência.
                  </span>
                }
                error={err.consentActivities}
              />

              <Checkbox
                id="consentImage"
                name="consentImage"
                value="on"
                label="Autorizo o uso de imagem e vídeo do adolescente para fins institucionais do acampamento (redes sociais, registros internos). — Opcional"
                hint="Você pode revogar esta autorização a qualquer momento entrando em contato com a organização."
              />
            </fieldset>
          </div>
        </fieldset>

        {/* ═══════════════════════════════════
            STEP 2 — Saúde & Triagem
        ═══════════════════════════════════ */}
        <fieldset
          hidden={step !== 2}
          className="space-y-5"
        >
          <legend
            tabIndex={-1}
            className="mb-6 font-display text-4xl text-verde-limao outline-none sm:text-5xl"
          >
            Saúde & Triagem
          </legend>

          <Callout tone="info" title="Informações confidenciais">
            Os dados de saúde são protegidos e acessados somente pela equipe médica e
            liderança responsável pelo adolescente durante o acampamento.
          </Callout>

          <Field label="Alergias" htmlFor="allergies" error={err.allergies}>
            <Textarea
              id="allergies"
              name="allergies"
              placeholder="Ex.: amendoim, penicilina, picadas de abelha…"
              maxLength={500}
            />
          </Field>

          <Field
            label="Medicamentos em uso"
            htmlFor="medications"
            error={err.medications}
          >
            <Textarea
              id="medications"
              name="medications"
              placeholder="Nome do medicamento, dosagem e horários…"
              maxLength={500}
            />
          </Field>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Field
              label="Restrições alimentares"
              htmlFor="dietaryRestrictions"
              error={err.dietaryRestrictions}
            >
              <Textarea
                id="dietaryRestrictions"
                name="dietaryRestrictions"
                placeholder="Vegetariano, sem glúten…"
                maxLength={500}
              />
            </Field>

            <Field
              label="Condições crônicas"
              htmlFor="chronicConditions"
              error={err.chronicConditions}
            >
              <Textarea
                id="chronicConditions"
                name="chronicConditions"
                placeholder="Diabetes, asma, epilepsia…"
                maxLength={500}
              />
            </Field>
          </div>

          <Field
            label="Observações de saúde"
            htmlFor="healthNotes"
            error={err.healthNotes}
          >
            <Textarea
              id="healthNotes"
              name="healthNotes"
              placeholder="Qualquer informação adicional relevante para a equipe…"
              maxLength={500}
            />
          </Field>

          {/* Triagem confidencial */}
          <fieldset className="space-y-3 rounded-xl border border-amarelo-sol/20 bg-amarelo-sol/5 p-4">
            <legend className="mb-1 px-1 text-sm font-semibold text-amarelo-sol">
              Triagem confidencial — Líder-âncora
            </legend>

            <p className="text-xs text-muted/90 leading-relaxed">
              Estas informações são estritamente confidenciais. Quando marcadas, um
              <strong className="text-creme"> líder-âncora</strong> é designado
              especificamente para acompanhar o adolescente com cuidado e discrição.
              Nenhum dado é compartilhado além da equipe de cuidado.
            </p>

            {TRIAGE_FLAGS.map((flag) => (
              <Checkbox
                key={flag}
                id={`triage_${flag}`}
                name="triageFlags"
                value={flag}
                label={TRIAGE_FLAG_LABELS[flag]}
              />
            ))}

            <Field
              label="Notas para o líder-âncora"
              htmlFor="triageNotes"
              error={err.triageNotes}
              hint="Opcional — detalhes que ajudem a equipe a cuidar melhor do adolescente"
            >
              <Textarea
                id="triageNotes"
                name="triageNotes"
                placeholder="Contexto confidencial para a equipe de cuidado…"
                maxLength={1000}
              />
            </Field>
          </fieldset>
        </fieldset>

        {/* ═══════════════════════════════════
            STEP 3 — Pagamento
        ═══════════════════════════════════ */}
        <fieldset
          hidden={step !== 3}
          className="space-y-5"
        >
          <legend
            tabIndex={-1}
            className="mb-6 font-display text-4xl text-verde-limao outline-none sm:text-5xl"
          >
            Pagamento
          </legend>

          <div className="rounded-sm border border-verde-limao/20 bg-[#0b0b0a]/55 p-6">
            <p className="text-xs font-condensed uppercase tracking-widest text-muted">
              {loteName}
            </p>
            <p className="font-display text-[clamp(3.5rem,9vw,5.8rem)] leading-none text-verde-limao">
              {formatBRL(priceCents)}
            </p>
          </div>

          <fieldset className="space-y-3">
            <legend className="mb-2 text-sm font-semibold text-creme">
              Forma de pagamento{" "}
              <span aria-hidden="true" className="text-verde-limao">
                *
              </span>
              <span className="sr-only">(obrigatório)</span>
            </legend>

            {/* PIX — opção online principal (fica em primeiro e já marcada
                enquanto o cartão online está em standby). */}
            <label
              htmlFor="pm_pix"
              className="flex cursor-pointer items-start gap-5 rounded-sm border border-verde-limao/90 bg-[#0b0b0a]/55 p-5 transition-colors has-[:checked]:border-verde-limao has-[:checked]:bg-verde-limao/10"
            >
              <input
                id="pm_pix"
                type="radio"
                name="paymentMethod"
                value="PIX"
                defaultChecked={!cardOnlineEnabled}
                onChange={() => setPayMethod("PIX")}
                className="mt-0.5 h-5 w-5 shrink-0 accent-verde-limao"
              />
              <div>
                <p className="font-semibold text-creme">Pix</p>
                <p className="mt-0.5 text-xs text-muted">
                  Após finalizar, você recebe a chave Pix e o QR code. Faça o
                  pagamento e envie o comprovante; a confirmação é feita em até 24 h
                  úteis.
                </p>
              </div>
            </label>

            {/* Carnê Pix — parcelamento em 2x ou 3x (só quando Pix selecionado) */}
            {payMethod === "PIX" && (
              <fieldset className="ml-2 space-y-2 border-l border-verde-limao/20 pl-4">
                <legend className="text-xs font-condensed uppercase tracking-widest text-muted">
                  Parcelar no carnê?
                </legend>
                {(
                  [
                    { n: 1, label: "À vista", desc: "Pagamento único" },
                    { n: 2, label: "2x no carnê", desc: "2 parcelas mensais" },
                    { n: 3, label: "3x no carnê", desc: "3 parcelas mensais" },
                  ] as const
                ).map(({ n, label, desc }) => {
                  const parts = splitInstallments(priceCents, n);
                  const per = parts[parts.length - 1];
                  const first = parts[0];
                  return (
                    <label
                      key={n}
                      htmlFor={`inst_${n}`}
                      className="flex cursor-pointer items-center gap-3 rounded-sm border border-verde-limao/20 bg-[#0b0b0a]/40 p-3 transition-colors has-[:checked]:border-verde-limao has-[:checked]:bg-verde-limao/10"
                    >
                      <input
                        id={`inst_${n}`}
                        type="radio"
                        name="installments"
                        value={n}
                        checked={installments === n}
                        onChange={() => setInstallments(n)}
                        className="h-4 w-4 shrink-0 accent-verde-limao"
                      />
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-creme">{label}</p>
                        <p className="text-xs text-muted">
                          {n === 1
                            ? desc
                            : first === per
                              ? `${desc} de ${formatBRL(per)}`
                              : `${desc}: 1ª de ${formatBRL(first)} + ${n - 1}x de ${formatBRL(per)}`}
                        </p>
                      </div>
                    </label>
                  );
                })}
                <p className="text-[11px] leading-snug text-muted">
                  No carnê, a 1ª parcela vence agora e garante sua vaga; as demais
                  vencem a cada 30 dias. Você paga e envia o comprovante de cada uma.
                </p>
              </fieldset>
            )}

            {/* CARD — online (Stripe) quando habilitado; senão, registro para
                pagamento presencial no crédito/débito. */}
            <label
              htmlFor="pm_card"
              className="flex cursor-pointer items-start gap-5 rounded-sm border border-verde-limao/20 bg-[#0b0b0a]/45 p-5 transition-colors has-[:checked]:border-verde-limao has-[:checked]:bg-verde-limao/10"
            >
              <input
                id="pm_card"
                type="radio"
                name="paymentMethod"
                value="CARD"
                defaultChecked={cardOnlineEnabled}
                onChange={() => {
                  setPayMethod("CARD");
                  setInstallments(1);
                }}
                className="mt-0.5 h-5 w-5 shrink-0 accent-verde-limao"
              />
              <div>
                {cardOnlineEnabled ? (
                  <>
                    <p className="font-semibold text-creme">Cartão de crédito</p>
                    <p className="mt-0.5 text-xs text-muted">
                      Você será redirecionado ao Stripe para inserir os dados do
                      cartão com segurança. Aprovação imediata.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-creme">
                      Crédito ou débito (presencial)
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Sua inscrição fica reservada e o pagamento no cartão é feito
                      presencialmente com a organização. O pagamento online no
                      cartão será habilitado em breve.
                    </p>
                  </>
                )}
              </div>
            </label>

            {err.paymentMethod && (
              <p role="alert" className="text-xs font-medium text-danger">
                {err.paymentMethod}
              </p>
            )}
          </fieldset>
        </fieldset>

        {/* ─── Navigation ─── */}
        <div className="mt-8 flex items-center justify-between gap-3">
          {step > 0 ? (
            <Button
              type="button"
              variant="secondary"
              onClick={goBack}
            >
              <span aria-hidden="true">←</span> Voltar
            </Button>
          ) : (
            <span />
          )}

          {step < 3 ? (
            <Button type="button" onClick={goNext}>
              Próximo <span aria-hidden="true">→</span>
            </Button>
          ) : (
            <SubmitButton label="Finalizar inscrição" />
          )}
        </div>

        {step === 3 && (
          <p className="mx-auto mt-9 max-w-lg text-center text-sm leading-relaxed text-muted">
            <span aria-hidden="true" className="mr-2 text-verde-limao">
              ▣
            </span>
            Seus dados estão protegidos com segurança de ponta a ponta.
            <br />
            Ambiente 100% seguro.
          </p>
        )}
      </form>
    </div>
  );
}
