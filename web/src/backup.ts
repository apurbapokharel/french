import { currentProgress, dayKey, parseProgress, replaceProgress, type Progress } from "./progress";
import { chooseSlowSpeed, chooseVoice, currentSlowSpeed, currentVoice, SLOW_SPEEDS } from "./speech";

const APP = "french-for-canadian-pr";
const FORMAT = 1;

const NOT_A_BACKUP = "This file isn't a backup from this site.";
const TOO_NEW = "This backup was made by a newer version of the site. Reload the page to update, then try again.";

interface Settings {
  voiceURI: string | null;
  slowSpeed: number;
}

export interface Backup {
  progress: Progress;
  settings: Settings;
}

/**
 * Download all progress and settings as a JSON file.
 */
export function downloadBackup(): void {
  const file = {
    app: APP,
    format: FORMAT,
    exportedAt: new Date().toISOString(),
    progress: currentProgress(),
    settings: { voiceURI: currentVoice()?.voiceURI ?? null, slowSpeed: currentSlowSpeed() },
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: "application/json" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: `french-progress-${dayKey()}.json` });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readSettings(value: unknown): Settings | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const { voiceURI, slowSpeed } = value as Record<string, unknown>;
  if (voiceURI !== null && typeof voiceURI !== "string") return null;
  if (typeof slowSpeed !== "number") return null;
  return { voiceURI, slowSpeed };
}

/**
 * Check a backup file without changing anything.
 *
 * @param text the file's contents
 * @returns the backup, with its progress migrated to the current version, or an error message for the learner
 */
export function readBackup(text: string): Backup | { error: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { error: NOT_A_BACKUP };
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) return { error: NOT_A_BACKUP };
  const file = data as Record<string, unknown>;
  if (file.app !== APP || typeof file.format !== "number") return { error: NOT_A_BACKUP };
  if (file.format > FORMAT) return { error: TOO_NEW };
  const progress = parseProgress(file.progress);
  if (progress === "newer") return { error: TOO_NEW };
  if (progress === "invalid") return { error: NOT_A_BACKUP };
  const settings = readSettings(file.settings);
  if (!settings) return { error: NOT_A_BACKUP };
  return { progress, settings };
}

/**
 * Replace all progress and settings with a checked backup.
 *
 * @param backup a backup returned by readBackup
 */
export function restoreBackup(backup: Backup): void {
  replaceProgress(backup.progress);
  if (backup.settings.voiceURI) chooseVoice(backup.settings.voiceURI);
  if (SLOW_SPEEDS.includes(backup.settings.slowSpeed)) chooseSlowSpeed(backup.settings.slowSpeed);
}
