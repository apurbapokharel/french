import { h } from "../dom";
import { SOURCES } from "../facts";
import { sourceNote, table } from "./guide";

/**
 * The "why French for PR" page.
 *
 * @returns the page element
 */
export function whyView(): HTMLElement {
  return h(
    "div",
    { class: "page guide" },
    h("a", { href: "#/", class: "back" }, "← Home"),
    h("h2", {}, "Why French helps with PR"),
    h(
      "p",
      {},
      "Express Entry ranks candidates with the Comprehensive Ranking System (CRS). A higher CRS score makes an invitation to apply for permanent residence more likely. If English is your first official language in Express Entry, French counts as your second, and French test results can help in three ways.",
    ),
    h("h3", {}, "1. Points for a second official language"),
    h("p", {}, "Each of the four skills (listening, reading, speaking, writing) earns points based on its NCLC level:"),
    table(
      "CRS points for French as a second official language",
      ["NCLC in a skill", "Points for that skill"],
      [
        ["4 or less", "0"],
        ["5 or 6", "1"],
        ["7 or 8", "3"],
        ["9 or more", "6"],
      ],
    ),
    h("p", {}, "The maximum is 24 points without a spouse or partner, or 22 with one."),
    sourceNote(SOURCES.crs),
    h("h3", {}, "2. Bonus points for French"),
    h("p", {}, "With NCLC 7 or higher in all four French skills, you also get:"),
    h(
      "ul",
      {},
      h("li", {}, h("strong", {}, "50 points"), " if your English is CLB 5 or higher in all four skills"),
      h("li", {}, h("strong", {}, "25 points"), " if your English is CLB 4 or lower, or you didn't take an English test"),
    ),
    sourceNote(SOURCES.crs),
    h(
      "p",
      { class: "notice" },
      "IRCC is consulting on whether to remove or change these bonus points. Check the CRS criteria page before you count on them.",
    ),
    sourceNote(SOURCES.consultation),
    h("h3", {}, "3. French-language draws"),
    h(
      "p",
      {},
      "Express Entry holds draws for candidates with strong French. To be eligible, you need NCLC 7 or higher in all four skills, and you must meet the requirements in the instructions for that round.",
    ),
    sourceNote(SOURCES.categories),
    h("h3", {}, "Example"),
    h(
      "p",
      {},
      "A candidate without a spouse, with CLB 9 English, reaches NCLC 7 in all four French skills. They gain 12 points for French as a second language (3 per skill) and 50 bonus points: up to 62 more CRS points. They can also be invited in French-language draws.",
    ),
    sourceNote(SOURCES.crs, SOURCES.categories),
    h("h3", {}, "Your results expire"),
    h(
      "p",
      {},
      "Language test results must be less than 2 years old when you create your Express Entry profile and when you submit your application for permanent residence.",
    ),
    sourceNote(SOURCES.languageTests),
  );
}
