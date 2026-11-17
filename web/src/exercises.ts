import { fill, h, frText, type Child } from "./dom";
import type { Lesson } from "./content";
import type {
  DictationExercise,
  Exercise,
  FillBlankExercise,
  ListenChooseExercise,
  MultipleChoiceExercise,
  WordOrderExercise,
} from "./content/types/lesson";
import { exerciseResult, recordResult, type ExerciseResult } from "./progress";
import { frenchItem, playButtons, uncertainFlag } from "./ui";

export interface ExerciseSlot {
  lessonId: string;
  key: string;
  exercise: Exercise;
}

type Finish = (correct: boolean, answer: Child[], extra: Child[]) => void;

const KIND: Record<Exercise["type"], string> = {
  "listen-choose": "Listen and choose",
  "multiple-choice": "Choose the answer",
  "word-order": "Put the words in order",
  "fill-blank": "Fill in the blank",
  dictation: "Write what you hear",
};

const ACCENTS = ["é", "è", "ê", "ë", "à", "â", "ù", "û", "ü", "ô", "î", "ï", "ç", "œ"];

/**
 * The exercises of one part of a lesson, each with its storage key.
 *
 * @param lesson the lesson
 * @param part "exercises" for practice, or "canDoCheck"
 * @returns one slot per exercise, in lesson order
 */
export function lessonSlots(lesson: Lesson, part: "exercises" | "canDoCheck"): ExerciseSlot[] {
  return lesson[part].map((exercise, i) => ({ lessonId: lesson.id, key: `${part}.${i}`, exercise }));
}

/**
 * Shuffle a copy of an array.
 *
 * @param items the items
 * @returns a new array in random order
 */
