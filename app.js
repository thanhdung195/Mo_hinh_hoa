const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const FITTRACK_WEIGHT_LOG_KEY = "fittrack_weight_log_v1";

function fittrackIsoDate(ms) {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Normalize to { date, weight, t } for the weight progress chart. */
function fittrackNormalizeWeightEntry(e) {
  if (!e) return null;
  if (Number.isFinite(Number(e.weight)) && e.date) {
    const w = Number(e.weight);
    let t = e.t;
    if (!Number.isFinite(t)) t = new Date(`${String(e.date)}T12:00:00`).getTime();
    return { date: String(e.date), weight: w, t };
  }
  if (Number.isFinite(Number(e.kg))) {
    const w = Number(e.kg);
    const d = String(e.d || "");
    let t = e.t;
    if (!Number.isFinite(t) && d) t = new Date(`${d}T12:00:00`).getTime();
    if (!Number.isFinite(t)) t = Date.now();
    return { date: d || fittrackIsoDate(t), weight: w, t };
  }
  return null;
}

function fittrackPointTime(p) {
  if (p && Number.isFinite(p.t)) return Number(p.t);
  if (p && p.date) return new Date(`${String(p.date)}T12:00:00`).getTime();
  return 0;
}

/**
 * Append `{ date, weight, t }` when the user’s weight value changes (Profile save or Progress load).
 * Skips duplicate consecutive values so the log stays one point per real update.
 * Chart: X = time (date), Y = kg; first entry in the log is always the initial weight.
 */
function fittrackAppendWeightSnapshot(profileKg) {
  if (!Number.isFinite(profileKg) || profileKg <= 0) return;
  try {
    const arr = JSON.parse(localStorage.getItem(FITTRACK_WEIGHT_LOG_KEY) || "[]");
    if (!Array.isArray(arr)) return;
    const next = arr
      .map(fittrackNormalizeWeightEntry)
      .filter(Boolean)
      .sort((a, b) => fittrackPointTime(a) - fittrackPointTime(b));
    const last = next[next.length - 1];
    if (last && Number(last.weight) === profileKg) return;
    const t = Date.now();
    next.push({ date: fittrackIsoDate(t), weight: profileKg, t });
    localStorage.setItem(FITTRACK_WEIGHT_LOG_KEY, JSON.stringify(next.slice(-400)));
  } catch {
    /* ignore */
  }
}

// Active nav link (marketing + /app/* on Express)
(() => {
  const raw = (location.pathname || "").toLowerCase();
  const pathNorm = raw.replace(/\/+$/, "") || "/";
  const segments = pathNorm === "/" ? [] : pathNorm.split("/").filter(Boolean);
  let normalized = "index.html";
  if (segments.length) {
    if (segments[0] === "app") {
      normalized = segments.length === 1 ? "app" : segments[segments.length - 1];
    } else {
      normalized = segments[segments.length - 1];
    }
  }

  const routeKey = (href) => {
    const h = (href || "").toLowerCase().replace(/^\.\//, "");
    const p = h.replace(/\/+$/, "") || "/";
    const segs = p === "/" ? [] : p.split("/").filter(Boolean);
    if (!segs.length) return "index.html";
    if (segs[0] === "app") return segs.length === 1 ? "app" : segs[segs.length - 1];
    return segs[segs.length - 1];
  };

  const isHome = normalized === "index.html";
  const links = $$("a.nav__link, a.mobilemenu__link");
  links.forEach((a) => {
    const href = a.getAttribute("href") || "";
    const hrefKey = routeKey(href);
    const match =
      (isHome &&
        (hrefKey === "index.html" || href === "/" || href === "./" || href.toLowerCase().endsWith("/index.html"))) ||
      hrefKey === normalized;
    if (match) a.classList.add("is-active");
  });

  const loginBtn = $$('a.btn[href]').find((a) => (a.getAttribute("href") || "").toLowerCase().endsWith("login.html"));
  if (loginBtn && normalized === "login.html") loginBtn.classList.add("is-active");
  const regBtn = $$('a.btn[href]').find((a) => (a.getAttribute("href") || "").toLowerCase().endsWith("register.html"));
  if (regBtn && normalized === "register.html") regBtn.classList.add("is-active");
})();

// Auth pages: show server redirect errors (?e=code)
(() => {
  const el = $("[data-auth-error]");
  if (!el) return;
  const params = new URLSearchParams(location.search);
  const code = params.get("e") || params.get("error");
  const messages = {
    invalid: "Email không hợp lệ hoặc mật khẩu cần tối thiểu 6 ký tự.",
    taken: "Email này đã được đăng ký.",
    missing: "Vui lòng nhập đủ email và mật khẩu.",
    auth: "Sai email hoặc mật khẩu."
  };
  if (code && messages[code]) {
    el.hidden = false;
    el.textContent = messages[code];
    params.delete("e");
    params.delete("error");
    const q = params.toString();
    history.replaceState(null, "", `${location.pathname}${q ? `?${q}` : ""}${location.hash}`);
  }
})();

// Footer year
const yearEl = $('[data-year]');
if (yearEl) yearEl.textContent = String(new Date().getFullYear());

// Mobile menu
const menuBtn = $('[data-menu]');
const menuOverlay = $('[data-mobilemenu]');
const menuClose = $('[data-menu-close]');

function openMenu() {
  if (!menuOverlay) return;
  menuOverlay.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeMenu() {
  if (!menuOverlay) return;
  menuOverlay.classList.remove('is-open');
  document.body.style.overflow = '';
}

menuBtn?.addEventListener('click', openMenu);
menuClose?.addEventListener('click', closeMenu);
menuOverlay?.addEventListener('click', (e) => {
  if (e.target === menuOverlay) closeMenu();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
});

// Close menu when clicking a link
$$('[data-mobilemenu] a').forEach((a) => a.addEventListener('click', closeMenu));

// Subtle progress animation when visib
const bar = $('.progress__bar');
const val = $('[data-consistency]');
if (bar && val) {
  const target = Number((bar.style.getPropertyValue('--p') || '0').trim());
  bar.style.setProperty('--p', '0');
  val.textContent = '0%';

  const io = new IntersectionObserver(
    (entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) return;
      io.disconnect();

      const start = performance.now();
      const dur = 900;
      const tick = (t) => {
        const k = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - k, 3);
        const p = target * eased;
        bar.style.setProperty('--p', String(p));
        val.textContent = `${Math.round(p * 100)}%`;
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    },
    { threshold: 0.35 }
  );
  io.observe(bar);
}

// User avatar + menu (app pages)
(() => {
  const avatars = $$('[data-avatar]');
  const avatar = avatars[0];
  const menu = $('[data-avatar-menu]');
  const nameEls = $$('[data-user-name]');
  const emailEls = $$('[data-user-email]');
  if (!avatar || !menu) return;

  const toggle = () => menu.classList.toggle('is-open');
  avatar.addEventListener('click', toggle);
  document.addEventListener('click', (e) => {
    if (!menu.classList.contains('is-open')) return;
    if (e.target === avatar || avatar.contains(e.target) || menu.contains(e.target)) return;
    menu.classList.remove('is-open');
  });

  fetch('/api/me', { headers: { 'Accept': 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const u = data?.user;
      if (!u) return;
      const displayName = (u.name || '').trim() || u.email;
      nameEls.forEach((el) => {
        el.textContent = displayName;
      });
      emailEls.forEach((el) => {
        el.textContent = u.email;
      });
      const initial = displayName.trim()[0]?.toUpperCase() || 'U';
      avatars.forEach((el) => {
        el.textContent = initial;
      });
    })
    .catch(() => {});
})();

// Profile page: load/save profile fields from backend
(() => {
  const form = $('#profile-form');
  if (!form) return;
  const msg = $('[data-profile-message]');
  const totalWorkoutsEl = $('[data-total-workouts]');
  const activeStreakEl = $('[data-active-streak]');
  const bmiInput = form.elements.namedItem('bmi');
  const heightInput = form.elements.namedItem('height_cm');
  const weightInput = form.elements.namedItem('weight_kg');
  const caloriesInput = form.elements.namedItem('calories_estimate');

  const updateDerivedProfileMetrics = () => {
    const heightCm = Number(heightInput?.value || 0);
    const weightKg = Number(weightInput?.value || 0);
    if (heightCm > 0 && weightKg > 0) {
      const bmi = weightKg / Math.pow(heightCm / 100, 2);
      if (bmiInput) bmiInput.value = bmi.toFixed(1);
      if (caloriesInput) caloriesInput.value = String(Math.round(weightKg * 33));
    } else {
      if (bmiInput) bmiInput.value = '';
      if (caloriesInput) caloriesInput.value = '';
    }
  };

  const setValue = (name, value) => {
    const input = form.elements.namedItem(name);
    if (!input) return;
    input.value = value ?? '';
  };

  fetch('/api/profile', { headers: { Accept: 'application/json' } })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      const p = data?.profile;
      if (!p) return;
      setValue('height_cm', p.height_cm);
      setValue('birthday', p.birthday);
      setValue('location', p.location);
      setValue('weight_kg', p.weight_kg);
      setValue('body_fat', p.body_fat);
      setValue('bmi', p.bmi);
      setValue('active_streak', p.active_streak);
      if (totalWorkoutsEl) totalWorkoutsEl.textContent = String(p.total_workouts || 0);
      if (activeStreakEl) activeStreakEl.textContent = String(p.active_streak || 0);
      updateDerivedProfileMetrics();
    })
    .catch(() => {});

  heightInput?.addEventListener('input', updateDerivedProfileMetrics);
  weightInput?.addEventListener('input', updateDerivedProfileMetrics);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = {
      height_cm: fd.get('height_cm'),
      birthday: fd.get('birthday'),
      location: fd.get('location'),
      weight_kg: fd.get('weight_kg'),
      body_fat: fd.get('body_fat'),
      bmi: fd.get('bmi'),
      active_streak: fd.get('active_streak')
    };
    try {
      const r = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!r.ok) throw new Error('Save failed');
      const data = await r.json();
      const p = data?.profile;
      const savedKg = Number(p?.weight_kg);
      if (Number.isFinite(savedKg) && savedKg > 0) {
        fittrackAppendWeightSnapshot(savedKg);
      }
      if (activeStreakEl) activeStreakEl.textContent = String(p?.active_streak || 0);
      if (msg) msg.textContent = 'Saved successfully.';
    } catch {
      if (msg) msg.textContent = 'Cannot save profile. Please try again.';
    }
  });
})();

