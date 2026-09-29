import type { ComponentType, HTMLAttributes, ReactNode } from "react";
import type { LucideProps } from "lucide-react";
import { cn } from "../../lib/cn";
import { toneClasses, type Tone } from "./Badge";

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-slate-200 bg-white shadow-sm", className)} {...rest} />;
}

export function CardHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 sm:p-5", className)} {...rest} />;
}

/** Headline metric tile — used by the Dashboard (Chunk 6). */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
}: {
  label: string;
  value: ReactNode;
  icon: ComponentType<LucideProps>;
  tone?: Tone;
  hint?: string;
}) {
  const accent: Record<Tone, string> = {
    critical: "bg-red-100 text-red-700",
    warning: "bg-amber-100 text-amber-800",
    info: "bg-blue-100 text-blue-700",
    safe: "bg-green-100 text-green-700",
    neutral: "bg-slate-100 text-slate-700",
  };
  const { Icon: ToneIcon } = toneClasses(tone);
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900">{value}</p>
          {hint && (
            <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
              <ToneIcon className="h-3 w-3" aria-hidden="true" />
              {hint}
            </p>
          )}
        </div>
        <span className={cn("rounded-lg p-2.5", accent[tone])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
    </Card>
  );
}
