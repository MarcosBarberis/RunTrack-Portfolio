/* eslint-disable @typescript-eslint/no-explicit-any -- los cuerpos de request simulados llegan como JSON sin tipar */
// Modo demo: simula la API de RunTrack en el navegador con datos ficticios.
// Se activa con VITE_DEMO_MODE=true (lo usa el deploy de GitHub Pages).
// Ningún dato de esta demo corresponde a personas reales.

export const isDemoMode = import.meta.env.VITE_DEMO_MODE === "true";

export const DEMO_COACH = { username: "coach", password: "demo1234" };
export const DEMO_RUNNER_DNI = "30111222";

// ---------------------------------------------------------------------------
// Utilidades de fechas
// ---------------------------------------------------------------------------
const DAY = 24 * 60 * 60 * 1000;

function today(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function iso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parse(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY);
}
function weekStart(d: Date): Date {
  const dow = (d.getDay() + 6) % 7; // lunes = 0
  return addDays(d, -dow);
}
function round(n: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

// PRNG determinista para que la demo se vea igual en cada visita
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Modelo en memoria
// ---------------------------------------------------------------------------
type Category = { id: number; name: string; description: string | null; isActive: boolean };

type Runner = {
  id: number;
  fullName: string;
  age: number;
  goal: string | null;
  isActive: boolean;
  dni: string;
  categoryId: number;
  birthDate: string | null;
  currentStreak: number;
  bestStreak: number;
  lastPaymentDate: string | null;
  waiverDeliveredAt: string | null;
  emacDeliveredAt: string | null;
  termsAccepted: boolean;
};

type TrainingEvent = {
  id: number;
  date: string;
  time: string;
  title: string | null;
  location: string | null;
  notes: string | null;
  categoryId: number | null;
  isActive: boolean;
};

type Attendance = { id: number; trainingEventId: number; runnerId: number; status: number; note: string | null };

type WorkoutLog = {
  id: number;
  date: string;
  runnerId: number;
  trainingEventId: number | null;
  distanceKm: number;
  durationMin: number;
  rpe: number;
  hadPain: boolean;
  notes: string | null;
  isSelfRegistered: boolean;
  selfRegisteredTitle: string | null;
};

type Db = {
  categories: Category[];
  runners: Runner[];
  events: TrainingEvent[];
  attendances: Attendance[];
  logs: WorkoutLog[];
  seq: number;
};

const STATUS_TEXT: Record<number, string> = {
  0: "Unknown",
  1: "Confirmed",
  2: "Attended",
  3: "NoShow",
  4: "Solo",
};

function seed(): Db {
  const rand = rng(20260115);
  const t = today();

  const categories: Category[] = [
    { id: 1, name: "Inicial", description: "Primeros pasos: caminata y trote", isActive: true },
    { id: 2, name: "Intermedio", description: "Objetivo 10K", isActive: true },
    { id: 3, name: "Avanzado", description: "Media maratón y más", isActive: true },
  ];

  const people: Array<[string, number, string, number]> = [
    ["Lucía Fernández", 29, "10K", 2],
    ["Martín Gómez", 34, "Media maratón", 3],
    ["Sofía Ramírez", 26, "5K", 1],
    ["Diego Herrera", 41, "Salud", 1],
    ["Valentina Castro", 31, "10K", 2],
    ["Tomás Medina", 38, "Maratón", 3],
    ["Camila Suárez", 24, "5K", 1],
    ["Joaquín Rojas", 45, "10K", 2],
    ["Florencia Díaz", 33, "Media maratón", 3],
    ["Nicolás Acosta", 28, "10K", 2],
    ["Agustina Molina", 36, "Salud", 1],
    ["Federico Ortiz", 30, "Media maratón", 3],
    ["Julieta Navarro", 27, "10K", 2],
    ["Ramiro Paz", 52, "5K", 1],
  ];

  const paymentOffsets = [5, 12, 26, 33, 2, 18, 40, 8, 27, 15, null, 21, 9, 36];

  const runners: Runner[] = people.map(([fullName, age, goal, categoryId], i) => {
    const isDemoRunner = i === 0;
    // La runner de la demo cumple años en ~4 meses y tiene el EMMAC al día
    const birth = isDemoRunner
      ? new Date(t.getFullYear() - age, t.getMonth() + 4, 12)
      : addDays(t, -(age * 365 + Math.floor(rand() * 300)));
    const pay = paymentOffsets[i];
    const emacDelivered = isDemoRunner
      ? iso(addDays(t, -30))
      : i % 5 === 3
        ? null
        : iso(addDays(t, -Math.floor(40 + rand() * 300)));
    return {
      id: i + 1,
      fullName,
      age,
      goal,
      isActive: i !== 13,
      dni: i === 0 ? DEMO_RUNNER_DNI : String(30111222 + (i + 1) * 104729),
      categoryId,
      birthDate: iso(birth),
      currentStreak: 0,
      bestStreak: 0,
      lastPaymentDate: pay === null ? null : iso(addDays(t, -pay)),
      waiverDeliveredAt: i % 6 === 4 ? null : iso(addDays(t, -120 - i * 3)),
      emacDeliveredAt: emacDelivered,
      termsAccepted: true,
    };
  });

  // Entrenamientos: lunes, miércoles y viernes de las últimas 12 semanas + próximas 2
  const events: TrainingEvent[] = [];
  const plans: Record<number, Array<[string, string]>> = {
    0: [["Fondo suave", "Parque Sarmiento"], ["Técnica de carrera", "Pista municipal"]],
    2: [["Pasadas 6 x 400 m", "Pista municipal"], ["Cambios de ritmo", "Costanera"]],
    4: [["Fartlek 30'", "Costanera"], ["Cuestas", "Cerro de la Cruz"]],
  };
  let eventId = 1;
  const start = weekStart(addDays(t, -7 * 12));
  for (let d = start; d <= addDays(t, 14); d = addDays(d, 1)) {
    const dow = (d.getDay() + 6) % 7;
    if (!(dow in plans)) continue;
    const variant = plans[dow][Math.floor(rand() * plans[dow].length)];
    events.push({
      id: eventId++,
      date: iso(d),
      time: dow === 4 ? "08:00:00" : "19:00:00",
      title: variant[0],
      location: variant[1],
      notes: dow === 0 ? "Entrada en calor 10' + elongación al final" : null,
      categoryId: null,
      isActive: true,
    });
  }

  // Asistencias y registros de entrenamiento de eventos pasados
  const attendances: Attendance[] = [];
  const logs: WorkoutLog[] = [];
  let attId = 1;
  let logId = 1;
  const pastEvents = events.filter((e) => parse(e.date) < t);
  for (const ev of pastEvents) {
    for (const r of runners) {
      if (!r.isActive) continue;
      const commitment = r.categoryId === 3 ? 0.85 : r.categoryId === 2 ? 0.72 : 0.6;
      const attended = rand() < commitment;
      if (!attended) continue;
      attendances.push({ id: attId++, trainingEventId: ev.id, runnerId: r.id, status: 2, note: null });

      if (rand() < 0.88) {
        const baseKm = r.categoryId === 3 ? 11 : r.categoryId === 2 ? 7.5 : 4.5;
        const basePace = r.categoryId === 3 ? 5.1 : r.categoryId === 2 ? 5.9 : 7.2;
        const km = round(baseKm * (0.75 + rand() * 0.5), 1);
        const pace = basePace * (0.92 + rand() * 0.16);
        logs.push({
          id: logId++,
          date: ev.date,
          runnerId: r.id,
          trainingEventId: ev.id,
          distanceKm: km,
          durationMin: Math.round(km * pace),
          rpe: Math.min(5, Math.max(1, Math.round(2 + rand() * 3))),
          hadPain: rand() < 0.08,
          notes: null,
          isSelfRegistered: false,
          selfRegisteredTitle: null,
        });
      }
    }
  }

  // Algunos entrenamientos libres de la runner de la demo
  for (let w = 1; w <= 6; w++) {
    const d = addDays(weekStart(t), -7 * w + 5);
    logs.push({
      id: logId++,
      date: iso(d),
      runnerId: 1,
      trainingEventId: null,
      distanceKm: round(6 + rand() * 4, 1),
      durationMin: Math.round((6 + rand() * 4) * 5.8),
      rpe: 3,
      hadPain: false,
      notes: "Rodaje del fin de semana",
      isSelfRegistered: true,
      selfRegisteredTitle: "Rodaje libre",
    });
  }

  const db: Db = { categories, runners, events, attendances, logs, seq: 100000 };
  db.runners.forEach((r) => recalcStreak(db, r.id));
  return db;
}

// ---------------------------------------------------------------------------
// Persistencia por pestaña (se reinicia al cerrar el navegador)
// ---------------------------------------------------------------------------
const STORAGE_KEY = "runtrack_demo_db_v1";

function load(): Db {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    /* sin almacenamiento */
  }
  return seed();
}

