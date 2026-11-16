import type { components } from "./api/schema";

export type Health = components["schemas"]["Health"];

export const AI_BASE_URL = "http://127.0.0.1:8765";

/**
 * Ask the local AI server for its health.
 *
 * @param timeoutMs how long to wait before giving up
 * @returns the health response, or null when the server is unreachable or answers with an error
 */
export async function fetchHealth(timeoutMs = 2000): Promise<Health | null> {
  try {
    const res = await fetch(`${AI_BASE_URL}/v1/health`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) return null;
    return (await res.json()) as Health;
  } catch {
    return null;
  }
}
