import { readSetting, writeSetting } from "./storage";

const VOICE_KEY = "voiceURI";
const SPEED_KEY = "slowSpeed";
const NORMAL_SPEED = 1;
const DEFAULT_SLOW_SPEED = 0.6;
const VOICE_WAIT_MS = 2000;
const PREFERRED_LANGS = ["fr-ca", "fr-fr"];

export const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

export const SLOW_SPEEDS = [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];

let voices: SpeechSynthesisVoice[] = [];
let voice: SpeechSynthesisVoice | null = null;
let ready: Promise<void> | null = null;
let settlePending: ((completed: boolean) => void) | null = null;
const listeners = new Set<() => void>();

function langOf(v: SpeechSynthesisVoice): string {
  return v.lang.toLowerCase().replace("_", "-");
}

function rank(v: SpeechSynthesisVoice): number {
  const index = PREFERRED_LANGS.indexOf(langOf(v));
  return index === -1 ? PREFERRED_LANGS.length : index;
}

function refresh(): void {
  voices = speechSynthesis
    .getVoices()
    .filter((v) => langOf(v).startsWith("fr"))
    .sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  const stored = readSetting(VOICE_KEY);
  voice = voices.find((v) => v.voiceURI === stored) ?? voices[0] ?? null;
  for (const listener of listeners) listener();
}

/**
 * Load the device's French voices once.
 *
 * @returns a promise that settles when voices have loaded, or after a short wait when the device reports none
 */
export function initSpeech(): Promise<void> {
  if (ready) return ready;
  if (!speechSupported) return (ready = Promise.resolve());
  ready = new Promise((resolve) => {
    speechSynthesis.addEventListener("voiceschanged", () => {
      refresh();
      if (voices.length > 0) resolve();
    });
    refresh();
    if (voices.length > 0) resolve();
    else setTimeout(resolve, VOICE_WAIT_MS);
  });
  return ready;
}

/**
 * The device's French voices, Canadian French first, then France French.
 *
 * @returns the voices, empty when the device has none
 */
export function frenchVoices(): SpeechSynthesisVoice[] {
  return voices;
}

/**
 * The voice used for playback.
 *
 * @returns the learner's saved choice if the device still has it, otherwise the best automatic match, or null
 */
export function currentVoice(): SpeechSynthesisVoice | null {
  return voice;
}

/**
 * Choose and save the playback voice.
 *
 * @param voiceURI the chosen voice's voiceURI
 */
export function chooseVoice(voiceURI: string): void {
  writeSetting(VOICE_KEY, voiceURI);
  voice = voices.find((v) => v.voiceURI === voiceURI) ?? voice;
}

/**
 * Listen for changes to the device's voice list.
 *
 * @param listener called after each change
 * @param signal stops the listening when aborted
 */
export function onVoicesChange(listener: () => void, signal: AbortSignal): void {
  listeners.add(listener);
  signal.addEventListener("abort", () => listeners.delete(listener), { once: true });
}

/**
 * The speed of slow playback.
 *
 * @returns the learner's saved slow speed if it is one of SLOW_SPEEDS, otherwise the default
 */
export function currentSlowSpeed(): number {
  const stored = Number(readSetting(SPEED_KEY));
  return SLOW_SPEEDS.includes(stored) ? stored : DEFAULT_SLOW_SPEED;
}

/**
 * Choose and save the speed of slow playback.
 *
 * @param speed one of SLOW_SPEEDS
 */
export function chooseSlowSpeed(speed: number): void {
  writeSetting(SPEED_KEY, String(speed));
}

function interrupt(): void {
  settlePending?.(false);
  settlePending = null;
  speechSynthesis.cancel();
}

/**
 * Speak French text, interrupting anything already playing.
 *
 * @param text French text
 * @param slow true to play at the learner's slow speed instead of normal speed
 * @returns a promise of true when the text was spoken to the end, or false when it failed or was interrupted by other speech or stopSpeaking
 */
export function speak(text: string, slow = false): Promise<boolean> {
  if (!speechSupported) return Promise.resolve(false);
  interrupt();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = voice?.lang ?? "fr-CA";
  if (voice) utterance.voice = voice;
  utterance.rate = slow ? currentSlowSpeed() : NORMAL_SPEED;
  return new Promise((resolve) => {
    const settle = (completed: boolean) => {
      if (settlePending !== settle) return;
      settlePending = null;
      resolve(completed);
    };
    settlePending = settle;
    utterance.onend = () => settle(true);
    utterance.onerror = () => settle(false);
    speechSynthesis.speak(utterance);
  });
}

/**
 * Stop any speech in progress.
 */
export function stopSpeaking(): void {
  if (speechSupported) interrupt();
}
