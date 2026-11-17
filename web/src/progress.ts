import { readSetting, writeSetting } from "./storage";

const KEY = "progress";
const VERSION = 2;

export const M1_LESSON_COUNT = 32;

export interface ExerciseResult {
  correct: boolean;
  at: string;
}

export interface LessonProgress {
  completedAt?: string;
  results: Record<string, ExerciseResult>;
}

export type CardDirection = "fr-en" | "en-fr";

export interface Card {
  lessonId: string;
  fr: string;
  direction: CardDirection;
  ease: number;
  interval: number;
  reps: number;
  due: string;
}

export interface Progress {
  version: number;
  lessons: Record<string, LessonProgress>;
  activeDays: string[];
  cards: Record<string, Card>;
}

type Raw = Record<string, unknown>;

const MIGRATIONS: Record<number, (data: Raw) => Raw> = {
  0: (data) => ({ ...data, version: 1, lessons: data.lessons ?? {}, activeDays: data.activeDays ?? [] }),
  1: (data) => ({ ...data, version: 2, cards: data.cards ?? {} }),
};

function fresh(): Progress {
  return { version: VERSION, lessons: {}, activeDays: [], cards: {} };
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

function isCard(value: unknown): value is Card {
  return (
    isRecord(value) &&
    typeof value.lessonId === "string" &&
    typeof value.fr === "string" &&
    (value.direction === "fr-en" || value.direction === "en-fr") &&
    typeof value.ease === "number" &&
    typeof value.interval === "number" &&
    typeof value.reps === "number" &&
    typeof value.due === "string"
  );
}

function isProgress(value: unknown): value is Progress {
  return (
    isRecord(value) &&
    value.version === VERSION &&
    isRecord(value.lessons) &&
    Object.values(value.lessons).every(isLessonProgress) &&
    Array.isArray(value.activeDays) &&
    value.activeDays.every((day) => typeof day === "string") &&
    isRecord(value.cards) &&
    Object.values(value.cards).every(isCard)
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

/**
 * Check stored or imported progress and bring it up to the current version.
 *
 * @param data parsed JSON
 * @returns the progress, or "newer" when it comes from a newer version of the site, or "invalid" when it isn't progress data
 */
export function parseProgress(data: unknown): Progress | "newer" | "invalid" {
  if (!isRecord(data)) return "invalid";
  if (typeof data.version === "number" && data.version > VERSION) return "newer";
  const migrated = migrate(structuredClone(data));
  return isProgress(migrated) ? migrated : "invalid";
}

let persist = true;

function load(): Progress {
  const text = readSetting(KEY);
  if (text === null) return fresh();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return fresh();
  }
  const parsed = parseProgress(data);
  if (parsed === "newer") persist = false;
  return typeof parsed === "string" ? fresh() : parsed;
}

let state = load();
let saved = persist && writeSetting(KEY, JSON.stringify(state));

function save(): void {
  if (persist) saved = writeSetting(KEY, JSON.stringify(state));
}

/**
 * A date as a local calendar day.
 *
 * @param date the date, today when omitted
 * @returns the day as YYYY-MM-DD
 */
export function dayKey(date = new Date()): string {
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

/**
 * Add both-direction flashcards for a lesson's vocabulary, keeping cards that already exist.
 *
 * @param lessonId lesson id
 * @param frenchItems the French of each vocabulary item
 */
export function addLessonCards(lessonId: string, frenchItems: string[]): void {
  const today = dayKey();
  let added = false;
  for (const fr of frenchItems) {
    for (const direction of ["fr-en", "en-fr"] as const) {
      const id = `${direction}:${fr}`;
      if (state.cards[id]) continue;
      state.cards[id] = { lessonId, fr, direction, ease: 2.5, interval: 0, reps: 0, due: today };
      added = true;
    }
  }
  if (added) save();
}

/**
 * Every flashcard with its id.
 *
 * @returns pairs of card id and card
 */
export function allCards(): [string, Card][] {
  return Object.entries(state.cards);
}

/**
 * Save a card's new schedule.
 *
 * @param id card id
 * @param card the updated card
 */
export function saveCard(id: string, card: Card): void {
  state.cards[id] = card;
  markActive();
  save();
}

/**
 * A copy of all progress, for backups.
 *
 * @returns the progress record
 */
export function currentProgress(): Progress {
  return structuredClone(state);
}

/**
 * Replace all progress, for restoring a backup.
 *
 * @param progress progress already checked by parseProgress
 */
export function replaceProgress(progress: Progress): void {
  state = structuredClone(progress);
  save();
}

/**
 * Short counts that describe a progress record.
 *
 * @param progress the progress record
 * @returns how many lessons are completed and how many flashcards exist
 */
export function progressSummary(progress: Progress): { lessons: number; cards: number } {
  return {
    lessons: Object.values(progress.lessons).filter((lesson) => lesson.completedAt !== undefined).length,
    cards: Object.keys(progress.cards).length,
  };
}
