import { h } from "../dom";
import { MILESTONES, SOURCES } from "../facts";
import { sourceNote } from "./guide";

/**
 * The milestone roadmap page.
 *
 * @returns the page element
 */
export function roadmapView(): HTMLElement {
  return h(
    "div",
    { class: "page guide" },
    h("a", { href: "#/", class: "back" }, "← Home"),
    h("h2", {}, "Roadmap"),
    h(
      "p",
      {},
      "The course has four milestones. You can stop at any of them and know what you have earned. Only M1 is available so far.",
    ),
    h(
      "ol",
      { class: "milestones" },
      ...MILESTONES.map((m) =>
        h(
          "li",
          { class: m.available ? "milestone available" : "milestone" },
          h(
            "div",
            { class: "milestone-head" },
            h("strong", {}, `${m.id} · ${m.cefr}`),
            h("span", { class: m.available ? "badge done" : "badge" }, m.available ? "Available now" : "Coming later"),
          ),
          h(
            "dl",
            {},
            h("dt", {}, "NCLC"),
            h("dd", {}, m.nclc),
            h("dt", {}, "PR value"),
            h("dd", {}, m.prValue),
            h("dt", {}, "Study time"),
            h("dd", {}, `About ${m.hours} hours in total`),
          ),
        ),
      ),
    ),
    h(
      "p",
      { class: "muted" },
      "The CEFR levels (A1 to B2) are a guide. IRCC only uses the NCLC levels from your TEF Canada or TCF Canada results.",
    ),
    sourceNote(SOURCES.crs, SOURCES.categories),
    h(
      "p",
      { class: "muted" },
      "Study times are cumulative estimates of guided learning from one language school, not an official figure. Your own time may differ.",
    ),
    sourceNote(SOURCES.studyHours),
  );
}
