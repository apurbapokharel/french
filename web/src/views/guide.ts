import { h, type Child } from "../dom";
import { LAST_CHECKED, type ScoreRow, type Source } from "../facts";
import { setTargetExam, targetExam, type TargetExam } from "../progress";

const EXAM_CHOICES: [TargetExam, string][] = [
  ["tef", "TEF Canada"],
  ["tcf", "TCF Canada"],
  ["undecided", "Not sure yet"],
];

/**
 * The day facts were last checked, for display.
 *
 * @returns for example "Nov 16, 2026"
 */
export function checkedDate(): string {
  const [y, m, d] = LAST_CHECKED.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" });
}

/**
 * A source line for an immigration or exam fact.
 *
 * @param sources one or more official pages that back the fact
 * @returns a small paragraph with links and the last-checked date
 */
export function sourceNote(...sources: Source[]): HTMLElement {
  const links: Child[] = sources.flatMap((source, i) => [
    i > 0 ? "; " : null,
    h("a", { href: source.url, target: "_blank", rel: "noopener" }, source.label),
  ]);
  return h("p", { class: "source" }, sources.length === 1 ? "Source: " : "Sources: ", ...links, ` · checked ${checkedDate()}`);
}

/**
 * A simple table.
 *
 * @param caption short description read by screen readers and shown above the table
 * @param head column headings
 * @param rows cell contents, row by row
 * @param className optional extra class for the wrapper
 * @returns a horizontally scrollable table
 */
export function table(caption: string, head: string[], rows: Child[][], className = ""): HTMLElement {
  return h(
    "div",
    { class: `table-wrap ${className}`.trim() },
    h(
      "table",
      {},
      h("caption", {}, caption),
      h("thead", {}, h("tr", {}, ...head.map((cell) => h("th", { scope: "col" }, cell)))),
      h("tbody", {}, ...rows.map((row) => h("tr", {}, ...row.map((cell, i) => (i === 0 ? h("th", { scope: "row" }, cell) : h("td", {}, cell)))))),
    ),
  );
}

/**
 * An exam's score-to-NCLC table.
 *
 * @param caption table caption
 * @param rows the conversion rows
 * @returns the table
 */
export function scoreTable(caption: string, rows: ScoreRow[]): HTMLElement {
  return table(
    caption,
    ["NCLC", "Listening", "Reading", "Speaking", "Writing"],
    rows.map((row) => [row.nclc, row.listening, row.reading, row.speaking, row.writing]),
    "scores",
  );
}

/**
 * Radio buttons for the learner's target exam, saved to progress.
 *
 * @param onChange optional callback after the choice is saved
 * @returns the fieldset
 */
export function examPicker(onChange?: (exam: TargetExam) => void): HTMLElement {
  const current = targetExam();
  return h(
    "fieldset",
    { class: "exam-picker" },
    h("legend", {}, "Which exam are you preparing for?"),
    ...EXAM_CHOICES.map(([value, label]) =>
      h(
        "label",
        {},
        h("input", {
          type: "radio",
          name: "target-exam",
          value,
          checked: value === current,
          onchange: () => {
            setTargetExam(value);
            onChange?.(value);
          },
        }),
        label,
      ),
    ),
  );
}
