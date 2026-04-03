# FitTrack (demo)

## Run

```bash
npm install
npm run dev
```

Open:
- Public pages: `http://localhost:3000/`
- Login: `http://localhost:3000/login.html`
- Register: `http://localhost:3000/register.html`
- User area (requires login): `http://localhost:3000/app`

## Data lưu ở đâu?

- **SQLite file**: `data/app.db` (tự tạo khi chạy server lần đầu)
- **Schema hiện có** (tạo trong `db.js`):
  - `users`: tài khoản (email unique, password hash)
  - `workouts`: buổi tập (thuộc user)
  - `workout_sets`: các set của buổi tập
  - `progress_metrics`: số đo/metric theo thời gian

Bạn **không cần** tạo file riêng kiểu `user.db` — một file `app.db` là đủ (hoặc tách ra nếu muốn về sau).

## Auth logic (public vs user interface)

- **Public UI** (chưa đăng nhập): `index.html`, `how-it-works.html`, `progress.html`, `contact.html`
  - Header có **Login** + **Register**
- **User UI** (đăng nhập rồi): route `/app` (placeholder) với menu:
  - `/app` (Home)
  - `/app/workouts`
  - `/app/progress`

### Session / Cookie

- Khi **register/login** thành công, server set session cookie `fittrack.sid`
- Khi **logout**, session bị xoá và redirect về `/`

## Webflow (end-to-end)

1. User vào web (chưa đăng nhập) → xem các page public
2. User bấm **Register** → submit form → tạo user trong SQLite → auto login → redirect `/app`
3. Trong `/app` user thao tác (sau này sẽ có UI thật: Home/Workouts/Progress)
4. User bấm **Logout** → session destroy → về `/`

## Routes & endpoints hiện tại

### Pages
- `GET /` → `index.html`
- `GET /how-it-works.html`
- `GET /progress.html` (public marketing)
- `GET /contact.html`
- `GET /login.html`
- `GET /register.html`
- `GET /app` (guarded)
- `GET /app/workouts` (guarded)
- `GET /app/progress` (guarded)

### Auth
- `POST /auth/register` → tạo user + set session + redirect `/app`
- `POST /auth/login` → verify + set session + redirect `/app`
- `POST /auth/logout` → destroy session + redirect `/`

## Notes

- Đây là bản demo để chốt layout + webflow. Khi bạn gửi UI “user interface” (dashboard) mình sẽ thay phần `user/*.html` bằng giao diện thật và bắt đầu nối CRUD workouts/progress.

