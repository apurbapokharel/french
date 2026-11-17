import { h, frText } from "./dom";
import type { Lesson } from "./content";
import { pageSignal } from "./page";
import {
  chooseSlowSpeed,
  chooseVoice,
  currentSlowSpeed,
  currentVoice,
  frenchVoices,
  initSpeech,
  onVoicesChange,
  speak,
  speechSupported,
  SLOW_SPEEDS,
} from "./speech";

/**
 * Play and slow-play buttons for a French item.
 *
 * @param fr French text to speak
 * @returns a group of two buttons
 */
export function playButtons(fr: string): HTMLElement {
  return h(
    "span",
    { class: "play" },
    h("button", { type: "button", class: "icon", "aria-label": `Play: ${fr}`, title: "Play", onclick: () => speak(fr) }, "▶"),
    h(
      "button",
      { type: "button", class: "icon", "aria-label": `Play slowly: ${fr}`, title: "Play slowly", onclick: () => speak(fr, true) },
      "🐢",
    ),
  );
}

/**
 * French text with its play buttons and an optional uncertain flag.
 *
 * @param fr French text
 * @param uncertain true when the French is not yet confirmed
 * @returns the element
 */
export function frenchItem(fr: string, uncertain?: boolean): HTMLElement {
  return h(
    "span",
    { class: "fr-item" },
    playButtons(fr),
    h("span", {}, h("span", { class: "fr", lang: "fr" }, frText(fr)), uncertain && uncertainFlag()),
  );
}

/**
 * Marker for French that hasn't been confirmed against a trusted reference.
 *
 * @returns the flag element
 */
export function uncertainFlag(): HTMLElement {
  return h(
    "span",
    { class: "flag", title: "Not yet confirmed against a trusted reference. It may be wrong." },
    "uncertain",
  );
}

/**
 * Badge shown on lessons a fluent speaker hasn't checked.
 *
 * @param lesson the lesson
 * @returns the badge, or null when the lesson has been reviewed
 */
export function unreviewedBadge(lesson: Lesson): HTMLElement | null {
  if (lesson.review.status !== "unreviewed") return null;
  return h(
    "span",
    { class: "badge warn", title: "A fluent French speaker hasn't checked this lesson yet. It may contain mistakes." },
    "Unreviewed",
  );
}

const INSTALL_STEPS: [string, string][] = [
  ["Windows", "Settings → Time & language → Speech → Add voices → French (Canada)"],
  ["macOS", "System Settings → Accessibility → Spoken Content → System voice → Manage Voices → French"],
  ["iPhone and iPad", "Settings → Accessibility → Spoken Content → Voices → French"],
  ["Android", "Settings → search \"Text-to-speech\" → Speech Services by Google → Install voice data → French"],
  [
    "Linux",
    "Install speech-dispatcher and espeak-ng with your package manager. Firefox then works after a restart. Chrome, Chromium, Brave and Edge also need the --enable-speech-dispatcher flag: add it to the browser's flags file (for example ~/.config/chromium-flags.conf or ~/.config/brave-flags.conf) or start the browser with it, then restart the browser completely",
  ],
];

function noVoiceHelp(): HTMLElement {
  return h(
    "div",
    { class: "notice", role: "status" },
    h("p", {}, h("strong", {}, "Your device has no French voice, so the play buttons are silent.")),
    h("p", {}, "To add one:"),
    h("ul", {}, ...INSTALL_STEPS.map(([os, steps]) => h("li", {}, h("strong", {}, `${os}: `), steps))),
    h("p", {}, "Menu names vary by version. Reload this page after installing."),
  );
}

function voicePicker(): HTMLElement {
  const select = h(
    "select",
    { id: "voice-select", onchange: (e: Event) => chooseVoice((e.target as HTMLSelectElement).value) },
    ...frenchVoices().map((v) =>
      h("option", { value: v.voiceURI, selected: v.voiceURI === currentVoice()?.voiceURI }, `${v.name} (${v.lang})`),
    ),
  );
  return h(
    "div",
    { class: "voice-settings" },
    h(
      "div",
      { class: "voice-row" },
      h("label", { for: "voice-select" }, "French voice"),
      select,
      h("button", { type: "button", onclick: () => speak("Bonjour ! Comment allez-vous ?") }, "Test"),
    ),
    speedPicker(),
  );
}

function speedPicker(): HTMLElement {
  const buttons = SLOW_SPEEDS.map((speed) =>
    h(
      "button",
      {
        type: "button",
        class: "speed",
        "aria-pressed": String(speed === currentSlowSpeed()),
        onclick: () => {
          chooseSlowSpeed(speed);
          buttons.forEach((b, i) => b.setAttribute("aria-pressed", String(SLOW_SPEEDS[i] === speed)));
          speak("Bonjour ! Comment allez-vous ?", true);
        },
      },
      `${speed}×`,
    ),
  );
  return h(
    "div",
    { class: "voice-row" },
    h("span", { class: "label", id: "speed-label" }, "🐢 Slow speed"),
    h("div", { class: "speeds", role: "group", "aria-labelledby": "speed-label" }, ...buttons),
    h("span", { class: "muted speed-note" }, "▶ always plays at normal speed. 🐢 plays at the speed you pick here."),
  );
}

/**
 * Voice settings: a picker for the device's French voices, or install help when there are none.
 *
 * @returns the panel, which updates itself as voices load
 */
export function voicePanel(): HTMLElement {
  const panel = h("section", { class: "voice-panel", "aria-label": "Voice" });
  if (!speechSupported) {
    panel.append(h("div", { class: "notice" }, "This browser can't play speech. Try a recent Chrome, Edge, Safari or Firefox."));
    return panel;
  }
  const signal = pageSignal();
  let loaded = false;
  const render = () => {
    if (signal.aborted) return;
    if (!loaded) panel.replaceChildren(h("p", { class: "muted" }, "Loading voices…"));
    else panel.replaceChildren(frenchVoices().length > 0 ? voicePicker() : noVoiceHelp());
  };
  onVoicesChange(render, signal);
  render();
  initSpeech().then(() => {
    loaded = true;
    render();
  });
  return panel;
}