let db: Db | null = null;
function getDb(): Db {
  if (!db) db = load();
  return db;
}
function save() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* sin almacenamiento */
  }
}
function nextId(): number {
  const d = getDb();
  d.seq += 1;
  return d.seq;
}

// ---------------------------------------------------------------------------
// Reglas de negocio (espejo simplificado de la API)
// ---------------------------------------------------------------------------
const BILLING_CYCLE_DAYS = 30;
const GRACE_DAYS = 7;

function billing(r: Runner) {
  const t = today();
  if (!r.lastPaymentDate) {
    return { feeStatus: 3, dueDate: null, hardBlockDate: null, planVisible: false };
  }
  const due = addDays(parse(r.lastPaymentDate), BILLING_CYCLE_DAYS);
  const block = addDays(due, GRACE_DAYS);
  const feeStatus = t < due ? (t >= addDays(due, -5) ? 1 : 0) : 2;
  return { feeStatus, dueDate: iso(due), hardBlockDate: iso(block), planVisible: t <= block };
}

function emacValidUntil(r: Runner): string | null {
  if (!r.emacDeliveredAt || !r.birthDate) return null;
  const delivered = parse(r.emacDeliveredAt);
  const birth = parse(r.birthDate);
  let next = new Date(delivered.getFullYear(), birth.getMonth(), birth.getDate());
  if (next <= delivered) next = new Date(delivered.getFullYear() + 1, birth.getMonth(), birth.getDate());
  return iso(next);
}

