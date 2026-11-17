import { fill, h } from "../dom";
import { allLessons, canDoSentence, reportMistakeUrl, unitByNumber, type Lesson } from "../content";
import type { Phrase } from "../content/types/lesson";
import { exerciseCard, lessonSlots, shuffle, type ExerciseSlot } from "../exercises";
import { addLessonCards, exerciseResult, isCompleted, progressSaved, setCompleted } from "../progress";
import { speak, stopSpeaking } from "../speech";
import { frenchItem, uncertainFlag, unreviewedBadge, voicePanel } from "../ui";

const WARM_UP_SIZE = 4;

function warmUpSlots(lesson: Lesson): ExerciseSlot[] {
  const earlier = allLessons().filter(
    (l) => (l.unit < lesson.unit || (l.unit === lesson.unit && l.order < lesson.order)) && isCompleted(l.id),
  );
  const priority = (slot: ExerciseSlot) => {
    const result = exerciseResult(slot.lessonId, slot.key);
    return result === undefined ? 1 : result.correct ? 2 : 0;
  };
  return shuffle(earlier.flatMap((l) => [...lessonSlots(l, "exercises"), ...lessonSlots(l, "canDoCheck")]))
    .sort((a, b) => priority(a) - priority(b))
    .slice(0, WARM_UP_SIZE);
}

function exerciseSection(heading: string, intro: string, slots: ExerciseSlot[], withSource = false): HTMLElement | null {
  if (slots.length === 0) return null;
  return h(
    "section",
    {},
    h("h3", {}, heading),
    h("p", { class: "muted" }, intro),
    h("ol", { class: "exercises" }, ...slots.map((slot) => exerciseCard(slot, withSource ? `From lesson ${slot.lessonId}` : undefined))),
  );
}

function completionSection(lesson: Lesson): HTMLElement {
  const section = h("section", { class: "completion" });
  const render = () => {
    const done = isCompleted(lesson.id);
    fill(
      section,
      h("h3", {}, "Finish"),
      !progressSaved() &&
        h("p", { class: "notice" }, "This browser is blocking storage, so your progress won't be kept after you leave this page."),
      done
        ? h("p", { class: "done" }, "✓ You've completed this lesson.")
        : h("p", { class: "muted" }, "Done with the lesson? Mark it complete to count it in your progress."),
      h(
        "div",
        { class: "completion-row" },
        h(
          "button",
          {
            type: "button",
            class: done ? "" : "primary",
            onclick: () => {
              setCompleted(lesson.id, !done);
              render();
            },
          },
          done ? "Mark as not complete" : "Mark lesson complete",
        ),
        h("a", { href: "#/progress" }, "See your progress"),
      ),
    );
  };
  render();
  return section;
}

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
  addLessonCards(
    lesson.id,
    lesson.vocabulary.map((item) => item.fr),
  );
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
    exerciseSection("Warm-up", "A few questions from lessons you've finished.", warmUpSlots(lesson), true),
    dialogueSection(lesson),
    vocabularySection(lesson),
    pointSection(`Grammar: ${lesson.grammar.title}`, lesson.grammar),
    pointSection(`Pronunciation: ${lesson.pronunciation.sound}`, lesson.pronunciation),
    exerciseSection(
      "Practice",
      "Each answer is checked straight away. Typed answers count even without accents, but look at the spelling shown.",
      lessonSlots(lesson, "exercises"),
    ),
    exerciseSection("Can-do check", canDoSentence(lesson) + " Check it here.", lessonSlots(lesson, "canDoCheck")),
    completionSection(lesson),
    h(
      "footer",
      { class: "lesson-footer" },
      h("a", { href: reportMistakeUrl(lesson), target: "_blank", rel: "noopener" }, "Report a mistake in this lesson"),
    ),
  );
}