// Workouts page: create/list/delete user workouts
(() => {
  const form = $('#workout-form');
  if (!form) return;
  const setRows = $('#set-rows');
  const addSetBtn = $('#add-set-btn');
  const listEl = $('#workout-list');
  const msg = $('[data-workout-message]');

  const createSetRow = (s = {}) => {
    const row = document.createElement('div');
    row.className = 'profileRow workoutSetRow';
    row.innerHTML = `
      <input class="field__input profileInput" name="exercise" type="text" placeholder="Exercise (e.g. Squat)" value="${s.exercise || ''}" />
      <input class="field__input profileInput" name="reps" type="number" min="0" step="1" placeholder="Reps" value="${s.reps ?? ''}" />
      <input class="field__input profileInput" name="weight" type="number" min="0" step="0.1" placeholder="Weight (kg)" value="${s.weight ?? ''}" />
      <input class="field__input profileInput" name="rpe" type="number" min="0" max="10" step="0.1" placeholder="RPE" value="${s.rpe ?? ''}" />
      <button class="btn btn--ghost" type="button" data-remove-set>Remove</button>
    `;
    row.querySelector('[data-remove-set]')?.addEventListener('click', () => row.remove());
    return row;
  };

  const renderList = (workouts) => {
    if (!listEl) return;
    if (!workouts.length) {
      listEl.innerHTML = '<p class="muted">No workouts yet. Create your first one above.</p>';
      return;
    }
    listEl.innerHTML = workouts
      .map(
        (w) => `
        <article class="profileCard">
          <div class="profileCard__title" style="justify-content:space-between">
            <span>${w.title}</span>
            <button class="btn btn--ghost" type="button" data-del-id="${w.id}">Delete</button>
          </div>
          <p class="muted" style="margin:0 0 8px">Date: ${w.performed_at}</p>
          <p class="muted" style="margin:0 0 10px">${w.notes || ''}</p>
          <div class="profileRows">
            ${(w.sets || [])
              .map(
                (s) => `
                <div class="profileRow">
                  <div class="profileRow__k">${s.exercise}</div>
                  <div class="profileRow__v">${s.reps ?? '-'} reps • ${s.weight ?? '-'} kg • RPE ${s.rpe ?? '-'}</div>
                </div>
              `
              )
              .join('')}
          </div>
        </article>
      `
      )
      .join('');
    $$('[data-del-id]', listEl).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-del-id');
        if (!id) return;
        await fetch(`/api/workouts/${id}`, { method: 'DELETE' });
        loadWorkouts();
      });
    });
  };

  const loadWorkouts = async () => {
    const r = await fetch('/api/workouts', { headers: { Accept: 'application/json' } });
    if (!r.ok) return;
    const data = await r.json();
    renderList(data?.workouts || []);
  };

  addSetBtn?.addEventListener('click', () => setRows?.appendChild(createSetRow()));
  setRows?.appendChild(createSetRow());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const rows = $$('.profileRow', setRows);
    const sets = rows
      .map((r) => ({
        exercise: $('[name="exercise"]', r)?.value || '',
        reps: $('[name="reps"]', r)?.value || '',
        weight: $('[name="weight"]', r)?.value || '',
        rpe: $('[name="rpe"]', r)?.value || ''
      }))
      .filter((s) => s.exercise.trim() !== '');
    const payload = {
      title: String(fd.get('title') || ''),
      performed_at: String(fd.get('performed_at') || ''),
      notes: String(fd.get('notes') || ''),
      sets
    };
    try {
      const r = await fetch('/api/workouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Save failed');
      form.reset();
      setRows.innerHTML = '';
      setRows.appendChild(createSetRow());
      if (msg) msg.textContent = 'Workout saved.';
      loadWorkouts();
    } catch (err) {
      if (msg) msg.textContent = err?.message || 'Cannot save workout.';
    }
  });

  loadWorkouts().catch(() => {});
})();

