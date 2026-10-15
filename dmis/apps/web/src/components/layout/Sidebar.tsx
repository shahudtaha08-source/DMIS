import { NavLink } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { GROUPS, MODULES } from "../../config/modules";
import { cn } from "../../lib/cn";

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, hasRole } = useAuth();
  const groups = GROUPS.map((g) => ({
    ...g,
    items: MODULES.filter((m) => m.group === g.id && (!m.roles || hasRole(...m.roles))),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/60 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        aria-label="Primary"
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-72 max-w-[85vw] flex-col bg-eoc-900 text-slate-300 lg:static lg:w-64 lg:max-w-none lg:shrink-0",
          open ? "translate-x-0" : "invisible -translate-x-full lg:visible lg:translate-x-0"
        )}
      >
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-white/10 px-5 pt-[env(safe-area-inset-top)]">
          <span className="rounded-lg bg-red-600 p-1.5 text-white">
            <ShieldAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="leading-tight">
            <p className="text-base font-bold tracking-wide text-white">DMIS</p>
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Emergency Operations</p>
          </div>
        </div>

        <nav aria-label="Modules" className="flex-1 overflow-y-auto px-3 py-4">
          {groups.map((g) => (
            <div key={g.id} className="mb-5">
              <p className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{g.label}</p>
              <ul className="space-y-0.5">
                {g.items.map((m) => (
                  <li key={m.id}>
                    <NavLink
                      to={m.path}
                      end={m.path === "/"}
                      onClick={onClose}
                      className={({ isActive }) =>
                        cn(
                          "flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
                          isActive ? "bg-white/10 text-white" : "hover:bg-white/5 hover:text-white"
                        )
                      }
                    >
                      <m.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate">{m.label}</span>
                      {m.status === "planned" && <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-400">Soon</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="shrink-0 border-t border-white/10 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <p className="truncate text-sm font-medium text-white">{user?.name}</p>
          <p className="truncate text-xs text-slate-400">{user?.role}</p>
        </div>
      </aside>
    </>
  );
}
