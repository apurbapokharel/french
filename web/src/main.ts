import "./style.css";
import { fetchHealth } from "./ai";

const POLL_MS = 5000;
const badge = document.querySelector<HTMLElement>("#ai-status")!;

async function updateBadge(): Promise<void> {
  const health = await fetchHealth();
  if (health) {
    badge.dataset.state = "connected";
    badge.textContent = "Local AI: connected";
    badge.title = `Server ${health.server_version}, API ${health.api_version}`;
  } else {
    badge.dataset.state = "offline";
    badge.textContent = "Local AI: not running";
    badge.title = "";
  }
  setTimeout(updateBadge, POLL_MS);
}

updateBadge();
