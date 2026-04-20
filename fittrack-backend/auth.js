// auth.js
import bcrypt from "bcryptjs";

/** Generate a short random ID with an optional prefix, e.g. "usr_3f2a…" */
export function newId(prefix = "") {
  return `${prefix}${Math.random().toString(16).slice(2)}${Date.now().toString(16)}`;
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export async function hashPassword(password) {
  return await bcrypt.hash(String(password), 12);
}

export async function verifyPassword(password, hash) {
  return await bcrypt.compare(String(password), String(hash));
}

/** Express middleware – redirects to /login.html when not authenticated. */
export function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  res.redirect("/login.html");
}

/** Same check but returns 401 JSON (used by API routes called via fetch). */
export function requireAuthAPI(req, res, next) {
  if (req.session?.userId) return next();
  res.status(401).json({ error: "Not authenticated." });
}