function docStatus(r: Runner) {
  const waiverStatus = r.waiverDeliveredAt ? 1 : 0;
  const until = emacValidUntil(r);
  const emacStatus = !r.emacDeliveredAt ? 0 : until && parse(until) < today() ? 2 : 1;
  return { waiverStatus, emacStatus, emacValidUntil: until };
}

function recalcStreak(d: Db, runnerId: number) {
  const r = d.runners.find((x) => x.id === runnerId);
  if (!r) return;
  const attended = new Set(
    d.attendances.filter((a) => a.runnerId === runnerId && a.status === 2).map((a) => a.trainingEventId)
  );
  const past = d.events
    .filter((e) => e.isActive && parse(e.date) < today())
    .sort((a, b) => a.date.localeCompare(b.date));
  let current = 0;
  let best = 0;
  for (const e of past) {
    if (attended.has(e.id)) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  r.currentStreak = current;
  r.bestStreak = best;
}

function categoryName(id: number | null | undefined): string {
  return getDb().categories.find((c) => c.id === id)?.name ?? "";
}

function eventDto(e: TrainingEvent) {
  const c = getDb().categories.find((x) => x.id === e.categoryId);
  return { ...e, category: c ? { id: c.id, name: c.name, description: c.description } : null };
}

function logDto(l: WorkoutLog) {
  const r = getDb().runners.find((x) => x.id === l.runnerId);
  return {
    id: l.id,
    date: l.date,
    runnerId: l.runnerId,
    runnerName: r?.fullName ?? "",
    plannedWorkoutId: null,
    plannedType: null,
    distanceKm: l.distanceKm,
    durationMin: l.durationMin,
    paceMinPerKm: l.distanceKm > 0 ? round(l.durationMin / l.distanceKm) : 0,
    rpe: l.rpe,
    hadPain: l.hadPain,
    notes: l.notes,
    isSelfRegistered: l.isSelfRegistered,
    selfRegisteredTitle: l.selfRegisteredTitle,
  };
}

function summarize(start: Date, end: Date, items: WorkoutLog[]) {
  const sessions = items.length;
  const totalKm = items.reduce((s, x) => s + x.distanceKm, 0);
  const totalMin = items.reduce((s, x) => s + x.durationMin, 0);
  return {
    weekStart: iso(start),
    weekEnd: iso(end),
    sessions,
    totalKm: round(totalKm),
    totalMinutes: totalMin,
    activeRunners: new Set(items.map((x) => x.runnerId)).size,
    avgPaceMinPerKm: totalKm > 0 ? round(totalMin / totalKm) : 0,
    painRate: sessions ? round(items.filter((x) => x.hadPain).length / sessions, 3) : 0,
    avgRpe: sessions ? round(items.reduce((s, x) => s + x.rpe, 0) / sessions) : 0,
  };
}

// ---------------------------------------------------------------------------
// Sesión simulada
// ---------------------------------------------------------------------------
function fakeToken(sub: string): string {
  const enc = (o: object) => btoa(JSON.stringify(o)).replace(/=+$/, "");
  const exp = Math.floor(Date.now() / 1000) + 12 * 3600;
  return `${enc({ alg: "none", typ: "JWT" })}.${enc({ sub, exp, demo: true })}.demo`;
}

function currentRunnerId(): number | null {
  try {
    const token = localStorage.getItem("runtrack_token");
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1]));
    const m = /^runner:(\d+)$/.exec(payload.sub ?? "");
    return m ? Number(m[1]) : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
