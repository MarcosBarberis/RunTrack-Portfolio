export interface Runner {
  id: number;
  fullName: string;
  age: number;
  goal?: string | null;
  categoryId: number;
  categoryName: string;
  birthDate?: string | null;
  isActive: boolean;
  dni: string;
  currentStreak?: number;
  bestStreak?: number;
}


export interface WorkoutLog {
  id: string;
  runnerId: string;
  runnerName: string;
  categoryId: string;
  categoryName: string;
  date: string;
  distanceKm: number;
  durationMin: number;
  type: string;
  notes: string;
  rpe: number;
  painRate: number;

}

export interface SelfWorkoutCreateDto {
  date: string; // "YYYY-MM-DD"
  title: string;
  distanceKm: number;
  durationMin: number;
  rpe: number;
  hadPain: boolean;
  notes?: string | null;
}

export interface SelfWorkoutResponseDto {
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
}

export interface Attendance {
  id: string;
  runnerId: string;
  runnerName: string;
  trainingEventId: string;
  trainingEventName: string;
  date: string;
  status: 'Present' | 'Absent' | 'Excused';
  categoryId: string;
  categoryName: string;
}

export interface WeeklyKPI {
  weekStart: string;
  weekEnd: string;
  sessions: number;
  totalKm: number;
  avgPaceMinPerKm: number;
  painRate: number;
  avgRpe: number;
}


export interface ApiError {
  message: string;
  statusCode?: number;
}

export interface DateRange {
  from: string;
  to: string;
}
