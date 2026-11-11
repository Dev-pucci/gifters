// Customer accounts: email + password, cookie sessions, password reset, account management.
//
// Security notes
//  - Passwords: scrypt (N=2^15, r=8, p=1) with a per-user random salt; compared in constant time.
//    Unknown emails still run a hash so response time doesn't reveal which emails exist.
//  - Sessions: 32 random bytes in an HttpOnly, SameSite=Lax cookie (Secure over https). Only a
//    SHA-256 of the token is stored, so a leaked sessions file can't be replayed.
//  - CSRF: state-changing auth requests must be JSON (forms can't send that cross-site without a
//    preflight) and, when the browser sends an Origin header, it must match this host.
//  - Password reset tokens: single use, 30 minutes, stored hashed. There's no email service yet,
//    so the reset link is written to the server log (see README).

import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb);
const SCRYPT = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEYLEN = 64;
const SESSION_DAYS = 30;
const RESET_MINUTES = 30;
const COOKIE = "hg_session";

const sha256 = (s) => createHash("sha256").update(s).digest("hex");
const token = () => randomBytes(32).toString("base64url");
const now = () => Date.now();

async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scrypt(password, salt, KEYLEN, SCRYPT);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64")}$${key.toString("base64")}`;
}

async function verifyPassword(password, stored) {
  const [alg, N, r, p, saltB64, keyB64] = String(stored).split("$");
  if (alg !== "scrypt") return false;
  const expected = Buffer.from(keyB64, "base64");
  const key = await scrypt(password, Buffer.from(saltB64, "base64"), expected.length, { N: +N, r: +r, p: +p, maxmem: SCRYPT.maxmem });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

// Used for unknown emails so sign-in takes the same time either way.
const DUMMY_HASH = await hashPassword(randomBytes(16).toString("hex"));

function parseCookies(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

export function createAuth({ dataDir, readJson, send, HttpError, rateLimit, str, isSecure, publicBaseUrl, adminEmails = [] }) {
  const admins = new Set(adminEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean));
  const isAdmin = (u) => !!u && admins.has(u.email);
  const file = (n) => join(dataDir, n);
  const load = (n, fallback) => (existsSync(file(n)) ? JSON.parse(readFileSync(file(n), "utf8")) : fallback);
  const save = (n, data) => {
    writeFileSync(file(n) + ".tmp", JSON.stringify(data, null, 1));
    renameSync(file(n) + ".tmp", file(n));
  };

  /** users: id → { id, email, name, passwordHash, createdAt, passwordChangedAt } */
  const users = load("users.json", {});
  /** sessions: sha256(token) → { userId, createdAt, expiresAt } */
  const sessions = load("sessions.json", {});
  /** resets: sha256(token) → { userId, expiresAt } */
  const resets = load("password-resets.json", {});
  for (const [k, s] of Object.entries(sessions)) if (s.expiresAt < now() || !users[s.userId]) delete sessions[k];
  for (const [k, r] of Object.entries(resets)) if (r.expiresAt < now()) delete resets[k];
  const persist = () => {
    save("users.json", users);
    save("sessions.json", sessions);
    save("password-resets.json", resets);
  };
  persist();

  const byEmail = (email) => Object.values(users).find((u) => u.email === email);
  const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, createdAt: u.createdAt, isAdmin: isAdmin(u) });

  const cleanEmail = (v) => str(v, 200).toLowerCase();
  const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const checkPassword = (pw) => {
    if (typeof pw !== "string" || pw.length < 8) throw new HttpError(400, "Use at least 8 characters for your password.");
    if (pw.length > 200) throw new HttpError(400, "That password is too long (200 characters max).");
    if (/^(.)\1+$/.test(pw) || /^(password|12345678|qwerty)/i.test(pw)) throw new HttpError(400, "That password is too easy to guess — try a phrase or mix of words.");
  };

  function setCookie(req, res, value, maxAgeSec) {
    const parts = [`${COOKIE}=${value}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${maxAgeSec}`];
    if (isSecure(req)) parts.push("Secure");
    res.setHeader("Set-Cookie", parts.join("; "));
  }

  function startSession(req, res, userId) {
    const t = token();
    sessions[sha256(t)] = { userId, createdAt: now(), expiresAt: now() + SESSION_DAYS * 86400_000 };
    setCookie(req, res, t, SESSION_DAYS * 86400);
    return sha256(t);
  }

  function sessionKey(req) {
    const t = parseCookies(req.headers.cookie)[COOKIE];
    return t ? sha256(t) : null;
  }

  /** The signed-in user for this request, or null. */
  function currentUser(req) {
    const key = sessionKey(req);
    const s = key && sessions[key];
    if (!s) return null;
    if (s.expiresAt < now() || !users[s.userId]) {
      delete sessions[key];
      return null;
    }
    return users[s.userId];
  }

  function requireUser(req) {
    const u = currentUser(req);
    if (!u) throw new HttpError(401, "Please sign in to continue.");
    return u;
  }

  /** Admin-only endpoints: signed in AND listed in ADMIN_EMAILS. */
  function requireAdmin(req) {
    const u = requireUser(req);
    if (!isAdmin(u)) throw new HttpError(403, "This area is for store admins only.");
    return u;
  }

  /** Blocks cross-site form posts: JSON only, and Origin (when sent) must be this host. */
  function guard(req) {
    const type = (req.headers["content-type"] || "").split(";")[0].trim();
    if (type !== "application/json") throw new HttpError(415, "Expected a JSON request.");
    guardOrigin(req);
  }

  /** Origin (when the browser sends one) must be this host — for non-JSON uploads. */
  function guardOrigin(req) {
    const origin = req.headers.origin;
    if (origin) {
      let host;
      try {
        host = new URL(origin).host;
      } catch {
        host = "";
      }
      if (host !== req.headers.host) throw new HttpError(403, "This request came from another site and was blocked.");
    }
  }

  const revokeSessions = (userId, exceptKey) => {
    for (const [k, s] of Object.entries(sessions)) if (s.userId === userId && k !== exceptKey) delete sessions[k];
  };

  /** Handles /api/auth/* and /api/account/* (except order history, which needs the order store). Returns true when handled. */
  async function handle(req, res, path) {
    if (path === "/api/auth/me" && req.method === "GET") {
      const u = currentUser(req);
      send(res, 200, { user: u ? publicUser(u) : null });
      return true;
    }

    if (path === "/api/auth/signup" && req.method === "POST") {
      guard(req);
      rateLimit(req, "signup", 10, 60 * 60_000);
      const b = await readJson(req);
      const email = cleanEmail(b.email);
      const name = str(b.name, 80);
      if (!name) throw new HttpError(400, "Please tell us your name.");
      if (!validEmail(email)) throw new HttpError(400, "Please enter a valid email address.");
      checkPassword(b.password);
      if (byEmail(email)) throw new HttpError(409, "An account with that email already exists. Try signing in, or reset your password.");
      const user = { id: "u_" + randomBytes(9).toString("base64url"), email, name, passwordHash: await hashPassword(b.password), createdAt: new Date().toISOString() };
      users[user.id] = user;
      startSession(req, res, user.id);
      persist();
      send(res, 201, { user: publicUser(user) });
      return true;
    }

    if (path === "/api/auth/signin" && req.method === "POST") {
      guard(req);
      rateLimit(req, "signin", 10, 15 * 60_000);
      const b = await readJson(req);
      const email = cleanEmail(b.email);
      rateLimit({ socket: { remoteAddress: "email:" + email } }, "signin-email", 10, 15 * 60_000);
      const user = byEmail(email);
      const ok = await verifyPassword(String(b.password ?? ""), user ? user.passwordHash : DUMMY_HASH);
      if (!user || !ok) throw new HttpError(401, "That email and password don't match. Check them and try again.");
      startSession(req, res, user.id);
      persist();
      send(res, 200, { user: publicUser(user) });
      return true;
    }

    if (path === "/api/auth/signout" && req.method === "POST") {
      guard(req);
      const key = sessionKey(req);
      if (key) delete sessions[key];
      setCookie(req, res, "", 0);
      persist();
      send(res, 200, { ok: true });
      return true;
    }

    if (path === "/api/auth/forgot" && req.method === "POST") {
      guard(req);
      rateLimit(req, "forgot", 5, 60 * 60_000);
      const b = await readJson(req);
      const email = cleanEmail(b.email);
      const user = validEmail(email) && byEmail(email);
      if (user) {
        for (const [k, r] of Object.entries(resets)) if (r.userId === user.id) delete resets[k];
        const t = token();
        resets[sha256(t)] = { userId: user.id, expiresAt: now() + RESET_MINUTES * 60_000 };
        persist();
        // No email service is connected yet: the link goes to the server log. Never send it in the response.
        console.log(`[password reset] ${email}: ${publicBaseUrl(req)}/reset-password?token=${t}  (valid ${RESET_MINUTES} min)`);
      }
      // Same answer whether or not the account exists, so emails can't be probed.
      send(res, 200, { ok: true });
      return true;
    }

    if (path === "/api/auth/reset" && req.method === "POST") {
      guard(req);
      rateLimit(req, "reset", 10, 60 * 60_000);
      const b = await readJson(req);
      const key = sha256(str(b.token, 200));
      const r = resets[key];
      if (!r || r.expiresAt < now() || !users[r.userId]) throw new HttpError(400, "That reset link is invalid or has expired. Request a new one.");
      checkPassword(b.password);
      const user = users[r.userId];
      user.passwordHash = await hashPassword(b.password);
      user.passwordChangedAt = new Date().toISOString();
      delete resets[key];
      revokeSessions(user.id); // sign out everywhere
      startSession(req, res, user.id);
      persist();
      send(res, 200, { user: publicUser(user) });
      return true;
    }

    if (path === "/api/account/profile" && req.method === "POST") {
      guard(req);
      const user = requireUser(req);
      const b = await readJson(req);
      const name = str(b.name, 80);
      if (!name) throw new HttpError(400, "Please enter your name.");
      user.name = name;
      persist();
      send(res, 200, { user: publicUser(user) });
      return true;
    }

    if (path === "/api/account/password" && req.method === "POST") {
      guard(req);
      const user = requireUser(req);
      rateLimit(req, "password", 10, 15 * 60_000);
      const b = await readJson(req);
      if (!(await verifyPassword(String(b.current ?? ""), user.passwordHash))) throw new HttpError(401, "Your current password isn't right.");
      checkPassword(b.next);
      user.passwordHash = await hashPassword(b.next);
      user.passwordChangedAt = new Date().toISOString();
      revokeSessions(user.id, sessionKey(req)); // sign out other devices
      persist();
      send(res, 200, { ok: true });
      return true;
    }

    if (path === "/api/account/delete" && req.method === "POST") {
      guard(req);
      const user = requireUser(req);
      const b = await readJson(req);
      if (!(await verifyPassword(String(b.password ?? ""), user.passwordHash))) throw new HttpError(401, "That password isn't right.");
      revokeSessions(user.id);
      delete users[user.id];
      setCookie(req, res, "", 0);
      persist();
      send(res, 200, { ok: true });
      return true;
    }

    return false;
  }

  return { handle, currentUser, requireUser, requireAdmin, guard, guardOrigin, publicUser, isAdmin };
}
