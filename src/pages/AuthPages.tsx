import { useState, type FormEvent, type ReactNode } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { Logo } from "../components/Header";
import { GiftIcon, LockIcon, TruckIcon } from "../components/Icons";
import { safeNext, useAuth } from "../state/auth";

const inputCls = "h-12 w-full rounded-[4px] border border-line bg-white px-4 text-sm focus:border-olive focus:outline-none aria-[invalid=true]:border-brand";

export function PasswordInput({ id, label, autoComplete, value, onChange, hint }: { id: string; label: string; autoComplete: string; value: string; onChange: (v: string) => void; hint?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input id={id} type={show ? "text" : "password"} autoComplete={autoComplete} required value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} pr-16`} aria-describedby={hint ? `${id}-hint` : undefined} />
        <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} aria-label={show ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-semibold text-olive hover:bg-linen">
          {show ? "Hide" : "Show"}
        </button>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-ink-soft">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function AuthShell({ title, intro, children }: { title: string; intro?: ReactNode; children: ReactNode }) {
  return (
    <div className="bg-linen">
      <div className="container-page grid gap-10 py-12 md:grid-cols-[1fr_minmax(0,440px)] md:items-center md:py-16 lg:gap-20">
        <div className="hidden md:block">
          <Logo />
          <h2 className="mt-8 font-display text-4xl font-medium leading-tight">
            Your gifts,
            <span className="block font-wordmark text-5xl text-olive">all in one place</span>
          </h2>
          <ul className="mt-8 space-y-4 text-sm text-ink-soft">
            <li className="flex items-center gap-3">
              <TruckIcon className="text-olive" /> Track every order and see delivery estimates
            </li>
            <li className="flex items-center gap-3">
              <GiftIcon className="text-olive" /> Check out faster with your details filled in
            </li>
            <li className="flex items-center gap-3">
              <LockIcon className="text-olive" /> Your password is encrypted and never shared
            </li>
          </ul>
        </div>
        <div className="rounded-md bg-white p-6 shadow-[0_2px_14px_rgba(31,42,55,0.08)] sm:p-8">
          <h1 className="font-display text-3xl font-medium">{title}</h1>
          {intro ? <p className="mt-2 text-sm text-ink-soft">{intro}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function ErrorBox({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="rounded-[4px] bg-brand-soft p-3 text-sm text-brand-dark">
      {error}
    </p>
  );
}

export function SignInPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading, signIn, signUp } = useAuth();
  const mode = params.get("mode") === "create" ? "create" : "signin";
  const next = safeNext(params.get("next"));
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!loading && user) return <Navigate to={next} replace />;

  const setMode = (m: "signin" | "create") => {
    setError(null);
    setParams((p) => {
      const n = new URLSearchParams(p);
      if (m === "create") n.set("mode", "create");
      else n.delete("mode");
      return n;
    }, { replace: true });
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "create") await signUp(name, email, password);
      else await signIn(email, password);
      navigate(next, { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title={mode === "create" ? "Create your account" : "Welcome back"} intro={mode === "create" ? "It takes less than a minute." : "Sign in to see your orders and check out faster."}>
      <div role="tablist" aria-label="Sign in or create account" className="mb-6 grid grid-cols-2 rounded-[4px] bg-linen p-1 text-sm">
        {(["signin", "create"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`rounded-[3px] py-2 font-medium transition ${mode === m ? "bg-white text-ink shadow-sm" : "text-ink-soft hover:text-ink"}`}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="space-y-4" noValidate>
        {mode === "create" ? (
          <div>
            <label htmlFor="auth-name" className="mb-1.5 block text-sm font-medium">
              Your name
            </label>
            <input id="auth-name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
          </div>
        ) : null}
        <div>
          <label htmlFor="auth-email" className="mb-1.5 block text-sm font-medium">
            Email
          </label>
          <input id="auth-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
        </div>
        <PasswordInput
          id="auth-password"
          label="Password"
          autoComplete={mode === "create" ? "new-password" : "current-password"}
          value={password}
          onChange={setPassword}
          hint={mode === "create" ? "At least 8 characters. A short phrase is easy to remember and hard to guess." : undefined}
        />
        {mode === "signin" ? (
          <p className="text-right text-sm">
            <Link to={`/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="text-olive underline-offset-2 hover:underline">
              Forgot your password?
            </Link>
          </p>
        ) : null}
        <ErrorBox error={error} />
        <button type="submit" disabled={busy} className="btn-primary h-12 w-full">
          {busy ? "Please wait…" : mode === "create" ? "Create account" : "Sign in"}
        </button>
        {mode === "create" ? (
          <p className="text-center text-xs text-ink-soft">
            By creating an account you agree to our <Link to="/terms" className="underline">Terms of Use</Link> and <Link to="/privacy" className="underline">Privacy Policy</Link>.
          </p>
        ) : null}
      </form>
      <p className="mt-6 border-t border-line pt-5 text-center text-sm text-ink-soft">
        No account needed to shop —{" "}
        <Link to="/cart" className="font-medium text-olive hover:underline">
          continue as a guest
        </Link>
        .
      </p>
    </AuthShell>
  );
}

export function ForgotPasswordPage() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <AuthShell title="Reset your password" intro="Enter the email for your account and we'll send you a link to choose a new password.">
      {sent ? (
        <div role="status" className="space-y-4">
          <p className="rounded-[4px] bg-pine-soft p-4 text-sm text-pine-dark">
            If an account exists for <strong>{email}</strong>, a reset link is on its way. It works once and expires in 30 minutes.
          </p>
          <Link to="/sign-in" className="btn-outline w-full">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form
          className="space-y-4"
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setBusy(true);
            try {
              await api.forgotPassword(email);
              setSent(true);
            } catch (err) {
              setError((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div>
            <label htmlFor="fp-email" className="mb-1.5 block text-sm font-medium">
              Email
            </label>
            <input id="fp-email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
          </div>
          <ErrorBox error={error} />
          <button type="submit" disabled={busy} className="btn-primary h-12 w-full">
            {busy ? "Sending…" : "Send reset link"}
          </button>
          <p className="text-center text-sm">
            <Link to="/sign-in" className="text-olive hover:underline">
              Back to sign in
            </Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!token) {
    return (
      <AuthShell title="Reset link missing" intro="Open the link from your email again, or request a new one.">
        <Link to="/forgot-password" className="btn-primary w-full">
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" intro="You'll be signed in on this device and signed out everywhere else.">
      <form
        className="space-y-4"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          setError(null);
          if (password !== confirm) return setError("The two passwords don't match.");
          setBusy(true);
          try {
            const r = await api.resetPassword(token, password);
            setUser(r.user);
            navigate("/account?reset=1", { replace: true });
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <PasswordInput id="rp-new" label="New password" autoComplete="new-password" value={password} onChange={setPassword} hint="At least 8 characters." />
        <PasswordInput id="rp-confirm" label="Confirm new password" autoComplete="new-password" value={confirm} onChange={setConfirm} />
        <ErrorBox error={error} />
        <button type="submit" disabled={busy} className="btn-primary h-12 w-full">
          {busy ? "Saving…" : "Save new password"}
        </button>
      </form>
    </AuthShell>
  );
}
