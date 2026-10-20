// src/services/api.ts
import type { Runner, WorkoutLog, Attendance, WeeklyKPI } from "../types";

import { isDemoMode, handleDemoRequest } from "../demo/mockApi";

const API_BASE_URL: string =
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:5053" : "");

if (!API_BASE_URL && import.meta.env.PROD && !isDemoMode) {
  console.error("VITE_API_URL no está configurada.");
}

// ----------------------
// SESIÓN (JWT)
// ----------------------
export type Role = "coach" | "runner";

const TOKEN_STORAGE = "runtrack_token";
const ROLE_STORAGE = "runtrack_role";
const RUNNER_USER_STORAGE = "runtrack_runner_username";

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* almacenamiento no disponible */
  }
}
function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* almacenamiento no disponible */
  }
}

/** Lee el vencimiento (exp) del JWT. Solo para la UI: la validación real la hace la API. */
function tokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" && payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function setSession(token: string, role: Role) {
  safeSet(TOKEN_STORAGE, token);
  safeSet(ROLE_STORAGE, role);
}

export function getToken(): string | null {
  const token = safeGet(TOKEN_STORAGE);
  if (!token) return null;
  if (tokenExpired(token)) {
    clearSession();
    return null;
  }
  return token;
}

export function getRole(): Role | null {
  if (!getToken()) return null;
  const role = safeGet(ROLE_STORAGE);
  return role === "coach" || role === "runner" ? role : null;
}

export function clearSession() {
  safeRemove(TOKEN_STORAGE);
  safeRemove(ROLE_STORAGE);
  safeRemove(RUNNER_USER_STORAGE);
}

/** DNI del runner logueado. Se usa solo como clave de caché en la UI. */
export function setRunnerUsername(username: string) {
  safeSet(RUNNER_USER_STORAGE, username);
}
export function getRunnerUsername(): string | null {
  return safeGet(RUNNER_USER_STORAGE);
}

// ----------------------
// TYPES / DTOs
// ----------------------
type RunnerUpsertDto = {
  fullName: string;
  age: number;
  goal?: string | null;
  categoryId: number;
};

export type Category = {
  id: number;
  name: string;
  description?: string | null;
  isActive: boolean;
};

export type CategoryUpsertDto = {
  name: string;
  description?: string | null;
  isActive: boolean;
};

export type TrainingEvent = {
  id: number;
  date: string; // "YYYY-MM-DD"
  time: string; // "HH:mm:ss"
  title?: string | null;
  location?: string | null;
  notes?: string | null;
  categoryId?: number | null;
  isActive?: boolean;
  category?: { id: number; name: string; description?: string | null } | null;
};

export type AttendanceMyUpsertDto = {
  status: number;
  note?: string | null;
};

export type TrainingEventUpsertDto = {
  date: string;
  time: string;
  title?: string | null;
  location?: string | null;
  notes?: string | null;
  categoryId?: number | null;
};

export type WorkoutLogMyUpsertDto = {
  distanceKm: number;
  durationMin: number;
  rpe: number; // 1..5
  hadPain: boolean;
  notes?: string | null;
};

export type SelfWorkoutCreateDto = {
  date: string; // "YYYY-MM-DD"
  title: string;
  distanceKm: number;
  durationMin: number;
  rpe: number;
  hadPain: boolean;
  notes?: string | null;
};

export type SelfWorkoutResponseDto = {
  id: number;
  date: string;
  runnerId: number;
  runnerName: string;
  plannedWorkoutId: number | null;
  plannedType: string | null;
  distanceKm: number;
  durationMin: number;
  paceMinPerKm: number;
  rpe: number;
  hadPain: boolean;
  notes: string | null;
  isSelfRegistered: boolean;
  selfRegisteredTitle: string | null;
};

export type WeeklyGroupSummaryDto = {
  weekStart: string; // "YYYY-MM-DD"
  weekEnd: string;
  sessions: number;
  totalKm: number;
  activeRunners: number;
  avgPaceMinPerKm: number;
  painRate: number;
  avgRpe: number;
};

export type RunnerKpiSummaryDto = {
  runnerId: number;
  runnerName: string;
  from: string;
  to: string;
  sessions: number;
  totalKm: number;
  totalMinutes: number;
  avgPaceMinPerKm: number;
  painRate: number;
  avgRpe: number;
};

