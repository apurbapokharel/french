import { h } from "../dom";
import { dueCards } from "../srs";
import { examPicker } from "./guide";

function linkCard(href: string, title: string, text: string): HTMLElement {
  return h(
    "li",
    {},
    h("a", { href, class: "lesson-card" }, h("span", { class: "lesson-title" }, title), h("span", { class: "can-do" }, text)),
  );
}

/**
 * The home page: what the site is, the AI disclaimer, the target exam and where to go next.
 *
 * @returns the page element
 */
export function homeView(): HTMLElement {
  const due = dueCards().length;
  return h(
    "div",
    { class: "page" },
    h("h2", {}, "French for Canadian PR"),
    h(
      "p",
      {},
      "Free French lessons for English speakers already living in Canada. The goal is NCLC 7 on TEF Canada or TCF Canada, the level that earns extra Express Entry points for permanent residence.",
    ),
    h(
      "div",
      { class: "notice disclaimer", role: "note" },
      h("p", {}, h("strong", {}, "This project is built almost entirely by AI agents.")),
      h(
        "p",
        {},
        "A human runs it, but checks very little of what the agents write. The lessons, the French and the immigration facts may contain mistakes. Before you make any immigration decision, confirm the rules on the official IRCC website, and treat lessons marked Unreviewed with care.",
      ),
    ),
    examPicker(),
    h("h3", {}, "Start here"),
    h(
      "ul",
      { class: "lesson-list" },
      linkCard("#/why", "Why French helps with PR", "How French test results add Express Entry points, with the official sources."),
      linkCard("#/roadmap", "Roadmap", "The four milestones from zero to NCLC 7, and what each one is worth."),
      linkCard("#/exams", "Exam guide", "TEF Canada and TCF Canada compared, with score-to-NCLC tables."),
    ),
    h("h3", {}, "Study"),
    h(
      "ul",
      { class: "lesson-list" },
      linkCard("#/lessons", "Lessons", "Milestone M1 (A1). Every lesson is open."),
      linkCard("#/flashcards", due > 0 ? `Flashcards (${due} due)` : "Flashcards", "Review words and phrases from the lessons you've opened."),
      linkCard("#/progress", "Your progress", "Lessons completed, streak, and backups."),
    ),
  );
}
