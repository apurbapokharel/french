import { readSetting, writeSetting } from "./storage";

const KEY = "progress";
const VERSION = 1;

export const M1_LESSON_COUNT = 32;

export interface ExerciseResult {
  correct: boolean;
  at: string;
}

export interface LessonProgress {
  completedAt?: string;
  results: Record<string, ExerciseResult>;
}

interface Progress {
  version: number;
  lessons: Record<string, LessonProgress>;
  activeDays: string[];
}

type Raw = Record<string, unknown>;

const MIGRATIONS: Record<number, (data: Raw) => Raw> = {
  0: (data) => ({ ...data, version: 1, lessons: data.lessons ?? {}, activeDays: data.activeDays ?? [] }),
};

function fresh(): Progress {
  return { version: VERSION, lessons: {}, activeDays: [] };
}

function isRecord(value: unknown): value is Raw {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isResult(value: unknown): value is ExerciseResult {
  return isRecord(value) && typeof value.correct === "boolean" && typeof value.at === "string";
}

function isLessonProgress(value: unknown): value is LessonProgress {
  return (
    isRecord(value) &&
    (value.completedAt === undefined || typeof value.completedAt === "string") &&
    isRecord(value.results) &&
    Object.values(value.results).every(isResult)
  );
}

function isProgress(value: unknown): value is Progress {
  return (
    isRecord(value) &&
    value.version === VERSION &&
    isRecord(value.lessons) &&
    Object.values(value.lessons).every(isLessonProgress) &&
    Array.isArray(value.activeDays) &&
    value.activeDays.every((day) => typeof day === "string")
  );
}

function migrate(data: Raw): Raw | null {
  let current = data;
  let version = typeof current.version === "number" ? current.version : 0;
  while (version < VERSION) {
    const step = MIGRATIONS[version];
    if (!step) return null;
    current = step(current);
    version = typeof current.version === "number" ? current.version : version + 1;
  }
  return current;
}

let persist = true;

function load(): Progress {
  const text = readSetting(KEY);
  if (text === null) return fresh();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return fresh();
  }
  if (!isRecord(parsed)) return fresh();
  if (typeof parsed.version === "number" && parsed.version > VERSION) {
    persist = false;
    return fresh();
  }
  const migrated = migrate(parsed);
  return isProgress(migrated) ? migrated : fresh();
}

const state = load();
let saved = persist && writeSetting(KEY, JSON.stringify(state));

function save(): void {
  if (persist) saved = writeSetting(KEY, JSON.stringify(state));
}

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function markActive(): void {
  const today = dayKey(new Date());
  if (!state.activeDays.includes(today)) state.activeDays.push(today);
}

function entry(lessonId: string): LessonProgress {
  return (state.lessons[lessonId] ??= { results: {} });
}

/**
 * Whether progress is being saved on this device.
 *
 * @returns false when storage is blocked or full, or holds progress from a newer version of the site
 */
export function progressSaved(): boolean {
  return saved;
}

/**
 * The stored result of one exercise.
 *
 * @param lessonId lesson id, for example "1.1"
 * @param key exercise key, for example "exercises.2" or "canDoCheck.0"
 * @returns the last result, or undefined when the exercise hasn't been answered
 */
export function exerciseResult(lessonId: string, key: string): ExerciseResult | undefined {
  return state.lessons[lessonId]?.results[key];
}

/**
 * Save an exercise answer and count today as active.
 *
 * @param lessonId lesson id
 * @param key exercise key
 * @param correct whether the answer was correct
 */
export function recordResult(lessonId: string, key: string, correct: boolean): void {
  entry(lessonId).results[key] = { correct, at: new Date().toISOString() };
  markActive();
  save();
}

/**
 * Whether a lesson is marked complete.
 *
 * @param lessonId lesson id
 * @returns true when complete
 */
export function isCompleted(lessonId: string): boolean {
  return state.lessons[lessonId]?.completedAt !== undefined;
}

/**
 * Mark a lesson complete or not complete. Marking complete counts today as active.
 *
 * @param lessonId lesson id
 * @param done true to mark complete, false to undo
 */
export function setCompleted(lessonId: string, done: boolean): void {
  const lesson = entry(lessonId);
  if (done) {
    lesson.completedAt = new Date().toISOString();
    markActive();
  } else {
    delete lesson.completedAt;
  }
  save();
}

/**
 * Ids of all completed lessons.
 *
 * @returns lesson ids in no particular order
 */
export function completedLessonIds(): string[] {
  return Object.keys(state.lessons).filter(isCompleted);
}

/**
 * Days in a row with activity, ending today, or yesterday when nothing has been done yet today.
 *
 * @returns the streak in days, 0 when there is none
 */
export function streakDays(): number {
  const days = new Set(state.activeDays);
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
