import { h } from "../dom";
import { lessonById, unitsWithLessons } from "../content";
import { completedLessonIds, isCompleted, M1_LESSON_COUNT, progressSaved, streakDays } from "../progress";
import { dueCards } from "../srs";

function stat(label: string, value: string, detail?: string, link?: string): HTMLElement {
  return h(
    "div",
    { class: "stat" },
    h("span", { class: "stat-label" }, label),
    h("span", { class: "stat-value" }, value),
    detail && h("span", { class: "muted" }, detail),
    link && h("a", { href: link }, "Review now"),
  );
}

/**
 * The progress page: lessons completed, streak and M1 completion.
 *
 * @returns the page element
 */
export function progressView(): HTMLElement {
  const completed = completedLessonIds().filter((id) => lessonById(id)).length;
  const streak = streakDays();
  const percent = Math.round((completed / M1_LESSON_COUNT) * 100);
  const due = dueCards().length;
  return h(
    "div",
    { class: "page" },
    h("h2", {}, "Your progress"),
    !progressSaved() &&
      h("p", { class: "notice" }, "This browser is blocking storage, so progress isn't saved on this device."),
    h(
      "div",
      { class: "stats" },
      stat("Lessons completed", `${completed} of ${M1_LESSON_COUNT}`),
      stat("Streak", `${streak} ${streak === 1 ? "day" : "days"}`, "Days in a row with practice"),
      stat("M1 completion", `${percent}%`, "Milestone M1 (A1)"),
      stat("Cards due today", String(due), undefined, "#/flashcards"),
    ),
    h("progress", { class: "m1-bar", max: M1_LESSON_COUNT, value: completed, "aria-label": "M1 completion" }),
    ...unitsWithLessons().map(({ unit, lessons }) =>
      h(
        "section",
        { class: "unit" },
        h("h3", {}, `Unit ${unit.unit}: ${unit.title}`),
        h(
          "ul",
          { class: "progress-list" },
          ...lessons.map((lesson) =>
            h(
              "li",
              {},
              h("a", { href: `#/lessons/${lesson.id}` }, `${lesson.id} ${lesson.title}`),
              isCompleted(lesson.id)
                ? h("span", { class: "badge done" }, "✓ Completed")
                : h("span", { class: "badge" }, "Not completed"),
            ),
          ),
        ),
      ),
    ),
  );
}
