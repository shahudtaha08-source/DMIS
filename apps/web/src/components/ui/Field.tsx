import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "../../lib/cn";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
}

const CONTROL =
  "block w-full rounded-lg border bg-white px-3 py-2 text-base text-slate-900 shadow-sm placeholder:text-slate-400 disabled:bg-slate-100 sm:text-sm min-h-11 sm:min-h-10";

function Shell({ id, label, error, hint, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-800">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} role="alert" className="mt-1 flex items-start gap-1 text-sm text-red-700">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-msg`} className="mt-1 text-sm text-slate-600">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function aria(id: string, error?: string, hint?: string) {
  return { "aria-invalid": error ? true : undefined, "aria-describedby": error || hint ? `${id}-msg` : undefined } as const;
}
const border = (error?: string) => (error ? "border-red-500" : "border-slate-300");

export const TextField = forwardRef<HTMLInputElement, FieldProps & InputHTMLAttributes<HTMLInputElement>>(function TextField(
  { label, error, hint, id, className, ...rest },
  ref
) {
  const uid = useId();
  const fid = id ?? uid;
  return (
    <Shell id={fid} label={label} error={error} hint={hint}>
      <input ref={ref} id={fid} className={cn(CONTROL, border(error), className)} {...aria(fid, error, hint)} {...rest} />
    </Shell>
  );
});

export const SelectField = forwardRef<HTMLSelectElement, FieldProps & SelectHTMLAttributes<HTMLSelectElement>>(function SelectField(
  { label, error, hint, id, className, children, ...rest },
  ref
) {
  const uid = useId();
  const fid = id ?? uid;
  return (
    <Shell id={fid} label={label} error={error} hint={hint}>
      <select ref={ref} id={fid} className={cn(CONTROL, border(error), className)} {...aria(fid, error, hint)} {...rest}>
        {children}
      </select>
    </Shell>
  );
});

export const TextareaField = forwardRef<HTMLTextAreaElement, FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextareaField(
  { label, error, hint, id, className, ...rest },
  ref
) {
  const uid = useId();
  const fid = id ?? uid;
  return (
    <Shell id={fid} label={label} error={error} hint={hint}>
      <textarea ref={ref} id={fid} rows={4} className={cn(CONTROL, border(error), className)} {...aria(fid, error, hint)} {...rest} />
    </Shell>
  );
});
