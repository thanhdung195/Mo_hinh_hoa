import express from "express";
import session from "express-session";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { migrate } from "./db.js";
import { SESSION_SECRET } from "./config.js";

import authRoutes from "./routes/auth.js";
import apiMeRoutes from "./routes/api.me.js";
import apiProfileRoutes from "./routes/api.profile.js";
import apiWorkoutsRoutes from "./routes/api.workouts.js";
import appPagesRoutes from "./routes/app.pages.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, ".."); // project root (where index.html lives)

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// DB migrations (async – must complete before serving requests)
await migrate();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(
  session({
    name: "fittrack.sid",
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: "lax", secure: false },
  })
);

// Static assets (styles.css, app.js, user/, …)
app.use(express.static(ROOT));

// Public HTML pages
app.get("/", (_req, res) => res.sendFile(path.join(ROOT, "index.html")));

// Redirect already-logged-in users away from auth pages
app.get(["/login.html", "/register.html"], (req, res, next) => {
  if (req.session?.userId) return res.redirect("/app");
  next();
});

// Route modules
app.use("/auth", authRoutes);
app.use("/api/me", apiMeRoutes);
app.use("/api/profile", apiProfileRoutes);
app.use("/api/workouts", apiWorkoutsRoutes);
app.use("/app", appPagesRoutes);

const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

server.on("close", () => console.log("HTTP server closed"));
process.on("SIGINT", () => {});
process.on("SIGTERM", () => {});
setInterval(() => {}, 60_000); // keep alive on Windows terminals