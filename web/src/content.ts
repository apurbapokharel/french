import type { Lesson } from "./content/types/lesson";
import type { Unit, Units } from "./content/types/unit";
import unitsJson from "./content/units.json";

export type { Lesson, Unit };

const lessonModules = import.meta.glob<Lesson>("./content/lessons/*.json", { eager: true, import: "default" });

const lessons: Lesson[] = Object.values(lessonModules).sort((a, b) => a.unit - b.unit || a.order - b.order);
const units = unitsJson as Units;

const REPORT_URL = "https://github.com/apurbapokharel/french/issues/new";

/**
 * Units that have at least one lesson, in course order.
 *
 * @returns each unit with its lessons
 */
export function unitsWithLessons(): { unit: Unit; lessons: Lesson[] }[] {
  return units
    .map((unit) => ({ unit, lessons: lessons.filter((lesson) => lesson.unit === unit.unit) }))
    .filter((group) => group.lessons.length > 0);
}

/**
 * Find a lesson.
 *
 * @param id lesson id, for example "1.1"
 * @returns the lesson, or undefined when there is none with that id
 */
export function lessonById(id: string): Lesson | undefined {
  return lessons.find((lesson) => lesson.id === id);
}

/**
 * Find a unit.
 *
 * @param unit unit number
 * @returns the unit, or undefined when it has no data
 */
export function unitByNumber(unit: number): Unit | undefined {
  return units.find((u) => u.unit === unit);
}

/**
 * The lesson's goal as a sentence.
 *
 * @param lesson the lesson
 * @returns "After this lesson you can …."
 */
export function canDoSentence(lesson: Lesson): string {
  return `After this lesson you can ${lesson.canDo}.`;
}

/**
 * Build a prefilled "report a mistake" link.
 *
 * @param lesson the lesson the report is about
 * @returns a URL that opens a new GitHub issue
 */
export function reportMistakeUrl(lesson: Lesson): string {
  const params = new URLSearchParams({
    title: `Mistake in lesson ${lesson.id}: ${lesson.title}`,
    body: `Lesson: ${lesson.id} ${lesson.title}\n\nWhat's wrong:\n\nWhat it should be (if you know):\n`,
  });
  return `${REPORT_URL}?${params}`;
}
