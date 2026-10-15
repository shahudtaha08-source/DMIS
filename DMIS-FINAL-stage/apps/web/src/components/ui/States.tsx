import type { ComponentType, ReactNode } from "react";
import { Inbox, Loader2, OctagonAlert, type LucideProps } from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "./Button";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-blue-600", className)} aria-hidden="true" />;
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 py-16 text-slate-600">
      <Spinner className="h-7 w-7" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", message, onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center">
      <OctagonAlert className="h-8 w-8 text-red-600" aria-hidden="true" />
      <div>
        <h2 className="text-base font-semibold text-red-900">{title}</h2>
        {message && <p className="mt-1 max-w-md text-sm text-red-800">{message}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: {
  icon?: ComponentType<LucideProps>;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <span className="rounded-full bg-slate-100 p-3 text-slate-600">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <div>
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-1 max-w-md text-sm text-slate-600">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-slate-200", className)} />;
}

export function FullPageLoading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex h-full items-center justify-center bg-slate-50">
      <LoadingState label={label} />
    </div>
  );
}

export function FullPageError({ title, message, onRetry }: { title?: string; message?: string; onRetry?: () => void }) {
  return (
    <div className="flex h-full items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md">
        <ErrorState title={title} message={message} onRetry={onRetry} />
      </div>
    </div>
  );
}