// ----------------------
// RUNNER (ME) - BIRTHDATE
// ----------------------
export type RunnerMe = {
  id: number;
  fullName: string;
  dni?: string | null;
  birthDate?: string | null; // ISO "YYYY-MM-DD..."
  currentStreak: number;
  bestStreak: number;
};

export type RunnerTrainingSubmissionDto = {
  status: number;
  note?: string | null;
  distanceKm: number;
  durationMin: number;
  rpe: number;
  hadPain: boolean;
  notes?: string | null;
};

export type RunnerBirthDateDto = { birthDate: string };

// ----------------------
// MEMBERSHIP
// ----------------------
export type FeeStatus = "UpToDate" | "DueSoon" | "Overdue" | "NotPaidYet";
export type DocStatus = "Pending" | "Valid" | "Expired";

export type MyMembershipStatusDto = {
  feeStatus: number | FeeStatus;
  lastPaymentDate: string | null;
  dueDate: string | null;
  hardBlockDate: string | null;
  planVisible: boolean;

  waiverStatus: number | DocStatus;

  emacStatus: number | DocStatus;
  emacValidUntil: string | null;

  termsAccepted: boolean;
  termsVersion: string | null;
};

// ----------------------
// BILLING
// ----------------------
export type RunnerBillingDto = {
  id: number;
  fullName: string;
  dni: string | null;
  isActive?: boolean;
  feeStatus: number | FeeStatus;
  lastPaymentDate: string | null;
  dueDate: string | null;
  hardBlockDate: string | null;
  planVisible: boolean;
};

export type RunnerTopStreakDto = {
  runnerId: number;
  fullName: string;
  bestStreak: number;
};

export type RegisterPaymentDto = {
  paidAt?: string; // "YYYY-MM-DD"
  months?: number;
};

// ----------------------
// DOCUMENTS
// ----------------------
export type RunnerDocumentsRow = {
  id: number;
  fullName: string;
  dni: string | null;
  isActive?: boolean;
  waiverDeliveredAt: string | null;
  emacDeliveredAt: string | null;
  emacValidUntil: string | null;
};

export type UpdateRunnerDocumentsDto = {
  waiverDeliveredAt?: string | null; // "YYYY-MM-DD" o null
  emacDeliveredAt?: string | null; // "YYYY-MM-DD" o null
};

