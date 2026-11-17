import { fill, h } from "../dom";
import { shuffle } from "../exercises";
import { pageSignal } from "../page";
import { dayKey, progressSaved, saveCard } from "../progress";
import { dueCards, intervalLabel, nextDue, RATINGS, refreshDueBadge, schedule, type DeckCard, type Rating } from "../srs";
import { frenchItem } from "../ui";

const RATING_LABEL: Record<Rating, string> = { again: "Again", hard: "Hard", good: "Good", easy: "Easy" };

function dayLabel(day: string): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (day === dayKey(tomorrow)) return "tomorrow";
  const [y, m, d] = day.split("-").map(Number);
  return `on ${new Date(y, m - 1, d).toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" })}`;
}

function doneMessage(): HTMLElement {
  const next = nextDue();
  if (!next) return h("p", { class: "muted" }, "No cards yet. Open a lesson to add its words and phrases.");
  return h(
    "div",
    { class: "flash-done" },
    h("p", { class: "done" }, "✓ All done for today."),
    h("p", { class: "muted" }, `Next cards due ${dayLabel(next.day)} (${next.count} ${next.count === 1 ? "card" : "cards"}).`),
  );
}

function french(entry: DeckCard): HTMLElement {
  return frenchItem(entry.item.fr, entry.item.uncertain);
}

function english(entry: DeckCard): HTMLElement {
  return h("span", { class: "flash-en" }, entry.item.en);
}

function notes(entry: DeckCard): HTMLElement[] {
  const { note, canadianNote } = entry.item;
  return [
    note ? h("p", { class: "note" }, note) : null,
    canadianNote ? h("p", { class: "note canadian" }, h("strong", {}, "In Canada: "), canadianNote) : null,
  ].filter((el): el is HTMLParagraphElement => el !== null);
}

/**
 * The flashcard review page: today's due cards, one at a time.
 *
 * @returns the page element
 */
export function flashcardsView(): HTMLElement {
  const queue = shuffle(dueCards());
  const stage = h("div", { class: "flash-stage" });
  const remaining = h("p", { class: "muted", role: "status" });
  let revealed = false;
  let showAnswer: (() => void) | null = null;
  let rate: ((rating: Rating) => void) | null = null;

  const render = () => {
    revealed = false;
    showAnswer = null;
    rate = null;
    const entry = queue[0];
    remaining.textContent = entry ? `${queue.length} ${queue.length === 1 ? "card" : "cards"} left today` : "";
    if (!entry) {
      fill(stage, doneMessage());
      return;
    }
    const frToEn = entry.card.direction === "fr-en";
    const front = h(
      "div",
      { class: "flash-face" },
      h("p", { class: "flash-direction muted" }, frToEn ? "French → English" : "English → French"),
      frToEn ? french(entry) : english(entry),
    );
    const back = h("div", { class: "flash-face flash-back" });
    const actions = h("div", { class: "flash-actions" });
    const card = h("div", { class: "flash-card" }, front, back, actions);

    rate = (rating: Rating) => {
      saveCard(entry.id, schedule(entry.card, rating));
      queue.shift();
      if (rating === "again") queue.push({ ...entry, card: schedule(entry.card, rating) });
      refreshDueBadge();
      render();
    };
    showAnswer = () => {
      revealed = true;
      fill(back, frToEn ? english(entry) : french(entry), ...notes(entry));
      fill(
        actions,
        ...RATINGS.map((rating, i) =>
          h(
            "button",
            { type: "button", class: `rate rate-${rating}`, title: `Key ${i + 1}`, onclick: () => rate?.(rating) },
            h("span", { class: "rate-name" }, RATING_LABEL[rating]),
            h("span", { class: "rate-when" }, intervalLabel(entry.card, rating)),
          ),
        ),
      );
    };
    fill(actions, h("button", { type: "button", class: "primary", onclick: () => showAnswer?.() }, "Show answer"));
    fill(stage, card);
  };

  document.addEventListener(
    "keydown",
    (e) => {
      if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
        if (e.key === " " || e.key === "Enter") return;
      }
      if (!revealed && e.key === " " && showAnswer) {
        e.preventDefault();
        showAnswer();
        return;
      }
      const index = Number(e.key) - 1;
      if (revealed && rate && index >= 0 && index < RATINGS.length) rate(RATINGS[index]);
    },
    { signal: pageSignal() },
  );

  render();
  return h(
    "div",
    { class: "page" },
    h("h2", {}, "Flashcards"),
    h(
      "p",
      { class: "muted" },
      "Words and phrases from the lessons you've opened. Try to remember the other side, show the answer, then rate how well you knew it. Keys: Space shows the answer, 1 to 4 pick a rating from left to right.",
    ),
    !progressSaved() && h("p", { class: "notice" }, "This browser is blocking storage, so your cards won't be kept after you leave."),
    remaining,
    stage,
  );
}
