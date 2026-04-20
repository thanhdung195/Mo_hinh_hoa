# FitTrack — Backend (MySQL / XAMPP)

Drop this `fittrack-backend/` folder **next to** your existing frontend folder
(the one that contains `index.html`, `app.js`, `styles.css`, `user/`, etc.).

```
your-project/
├── fittrack-backend/   ← this folder
│   ├── config/
│   │   └── db.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── user.js
│   │   ├── workouts.js
│   │   └── progress.js
│   ├── auth.js
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── index.html          ← existing frontend
├── app.js
├── styles.css
└── user/
    ├── home.html
    ├── workouts.html
    └── progress.html
```

---

## 1. Start XAMPP

Open XAMPP Control Panel and start **Apache** + **MySQL**.  
The server will auto-create the `fittrack` database and all tables on first run.

## 2. Install dependencies

```bash
cd fittrack-backend
npm install
```

## 3. Configure (optional)

```bash
cp .env.example .env
# Edit .env if your XAMPP MySQL password is not empty,
# or if you want a different database name / port.
```

> The app reads `process.env.*` directly. To load `.env` automatically, install
> `dotenv` and add `import 'dotenv/config';` as the **first line** of `server.js`.

## 4. Run

```bash
npm run dev
```

Open http://localhost:3000

---

## API surface (matches your frontend's fetch calls)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | — | Create account → redirect `/app` |
| POST | `/auth/login` | — | Sign in → redirect `/app` |
| POST | `/auth/logout` | — | Destroy session → redirect `/` |
| GET | `/api/me` | ✅ | Current user info |
| GET | `/api/profile` | ✅ | Profile + body metrics |
| PUT | `/api/profile` | ✅ | Save profile |
| GET | `/api/workouts` | ✅ | List workouts + sets |
| POST | `/api/workouts` | ✅ | Create workout |
| DELETE | `/api/workouts/:id` | ✅ | Delete workout |
| GET | `/api/progress` | ✅ | Metric history |
| POST | `/api/progress` | ✅ | Log a metric snapshot |

---

## Notes

- **No schema file needed** — `config/db.js` runs `CREATE TABLE IF NOT EXISTS`
  for all five tables on startup.
- Sessions use an in-process memory store (fine for local/dev). For production,
  swap in `express-mysql-session` or similar.
- The `FRONTEND_DIR` env var lets you point the server at any frontend path;
  defaults to the parent folder (`../`).
