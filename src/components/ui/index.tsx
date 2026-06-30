import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
  ReactNode,
} from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-sm font-condensed font-bold uppercase tracking-[0.18em] transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "border border-verde-limao bg-verde-limao text-[#0b0b0a] shadow-[0_0_22px_rgba(200,255,80,0.26)] hover:bg-[#b6f23c] focus-visible:outline-verde-limao",
  secondary:
    "border border-verde-limao/55 bg-[#0b0b0a]/60 text-verde-limao hover:bg-verde-limao hover:text-[#0b0b0a] focus-visible:outline-verde-limao",
  ghost: "text-creme hover:bg-surface focus-visible:outline-creme",
  danger: "bg-danger text-[#0b0b0a] hover:opacity-90 focus-visible:outline-danger",
};

const buttonSizes = {
  sm: "h-10 px-3 text-xs",
  md: "h-11 px-5 text-sm",
  lg: "min-h-13 px-7 py-3 text-base",
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: keyof typeof buttonSizes;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: keyof typeof buttonSizes;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}
    >
      {children}
    </Link>
  );
}

export function Card({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("root-card p-6 backdrop-blur-sm", className)}>{children}</div>;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errId = error ? `${htmlFor}-error` : undefined;
  // Layout em coluna com a dica/erro DEPOIS do controle: garante que os campos
  // de uma mesma linha (grid) tenham os inputs alinhados na vertical, mesmo
  // quando um tem dica (ex.: "Data de nascimento") e o vizinho não (ex.: "Gênero").
  return (
    <div className={cn("flex flex-col", className)}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-creme"
      >
        {label}
        {required && <span className="ml-1 text-verde-limao">*</span>}
      </label>
      {children}
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} className="mt-1.5 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

const controlBase =
  "w-full rounded-sm border border-verde-limao/20 bg-[#0b0b0a]/70 px-3 py-2.5 text-creme placeholder:text-muted/60 focus:border-verde-limao focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-verde-limao/40";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlBase, props.className)} {...props} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(controlBase, "min-h-24 resize-y", props.className)} {...props} />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(controlBase, props.className)} {...props} />;
}

export function Checkbox({
  id,
  label,
  hint,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  hint?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3">
        <input
          id={id}
          type="checkbox"
          className="mt-0.5 h-5 w-5 shrink-0 rounded-sm border-border bg-surface-2 accent-verde-limao"
          aria-describedby={
            [hint ? `${id}-hint` : null, error ? `${id}-error` : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          aria-invalid={error ? true : undefined}
          {...props}
        />
        <span className="text-sm text-creme/90">{label}</span>
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 pl-8 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1 pl-8 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

type CalloutTone = "info" | "success" | "warning" | "danger";
const calloutTones: Record<CalloutTone, string> = {
  info: "border-border bg-surface text-creme",
  success: "border-verde-limao/40 bg-verde-limao/10 text-creme",
  warning: "border-amarelo-sol/40 bg-amarelo-sol/10 text-creme",
  danger: "border-danger/40 bg-danger/10 text-creme",
};

export function Callout({
  tone = "info",
  title,
  children,
}: {
  tone?: CalloutTone;
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("rounded-sm border p-4 text-sm", calloutTones[tone])}>
      {title && <p className="mb-1 font-semibold">{title}</p>}
      {children}
    </div>
  );
}

export function Badge({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border border-verde-limao/25 bg-[#0b0b0a]/50 px-2.5 py-0.5 font-condensed text-xs font-bold uppercase tracking-[0.16em] text-creme",
        className,
      )}
    >
      {children}
    </span>
  );
}
