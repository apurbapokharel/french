import { allLessons } from "./content";
import type { VocabItem } from "./content/types/lesson";
import { allCards, dayKey, type Card } from "./progress";

export type Rating = "again" | "hard" | "good" | "easy";

export const RATINGS: Rating[] = ["again", "hard", "good", "easy"];

export interface DeckCard {
  id: string;
  card: Card;
  item: VocabItem;
}

const MIN_EASE = 1.3;

/**
 * The card after a rating, using a simplified SM-2.
 *
 * @param card the card before the rating
 * @param rating how well the learner remembered
 * @param today the current day as YYYY-MM-DD
 * @returns a new card with updated ease, interval, repetitions and due day
 */
export function schedule(card: Card, rating: Rating, today = dayKey()): Card {
  const learned = card.reps > 0;
  let { ease, interval, reps } = card;
  if (rating === "again") {
    ease = Math.max(MIN_EASE, ease - 0.2);
    interval = 0;
    reps = 0;
  } else {
    const grown = (factor: number) => Math.max(interval + 1, Math.round(interval * factor));
    if (rating === "hard") interval = learned ? grown(1.2) : 1;
    if (rating === "good") interval = learned ? grown(ease) : 1;
    if (rating === "easy") interval = learned ? grown(ease * 1.3) : 4;
    if (rating === "hard") ease = Math.max(MIN_EASE, ease - 0.15);
    if (rating === "easy") ease += 0.15;
    reps += 1;
  }
  return { ...card, ease, interval, reps, due: addDays(today, interval) };
}

function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return dayKey(new Date(y, m - 1, d + days));
}

/**
 * How long until a card returns after a rating, in words.
 *
 * @param card the card
 * @param rating the rating
 * @returns for example "today", "1 day" or "8 days"
 */
export function intervalLabel(card: Card, rating: Rating): string {
  const { interval } = schedule(card, rating);
  if (interval === 0) return "today";
  return interval === 1 ? "1 day" : `${interval} days`;
}

function vocabByFrench(): Map<string, VocabItem> {
  const items = new Map<string, VocabItem>();
  for (const lesson of allLessons()) for (const item of lesson.vocabulary) if (!items.has(item.fr)) items.set(item.fr, item);
  return items;
}

/**
 * Every card whose word is still in the course.
 *
 * @returns the cards with their vocabulary items
 */
export function deck(): DeckCard[] {
  const items = vocabByFrench();
  return allCards().flatMap(([id, card]) => {
    const item = items.get(card.fr);
    return item ? [{ id, card, item }] : [];
  });
}

/**
 * Cards due today or earlier.
 *
 * @returns the due cards
 */
export function dueCards(): DeckCard[] {
  const today = dayKey();
  return deck().filter(({ card }) => card.due <= today);
}

/**
 * The next day with cards due, after today.
 *
 * @returns the day and how many cards are due then, or null when no cards are scheduled
 */
export function nextDue(): { day: string; count: number } | null {
  const today = dayKey();
  const later = deck().filter(({ card }) => card.due > today);
  if (later.length === 0) return null;
  const day = later.map(({ card }) => card.due).sort()[0];
  return { day, count: later.filter(({ card }) => card.due === day).length };
}

/**
 * Show the due count in the header link.
 */
export function refreshDueBadge(): void {
  const link = document.querySelector<HTMLElement>("#nav-flashcards");
  if (!link) return;
  const due = dueCards().length;
  link.textContent = due > 0 ? `Flashcards (${due})` : "Flashcards";
}
