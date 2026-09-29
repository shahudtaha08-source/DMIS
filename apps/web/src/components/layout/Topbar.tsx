import { LogOut, Menu, TriangleAlert, Wifi, WifiOff, LoaderCircle } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { moduleForPath } from "../../config/modules";
import { useApiStatus } from "../../hooks/useApiStatus";
import { cn } from "../../lib/cn";

const STATUS = {
  checking: { label: "Checking…", cls: "bg-slate-100 text-slate-700", Icon: LoaderCircle },
  online: { label: "System online", cls: "bg-green-50 text-green-800", Icon: Wifi },
  degraded: { label: "Degraded", cls: "bg-amber-50 text-amber-900", Icon: TriangleAlert },
  offline: { label: "Offline", cls: "bg-red-50 text-red-800", Icon: WifiOff },
} as const;

export function ApiStatusPill() {
  const { status } = useApiStatus();
  const { label, cls, Icon } = STATUS[status.state];
  return (
    <span
      role="status"
      title={status.database ? `Database: ${status.database.replace("_", " ")}` : undefined}
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", cls)}
    >
      <Icon className={cn("h-3.5 w-3.5", status.state === "checking" && "animate-spin")} aria-hidden="true" />
      <span className="sr-only sm:not-sr-only">{label}</span>
    </span>
  );
}

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const title = moduleForPath(pathname)?.label ?? "DMIS";

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 pt-[env(safe-area-inset-top)] sm:gap-3 sm:px-6">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation menu"
        className="-ml-1 inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
      >
        <Menu className="h-6 w-6" aria-hidden="true" />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-slate-900">{title}</h1>
      <ApiStatusPill />
      <div className="hidden text-right leading-tight sm:block">
        <p className="max-w-[10rem] truncate text-sm font-medium text-slate-900">{user?.name}</p>
        <p className="text-xs text-slate-600">{user?.role}</p>
      </div>
      <button
        type="button"
        onClick={logout}
        aria-label="Sign out"
        className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 sm:h-10 sm:w-10"
      >
        <LogOut className="h-5 w-5" aria-hidden="true" />
      </button>
    </header>
  );
}
