import { fill, h } from "../dom";
import { SOURCES, TCF_TABLE, TEF_TABLE } from "../facts";
import { targetExam } from "../progress";
import { examPicker, scoreTable, sourceNote, table } from "./guide";

function tefSection(): HTMLElement {
  return h(
    "section",
    { class: "exam" },
    h("h3", {}, "TEF Canada: score to NCLC"),
    h("p", {}, "Run by the Paris Île-de-France Chamber of Commerce and Industry (CCI Paris)."),
    scoreTable("TEF Canada scores and the NCLC level they give", TEF_TABLE),
    h(
      "p",
      { class: "notice" },
      "TEF Canada certificates now show a score out of 699. IRCC's table above uses the older scale, which the certificate also prints in its \"old score equivalence\" column. Enter the old-scale numbers in your Express Entry profile.",
    ),
    sourceNote(SOURCES.languageTests, SOURCES.tefResults),
  );
}

function tcfSection(): HTMLElement {
  return h(
    "section",
    { class: "exam" },
    h("h3", {}, "TCF Canada: score to NCLC"),
    h("p", {}, "Run by France Éducation international."),
    scoreTable("TCF Canada scores and the NCLC level they give", TCF_TABLE),
    h("p", { class: "muted" }, "Listening and reading are scored out of 699. Speaking and writing are scored out of 20."),
    sourceNote(SOURCES.languageTests),
  );
}

/**
 * The TEF Canada and TCF Canada exam guide.
 *
 * @returns the page element, with the learner's chosen exam shown first
 */
export function examsView(): HTMLElement {
  const tables = h("div", {});
  const order = () => fill(tables, ...(targetExam() === "tcf" ? [tcfSection(), tefSection()] : [tefSection(), tcfSection()]));
  order();
  return h(
    "div",
    { class: "page guide" },
    h("a", { href: "#/", class: "back" }, "← Home"),
    h("h2", {}, "Exam guide: TEF Canada and TCF Canada"),
    h(
      "p",
      {},
      "IRCC accepts two French tests for Express Entry. Both test the same four skills and both give an NCLC level for each skill. The lessons on this site prepare you for either one.",
    ),
    examPicker(() => order()),
    h("h3", {}, "The two tests side by side"),
    table(
      "Sections of TEF Canada and TCF Canada",
      ["Section", "TEF Canada", "TCF Canada"],
      [
        ["Listening", "40 multiple-choice questions, 40 minutes. Each recording plays once.", "39 multiple-choice questions, 35 minutes. Each recording plays once."],
        ["Reading", "40 multiple-choice questions, 60 minutes", "39 multiple-choice questions, 60 minutes"],
        [
          "Writing",
          "60 minutes, 2 tasks: continue a news article (at least 80 words), then give and defend an opinion (at least 200 words)",
          "60 minutes, 3 tasks",
        ],
        [
          "Speaking",
          "15 minutes face to face with an examiner, 2 tasks: ask for information (5 minutes), then argue to convince (10 minutes)",
          "12 minutes face to face with an examiner, 3 tasks, including 2 minutes to prepare",
        ],
      ],
    ),
    sourceNote(SOURCES.tefFormat, SOURCES.tcfFormat),
    h(
      "p",
      {},
      "For the French bonus points and the French-language draws, you need NCLC 7 in all four skills (see ",
      h("a", { href: "#/why" }, "Why French helps with PR"),
      ").",
    ),
    tables,
    h("h3", {}, "Results are valid for 2 years"),
    h(
      "p",
      {},
      "Your results must be less than 2 years old when you create your Express Entry profile and when you submit your application. Plan your test date so it doesn't expire before you apply.",
    ),
    sourceNote(SOURCES.languageTests),
  );
}