class DemoHttpError extends Error {
  constructor(status: number, message: string) {
    super(`API Error (${status}): ${message}`);
  }
}

type Ctx = { method: string; path: string; query: URLSearchParams; body: any };
type Handler = (ctx: Ctx, params: string[]) => unknown;

const routes: Array<[string, RegExp, Handler]> = [];
function route(method: string, pattern: string, handler: Handler) {
  const re = new RegExp("^" + pattern.replace(/:\w+/g, "(\\d+)") + "$");
  routes.push([method, re, handler]);
}

function me(): Runner {
  const id = currentRunnerId();
  const r = getDb().runners.find((x) => x.id === id);
  if (!r) throw new DemoHttpError(401, "Sesión de runner inválida.");
  return r;
}

function inRange(date: string, from?: string | null, to?: string | null) {
  return (!from || date >= from.slice(0, 10)) && (!to || date <= to.slice(0, 10));
}

// --- Auth
route("POST", "/api/auth/coach-login", ({ body }) => {
  if (body?.username?.trim() !== DEMO_COACH.username || body?.password !== DEMO_COACH.password)
    throw new DemoHttpError(401, "Usuario o contraseña incorrectos.");
  return { token: fakeToken("coach"), role: "Coach" };
});

route("POST", "/api/auth/runner-login", ({ body }) => {
  const dni = String(body?.dni ?? "").replace(/\D/g, "");
  const r = getDb().runners.find((x) => x.dni === dni);
  if (!r) throw new DemoHttpError(401, "No encontramos un runner con ese DNI.");
  if (!r.isActive)
    throw new DemoHttpError(403, "Runner fuera de actividad, contactarse con su profesor para más info.");
  return { token: fakeToken(`runner:${r.id}`), role: "Runner" };
});

// --- Runner (me)
route("GET", "/api/runners/me", () => {
  const r = me();
  return {
    id: r.id,
    fullName: r.fullName,
    dni: r.dni,
    birthDate: r.birthDate,
    currentStreak: r.currentStreak,
    bestStreak: r.bestStreak,
  };
});

route("PATCH", "/api/runners/me/birthdate", ({ body }) => {
  me().birthDate = body?.birthDate ?? null;
  save();
});

route("GET", "/api/membership/my-status", () => {
  const r = me();
  return {
    ...billing(r),
    lastPaymentDate: r.lastPaymentDate,
    ...docStatus(r),
    termsAccepted: r.termsAccepted,
    termsVersion: r.termsAccepted ? "v1" : null,
  };
});

const acceptTerms = () => {
  me().termsAccepted = true;
  save();
};
route("POST", "/api/membership/accept-terms", acceptTerms);
route("POST", "/api/terms/accept", acceptTerms);

route("GET", "/api/training-events/my", ({ query }) => {
  const r = me();
  const t = today();
  const from = iso(addDays(t, -15));
  const to = iso(addDays(t, 15));
  return getDb()
    .events.filter((e) => e.isActive && (e.categoryId == null || e.categoryId === r.categoryId))
    .filter((e) => inRange(e.date, from, to))
    .filter((e) => inRange(e.date, query.get("from"), query.get("to")))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(eventDto);
});

route("GET", "/api/attendance/my/:id", (_c, [eid]) => {
  const r = me();
  const a = getDb().attendances.find((x) => x.trainingEventId === Number(eid) && x.runnerId === r.id);
  if (!a) return { exists: false };
  return {
    exists: true,
    id: a.id,
    trainingEventId: a.trainingEventId,
    runnerId: a.runnerId,
    status: a.status,
    statusText: STATUS_TEXT[a.status],
  };
});

