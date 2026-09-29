import type { ComponentType } from "react";
import { CircleCheck, Circle, Info, OctagonAlert, TriangleAlert, type LucideProps } from "lucide-react";
import type { Severity } from "@dmis/shared";
import { cn } from "../../lib/cn";

/**
 * Emergency colour language (plan §41): Critical RED, Warning AMBER, Normal
 * BLUE, Safe/Resolved GREEN. Colour is never the only signal — every badge
 * also carries an icon and a text label.
 */
export type Tone = "critical" | "warning" | "info" | "safe" | "neutral";

const TONES: Record<Tone, { cls: string; Icon: ComponentType<LucideProps> }> = {
  critical: { cls: "bg-red-50 text-red-800 ring-red-600/30", Icon: OctagonAlert },
  warning: { cls: "bg-amber-50 text-amber-900 ring-amber-600/30", Icon: TriangleAlert },
  info: { cls: "bg-blue-50 text-blue-800 ring-blue-600/30", Icon: Info },
  safe: { cls: "bg-green-50 text-green-800 ring-green-600/30", Icon: CircleCheck },
  neutral: { cls: "bg-slate-100 text-slate-700 ring-slate-500/20", Icon: Circle },
};

export function toneClasses(tone: Tone) {
  return TONES[tone];
}

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: string; className?: string }) {
  const { cls, Icon } = TONES[tone];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", cls, className)}>
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}

const SEVERITY: Record<Severity, { tone: Tone; label: string }> = {
  CRITICAL: { tone: "critical", label: "Critical" },
  HIGH: { tone: "warning", label: "High" },
  MODERATE: { tone: "info", label: "Moderate" },
  LOW: { tone: "info", label: "Low" },
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  const { tone, label } = SEVERITY[severity];
  return <Badge tone={tone}>{label}</Badge>;
}
