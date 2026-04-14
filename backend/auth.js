import bcrypt from "bcryptjs";

// ─── ID generation ────────────────────────────────────────────────────────────
export function newId(prefix = "") {
  return `${prefix}${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

// ─── Email normalisation ──────────────────────────────────────────────────────
export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

// ─── Password helpers ─────────────────────────────────────────────────────────
export async function hashPassword(password) {
  return await bcrypt.hash(String(password), 12);
}

export async function verifyPassword(password, hash) {
  return await bcrypt.compare(String(password), String(hash));
}

// ─── Route guard ─────────────────────────────────────────────────────────────
/** Express middleware – redirects to /login.html when no session exists. */
export function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  res.redirect("/login.html");
}

/** Same guard but for API routes – returns 401 JSON instead of a redirect. */
export function requireAuthApi(req, res, next) {
  if (req.session?.userId) return next();
  res.status(401).json({ error: "Not authenticated." });
}