route("PUT", "/api/attendance/my/:id", ({ body }, [eid]) => {
  const r = me();
  const d = getDb();
  let a = d.attendances.find((x) => x.trainingEventId === Number(eid) && x.runnerId === r.id);
  if (!a) {
    a = { id: nextId(), trainingEventId: Number(eid), runnerId: r.id, status: 0, note: null };
    d.attendances.push(a);
  }
  a.status = Number(body?.status ?? 2);
  a.note = body?.note ?? null;
  recalcStreak(d, r.id);
  save();
  return { id: a.id, status: a.status };
});

route("GET", "/api/workout-logs/my/:id", (_c, [eid]) => {
  const r = me();
  const l = getDb().logs.find((x) => x.trainingEventId === Number(eid) && x.runnerId === r.id);
  if (!l) return null;
  return { distanceKm: l.distanceKm, durationMin: l.durationMin, rpe: l.rpe, hadPain: l.hadPain, notes: l.notes, exists: true };
});

function upsertEventLog(runnerId: number, eid: number, body: any) {
  const d = getDb();
  const ev = d.events.find((e) => e.id === eid);
  if (!ev) throw new DemoHttpError(404, "Entrenamiento inexistente.");
  let l = d.logs.find((x) => x.trainingEventId === eid && x.runnerId === runnerId);
  if (!l) {
    l = {
      id: nextId(),
      date: ev.date,
      runnerId,
      trainingEventId: eid,
      distanceKm: 0,
      durationMin: 0,
      rpe: 1,
      hadPain: false,
      notes: null,
      isSelfRegistered: false,
      selfRegisteredTitle: null,
    };
    d.logs.push(l);
  }
  l.distanceKm = Number(body?.distanceKm ?? 0);
  l.durationMin = Number(body?.durationMin ?? 0);
  l.rpe = Number(body?.rpe ?? 3);
  l.hadPain = !!body?.hadPain;
  l.notes = body?.notes ?? null;
  return l;
}

route("PUT", "/api/workout-logs/my/:id", ({ body }, [eid]) => {
  const l = upsertEventLog(me().id, Number(eid), body);
  save();
  return { id: l.id };
});

route("POST", "/api/runner-training/:id", ({ body }, [eid]) => {
  const r = me();
  const d = getDb();
  let a = d.attendances.find((x) => x.trainingEventId === Number(eid) && x.runnerId === r.id);
  if (!a) {
    a = { id: nextId(), trainingEventId: Number(eid), runnerId: r.id, status: 0, note: null };
    d.attendances.push(a);
  }
  a.status = Number(body?.status ?? 2);
  a.note = body?.note ?? null;
  if (a.status === 2 || a.status === 4) upsertEventLog(r.id, Number(eid), body);
  recalcStreak(d, r.id);
  save();
  return { ok: true };
});

route("GET", "/api/workout-logs", ({ query }) => {
  const runnerId = currentRunnerId() ?? (query.get("runnerId") ? Number(query.get("runnerId")) : null);
  return getDb()
    .logs.filter((l) => runnerId == null || l.runnerId === runnerId)
    .filter((l) => inRange(l.date, query.get("dateFrom"), query.get("dateTo")))
    .sort((a, b) => b.date.localeCompare(a.date))
    .map(logDto);
});

route("POST", "/api/workout-logs/self", ({ body }) => {
  const r = me();
  const l: WorkoutLog = {
    id: nextId(),
    date: body.date,
    runnerId: r.id,
    trainingEventId: null,
    distanceKm: Number(body.distanceKm),
    durationMin: Number(body.durationMin),
    rpe: Number(body.rpe),
    hadPain: !!body.hadPain,
    notes: body.notes ?? null,
    isSelfRegistered: true,
    selfRegisteredTitle: body.title,
  };
  getDb().logs.push(l);
  save();
  return { id: l.id };
});

route("DELETE", "/api/workout-logs/self/:id", (_c, [id]) => {
  const r = me();
  const d = getDb();
  d.logs = d.logs.filter((l) => !(l.id === Number(id) && l.runnerId === r.id && l.isSelfRegistered));
  save();
});