// ----------------------
// AUTH
// ----------------------
export type LoginResponse = { token: string; role: "Coach" | "Runner" };

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    if (isDemoMode) {
      return handleDemoRequest<T>(endpoint, options);
    }

    const token = getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> | undefined),
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Token vencido o inválido: cerramos la sesión local.
      if (response.status === 401 && token) clearSession();

      const errorText = await response.text();
      // Incluimos el status en el mensaje para que las pantallas lo detecten fácil.
      throw new Error(`API Error (${response.status}): ${errorText || response.statusText}`);
    }

    // Endpoints que devuelven vacío
    const text = await response.text();
    return text ? (JSON.parse(text) as T) : (undefined as T);
  }

  private async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "GET" });
  }

  private async post<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: "POST", body: JSON.stringify(body) });
  }

  private async put<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: "PUT", body: JSON.stringify(body) });
  }

  private async patch<T>(endpoint: string, body: unknown): Promise<T> {
    return this.request<T>(endpoint, { method: "PATCH", body: JSON.stringify(body) });
  }

  private async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE" });
  }

  // ----------------------
  // AUTH
  // ----------------------
  async coachLogin(username: string, password: string) {
    return this.request<LoginResponse>("/api/auth/coach-login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
  }

  async runnerLogin(dni: string) {
    return this.request<LoginResponse>("/api/auth/runner-login", {
      method: "POST",
      body: JSON.stringify({ dni }),
    });
  }

  // ----------------------
  // RUNNER: me
  // ----------------------
  async getRunnerMe(): Promise<RunnerMe> {
    return this.request<RunnerMe>(`/api/runners/me`);
  }

  async setMyBirthDate(dto: RunnerBirthDateDto): Promise<void> {
    await this.request<void>(`/api/runners/me/birthdate`, {
      method: "PATCH",
      body: JSON.stringify(dto),
    });
  }

  // ----------------------
  // MEMBERSHIP
  // ----------------------
  async getMyMembershipStatus(): Promise<MyMembershipStatusDto> {
    return this.get<MyMembershipStatusDto>("/api/membership/my-status");
  }

  async acceptTerms(): Promise<void> {
    await this.post<void>("/api/membership/accept-terms", {});
  }

  // ----------------------
  // BILLING
  // ----------------------
  async getRunnersBilling(): Promise<RunnerBillingDto[]> {
    return this.get<RunnerBillingDto[]>("/api/runners/billing");
  }

  async registerPayment(runnerId: number, dto: RegisterPaymentDto): Promise<void> {
    await this.patch<void>(`/api/runners/${runnerId}/payment`, dto);
  }

  // ----------------------
  // DOCUMENTS
  // ----------------------
  async getRunnersDocuments(): Promise<RunnerDocumentsRow[]> {
    return this.get<RunnerDocumentsRow[]>("/api/runners/documents");
  }

  async updateRunnerDocuments(runnerId: number, dto: UpdateRunnerDocumentsDto): Promise<void> {
    await this.patch<void>(`/api/runners/${runnerId}/documents`, dto);
  }

  // ----------------------
  // RUNNER: attendance / logs / plan
  // ----------------------
  async getMyAttendance(trainingEventId: number) {
    return this.get<any>(`/api/attendance/my/${trainingEventId}`);
  }

  async upsertMyAttendance(trainingEventId: number, dto: AttendanceMyUpsertDto) {
    return this.put<any>(`/api/attendance/my/${trainingEventId}`, dto);
  }

  async getMyWorkoutLog(trainingEventId: number) {
    return this.get<any>(`/api/workout-logs/my/${trainingEventId}`);
  }

  async upsertMyWorkoutLog(trainingEventId: number, dto: WorkoutLogMyUpsertDto) {
    return this.put<any>(`/api/workout-logs/my/${trainingEventId}`, dto);
  }

  async getMyWorkoutLogs(params?: {
    runnerId?: number;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<SelfWorkoutResponseDto[]> {
    const qs = new URLSearchParams();
    if (params?.runnerId != null) qs.set("runnerId", String(params.runnerId));
    if (params?.dateFrom) qs.set("dateFrom", params.dateFrom);
    if (params?.dateTo) qs.set("dateTo", params.dateTo);

    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return this.get<SelfWorkoutResponseDto[]>(`/api/workout-logs${suffix}`);
  }

  async createSelfWorkout(dto: SelfWorkoutCreateDto): Promise<{ id: number }> {
    return this.post<{ id: number }>("/api/workout-logs/self", dto);
  }

  async deleteSelfWorkout(id: number): Promise<void> {
    return this.delete<void>(`/api/workout-logs/self/${id}`);
  }

  async getMyTrainingEvents(params?: { from?: string; to?: string }) {
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);

    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return this.get<TrainingEvent[]>(`/api/training-events/my${suffix}`);
  }

  async submitRunnerTraining(trainingEventId: number, dto: RunnerTrainingSubmissionDto) {
    return this.post<any>(`/api/runner-training/${trainingEventId}`, dto);
  }

  // ----------------------
  // ANALYTICS
  // ----------------------
  async getKpiSeries(params?: {
    from?: string;
    to?: string;
    weeks?: number;
    runnerId?: number;
    categoryId?: number;
    groupBy?: "week" | "month";
  }): Promise<WeeklyGroupSummaryDto[]> {
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);
    if (params?.weeks != null) qs.set("weeks", String(params.weeks));
    if (params?.runnerId != null) qs.set("runnerId", String(params.runnerId));
    if (params?.categoryId != null) qs.set("categoryId", String(params.categoryId));
    if (params?.groupBy) qs.set("groupBy", params.groupBy);

    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return this.get<WeeklyGroupSummaryDto[]>(`/api/analytics/kpi-series${suffix}`);
  }

  async getRunnerSummary(params: {
    runnerId: number;
    weeks?: number;
    from?: string;
    to?: string;
  }): Promise<RunnerKpiSummaryDto> {
    const qs = new URLSearchParams();
    qs.set("runnerId", String(params.runnerId));
    if (params.weeks != null) qs.set("weeks", String(params.weeks));
    if (params.from) qs.set("from", params.from);
    if (params.to) qs.set("to", params.to);

    return this.get<RunnerKpiSummaryDto>(`/api/analytics/runner-summary?${qs.toString()}`);
  }

  // ----------------------
  // CATEGORIES (ABM)
  // ----------------------
  async getCategories(): Promise<Category[]> {
    return this.get<Category[]>("/api/categories");
  }

  async createCategory(dto: CategoryUpsertDto): Promise<any> {
    return this.post<any>("/api/categories", dto);
  }

  async updateCategory(id: number, dto: CategoryUpsertDto): Promise<any> {
    return this.put<any>(`/api/categories/${id}`, dto);
  }

  async updateCategoryStatus(
    id: number,
    isActive: boolean
  ): Promise<{ id: number; isActive: boolean }> {
    return this.patch<{ id: number; isActive: boolean }>(`/api/categories/${id}/status`, { isActive });
  }

  // ----------------------
  // RUNNERS (ABM)
  // ----------------------
  async getRunners(): Promise<Runner[]> {
    return this.get<Runner[]>("/api/runners");
  }

  async getTopStreaks(): Promise<RunnerTopStreakDto[]> {
    return this.get<RunnerTopStreakDto[]>("/api/runners/top-streaks");
  }

  async createRunner(dto: RunnerUpsertDto): Promise<any> {
    return this.post<any>("/api/runners", dto);
  }

  async updateRunner(id: number, dto: RunnerUpsertDto): Promise<any> {
    return this.put<any>(`/api/runners/${id}`, dto);
  }

  async updateRunnerStatus(id: number, isActive: boolean): Promise<{ id: number; isActive: boolean }> {
    return this.patch<{ id: number; isActive: boolean }>(`/api/runners/${id}/status`, { isActive });
  }

  async deleteRunner(id: number): Promise<void> {
    return this.delete<void>(`/api/runners/${id}`);
  }

  // ----------------------
  // TRAINING EVENTS (coach)
  // ----------------------
  async getTrainingEvents(params?: { from?: string; to?: string }): Promise<TrainingEvent[]> {
    const qs = new URLSearchParams();
    if (params?.from) qs.set("from", params.from);
    if (params?.to) qs.set("to", params.to);

    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return this.get<TrainingEvent[]>(`/api/training-events${suffix}`);
  }

  async getTrainingEventById(id: number): Promise<TrainingEvent> {
    return this.get<TrainingEvent>(`/api/training-events/${id}`);
  }

  async createTrainingEvent(dto: TrainingEventUpsertDto): Promise<{ id: number }> {
    return this.post<{ id: number }>(`/api/training-events`, dto);
  }

  async updateTrainingEvent(id: number, dto: TrainingEventUpsertDto): Promise<void> {
    await this.put<void>(`/api/training-events/${id}`, dto);
  }

  async updateTrainingEventStatus(
    id: number,
    isActive: boolean
  ): Promise<{ id: number; isActive: boolean }> {
    return this.patch<{ id: number; isActive: boolean }>(`/api/training-events/${id}/status`, { isActive });
  }

  // ----------------------
  // REPORTS
  // ----------------------
  async getWorkoutLogs(params: {
    from: string;
    to: string;
    skip?: number;
    take?: number;
    categoryId?: string;
    runnerId?: string;
  }): Promise<WorkoutLog[]> {
    const queryParams = new URLSearchParams({
      from: params.from,
      to: params.to,
      skip: String(params.skip ?? 0),
      take: String(params.take ?? 5000),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.runnerId ? { runnerId: params.runnerId } : {}),
    });

    return this.get<WorkoutLog[]>(`/api/reports/workout-logs?${queryParams.toString()}`);
  }

  async getAttendance(params: {
    from: string;
    to: string;
    skip?: number;
    take?: number;
    categoryId?: string;
    runnerId?: string;
    trainingEventId?: string;
  }): Promise<Attendance[]> {
    const queryParams = new URLSearchParams({
      from: params.from,
      to: params.to,
      skip: String(params.skip ?? 0),
      take: String(params.take ?? 5000),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.runnerId ? { runnerId: params.runnerId } : {}),
      ...(params.trainingEventId ? { trainingEventId: params.trainingEventId } : {}),
    });

    return this.get<Attendance[]>(`/api/reports/attendance?${queryParams.toString()}`);
  }

  async getWeeklyKPIs(params: { from: string; to: string }): Promise<WeeklyKPI[]> {
    const queryParams = new URLSearchParams({
      from: params.from,
      to: params.to,
    });

    return this.get<WeeklyKPI[]>(`/api/reports/weekly-kpis?${queryParams.toString()}`);
  }
}

export const apiClient = new ApiClient();