// Progress page: bind stats to real workout/profile data
(() => {
  const totalEl = $('[data-progress-total-workouts]');
  if (!totalEl) return;

  const caloriesEls = $$('[data-progress-calories], [data-progress-calories-card]');
  const consistencyEl = $('[data-progress-consistency]');
  const weightChangeEl = $('[data-progress-weight-change]');
  const currentWeightEls = $$('[data-progress-current-weight], [data-progress-current-weight-pill]');
  const streakEl = $('[data-progress-streak]');
  const prsEl = $('[data-progress-prs]');
  const volumeEl = $('[data-progress-volume]');
  const proteinEl = $('[data-progress-protein]');
  const tbody = $('[data-progress-exercise-body]');
  const calMonthEl = $("[data-progress-cal-month]");
  if (calMonthEl) {
    calMonthEl.textContent = new Date().toLocaleDateString("vi-VN", { month: "long", year: "numeric" });
  }

  const chartSvg = $("[data-weight-chart-svg]");

  const fmt = (n) => (Number.isFinite(n) ? n : 0);

  const MS_DAY = 86400000;

  const loadWeightLog = () => {
    try {
      const arr = JSON.parse(localStorage.getItem(FITTRACK_WEIGHT_LOG_KEY) || "[]");
      if (!Array.isArray(arr)) return [];
      return arr
        .map(fittrackNormalizeWeightEntry)
        .filter(Boolean)
        .sort((a, b) => fittrackPointTime(a) - fittrackPointTime(b));
    } catch {
      return [];
    }
  };

  const POINTS_PER_SEGMENT = 14;

  /**
   * Weight line chart data: chronological points from first logged weigh-in to latest.
   * X-axis maps each point’s time (`t` / `date`); Y-axis is `weight` (kg).
   * `displayPoints[0]` is always the user’s initial weight (oldest log entry).
   * `linePoints` connects every point in order, plus an optional flat tail to “now”.
   */
  const buildDisplayPoints = (log, profileKg) => {
    const sorted = [...log].sort((a, b) => fittrackPointTime(a) - fittrackPointTime(b));
    const tNow = Date.now();
    if (!sorted.length) {
      if (!(Number.isFinite(profileKg) && profileKg > 0)) {
        return { displayPoints: [], linePoints: [], tMin: tNow - 1, tMax: tNow };
      }
      const p = { date: fittrackIsoDate(tNow), weight: profileKg, t: tNow };
      return {
        displayPoints: [p],
        linePoints: [p, { date: fittrackIsoDate(tNow + MS_DAY), weight: profileKg, t: tNow + MS_DAY, _virtual: true }],
        tMin: tNow - MS_DAY,
        tMax: tNow + MS_DAY
      };
    }

    const displayPoints = [...sorted];

    let tMin = fittrackPointTime(displayPoints[0]);
    let tMax = Math.max(tNow, fittrackPointTime(displayPoints[displayPoints.length - 1]));
    if (tMax <= tMin) tMax = tMin + MS_DAY;

    const linePoints = [...displayPoints];
    const last = linePoints[linePoints.length - 1];
    if (fittrackPointTime(last) < tNow - 36e5) {
      linePoints.push({
        date: fittrackIsoDate(tNow),
        weight: last.weight,
        t: tNow,
        _virtual: true
      });
      tMax = tNow;
    }

    return { displayPoints, linePoints, tMin, tMax };
  };

  const buildDenseSmoothPolyline = (linePoints, tMin, tMax, plotL, plotR, yFromKg) => {
    if (!linePoints.length) return [];
    const span = Math.max(1, tMax - tMin);
    const xy = [];
    for (let i = 0; i < linePoints.length - 1; i += 1) {
      const a = linePoints[i];
      const b = linePoints[i + 1];
      const ta = fittrackPointTime(a);
      const tb = fittrackPointTime(b);
      for (let s = 0; s < POINTS_PER_SEGMENT; s += 1) {
        const u = s / POINTS_PER_SEGMENT;
        const t = ta + u * (tb - ta);
        const w = a.weight + u * (b.weight - a.weight);
        const ux = (t - tMin) / span;
        xy.push({ x: plotL + Math.max(0, Math.min(1, ux)) * (plotR - plotL), y: yFromKg(w) });
      }
    }
    const L = linePoints[linePoints.length - 1];
    const uu = (fittrackPointTime(L) - tMin) / span;
    xy.push({
      x: plotL + Math.max(0, Math.min(1, uu)) * (plotR - plotL),
      y: yFromKg(L.weight)
    });
    return xy;
  };

  const smoothLineD = (points) => {
    if (points.length < 2) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i += 1) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const c1x = p0.x + (p1.x - p0.x) / 3;
      const c1y = p0.y;
      const c2x = p0.x + (2 * (p1.x - p0.x)) / 3;
      const c2y = p1.y;
      d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };

  const clearWeightChartDrawings = (svg) => {
    const labels = svg.querySelector("[data-weight-chart-labels]");
    if (labels) labels.innerHTML = "";
  };

  const formatWeightPointLabel = (w) => {
    const n = Number(w);
    if (!Number.isFinite(n)) return "";
    return Number.isInteger(n) ? String(Math.round(n)) : n.toFixed(1);
  };

  const drawWeightMilestoneLabels = (svg, displayPoints, tMin, tMax, yFromKg, xl, xr) => {
    const g = svg.querySelector("[data-weight-chart-labels]");
    if (!g || !displayPoints.length) return;
    g.innerHTML = "";
    const NS = "http://www.w3.org/2000/svg";
    const span = Math.max(1, tMax - tMin);
    const MIN_LABEL_X = 42;
    let lastLabelX = -1e9;
    let lastLabelStr = "";
    const n = displayPoints.length;
    displayPoints.forEach((p, idx) => {
      if (p._virtual) return;
      const tMs = fittrackPointTime(p);
      const u = (tMs - tMin) / span;
      const x = xl + Math.max(0, Math.min(1, u)) * (xr - xl);
      const y = yFromKg(p.weight);
      const labelStr = formatWeightPointLabel(p.weight);
      const isFirst = idx === 0;
      const isLast = idx === n - 1;
      const weightChanged = labelStr !== lastLabelStr;
      const farFromLastLabel = Math.abs(x - lastLabelX) >= MIN_LABEL_X;
      const showText =
        isFirst ||
        (!isLast && (weightChanged || farFromLastLabel)) ||
        (isLast && (n === 1 || farFromLastLabel || labelStr !== lastLabelStr));

      const circ = document.createElementNS(NS, "circle");
      circ.setAttribute("class", "chartDeltaDot");
      circ.setAttribute("cx", String(x));
      circ.setAttribute("cy", String(y));
      circ.setAttribute("r", "4.5");
      g.appendChild(circ);

      if (showText) {
        const stagger =
          !isFirst && !farFromLastLabel && weightChanged && Math.abs(x - lastLabelX) < MIN_LABEL_X ? 16 : 0;
        const txt = document.createElementNS(NS, "text");
        txt.setAttribute("class", "chartPointLabel");
        txt.setAttribute("x", String(x));
        txt.setAttribute("y", String(y - 12 - stagger));
        txt.setAttribute("text-anchor", "middle");
        txt.setAttribute("dominant-baseline", "auto");
        txt.textContent = labelStr;
        g.appendChild(txt);
        lastLabelX = x;
        lastLabelStr = labelStr;
      }
    });
  };

  const renderDeltaWeightChart = (svg, profileKg) => {
    const area = svg.querySelector("[data-weight-area]");
    const line = svg.querySelector("[data-weight-line]");
    if (!area || !line) return null;

    if (!Number.isFinite(profileKg) || profileKg <= 0) {
      clearWeightChartDrawings(svg);
      line.setAttribute("d", "");
      area.setAttribute("d", "");
      return null;
    }

    fittrackAppendWeightSnapshot(profileKg);
    const log = loadWeightLog();

    const { displayPoints, linePoints, tMin, tMax } = buildDisplayPoints(log, profileKg);
    if (!displayPoints.length) {
      clearWeightChartDrawings(svg);
      line.setAttribute("d", "");
      area.setAttribute("d", "");
      return null;
    }

    const plotL = 20;
    const plotR = 540;
    const plotT = 22;
    const plotB = 168;
    const areaFloor = 186;

    const W0 = displayPoints[0].weight;
    const weights = linePoints.map((p) => p.weight);
    let kMin = Math.min(...weights, W0);
    let kMax = Math.max(...weights, W0);
    if (Math.abs(kMax - kMin) < 1e-6) {
      kMin -= 1;
      kMax += 1;
    }
    if (kMax - kMin < 0.35) {
      kMin -= 0.4;
      kMax += 0.4;
    }
    const pad = Math.max(0.15, (kMax - kMin) * 0.08);
    kMin -= pad;
    kMax += pad;

    const yFromKg = (kg) => {
      if (kMax === kMin) return (plotT + plotB) / 2;
      return plotB - ((kg - kMin) / (kMax - kMin)) * (plotB - plotT);
    };

    let xy = buildDenseSmoothPolyline(linePoints, tMin, tMax, plotL, plotR, yFromKg);
    if (xy.length < 2) {
      const p0 = xy[0] || { x: (plotL + plotR) / 2, y: yFromKg(linePoints[0].weight) };
      xy = [p0, { x: p0.x + 40, y: p0.y }];
    }
    const lineD = smoothLineD(xy);
    line.setAttribute("d", lineD);
    area.setAttribute("d", `${lineD} L ${plotR} ${areaFloor} L ${plotL} ${areaFloor} Z`);

    drawWeightMilestoneLabels(svg, displayPoints, tMin, tMax, yFromKg, plotL, plotR);

    const lastReal = displayPoints[displayPoints.length - 1];
    const lastKg = lastReal.weight;
    const totalDelta = lastKg - W0;
    const pctVsInitial =
      W0 > 0 && Number.isFinite(lastKg) ? ((lastKg - W0) / W0) * 100 : null;
    svg.setAttribute(
      "aria-label",
      `Weight line chart: date on horizontal axis, kg on vertical axis; from ${W0.toFixed(
        1
      )} kg (first entry) to ${lastKg.toFixed(1)} kg.`
    );

    return { W0, lastKg, totalDelta, pctVsInitial };
  };

  Promise.all([
    fetch('/api/workouts', { headers: { Accept: 'application/json' } }).then((r) => (r.ok ? r.json() : { workouts: [] })),
    fetch('/api/profile', { headers: { Accept: 'application/json' } }).then((r) => (r.ok ? r.json() : { profile: null }))
  ])
    .then(([wData, pData]) => {
      const workouts = Array.isArray(wData?.workouts) ? wData.workouts : [];
      const profile = pData?.profile || {};
      const total = workouts.length;

      let volume = 0;
      let prs = 0;
      const perExercise = new Map();
      const daySet = new Set();
      const now = new Date();
      let workoutsLast30 = 0;

      workouts.forEach((w) => {
        const day = String(w.performed_at || '').slice(0, 10);
        if (day) daySet.add(day);
        const dt = new Date(w.performed_at);
        if (!Number.isNaN(dt.getTime())) {
          const diff = (now - dt) / (1000 * 60 * 60 * 24);
          if (diff <= 30) workoutsLast30 += 1;
        }
        (w.sets || []).forEach((s) => {
          const reps = Number(s.reps || 0);
          const weight = Number(s.weight || 0);
          const lift = reps * weight;
          volume += lift;
          if (weight >= 100) prs += 1;
          const key = String(s.exercise || 'Unknown').trim() || 'Unknown';
          const item = perExercise.get(key) || { sets: 0, bestWeight: 0, bestReps: 0 };
          item.sets += 1;
          if (weight > item.bestWeight) {
            item.bestWeight = weight;
            item.bestReps = reps;
          }
          perExercise.set(key, item);
        });
      });

      const height = Number(profile.height_cm || 0);
      const weight = Number(profile.weight_kg || 0);
      const bmi = height > 0 && weight > 0 ? weight / Math.pow(height / 100, 2) : Number(profile.bmi || 0);
      const calories = weight > 0 ? Math.round(weight * 33) : 0;
      const protein = weight > 0 ? Math.round(weight * 1.8) : 0;
      const consistency = Math.min(100, Math.round((workoutsLast30 / 30) * 100));

      totalEl.textContent = String(total);
      caloriesEls.forEach((el) => {
        el.textContent = calories.toLocaleString();
      });
      if (consistencyEl) consistencyEl.textContent = `${consistency}%`;
      currentWeightEls.forEach((el) => {
        el.textContent = fmt(weight).toFixed(1);
      });
      const trendWtEl = $("[data-progress-trend-current-weight]");
      const trendPctEl = $("[data-progress-trend-pct]");
      if (trendWtEl) {
        trendWtEl.textContent = weight > 0 ? fmt(weight).toFixed(1) : "—";
      }
      if (trendPctEl) {
        trendPctEl.textContent = "—";
        trendPctEl.classList.remove("is-loss", "is-gain", "is-flat");
        trendPctEl.classList.add("is-flat");
      }
      let weightDeltaInfo = null;
      if (chartSvg) {
        weightDeltaInfo = renderDeltaWeightChart(chartSvg, weight);
      }
      if (trendPctEl && weightDeltaInfo && weightDeltaInfo.pctVsInitial != null) {
        const p = weightDeltaInfo.pctVsInitial;
        trendPctEl.classList.remove("is-loss", "is-gain", "is-flat");
        if (Math.abs(p) < 0.05) {
          trendPctEl.classList.add("is-flat");
          trendPctEl.textContent = "0%";
        } else {
          const sign = p > 0 ? "+" : "";
          trendPctEl.textContent = `${sign}${p.toFixed(1)}%`;
          if (p < 0) trendPctEl.classList.add("is-loss");
          else trendPctEl.classList.add("is-gain");
        }
      }
      if (weightChangeEl) {
        if (weightDeltaInfo && Number.isFinite(weightDeltaInfo.totalDelta)) {
          const td = weightDeltaInfo.totalDelta;
          weightChangeEl.textContent = `${td >= 0 ? "+" : ""}${td.toFixed(1)} kg`;
          weightChangeEl.title = `Chênh lệch so với cân mốc lần đầu ghi (${weightDeltaInfo.W0.toFixed(1)} kg).`;
        } else {
          weightChangeEl.textContent = "—";
          weightChangeEl.title = "Nhập cân trên Profile để có mốc so sánh và biểu đồ.";
        }
      }
      if (streakEl) streakEl.textContent = String(profile.active_streak || 0);
      if (prsEl) prsEl.textContent = `+${prs}`;
      if (volumeEl) volumeEl.textContent = Math.round(volume).toLocaleString();
      if (proteinEl) proteinEl.textContent = protein.toLocaleString();

      if (tbody) {
        const rows = Array.from(perExercise.entries())
          .sort((a, b) => b[1].sets - a[1].sets)
          .slice(0, 8);
        if (!rows.length) {
          tbody.innerHTML = '<tr><td colspan="4" class="muted">No exercise data yet. Add workouts first.</td></tr>';
        } else {
          tbody.innerHTML = rows
            .map(
              ([name, stat]) => `
              <tr>
                <td>${name}</td>
                <td>${Math.round(stat.bestWeight)}kg x ${Math.round(stat.bestReps || 0)}</td>
                <td>${stat.sets}</td>
                <td><span class="okDot" aria-hidden="true"></span></td>
              </tr>
            `
            )
            .join('');
        }
      }

      // sync BMI field if home page not visited yet
      const bmiInput = $('input[name="bmi"]');
      if (bmiInput && !bmiInput.value && bmi > 0) bmiInput.value = bmi.toFixed(1);
    })
    .catch(() => {});
})();