// --- Coach: categorías
route("GET", "/api/categories", () => getDb().categories);
route("POST", "/api/categories", ({ body }) => {
  const c: Category = { id: nextId(), name: body.name, description: body.description ?? null, isActive: body.isActive ?? true };
  getDb().categories.push(c);
  save();
  return c;
});
route("PUT", "/api/categories/:id", ({ body }, [id]) => {
  const c = getDb().categories.find((x) => x.id === Number(id));
  if (!c) throw new DemoHttpError(404, "Categoría inexistente.");
  Object.assign(c, { name: body.name, description: body.description ?? null, isActive: body.isActive ?? c.isActive });
  save();
  return c;
});
route("PATCH", "/api/categories/:id/status", ({ body }, [id]) => {
  const c = getDb().categories.find((x) => x.id === Number(id));
  if (!c) throw new DemoHttpError(404, "Categoría inexistente.");
  c.isActive = !!body.isActive;
  save();
  return { id: c.id, isActive: c.isActive };
});

// --- Coach: runners
function runnerListDto(r: Runner) {
  return {
    id: r.id,
    fullName: r.fullName,
    age: r.age,
    goal: r.goal,
    isActive: r.isActive,
    dni: r.dni,
    categoryId: r.categoryId,
    categoryName: categoryName(r.categoryId),
    birthDate: r.birthDate,
    currentStreak: r.currentStreak,
    bestStreak: r.bestStreak,
  };
}

route("GET", "/api/runners", () => getDb().runners.map(runnerListDto));
route("GET", "/api/runners/top-streaks", () =>
  getDb()
    .runners.filter((r) => r.isActive)
    .sort((a, b) => b.bestStreak - a.bestStreak)
    .slice(0, 5)
    .map((r) => ({ runnerId: r.id, fullName: r.fullName, bestStreak: r.bestStreak }))
);
route("POST", "/api/runners", ({ body }) => {
  const r: Runner = {
    id: nextId(),
    fullName: body.fullName,
    age: Number(body.age ?? 0),
    goal: body.goal ?? null,
    isActive: true,
    dni: String(body.dni ?? ""),
    categoryId: Number(body.categoryId),
    birthDate: body.birthDate ?? null,
    currentStreak: 0,
    bestStreak: 0,
    lastPaymentDate: null,
    waiverDeliveredAt: null,
    emacDeliveredAt: null,
    termsAccepted: false,
  };
  getDb().runners.push(r);
  save();
  return runnerListDto(r);
});
route("PUT", "/api/runners/:id", ({ body }, [id]) => {
  const r = getDb().runners.find((x) => x.id === Number(id));
  if (!r) throw new DemoHttpError(404, "Runner no existe.");
  Object.assign(r, {
    fullName: body.fullName ?? r.fullName,
    age: body.age != null ? Number(body.age) : r.age,
    goal: body.goal ?? r.goal,
    categoryId: body.categoryId != null ? Number(body.categoryId) : r.categoryId,
    dni: body.dni != null ? String(body.dni) : r.dni,
    birthDate: body.birthDate ?? r.birthDate,
  });
  save();
  return runnerListDto(r);
});
route("PATCH", "/api/runners/:id/status", ({ body }, [id]) => {
  const r = getDb().runners.find((x) => x.id === Number(id));
  if (!r) throw new DemoHttpError(404, "Runner no existe.");
  r.isActive = !!body.isActive;
  save();
  return { id: r.id, isActive: r.isActive };
});
route("DELETE", "/api/runners/:id", (_c, [id]) => {
  const r = getDb().runners.find((x) => x.id === Number(id));
  if (r) r.isActive = false;
  save();
});

route("GET", "/api/runners/billing", () =>
  getDb()
    .runners.filter((r) => r.isActive)
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((r) => ({ id: r.id, fullName: r.fullName, dni: r.dni, lastPaymentDate: r.lastPaymentDate, ...billing(r) }))
);
route("PATCH", "/api/runners/:id/payment", ({ body }, [id]) => {
  const r = getDb().runners.find((x) => x.id === Number(id));
  if (!r) throw new DemoHttpError(404, "Runner not found.");
  const paidAt = body?.paidAt ? parse(body.paidAt) : today();
  const months = Math.min(12, Math.max(1, Number(body?.months ?? 1)));
  r.lastPaymentDate = iso(addDays(paidAt, BILLING_CYCLE_DAYS * (months - 1)));
  save();
});

