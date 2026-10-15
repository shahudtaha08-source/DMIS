import { useState, type FormEvent } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, ShieldAlert, CircleAlert } from "lucide-react";
import { z } from "zod";
import { useAuth } from "../auth/AuthContext";
import { ApiClientError } from "../lib/api";
import { Button, TextField } from "../components/ui";

const schema = z.object({
  email: z.string().trim().min(1, "Enter your email address").email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

export function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (auth.status === "authenticated") return <Navigate to={from} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors;
      setFieldErrors({ email: f.email?.[0], password: f.password?.[0] });
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      await auth.login(parsed.data.email, parsed.data.password);
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.userMessage : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="grid h-full overflow-y-auto lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-eoc-900 p-12 text-slate-300 lg:flex">
        <div className="flex items-center gap-3">
          <span className="rounded-lg bg-red-600 p-2 text-white">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="text-xl font-bold tracking-wide text-white">DMIS</span>
        </div>
        <div>
          <h2 className="text-3xl font-bold leading-tight text-white">Disaster Management Information System</h2>
          <p className="mt-4 max-w-md text-slate-400">Incidents, alerts, shelters, resources and rescue teams — coordinated from one operations picture, backed by 125 years of India disaster history.</p>
        </div>
        <p className="text-xs text-slate-500">Authorised personnel only.</p>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="rounded-lg bg-red-600 p-1.5 text-white">
              <ShieldAlert className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-bold text-slate-900">DMIS</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Sign in</h1>
          <p className="mt-1 text-sm text-slate-600">Use the account issued to you by an administrator.</p>

          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
            {formError && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {formError}
              </div>
            )}
            <TextField label="Email" type="email" autoComplete="username" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} error={fieldErrors.email} />
            <div className="relative">
              <TextField label="Password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={fieldErrors.password} className="pr-11" />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1 top-[26px] inline-flex h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100"
              >
                {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
            <Button type="submit" className="w-full" loading={submitting}>
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