export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalize(text: string): string {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[’‘ʼ`]/g, "'")
    .replace(/[^\p{L}\p{N}']+/gu, " ")
    .replace(/' /g, "'")
    .trim();
}

function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").replace(/œ/g, "oe").replace(/æ/g, "ae");
}

function grade(typed: string, expected: string): "right" | "accents" | "wrong" {
  const a = normalize(typed);
  const b = normalize(expected);
  if (a === b) return "right";
  return stripAccents(a) === stripAccents(b) ? "accents" : "wrong";
}

function strongFr(text: string): HTMLElement {
  return h("strong", { lang: "fr" }, frText(text));
}

function lastTime(result: ExerciseResult): HTMLElement {
  return h(
    "span",
    { class: `last ${result.correct ? "right" : "wrong"}` },
    result.correct ? "Last time: ✓ correct" : "Last time: ✗ not quite",
  );
}

function choiceBody(prompt: Child[], options: string[], answer: number, finish: Finish, extra: Child[]): Child[] {
  const order = shuffle(options.map((_, i) => i));
  const buttons: HTMLButtonElement[] = order.map((i) =>
    h(
      "button",
      {
        type: "button",
        class: "option",
        onclick: () => {
          buttons.forEach((b) => (b.disabled = true));
          buttons[order.indexOf(answer)].classList.add("right");
          const correct = i === answer;
          if (!correct) buttons[order.indexOf(i)].classList.add("wrong");
          finish(correct, correct ? [] : ["The answer is: ", h("strong", {}, frText(options[answer]))], extra);
        },
      },
      frText(options[i]),
    ),
  );
  return [...prompt, h("div", { class: "options" }, ...buttons)];
}

function listenChoose(ex: ListenChooseExercise, finish: Finish): Child[] {
  return choiceBody(
    [h("div", { class: "listen" }, playButtons(ex.fr), h("span", { class: "muted" }, "What does it mean?"))],
    ex.options,
    ex.answer,
    finish,
    [h("p", {}, "You heard: ", strongFr(ex.fr))],
  );
}

function multipleChoice(ex: MultipleChoiceExercise, finish: Finish): Child[] {
  return choiceBody([h("p", { class: "prompt" }, frText(ex.prompt))], ex.options, ex.answer, finish, []);
}

function wordOrder(ex: WordOrderExercise, finish: Finish): Child[] {
  const words = ex.words;
  const sentence = words.join(" ");
  let pool = shuffle(words.map((_, i) => i));
  for (let tries = 0; tries < 10 && pool.every((v, i) => v === i); tries++) pool = shuffle(pool);
  const chosen: number[] = [];
  let locked = false;
  const answerLine = h("div", { class: "tiles answer-line", "aria-label": "Your sentence" });
  const poolLine = h("div", { class: "tiles", "aria-label": "Words to use" });
  const check = h("button", { type: "button", class: "primary", disabled: true }, "Check");
  const tile = (i: number, onclick: () => void) =>
    h("button", { type: "button", class: "tile", lang: "fr", disabled: locked, onclick }, frText(words[i]));
  const redraw = () => {
    answerLine.replaceChildren(
      ...chosen.map((i, at) =>
        tile(i, () => {
          chosen.splice(at, 1);
          redraw();
        }),
      ),
    );
    poolLine.replaceChildren(
      ...pool
        .filter((i) => !chosen.includes(i))
        .map((i) =>
          tile(i, () => {
            chosen.push(i);
            redraw();
          }),
        ),
    );
    check.disabled = locked || chosen.length !== words.length;
  };
  check.addEventListener("click", () => {
    locked = true;
    redraw();
    const correct = normalize(chosen.map((i) => words[i]).join(" ")) === normalize(sentence);
    finish(correct, correct ? [] : ["The answer is:"], [frenchItem(sentence)]);
  });
  redraw();
  return [h("p", { class: "prompt" }, ex.en), answerLine, poolLine, check];
}

function accentKeys(input: HTMLInputElement): HTMLElement {
  let upper = false;
  const keys = ACCENTS.map((letter) =>
    h(
      "button",
      {
        type: "button",
        class: "key",
        lang: "fr",
        onmousedown: (e: Event) => e.preventDefault(),
        onclick: (e: Event) => {
          const text = (e.currentTarget as HTMLButtonElement).textContent ?? "";
          const start = input.selectionStart ?? input.value.length;
          const end = input.selectionEnd ?? start;
          input.setRangeText(text, start, end, "end");
          input.focus();
        },
      },
      letter,
    ),
  );
  const shift = h(
    "button",
    {
      type: "button",
      class: "key",
      "aria-pressed": "false",
      title: "Capital letters",
      onmousedown: (e: Event) => e.preventDefault(),
      onclick: () => {
        upper = !upper;
        shift.setAttribute("aria-pressed", String(upper));
        keys.forEach((key, i) => (key.textContent = upper ? ACCENTS[i].toUpperCase() : ACCENTS[i]));
      },
    },
    "⇧",
  );
  return h("div", { class: "keys", "aria-label": "Accented letters" }, shift, ...keys);
}

function typedAnswer(
  expected: string,
  label: string,
  inline: boolean,
  finish: Finish,
  extra: Child[],
): { input: HTMLInputElement; controls: HTMLElement } {
  const input = h("input", {
    type: "text",
    class: inline ? "answer-input inline" : "answer-input",
    lang: "fr",
    autocomplete: "off",
    autocapitalize: "off",
    spellcheck: "false",
    "aria-label": label,
  });
  const check = h("button", { type: "button", class: "primary" }, "Check");
  const submit = () => {
    if (input.disabled || input.value.trim() === "") return;
    input.disabled = true;
    check.disabled = true;
    keys.querySelectorAll("button").forEach((b) => (b.disabled = true));
    const outcome = grade(input.value, expected);
    const answer: Child[] =
      outcome === "right"
        ? []
        : outcome === "accents"
          ? ["Watch the accents: ", strongFr(expected)]
          : ["The answer is: ", strongFr(expected)];
    finish(outcome !== "wrong", answer, extra);
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submit();
  });
  check.addEventListener("click", submit);
  const keys = accentKeys(input);
  return { input, controls: h("div", { class: "typed-controls" }, keys, check) };
}

function fillBlank(ex: FillBlankExercise, finish: Finish): Child[] {
  const full = `${ex.before}${ex.answer}${ex.after}`;
  const { input, controls } = typedAnswer(ex.answer, "Missing word", true, finish, [frenchItem(full)]);
  return [
    h("p", { class: "blank-line", lang: "fr" }, frText(ex.before), input, frText(ex.after)),
    h("p", { class: "muted" }, ex.en),
    controls,
  ];
}

function dictation(ex: DictationExercise, finish: Finish): Child[] {
  const { input, controls } = typedAnswer(ex.fr, "What you heard", false, finish, [
    h("p", { class: "muted" }, `It means: ${ex.en}`),
  ]);
  return [h("div", { class: "listen" }, playButtons(ex.fr)), input, controls];
}

function body(ex: Exercise, finish: Finish): Child[] {
  switch (ex.type) {
    case "listen-choose":
      return listenChoose(ex, finish);
    case "multiple-choice":
      return multipleChoice(ex, finish);
    case "word-order":
      return wordOrder(ex, finish);
    case "fill-blank":
      return fillBlank(ex, finish);
    case "dictation":
      return dictation(ex, finish);
  }
}

/**
 * One exercise, graded instantly, with its result saved to progress.
 *
 * @param slot the exercise and where its result is stored
 * @param source optional label naming the lesson it came from
 * @returns a list item that redraws itself on "Try again"
 */
export function exerciseCard(slot: ExerciseSlot, source?: string): HTMLElement {
  const root = h("li", { class: "exercise" });
  const render = () => {
    const previous = exerciseResult(slot.lessonId, slot.key);
    const feedback = h("div", { class: "feedback", role: "status" });
    const again = h("button", { type: "button", class: "again", hidden: true, onclick: render }, "Try again");
    let answered = false;
    const finish: Finish = (correct, answer, extra) => {
      if (answered) return;
      answered = true;
      recordResult(slot.lessonId, slot.key, correct);
      feedback.className = `feedback ${correct ? "right" : "wrong"}`;
      fill(feedback, h("p", { class: "verdict" }, h("strong", {}, correct ? "Correct." : "Not quite."), " ", ...answer), ...extra);
      again.hidden = false;
    };
    fill(
      root,
      h(
        "p",
        { class: "exercise-head" },
        h("span", { class: "exercise-kind" }, KIND[slot.exercise.type]),
        source && h("span", { class: "muted" }, source),
        slot.exercise.uncertain && uncertainFlag(),
        previous && lastTime(previous),
      ),
      ...body(slot.exercise, finish),
      feedback,
      again,
    );
  };
  render();
  return root;
}
