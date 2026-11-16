import { h } from "../dom";
import { canDoSentence, reportMistakeUrl, unitByNumber, type Lesson } from "../content";
import type { Phrase } from "../content/types/lesson";
import { speak, stopSpeaking } from "../speech";
import { frenchItem, uncertainFlag, unreviewedBadge, voicePanel } from "../ui";

function dialogueSection(lesson: Lesson): HTMLElement {
  const { setting, lines } = lesson.dialogue;
  let playing = false;
  const rows = lines.map((line) => {
    const english = h("p", { class: "en", hidden: true }, line.en);
    const reveal = h(
      "button",
      {
        type: "button",
        class: "reveal",
        "aria-expanded": "false",
        onclick: () => {
          english.hidden = !english.hidden;
          reveal.setAttribute("aria-expanded", String(!english.hidden));
          reveal.textContent = english.hidden ? "Show English" : "Hide English";
        },
      },
      "Show English",
    );
    return h(
      "li",
      { class: "line" },
      h("span", { class: "speaker" }, line.speaker),
      h(
        "div",
        { class: "line-body" },
        frenchItem(line.fr, line.uncertain),
        reveal,
        english,
      ),
    );
  });

  const playAll = h("button", { type: "button", class: "primary" }, "▶ Play dialogue");
  const finishPlaying = () => {
    playing = false;
    rows.forEach((row) => row.classList.remove("speaking"));
    playAll.textContent = "▶ Play dialogue";
  };
  playAll.addEventListener("click", async () => {
    if (playing) {
      stopSpeaking();
      return;
    }
    playing = true;
    playAll.textContent = "■ Stop";
    for (const [i, line] of lines.entries()) {
      rows.forEach((row, j) => row.classList.toggle("speaking", i === j));
      if (!(await speak(line.fr))) break;
    }
    finishPlaying();
  });

  return h(
    "section",
    {},
    h("h3", {}, "Listen first"),
    h("p", { class: "muted" }, setting),
    h("p", { class: "muted" }, "Listen before reading the English. Tap Show English to check what a line means."),
    playAll,
    h("ol", { class: "dialogue" }, ...rows),
  );
}

function vocabularySection(lesson: Lesson): HTMLElement {
  return h(
    "section",
    {},
    h("h3", {}, "New words and phrases"),
    h(
      "ul",
      { class: "vocab" },
      ...lesson.vocabulary.map((item) =>
        h(
          "li",
          {},
          frenchItem(item.fr, item.uncertain),
          h("span", { class: "en" }, item.en),
          item.note && h("span", { class: "note" }, item.note),
          item.canadianNote && h("span", { class: "note canadian" }, h("strong", {}, "In Canada: "), item.canadianNote),
        ),
      ),
    ),
  );
}

function examples(items: Phrase[]): HTMLElement {
  return h(
    "ul",
    { class: "examples" },
    ...items.map((item) => h("li", {}, frenchItem(item.fr, item.uncertain), h("span", { class: "en" }, item.en))),
  );
}

function pointSection(heading: string, point: { explanation: string[]; examples: Phrase[] }): HTMLElement {
  return h(
    "section",
    {},
    h("h3", {}, heading),
    ...point.explanation.map((p) => h("p", {}, p)),
    examples(point.examples),
  );
}

/**
 * One lesson's page.
 *
 * @param lesson the lesson to show
 * @returns the page element
 */
export function lessonView(lesson: Lesson): HTMLElement {
  const unit = unitByNumber(lesson.unit);
  return h(
    "article",
    { class: "page lesson" },
    h("a", { href: "#/", class: "back" }, "← All lessons"),
    h("p", { class: "muted" }, unit ? `Unit ${unit.unit}: ${unit.title} · Lesson ${lesson.id}` : `Lesson ${lesson.id}`),
    h("h2", {}, lesson.title, " ", unreviewedBadge(lesson)),
    h("p", { class: "can-do" }, canDoSentence(lesson)),
    lesson.review.status === "unreviewed" &&
      h(
        "p",
        { class: "notice" },
        "A fluent French speaker hasn't checked this lesson yet, so it may contain mistakes. Items marked ",
        uncertainFlag(),
        " haven't been confirmed against a trusted reference.",
      ),
    voicePanel(),
    dialogueSection(lesson),
    vocabularySection(lesson),
    pointSection(`Grammar: ${lesson.grammar.title}`, lesson.grammar),
    pointSection(`Pronunciation: ${lesson.pronunciation.sound}`, lesson.pronunciation),
    h(
      "footer",
      { class: "lesson-footer" },
      h("a", { href: reportMistakeUrl(lesson), target: "_blank", rel: "noopener" }, "Report a mistake in this lesson"),
    ),
  );
}
