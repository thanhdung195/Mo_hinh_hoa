import bcrypt from "bcryptjs";

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

export function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  res.redirect("/login.html");
}

