import { h } from "../dom";
import { canDoSentence, unitsWithLessons } from "../content";
import { isCompleted } from "../progress";
import { unreviewedBadge } from "../ui";

/**
 * The lesson list, grouped by unit.
 *
 * @returns the page element
 */
export function lessonListView(): HTMLElement {
  return h(
    "div",
    { class: "page" },
    h("h2", {}, "Lessons"),
    h("p", { class: "muted" }, "Milestone M1 (A1). The order is recommended, but every lesson is open."),
    ...unitsWithLessons().map(({ unit, lessons }) =>
      h(
        "section",
        { class: "unit" },
        h("h3", {}, `Unit ${unit.unit}: ${unit.title}`),
        h(
          "ol",
          { class: "lesson-list" },
          ...lessons.map((lesson) =>
            h(
              "li",
              {},
              h(
                "a",
                { href: `#/lessons/${lesson.id}`, class: "lesson-card" },
                h("span", { class: "lesson-title" }, h("span", { class: "lesson-id" }, lesson.id), lesson.title),
                h("span", { class: "can-do" }, canDoSentence(lesson)),
                h(
                  "span",
                  { class: "badges" },
                  isCompleted(lesson.id) && h("span", { class: "badge done" }, "✓ Completed"),
                  unreviewedBadge(lesson),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
