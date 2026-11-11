import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, type Order } from "../api/client";
import { money } from "../components/ProductCard";
import { formatKes } from "../lib/pricing";
import { useAuth } from "../state/auth";
import { useSections } from "../state/sections";
import { PasswordInput } from "./AuthPages";

const statusLabel: Record<Order["status"], { text: string; cls: string }> = {
  paid: { text: "Paid", cls: "bg-pine-soft text-pine-dark" },
  test_order: { text: "Test order", cls: "bg-[#fdf6e7] text-[#7a5a12]" },
  awaiting_payment: { text: "Awaiting payment", cls: "bg-linen text-ink" },
  payment_failed: { text: "Payment failed", cls: "bg-brand-soft text-brand-dark" },
};

function Card({ title, children, id }: { title: string; children: ReactNode; id?: string }) {
  return (
    <section id={id} className="rounded-md bg-white p-6 shadow-[0_1px_3px_rgba(31,42,55,0.08)]" aria-labelledby={`${id ?? title}-h`}>
      <h2 id={`${id ?? title}-h`} className="font-display text-xl font-medium">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

const Note = ({ ok, children }: { ok?: boolean; children: ReactNode }) => (
  <p role={ok ? "status" : "alert"} className={`rounded-[4px] p-3 text-sm ${ok ? "bg-pine-soft text-pine-dark" : "bg-brand-soft text-brand-dark"}`}>
    {children}
  </p>
);

const inputCls = "h-11 w-full rounded-[4px] border border-line bg-white px-4 text-sm focus:border-olive focus:outline-none";

function Orders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    api.myOrders().then((r) => setOrders(r.orders), (e) => setError((e as Error).message));
  }, []);
  if (error) return <Note>{error}</Note>;
  if (!orders) return <p className="text-sm text-ink-soft">Loading your orders…</p>;
  if (!orders.length)
    return (
      <div className="rounded-[4px] bg-linen p-5 text-sm">
        <p>No orders yet. Orders you place while signed in will show up here.</p>
        <Link to="/c/bestsellers" className="btn-primary mt-4">
          Start shopping
        </Link>
      </div>
    );
  return (
    <ul className="divide-y divide-line">
      {orders.map((o) => {
        const s = statusLabel[o.status];
        const items = o.lines.reduce((n, l) => n + l.qty, 0);
        return (
          <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                <Link to={`/order/${o.id}`} className="hover:text-olive">
                  {o.id}
                </Link>
              </p>
              <p className="text-sm text-ink-soft">
                {new Date(o.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })} · {items} item{items === 1 ? "" : "s"} · {o.lines.map((l) => l.name).join(", ")}
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>{s.text}</span>
            <span className="w-24 text-right font-semibold">
              {money(o.totals.total)}
              {o.payment?.method === "mpesa" ? <span className="block text-xs font-normal text-ink-soft">{formatKes(o.payment.amountKes)}</span> : null}
            </span>
            <Link to={`/track-order?order=${o.id}`} className="text-sm text-olive underline-offset-2 hover:underline">
              Track
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function Profile() {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user!.name);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e: FormEvent) => {
        e.preventDefault();
        setMsg(null);
        setBusy(true);
        try {
          const r = await api.updateProfile(name);
          setUser(r.user);
          setMsg({ ok: true, text: "Saved." });
        } catch (err) {
          setMsg({ ok: false, text: (err as Error).message });
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <label htmlFor="pf-name" className="mb-1.5 block text-sm font-medium">
          Name
        </label>
        <input id="pf-name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
      </div>
      <div>
        <p className="mb-1.5 text-sm font-medium">Email</p>
        <p className="text-sm text-ink-soft">{user!.email}</p>
      </div>
      {msg ? <Note ok={msg.ok}>{msg.text}</Note> : null}
      <button type="submit" disabled={busy || name.trim() === user!.name} className="btn-outline">
        {busy ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}

function ChangePassword() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setMsg(null);
        setBusy(true);
        try {
          await api.changePassword(current, next);
          setCurrent("");
          setNext("");
          setMsg({ ok: true, text: "Password changed. You've been signed out on your other devices." });
        } catch (err) {
          setMsg({ ok: false, text: (err as Error).message });
        } finally {
          setBusy(false);
        }
      }}
    >
      <PasswordInput id="cp-current" label="Current password" autoComplete="current-password" value={current} onChange={setCurrent} />
      <PasswordInput id="cp-new" label="New password" autoComplete="new-password" value={next} onChange={setNext} hint="At least 8 characters." />
      {msg ? <Note ok={msg.ok}>{msg.text}</Note> : null}
      <button type="submit" disabled={busy || !current || !next} className="btn-outline">
        {busy ? "Saving…" : "Change password"}
      </button>
    </form>
  );
}

function DeleteAccount() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  if (!open)
    return (
      <div className="space-y-3 text-sm text-ink-soft">
        <p>Permanently delete your account and sign-in details. Records of past orders are kept as the law requires, but are no longer linked to you.</p>
        <button type="button" onClick={() => setOpen(true)} className="text-sm font-semibold text-brand underline">
          Delete my account…
        </button>
      </div>
    );
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setBusy(true);
        try {
          await api.deleteAccount(password);
          navigate("/", { replace: true });
          setUser(null);
        } catch (err) {
          setError((err as Error).message);
          setBusy(false);
        }
      }}
    >
      <p className="text-sm">This can't be undone. Enter your password to confirm.</p>
      <PasswordInput id="del-pw" label="Password" autoComplete="current-password" value={password} onChange={setPassword} />
      {error ? <Note>{error}</Note> : null}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy || !password} className="btn bg-brand text-white hover:bg-brand-dark">
          {busy ? "Deleting…" : "Delete account permanently"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-outline">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function Account() {
  const { user, signOut } = useAuth();
  const { cart, favorite } = useSections();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const first = user!.name.split(" ")[0];

  return (
    <div className="bg-linen">
      <div className="container-page max-w-5xl py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">My account</p>
            <h1 className="mt-2 font-display text-4xl font-medium">Hello, {first}</h1>
            <p className="mt-1 text-sm text-ink-soft">Member since {new Date(user!.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</p>
          </div>
          <button
            type="button"
            onClick={async () => {
              // Leave the protected page first; otherwise it would bounce to the sign-in page.
              navigate("/", { replace: true });
              await signOut();
            }}
            className="btn-outline"
          >
            Sign out
          </button>
        </div>

        {user!.isAdmin ? (
          <Link to="/admin" className="card mt-6 flex items-center justify-between gap-4 p-5 hover:shadow-md">
            <span>
              <span className="eyebrow block">Store admin</span>
              <span className="mt-1 block font-display text-xl font-medium">Seasons, colors & images</span>
              <span className="text-sm text-ink-soft">Change how the shop looks for each season.</span>
            </span>
            <span className="btn-primary shrink-0">Open admin</span>
          </Link>
        ) : null}

        {params.get("reset") ? (
          <div className="mt-6">
            <Note ok>Your password was changed and you're signed in.</Note>
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Cart", cart.count, "/cart"],
            ["Favorites", favorite.count, "/favorites"],
            ["Saved for later", cart.saved.length, "/cart"],
          ].map(([label, n, to]) => (
            <Link key={label as string} to={to as string} className="rounded-md bg-white p-5 shadow-[0_1px_3px_rgba(31,42,55,0.08)] hover:shadow-md">
              <p className="text-sm text-ink-soft">{label}</p>
              <p className="font-display text-3xl font-medium">{n}</p>
            </Link>
          ))}
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1.6fr_1fr]">
          <Card title="Your orders" id="orders">
            <Orders />
          </Card>
          <div className="space-y-6">
            <Card title="Profile" id="profile">
              <Profile />
            </Card>
            <Card title="Password" id="password">
              <ChangePassword />
            </Card>
            <Card title="Delete account" id="delete">
              <DeleteAccount />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
