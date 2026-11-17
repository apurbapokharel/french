import { h } from "../dom";
import { downloadBackup, readBackup, restoreBackup } from "../backup";
import { lessonById, unitsWithLessons } from "../content";
import {
  completedLessonIds,
  currentProgress,
  isCompleted,
  M1_LESSON_COUNT,
  progressSaved,
  progressSummary,
  streakDays,
  type Progress,
} from "../progress";
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

let restoredNotice = false;

function describe(progress: Progress): string {
  const { lessons, cards } = progressSummary(progress);
  return `${lessons} ${lessons === 1 ? "lesson" : "lessons"} completed, ${cards} ${cards === 1 ? "card" : "cards"}`;
}

function backupSection(): HTMLElement {
  const status = h("p", { class: "backup-status", role: "status" });
  if (restoredNotice) {
    restoredNotice = false;
    status.classList.add("ok");
    status.textContent = "✓ Your backup has been restored.";
  }
  const input = h("input", { type: "file", accept: ".json,application/json", hidden: true });
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;
    const backup = readBackup(await file.text());
    if ("error" in backup) {
      status.className = "backup-status error";
      status.textContent = backup.error;
      return;
    }
    const question = `This replaces your progress on this device (${describe(currentProgress())}) with the backup (${describe(backup.progress)}). Continue?`;
    if (!window.confirm(question)) {
      status.className = "backup-status";
      status.textContent = "Nothing was changed.";
      return;
    }
    restoreBackup(backup);
    restoredNotice = true;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  return h(
    "section",
    { class: "backup" },
    h("h3", {}, "Back up your progress"),
    h(
      "p",
      { class: "muted" },
      "Progress is stored in this browser only. Download a backup to keep it safe or to move it to another device or browser, then restore it there.",
    ),
    h(
      "div",
      { class: "backup-row" },
      h("button", { type: "button", onclick: () => downloadBackup() }, "Download backup"),
      h("button", { type: "button", onclick: () => input.click() }, "Restore from backup"),
      input,
    ),
    status,
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
    backupSection(),
  );
}