route("GET", "/api/runners/documents", () =>
  getDb()
    .runners.filter((r) => r.isActive)
    .sort((a, b) => a.fullName.localeCompare(b.fullName))
    .map((r) => ({
      id: r.id,
      fullName: r.fullName,
      dni: r.dni,
      isActive: r.isActive,
      waiverDeliveredAt: r.waiverDeliveredAt,
      emacDeliveredAt: r.emacDeliveredAt,
      emacValidUntil: emacValidUntil(r),
    }))
);
route("PATCH", "/api/runners/:id/documents", ({ body }, [id]) => {
  const r = getDb().runners.find((x) => x.id === Number(id));
  if (!r) throw new DemoHttpError(404, "Runner not found.");
  if ("waiverDeliveredAt" in body) r.waiverDeliveredAt = body.waiverDeliveredAt;
  if ("emacDeliveredAt" in body) r.emacDeliveredAt = body.emacDeliveredAt;
  save();
});

// --- Coach: entrenamientos
route("GET", "/api/training-events", ({ query }) =>
  getDb()
    .events.filter((e) => inRange(e.date, query.get("from"), query.get("to")))
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time))
    .map(eventDto)
);
route("GET", "/api/training-events/:id", (_c, [id]) => {
  const e = getDb().events.find((x) => x.id === Number(id));
  if (!e) throw new DemoHttpError(404, "Entrenamiento inexistente.");
  return eventDto(e);
});
route("POST", "/api/training-events", ({ body }) => {
  const e: TrainingEvent = {
    id: nextId(),
    date: body.date,
    time: body.time?.length === 5 ? `${body.time}:00` : body.time,
    title: body.title ?? null,
    location: body.location ?? null,
    notes: body.notes ?? null,
    categoryId: body.categoryId ?? null,
    isActive: true,
  };
  getDb().events.push(e);
  save();
  return { id: e.id };
});
route("PUT", "/api/training-events/:id", ({ body }, [id]) => {
  const e = getDb().events.find((x) => x.id === Number(id));
  if (!e) throw new DemoHttpError(404, "Entrenamiento inexistente.");
  Object.assign(e, {
    date: body.date ?? e.date,
    time: body.time ? (body.time.length === 5 ? `${body.time}:00` : body.time) : e.time,
    title: body.title ?? null,
    location: body.location ?? null,
    notes: body.notes ?? null,
    categoryId: body.categoryId ?? null,
  });
  save();
});
route("PATCH", "/api/training-events/:id/status", ({ body }, [id]) => {
  const e = getDb().events.find((x) => x.id === Number(id));
  if (!e) throw new DemoHttpError(404, "Entrenamiento inexistente.");
  e.isActive = !!body.isActive;
  save();
  return { id: e.id, isActive: e.isActive };
});

// --- Coach: analítica y reportes
function filteredLogs(query: URLSearchParams, fromKey = "from", toKey = "to") {
  const d = getDb();
  const runnerId = query.get("runnerId");
  const categoryId = query.get("categoryId");
  return d.logs
    .filter((l) => inRange(l.date, query.get(fromKey), query.get(toKey)))
    .filter((l) => !runnerId || l.runnerId === Number(runnerId))
    .filter(
      (l) => runnerId || !categoryId || d.runners.find((r) => r.id === l.runnerId)?.categoryId === Number(categoryId)
    );
}

route("GET", "/api/analytics/kpi-series", ({ query }) => {
  const to = query.get("to") ? parse(query.get("to")!) : today();
  const weeks = Number(query.get("weeks") ?? 12);
  const from = query.get("from") ? parse(query.get("from")!) : addDays(to, -weeks * 7);
  const q = new URLSearchParams(query);
  q.set("from", iso(from));
  q.set("to", iso(to));
  const logs = filteredLogs(q);

  if (query.get("groupBy") === "month") {
    const months = new Map<string, WorkoutLog[]>();
    for (const l of logs) {
      const key = l.date.slice(0, 7);
      months.set(key, [...(months.get(key) ?? []), l]);
    }
    return [...months.keys()].sort().map((k) => {
      const start = parse(`${k}-01`);
      const end = addDays(new Date(start.getFullYear(), start.getMonth() + 1, 1), -1);
      return summarize(start, end, months.get(k)!);
    });
  }

  const out = [];
  for (let ws = weekStart(from); ws <= to; ws = addDays(ws, 7)) {
    const we = addDays(ws, 6);
    out.push(summarize(ws, we, logs.filter((l) => inRange(l.date, iso(ws), iso(we)))));
  }
  return out;
});