// Workout library page: plans, custom builder, active session
(() => {
  const page = $('[data-workout-library]');
  if (!page) return;

  const listView = $('[data-workout-list-view]', page);
  const builderView = $('[data-workout-builder-view]', page);
  const detailView = $('[data-workout-detail-view]', page);
  const activeView = $('[data-workout-active-view]', page);
  const planListEl = $('[data-workout-plan-list]', page);
  const customPlanListEl = $('[data-custom-plan-list]', page);
  const backBtn = $('[data-workout-back]', page);
  const planNameEl = $('[data-workout-plan-name]', page);
  const titleEl = $('[data-workout-title]', page);
  const totalExerciseEl = $('[data-workout-total-exercises]', page);
  const durationEl = $('[data-workout-duration]', page);
  const caloriesEl = $('[data-workout-calories]', page);
  const exerciseListEl = $('[data-workout-exercise-list]', page);
  const startBtn = $('[data-workout-start]', page);
  const openBuilderBtn = $('[data-open-workout-builder]', page);
  const builderBackBtn = $('[data-workout-builder-back]', page);
  const exerciseRowsEl = $('[data-custom-exercise-rows]', page);
  const planTitleInput = $('[data-custom-plan-title]', page);
  const addRowBtn = $('[data-add-exercise-row]', page);
  const savePlanBtn = $('[data-save-custom-plan]', page);
  const summaryEl = $('[data-custom-plan-summary]', page);
  const activeBackBtn = $('[data-workout-active-back]', page);
  const activePlanTitleEl = $('[data-active-plan-title]', page);
  const activeElapsedEl = $('[data-active-elapsed]', page);
  const activeProgressFill = $('[data-active-progress-fill]', page);
  const activeExIndexEl = $('[data-active-exercise-index]', page);
  const activeOverallPctEl = $('[data-active-overall-pct]', page);
  const activeExImg = $('[data-active-exercise-img]', page);
  const activeExName = $('[data-active-exercise-name]', page);
  const activeExTarget = $('[data-active-exercise-target]', page);
  const activeSetPills = $('[data-active-set-pills]', page);
  const activeNextBtn = $('[data-active-next]', page);
  const activeFinishBtn = $('[data-active-finish]', page);

  if (!listView || !detailView || !planListEl || !exerciseListEl || !builderView || !activeView) return;

  const LS_KEY = "fittrack_custom_plans_v1";
  const PLACEHOLDER_GIF =
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=400&q=80";
  const CUSTOM_CARD_BG =
    "linear-gradient(135deg, rgba(30,58,95,.95) 0%, rgba(12,20,38,.98) 45%, rgba(22,36,62,.95) 100%)";

  const escapeHtml = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const parseExerciseTargets = (ex) => {
    if (Number.isFinite(ex.setCount) && (Number.isFinite(ex.repCount) || typeof ex.repCount === "string")) {
      const sc = Math.max(1, Math.floor(Number(ex.setCount)));
      const repLabel = typeof ex.repCount === "number" ? String(ex.repCount) : String(ex.repCount || "—");
      return { setCount: sc, repLabel };
    }
    const raw = String(ex.sets || "");
    const m = raw.match(/(\d+)\s*sets?\s*x\s*(.+)/i);
    if (m) {
      const setCount = Math.max(1, parseInt(m[1], 10));
      const rest = m[2].trim();
      return { setCount, repLabel: rest };
    }
    const m2 = raw.match(/(\d+)\s*sets?/i);
    if (m2) return { setCount: Math.max(1, parseInt(m2[1], 10)), repLabel: raw };
    return { setCount: 3, repLabel: raw || "—" };
  };

  const loadCustomPlans = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const data = raw ? JSON.parse(raw) : { plans: [] };
      return Array.isArray(data.plans) ? data.plans : [];
    } catch {
      return [];
    }
  };

  const saveCustomPlans = (arr) => {
    localStorage.setItem(LS_KEY, JSON.stringify({ plans: arr }));
  };

  let customPlans = loadCustomPlans();
  let currentPlan = null;
  let timerId = null;
  let session = null;

  const setView = (name) => {
    listView.hidden = name !== "list";
    builderView.hidden = name !== "builder";
    detailView.hidden = name !== "detail";
    activeView.hidden = name !== "active";
  };

  const stopTimer = () => {
    if (timerId) {
      clearInterval(timerId);
      timerId = null;
    }
  };

  const plans = [
    {
      id: "plan_1",
      planName: "PLAN 1",
      title: "GET IN SHAPE",
      subtitle: "Full Body Split",
      duration: 58,
      calories: 246,
      cover:
        "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80",
      exercises: [
        {
          name: "Barbell Back Squat",
          sets: "4 sets x 6-8 reps",
          gif: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=600&q=80"
        },
        {
          name: "Barbell Bench Press",
          sets: "3 sets x 6-8 reps",
          gif: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&w=600&q=80"
        },
        {
          name: "Seated DB Overhead Press",
          sets: "4 sets x 10-12 reps",
          gif: "https://images.unsplash.com/photo-1583454110551-21f2fa296cfe?auto=format&fit=crop&w=600&q=80"
        },
        {
          name: "Overhand Grip Lat Pulldown",
          sets: "4 sets x 8-10 reps",
          gif: "https://images.unsplash.com/photo-1540497077851-095a2f89b5ba?auto=format&fit=crop&w=600&q=80"
        },
        {
          name: "Roman Chair Back Extension",
          sets: "4 sets x 8-10 reps",
          gif: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=600&q=80"
        },
        {
          name: "Hack Squat",
          sets: "4 sets x 10-12 reps",
          gif: "https://images.unsplash.com/photo-1434609446631-334449a247e0?auto=format&fit=crop&w=600&q=80"
        }
      ]
    },
    {
      id: "plan_2",
      planName: "PLAN 2",
      title: "GET LEAN",
      subtitle: "Full Body Split",
      duration: 52,
      calories: 221,
      cover:
        "https://images.unsplash.com/photo-1518611012118-696072aa981a?auto=format&fit=crop&w=1400&q=80",
      exercises: [
        {
          name: "Incline DB Press",
          sets: "4 sets x 8-10 reps",
          gif: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=600&q=80"
        },
        {
          name: "Walking Lunge",
          sets: "3 sets x 12-14 reps",
          gif: "https://images.unsplash.com/photo-1518611012118-696072aa981a?auto=format&fit=crop&w=600&q=80"
        },
        {
          name: "Cable Row",
          sets: "4 sets x 10-12 reps",
          gif: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=600&q=80"
        },
        {
          name: "Mountain Climber",
          sets: "3 sets x 40 sec",
          gif: "https://images.unsplash.com/photo-1434682886298-185a09d6cbde?auto=format&fit=crop&w=600&q=80"
        }
      ]
    },
    {
      id: "plan_3",
      planName: "PLAN 3",
      title: "BUILD POWER",
      subtitle: "Upper + Lower",
      duration: 64,
      calories: 302,
      cover:
        "https://images.unsplash.com/photo-1526506118085-81ce109bd9e6?auto=format&fit=crop&w=1400&q=80",
      exercises: [
        {
          name: "Deadlift",
          sets: "5 sets x 3-5 reps",
          gif: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=600&q=80"
        },
        {
          name: "Push Press",
          sets: "4 sets x 5 reps",
          gif: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&w=600&q=80"
        },
        {
          name: "Weighted Pull Up",
          sets: "4 sets x 6 reps",
          gif: "https://images.unsplash.com/photo-1526506118085-81ce109bd9e6?auto=format&fit=crop&w=600&q=80"
        },
        {
          name: "Front Squat",
          sets: "4 sets x 6 reps",
          gif: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=600&q=80"
        }
      ]
    }
  ];

  const renderPlans = () => {
    planListEl.innerHTML = plans
      .map(
        (p) => `
          <button class="workoutPlanCard" type="button" data-plan-id="${escapeHtml(p.id)}" style="background-image:url('${p.cover.replace(/'/g, "%27")}')">
            <div class="workoutPlanCard__content">
              <h3 class="workoutPlanCard__title">${escapeHtml(p.title)}</h3>
              <div class="workoutPlanCard__sub">${escapeHtml(p.subtitle)}</div>
            </div>
          </button>
        `
      )
      .join("");
  };

  const normalizeStoredExercise = (e) => {
    const name = String(e?.name || "").trim();
    const setCount = Math.max(1, Math.floor(Number(e?.setCount) || 1));
    const repCount = Math.max(1, Math.floor(Number(e?.repCount) || 1));
    const minutes = Math.max(0, Number(e?.minutes) || 0);
    return {
      name,
      setCount,
      repCount,
      minutes,
      sets: `${setCount} sets x ${repCount} reps`,
      gif: String(e?.gif || "").trim() || PLACEHOLDER_GIF
    };
  };

  const storedPlanToRuntime = (sp) => {
    const exercises = (sp.exercises || []).map(normalizeStoredExercise).filter((x) => x.name);
    const duration =
      Number(sp.duration) > 0
        ? Math.round(Number(sp.duration))
        : Math.max(1, Math.round(exercises.reduce((s, x) => s + (x.minutes || 0), 0))) || exercises.length * 8;
    const calories =
      Number(sp.calories) > 0 ? Math.round(Number(sp.calories)) : Math.max(120, Math.round(duration * 4.25));
    return {
      id: sp.id,
      isCustom: true,
      planName: sp.planName || "LỊCH RIÊNG",
      title: sp.title || "TỰ TẠO",
      subtitle: sp.subtitle || "Lịch của bạn",
      duration,
      calories,
      cover: sp.cover || CUSTOM_CARD_BG,
      exercises
    };
  };

  const renderCustomPlans = () => {
    if (!customPlanListEl) return;
    if (!customPlans.length) {
      customPlanListEl.innerHTML = '<p class="muted" style="margin:0">Chưa có lịch tự tạo. Bấm «Tạo lịch mới» để bắt đầu.</p>';
      return;
    }
    customPlanListEl.innerHTML = customPlans
      .map((sp) => {
        const p = storedPlanToRuntime(sp);
        const bg =
          typeof p.cover === "string" && p.cover.startsWith("linear-gradient")
            ? `background-image:${p.cover}`
            : `background-image:url('${String(p.cover).replace(/'/g, "%27")}')`;
        return `
          <div class="workoutPlanCard workoutPlanCard--custom" style="${bg}" data-custom-card="${escapeHtml(p.id)}">
            <div class="workoutPlanCard__badge">
              <button class="workoutPlanCard__del" type="button" data-delete-custom="${escapeHtml(p.id)}" aria-label="Xóa lịch">×</button>
            </div>
            <div class="workoutPlanCard__content">
              <h3 class="workoutPlanCard__title">${escapeHtml(p.title)}</h3>
              <div class="workoutPlanCard__sub">${escapeHtml(p.subtitle)}</div>
            </div>
          </div>
        `;
      })
      .join("");
  };

  const findPlanById = (id) => {
    const preset = plans.find((p) => p.id === id);
    if (preset) return { ...preset, isCustom: false };
    const raw = customPlans.find((p) => p.id === id);
    return raw ? storedPlanToRuntime(raw) : null;
  };

  const openDetail = (plan) => {
    if (!plan) return;
    currentPlan = plan;
    setView("detail");
    planNameEl.textContent = plan.planName;
    titleEl.textContent = plan.subtitle;
    totalExerciseEl.textContent = `${plan.exercises.length} Exercises`;
    durationEl.textContent = `${plan.duration} Min`;
    caloriesEl.textContent = `${plan.calories} Cal`;
    exerciseListEl.innerHTML = plan.exercises
      .map(
        (ex) => `
          <article class="workoutExercise">
            <img class="workoutExercise__gif" src="${escapeHtml(ex.gif)}" alt="${escapeHtml(ex.name)}" loading="lazy" />
            <div>
              <h3 class="workoutExercise__name">${escapeHtml(ex.name)}</h3>
              <div class="workoutExercise__meta">${escapeHtml(ex.sets)}</div>
            </div>
          </article>
        `
      )
      .join("");
  };

  const closeDetail = () => {
    currentPlan = null;
    setView("list");
  };

  const exerciseRowTemplate = () => `
    <div class="workoutBuilderRow" data-builder-row>
      <div class="field">
        <label class="field__label">Tên bài tập</label>
        <input class="field__input profileInput" type="text" data-f-name placeholder="Ví dụ: Squat" autocomplete="off" />
      </div>
      <div class="workoutBuilderRow__grid">
        <div class="field workoutBuilderRow__mini">
          <label class="field__label">Set</label>
          <input class="field__input profileInput" type="number" min="1" step="1" data-f-sets value="3" />
        </div>
        <div class="field workoutBuilderRow__mini">
          <label class="field__label">Rep</label>
          <input class="field__input profileInput" type="number" min="1" step="1" data-f-reps value="10" />
        </div>
        <div class="field workoutBuilderRow__mini workoutBuilderRow__mini--wide">
          <label class="field__label">Phút (bài này)</label>
          <input class="field__input profileInput" type="number" min="0" step="1" data-f-min value="8" />
        </div>
        <button class="workoutBuilderRow__del" type="button" data-remove-row aria-label="Xóa dòng">×</button>
      </div>
    </div>
  `;

  const readBuilderRows = () => {
    const rows = $$("[data-builder-row]", exerciseRowsEl);
    return rows
      .map((row) => {
        const name = ($("[data-f-name]", row)?.value || "").trim();
        const setCount = Math.max(1, Math.floor(Number($("[data-f-sets]", row)?.value) || 1));
        const repCount = Math.max(1, Math.floor(Number($("[data-f-reps]", row)?.value) || 1));
        const minutes = Math.max(0, Number($("[data-f-min]", row)?.value) || 0);
        return { name, setCount, repCount, minutes };
      })
      .filter((r) => r.name);
  };

  const updateBuilderSummary = () => {
    if (!summaryEl) return;
    const rows = readBuilderRows();
    const totalMin = rows.reduce((s, r) => s + r.minutes, 0);
    summaryEl.textContent = `Tổng thời gian ước lượng: ${totalMin || 0} phút (${rows.length} bài)`;
  };

  const openBuilder = () => {
    if (planTitleInput) planTitleInput.value = "";
    if (exerciseRowsEl) {
      exerciseRowsEl.innerHTML = exerciseRowTemplate() + exerciseRowTemplate();
    }
    updateBuilderSummary();
    setView("builder");
  };

  const saveBuilderPlan = () => {
    const title = (planTitleInput?.value || "").trim();
    const rows = readBuilderRows();
    if (!title) {
      alert("Vui lòng nhập tên lịch.");
      return;
    }
    if (!rows.length) {
      alert("Thêm ít nhất một bài tập (tên bài không được để trống).");
      return;
    }
    const totalMin = rows.reduce((s, r) => s + r.minutes, 0) || Math.max(8, rows.length * 8);
    const id = `custom_${Date.now().toString(36)}`;
    const cardTitle = title.length > 14 ? `${title.slice(0, 14)}…` : title;
    const stored = {
      id,
      planName: "LỊCH RIÊNG",
      title: cardTitle.toUpperCase(),
      subtitle: title,
      duration: Math.round(totalMin),
      calories: Math.max(120, Math.round(totalMin * 4.25)),
      cover: CUSTOM_CARD_BG,
      exercises: rows.map((r) => ({
        name: r.name,
        setCount: r.setCount,
        repCount: r.repCount,
        minutes: r.minutes
      }))
    };
    customPlans = [stored, ...customPlans.filter((p) => p.id !== id)];
    saveCustomPlans(customPlans);
    renderCustomPlans();
    openDetail(storedPlanToRuntime(stored));
  };

  const refreshActiveProgress = () => {
    if (!session || !currentPlan) return;
    const exs = currentPlan.exercises;
    const t = parseExerciseTargets(exs[session.exerciseIndex]);
    const doneN = session.setDone.filter(Boolean).length;
    const frac = t.setCount ? doneN / t.setCount : 0;
    const pct = Math.min(100, Math.round(((session.exerciseIndex + frac) / exs.length) * 100));
    if (activeProgressFill) activeProgressFill.style.width = `${pct}%`;
    if (activeOverallPctEl) activeOverallPctEl.textContent = `${pct}%`;
    if (activeExIndexEl) activeExIndexEl.textContent = `Bài ${session.exerciseIndex + 1} / ${exs.length}`;
  };

  const renderActiveExercise = () => {
    if (!session || !currentPlan) return;
    const ex = currentPlan.exercises[session.exerciseIndex];
    const t = parseExerciseTargets(ex);
    session.setDone = Array.from({ length: t.setCount }, () => false);
    if (activeExImg) {
      activeExImg.src = ex.gif || PLACEHOLDER_GIF;
      activeExImg.alt = ex.name;
    }
    if (activeExName) activeExName.textContent = ex.name;
    if (activeExTarget) activeExTarget.textContent = `Mục tiêu: ${t.setCount} set × ${t.repLabel}`;
    if (activeSetPills) {
      activeSetPills.innerHTML = "";
      for (let i = 0; i < t.setCount; i += 1) {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "workoutSetPill";
        b.textContent = `Set ${i + 1}`;
        b.dataset.setIndex = String(i);
        activeSetPills.appendChild(b);
      }
    }
    if (activeNextBtn) activeNextBtn.hidden = true;
    if (activeFinishBtn) activeFinishBtn.hidden = true;
    refreshActiveProgress();
  };

  const onSetPillClick = (e) => {
    if (!session || !currentPlan) return;
    const pill = e.target.closest(".workoutSetPill");
    if (!pill || !activeSetPills?.contains(pill)) return;
    const idx = Number(pill.dataset.setIndex);
    if (!Number.isFinite(idx)) return;
    session.setDone[idx] = !session.setDone[idx];
    pill.classList.toggle("is-done", session.setDone[idx]);
    const t = parseExerciseTargets(currentPlan.exercises[session.exerciseIndex]);
    const allDone = session.setDone.length && session.setDone.every(Boolean);
    const lastEx = session.exerciseIndex >= currentPlan.exercises.length - 1;
    if (activeNextBtn) activeNextBtn.hidden = !(allDone && !lastEx);
    if (activeFinishBtn) activeFinishBtn.hidden = !(allDone && lastEx);
    refreshActiveProgress();
  };

  const startActiveSession = () => {
    if (!currentPlan || !currentPlan.exercises.length) return;
    stopTimer();
    session = {
      exerciseIndex: 0,
      setDone: [],
      startedAt: Date.now()
    };
    if (activePlanTitleEl) activePlanTitleEl.textContent = currentPlan.subtitle || currentPlan.title;
    if (activeElapsedEl) activeElapsedEl.textContent = "00:00";
    timerId = setInterval(() => {
      if (!session || !activeElapsedEl) return;
      const sec = Math.floor((Date.now() - session.startedAt) / 1000);
      const m = String(Math.floor(sec / 60)).padStart(2, "0");
      const s = String(sec % 60).padStart(2, "0");
      activeElapsedEl.textContent = `${m}:${s}`;
    }, 1000);
    setView("active");
    renderActiveExercise();
  };

  const goNextExercise = () => {
    if (!session || !currentPlan) return;
    session.exerciseIndex += 1;
    if (session.exerciseIndex >= currentPlan.exercises.length) return;
    renderActiveExercise();
  };

  const endActiveSession = (toDetail) => {
    stopTimer();
    session = null;
    if (toDetail && currentPlan) {
      openDetail(currentPlan);
    } else {
      currentPlan = null;
      setView("list");
    }
  };

  renderPlans();
  renderCustomPlans();

  planListEl.addEventListener("click", (e) => {
    const card = e.target.closest("[data-plan-id]");
    if (!card) return;
    const selected = findPlanById(card.getAttribute("data-plan-id"));
    openDetail(selected);
  });

  customPlanListEl?.addEventListener("click", (e) => {
    const del = e.target.closest("[data-delete-custom]");
    if (del) {
      e.preventDefault();
      e.stopPropagation();
      const id = del.getAttribute("data-delete-custom");
      customPlans = customPlans.filter((p) => p.id !== id);
      saveCustomPlans(customPlans);
      renderCustomPlans();
      return;
    }
    const card = e.target.closest("[data-custom-card]");
    if (!card) return;
    const id = card.getAttribute("data-custom-card");
    const selected = findPlanById(id);
    openDetail(selected);
  });

  backBtn?.addEventListener("click", closeDetail);
  openBuilderBtn?.addEventListener("click", openBuilder);
  builderBackBtn?.addEventListener("click", () => setView("list"));
  addRowBtn?.addEventListener("click", () => {
    exerciseRowsEl?.insertAdjacentHTML("beforeend", exerciseRowTemplate());
    updateBuilderSummary();
  });
  exerciseRowsEl?.addEventListener("input", updateBuilderSummary);
  exerciseRowsEl?.addEventListener("click", (e) => {
    if (e.target.closest("[data-remove-row]")) {
      const row = e.target.closest("[data-builder-row]");
      const rows = $$("[data-builder-row]", exerciseRowsEl);
      if (rows.length <= 1) return;
      row?.remove();
      updateBuilderSummary();
    }
  });
  savePlanBtn?.addEventListener("click", saveBuilderPlan);
  startBtn?.addEventListener("click", startActiveSession);
  activeNextBtn?.addEventListener("click", goNextExercise);
  activeFinishBtn?.addEventListener("click", () => endActiveSession(true));
  activeBackBtn?.addEventListener("click", () => {
    if (confirm("Kết thúc buổi tập và quay lại?")) endActiveSession(true);
  });
  activeSetPills?.addEventListener("click", onSetPillClick);
})();