route("GET", "/api/analytics/runner-summary", ({ query }) => {
  const runnerId = Number(query.get("runnerId"));
  const to = query.get("to") ? parse(query.get("to")!) : today();
  const from = query.get("from") ? parse(query.get("from")!) : addDays(to, -Number(query.get("weeks") ?? 4) * 7);
  const logs = getDb().logs.filter((l) => l.runnerId === runnerId && inRange(l.date, iso(from), iso(to)));
  const s = summarize(from, to, logs);
  return {
    runnerId,
    runnerName: getDb().runners.find((r) => r.id === runnerId)?.fullName ?? "",
    from: iso(from),
    to: iso(to),
    sessions: s.sessions,
    totalKm: s.totalKm,
    totalMinutes: s.totalMinutes,
    avgPaceMinPerKm: s.avgPaceMinPerKm,
    painRate: s.painRate,
    avgRpe: s.avgRpe,
  };
});

route("GET", "/api/reports/workout-logs", ({ query }) => {
  const d = getDb();
  return filteredLogs(query)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((l) => {
      const r = d.runners.find((x) => x.id === l.runnerId)!;
      return {
        workoutLogId: l.id,
        id: l.id,
        date: l.date,
        runnerId: r.id,
        runnerName: r.fullName,
        categoryId: r.categoryId,
        categoryName: categoryName(r.categoryId),
        distanceKm: l.distanceKm,
        durationMin: l.durationMin,
        paceMinPerKm: l.distanceKm > 0 ? round(l.durationMin / l.distanceKm) : 0,
        rpe: l.rpe,
        hadPain: l.hadPain,
        notes: l.notes,
        type: l.isSelfRegistered ? l.selfRegisteredTitle : "Entrenamiento grupal",
      };
    });
});

route("GET", "/api/reports/attendance", ({ query }) => {
  const d = getDb();
  const runnerId = query.get("runnerId");
  const categoryId = query.get("categoryId");
  const eventId = query.get("trainingEventId");
  const out = [];
  const events = d.events
    .filter((e) => e.isActive && parse(e.date) < today())
    .filter((e) => inRange(e.date, query.get("from"), query.get("to")))
    .filter((e) => !eventId || e.id === Number(eventId));
  for (const ev of events) {
    for (const r of d.runners) {
      if (!r.isActive) continue;
      if (runnerId && r.id !== Number(runnerId)) continue;
      if (categoryId && r.categoryId !== Number(categoryId)) continue;
      if (ev.categoryId != null && ev.categoryId !== r.categoryId) continue;
      const a = d.attendances.find((x) => x.trainingEventId === ev.id && x.runnerId === r.id);
      const status = a && a.status !== 0 ? a.status : 3;
      out.push({
        attendanceId: a?.id ?? 0,
        trainingEventId: ev.id,
        eventDate: ev.date,
        eventTime: ev.time,
        eventTitle: ev.title,
        location: ev.location,
        runnerId: r.id,
        runnerName: r.fullName,
        categoryId: r.categoryId,
        categoryName: categoryName(r.categoryId),
        status,
        statusText: status === 3 ? "Ausente" : STATUS_TEXT[status],
      });
    }
  }
  return out.sort((a, b) => b.eventDate.localeCompare(a.eventDate));
});

route("GET", "/api/reports/weekly-kpis", ({ query }) => {
  const from = parse(query.get("from") ?? iso(addDays(today(), -84)));
  const to = parse(query.get("to") ?? iso(today()));
  const logs = filteredLogs(query);
  const out = [];
  for (let ws = weekStart(from); ws <= to; ws = addDays(ws, 7)) {
    const we = addDays(ws, 6);
    const items = logs.filter((l) => inRange(l.date, iso(ws), iso(we)));
    if (items.length) out.push(summarize(ws, we, items));
  }
  return out;
});

// ---------------------------------------------------------------------------
// Punto de entrada
// ---------------------------------------------------------------------------
export async function handleDemoRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const [path, qs = ""] = endpoint.split("?");
  const body = typeof options.body === "string" && options.body ? JSON.parse(options.body) : undefined;

  // Pequeña latencia para que los estados de carga se vean naturales
  await new Promise((r) => setTimeout(r, 150 + Math.random() * 150));

  for (const [m, re, handler] of routes) {
    if (m !== method) continue;
    const match = re.exec(path);
    if (!match) continue;
    const result = handler({ method, path, query: new URLSearchParams(qs), body }, match.slice(1));
    // Copia profunda para que la UI no mute el estado interno
    return (result === undefined ? undefined : JSON.parse(JSON.stringify(result))) as T;
  }

  throw new DemoHttpError(404, `Endpoint no disponible en la demo: ${method} ${path}`);
}
